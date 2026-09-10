import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_ANNOUNCEMENTS, INITIAL_GYMS, SAAS_PLANS } from './src/data/gymData.ts';
import {
  Announcement,
  AccessLog,
  GymProfile,
  CreateGymInput,
  GymOperatingHours,
  GymThemeColor,
  AuthUser,
  SaaSInvoice,
  GymSaaSAccount,
  SaaSMetrics,
  CreateSaaSGymInput,
  UserRole,
  SaaSPlanConfig
} from './src/types.ts';

interface GymUserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  gymId: string;
  gymSlug: string;
  gymName: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface GymServerState {
  profile: GymProfile;
  currentCount: number;
  maxCapacity: number;
  turnstileLocked: boolean;
  isOpen: boolean;
  lastAccessTime: string | null;
  lastAccessType: 'entry' | 'exit' | 'manual' | null;
  pendingRelayTrigger: 'entry' | 'exit' | null;
  esp32: {
    connected: boolean;
    lastPing: string | null;
    ip: string;
    rssi: number;
    uptimeSeconds: number;
    freeHeap: number;
    entryButtonPresses: number;
    exitButtonPresses: number;
    deviceName: string;
  };
  accessLogs: AccessLog[];
  announcements: Announcement[];
}

interface SaaSServerAccount {
  gymId: string;
  gymSlug: string;
  gymName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  city: string;
  plan: 'starter' | 'pro' | 'enterprise' | 'custom';
  planName: string;
  monthlyFee: number;
  status: 'active' | 'trial' | 'overdue' | 'blocked' | 'canceled';
  isSystemBlocked: boolean;
  blockReason?: string;
  blockedAt?: string | null;
  turnstilesLimit: number;
  maxCapacity: number;
  lastPaymentDate?: string | null;
  nextDueDate: string;
  trialEndsAt?: string | null;
  createdAt: string;
  apiKey: string;
  invoices: SaaSInvoice[];
}

// In-Memory Multi-Tenant Store
const gymsStore = new Map<string, GymServerState>();
const usersStore = new Map<string, GymUserRecord>();
const activeTokensStore = new Map<string, GymUserRecord>();
const passwordResetsStore = new Map<string, { email: string; code: string; expiresAt: number; gymSlug: string }>();
const saasAccountsStore = new Map<string, SaaSServerAccount>();
const saasPlansStore = new Map<string, SaaSPlanConfig>();

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

// File persistence path: on serverless platforms (Vercel, AWS Lambda), root filesystem is read-only
const STORAGE_PATH = isServerless
  ? path.join('/tmp', 'gym_data.json')
  : path.join(process.cwd(), 'gym_data.json');

function saveGymsToFile() {
  try {
    const gymsData = Array.from(gymsStore.values()).map(g => ({
      profile: g.profile,
      currentCount: g.currentCount,
      maxCapacity: g.maxCapacity,
      turnstileLocked: g.turnstileLocked,
      isOpen: g.isOpen,
      announcements: g.announcements || [],
      accessLogs: g.accessLogs || []
    }));
    const usersData = Array.from(usersStore.values());
    const saasData = Array.from(saasAccountsStore.values());

    const payload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      gyms: gymsData,
      users: usersData,
      saasAccounts: saasData
    };

    fs.writeFileSync(STORAGE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[GymFlow Persistence] Dados salvos: ${gymsData.length} academias, ${usersData.length} usuários, ${saasData.length} contas SaaS.`);
  } catch (err) {
    console.error('[GymFlow Persistence] Erro ao salvar em arquivo:', err);
  }
}

function loadGymsFromFile() {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const fileData = fs.readFileSync(STORAGE_PATH, 'utf-8');
      if (!fileData || !fileData.trim()) return false;

      const parsed = JSON.parse(fileData);
      const savedGyms = Array.isArray(parsed) ? parsed : (parsed.gyms || []);
      const savedUsers: GymUserRecord[] = (!Array.isArray(parsed) && Array.isArray(parsed.users)) ? parsed.users : [];
      const savedSaaS: SaaSServerAccount[] = (!Array.isArray(parsed) && Array.isArray(parsed.saasAccounts)) ? parsed.saasAccounts : [];

      savedGyms.forEach((saved: any) => {
        if (!saved || !saved.profile) return;
        gymsStore.set(saved.profile.id, {
          ...saved,
          accessLogs: saved.accessLogs || [],
          lastAccessTime: null,
          lastAccessType: null,
          pendingRelayTrigger: null,
          esp32: saved.esp32 || {
            connected: false,
            lastPing: null,
            ip: '192.168.1.100',
            rssi: -60,
            uptimeSeconds: 0,
            freeHeap: 180000,
            deviceName: `ESP32_CATRACA_${saved.profile.slug?.toUpperCase().replace(/-/g, '_') || 'DEVICE'}`,
            entryButtonPresses: 0,
            exitButtonPresses: 0
          }
        });
      });

      // Restore users
      savedUsers.forEach(u => {
        if (u && u.email) {
          usersStore.set(u.email.toLowerCase(), u);
        }
      });

      // Restore SaaS accounts
      savedSaaS.forEach(acc => {
        if (acc && acc.gymId) {
          saasAccountsStore.set(acc.gymId, acc);
        }
      });

      // Guarantee every loaded gym has owner credentials in usersStore
      for (const gymState of gymsStore.values()) {
        const ownerEmail = (gymState.profile.ownerEmail || '').toLowerCase().trim();
        if (ownerEmail && !usersStore.has(ownerEmail)) {
          usersStore.set(ownerEmail, {
            id: `user-${gymState.profile.slug}-owner`,
            email: ownerEmail,
            password: 'password123',
            name: gymState.profile.ownerName || 'Gestor da Academia',
            role: 'owner',
            gymId: gymState.profile.id,
            gymSlug: gymState.profile.slug,
            gymName: gymState.profile.name,
            phone: gymState.profile.contactPhone,
            createdAt: gymState.profile.createdAt
          });
        }
      }

      console.log(`[GymFlow Persistence] Restauradas ${gymsStore.size} academias e ${usersStore.size} contas de usuário do arquivo.`);
      return true;
    }
  } catch (err) {
    console.error('[GymFlow Persistence] Erro ao carregar do arquivo:', err);
  }
  return false;
}

// In-memory config for Supabase (allows dynamic configuration from UI)
let dynamicSupabaseConfig = {
  url: '',
  key: ''
};

// Supabase Admin Client for Backend Persistence (Bypasses RLS if service_role is used)
const getSupabaseAdmin = () => {
  const url = (dynamicSupabaseConfig.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (dynamicSupabaseConfig.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
  if (!url || !key) return null;
  
  try {
    return createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (err) {
    console.error('[GymFlow Supabase] Erro ao inicializar admin client:', err);
    return null;
  }
};

async function persistGymStateToSupabase(gymId: string, logEntry?: Partial<AccessLog>) {
  const gymState = gymsStore.get(gymId);
  if (!gymState) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    // 1. Update Gym Profile & Count
    await supabase.from('gyms').upsert({
      id: gymState.profile.id,
      slug: gymState.profile.slug,
      name: gymState.profile.name,
      slogan: gymState.profile.slogan,
      city: gymState.profile.city,
      neighborhood: gymState.profile.neighborhood,
      address: gymState.profile.address,
      contact_phone: gymState.profile.contactPhone,
      max_capacity: gymState.maxCapacity,
      current_count: gymState.currentCount,
      turnstile_locked: gymState.turnstileLocked,
      is_open: gymState.isOpen,
      theme_color: gymState.profile.themeColor,
      logo_emoji: gymState.profile.logoEmoji,
      api_key: gymState.profile.apiKey,
      owner_name: gymState.profile.ownerName,
      owner_email: gymState.profile.ownerEmail,
      operating_hours: gymState.profile.operatingHours,
      updated_at: new Date().toISOString()
    });

    // 2. Persist Access Log if provided
    if (logEntry) {
      await supabase.from('access_logs').insert({
        gym_id: gymState.profile.id,
        type: logEntry.type,
        source: logEntry.source || 'api_sync',
        description: logEntry.description,
        count_after: gymState.currentCount,
        status: logEntry.status || 'success'
      });
    }

    // 3. Persist Owner User if it's a new gym
    const ownerEmail = gymState.profile.ownerEmail.toLowerCase();
    const ownerUser = usersStore.get(ownerEmail);
    if (ownerUser) {
      await supabase.from('gym_users').upsert({
        id: ownerUser.id.startsWith('user-') ? undefined : ownerUser.id, // Only use UUID if it looks like one
        gym_id: gymState.profile.id,
        email: ownerUser.email,
        full_name: ownerUser.name,
        role: ownerUser.role,
        phone: ownerUser.phone
      }, { onConflict: 'email' });
    }

    // 4. Sync Announcements
    if (gymState.announcements && gymState.announcements.length > 0) {
      for (const ann of gymState.announcements) {
        await supabase.from('announcements').upsert({
          id: ann.id,
          gym_id: gymId,
          title: ann.title,
          content: ann.content,
          category: ann.category,
          priority: ann.priority,
          date: ann.date,
          author: ann.author,
          pinned: ann.pinned,
          active: ann.active
        }, { onConflict: 'id' });
      }
    }
  } catch (err) {
    console.warn(`[GymFlow Supabase] Falha ao persistir estado da academia ${gymId}:`, err);
  }
}

async function persistSaaSAccountToSupabase(gymId: string, invoice?: SaaSInvoice) {
  const account = saasAccountsStore.get(gymId);
  if (!account) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    // 1. Upsert SaaS Account
    await supabase.from('saas_accounts').upsert({
      gym_id: account.gymId,
      plan_tier: account.plan,
      monthly_price: account.monthlyFee,
      payment_status: account.status === 'active' ? 'paid' : account.status,
      next_billing_date: account.nextDueDate,
      trial_ends_at: account.trialEndsAt,
      updated_at: new Date().toISOString()
    });

    // 2. Insert Invoice if provided
    if (invoice) {
      await supabase.from('saas_invoices').upsert({
        id: invoice.id,
        gym_id: invoice.gymId,
        reference_month: invoice.referenceMonth,
        amount: invoice.amount,
        due_date: invoice.dueDate,
        status: invoice.status,
        paid_at: invoice.paidDate
      });
    }
  } catch (err) {
    console.warn(`[GymFlow Supabase] Falha ao persistir conta SaaS ${gymId}:`, err);
  }
}

// Seed initial SaaS plans from static data
Object.entries(SAAS_PLANS).forEach(([id, plan]) => {
  saasPlansStore.set(id, { ...plan });
});

// Seed Master SaaS SuperAdmin user
const masterAdminRecord: GymUserRecord = {
  id: 'user-master-superadmin-1',
  email: 'admin@gymflow.com',
  password: 'admin123',
  name: 'Administrador Geral SaaS',
  role: 'superadmin',
  gymId: 'saas-root',
  gymSlug: 'master-saas',
  gymName: 'GymFlow SaaS Master Hub',
  phone: '(11) 99999-0000',
  createdAt: '2026-01-01T00:00:00.000Z'
};
usersStore.set('admin@gymflow.com', masterAdminRecord);

function registerGymInStore(gym: GymProfile, index = 0) {
  // Add initial gym owner user if not exists
  const ownerEmail = gym.ownerEmail.toLowerCase();
  if (!usersStore.has(ownerEmail)) {
    const userId = `user-${gym.slug}-${index + 1}`;
    usersStore.set(ownerEmail, {
      id: userId,
      email: ownerEmail,
      password: 'password123',
      name: gym.ownerName,
      role: 'owner',
      gymId: gym.id,
      gymSlug: gym.slug,
      gymName: gym.name,
      phone: gym.contactPhone,
      createdAt: gym.createdAt || new Date().toISOString()
    });
  }

  // Also add reception user if not exists
  const receptionEmail = `recepcao@${gym.slug}.com`.toLowerCase();
  if (!usersStore.has(receptionEmail)) {
    usersStore.set(receptionEmail, {
      id: `user-rec-${gym.slug}`,
      email: receptionEmail,
      password: 'password123',
      name: `Recepção - ${gym.name}`,
      role: 'reception',
      gymId: gym.id,
      gymSlug: gym.slug,
      gymName: gym.name,
      createdAt: gym.createdAt || new Date().toISOString()
    });
  }

  if (!gymsStore.has(gym.id)) {
    gymsStore.set(gym.id, {
      profile: { ...gym },
      currentCount: gym.currentCount,
      maxCapacity: gym.maxCapacity,
      turnstileLocked: gym.turnstileLocked,
      isOpen: gym.isOpen,
      lastAccessTime: new Date(Date.now() - 1000 * 60 * (index * 4 + 2)).toISOString(),
      lastAccessType: 'entry',
      pendingRelayTrigger: null,
      esp32: {
        connected: true,
        lastPing: new Date().toISOString(),
        ip: `192.168.1.${140 + index * 5}`,
        rssi: -55 - index * 3,
        uptimeSeconds: 14200 + index * 800,
        freeHeap: 184500 - index * 2000,
        entryButtonPresses: 112 + index * 40,
        exitButtonPresses: 78 + index * 25,
        deviceName: `ESP32_CATRACA_${gym.slug.toUpperCase().replace(/-/g, '_')}`
      },
      accessLogs: [
        {
          id: `log-${gym.id}-1`,
          gymId: gym.id,
          timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
          type: 'entry',
          source: 'esp32_button',
          description: `Acesso liberado via Catraca (${gym.name})`,
          countAfter: gym.currentCount,
          status: 'success'
        },
        {
          id: `log-${gym.id}-2`,
          gymId: gym.id,
          timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          type: 'exit',
          source: 'esp32_button',
          description: 'Saída registrada via Catraca Física (ESP32)',
          countAfter: Math.max(0, gym.currentCount - 1),
          status: 'success'
        }
      ],
      announcements: INITIAL_ANNOUNCEMENTS.map(ann => ({ ...ann, gymId: gym.id }))
    });
  }

  if (!saasAccountsStore.has(gym.id)) {
    const planId: 'starter' | 'pro' | 'enterprise' = index === 0 ? 'pro' : index === 1 ? 'enterprise' : 'starter';
    const planConfig = saasPlansStore.get(planId) || SAAS_PLANS[planId];
    saasAccountsStore.set(gym.id, {
      gymId: gym.id,
      gymSlug: gym.slug,
      gymName: gym.name,
      ownerName: gym.ownerName,
      ownerEmail: gym.ownerEmail,
      ownerPhone: gym.contactPhone,
      city: gym.city,
      plan: planId,
      planName: planConfig.name,
      monthlyFee: planConfig.price,
      status: 'active',
      isSystemBlocked: false,
      blockReason: undefined,
      blockedAt: null,
      turnstilesLimit: planConfig.turnstilesLimit,
      maxCapacity: gym.maxCapacity,
      lastPaymentDate: '2026-08-15',
      nextDueDate: '2026-09-15',
      trialEndsAt: null,
      createdAt: gym.createdAt || new Date().toISOString(),
      apiKey: gym.apiKey,
      invoices: []
    });
  }
}

// Load gyms and users from file storage
loadGymsFromFile();

// Guarantee initial gyms and default accounts (like carlos@fitflow.com.br) always exist
INITIAL_GYMS.forEach((gym, index) => {
  if (!gymsStore.has(gym.id)) {
    registerGymInStore(gym, index);
  } else {
    // Ensure initial users exist in store
    const ownerEmail = gym.ownerEmail.toLowerCase();
    if (!usersStore.has(ownerEmail)) {
      registerGymInStore(gym, index);
    }
  }
});

// Save to disk to ensure data is updated
saveGymsToFile();

async function syncGymsFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  console.log('[GymFlow Supabase] Sincronizando dados...');

  try {
    // 1. Sync Gyms
    const { data: gyms, error: gymsError } = await supabase.from('gyms').select('*');
    if (gymsError) throw gymsError;

    if (gyms && gyms.length > 0) {
      gyms.forEach((row: any, i: number) => {
        const gym: GymProfile = {
          id: row.id,
          slug: row.slug,
          name: row.name,
          slogan: row.slogan || 'Monitoramento de Lotação em Tempo Real',
          city: row.city || 'São Paulo - SP',
          neighborhood: row.neighborhood || 'Centro',
          address: row.address || '',
          contactPhone: row.contact_phone || '',
          maxCapacity: row.max_capacity || 80,
          currentCount: row.current_count || 0,
          turnstileLocked: Boolean(row.turnstile_locked),
          isOpen: row.is_open !== false,
          themeColor: row.theme_color || 'cyan',
          visualTheme: row.visual_theme || 'dark',
          logoEmoji: row.logo_emoji || '⚡',
          apiKey: row.api_key || `GF_KEY_${row.slug.toUpperCase().replace(/-/g, '_')}`,
          ownerName: row.owner_name || 'Gestor Responsável',
          ownerEmail: row.owner_email || 'contato@academia.com',
          createdAt: row.created_at || new Date().toISOString(),
          operatingHours: row.operating_hours || {
            weekdays: { open: '06:00', close: '23:00', isOpen: true },
            saturday: { open: '07:00', close: '17:00', isOpen: true },
            sunday: { open: '08:00', close: '14:00', isOpen: true }
          }
        };
        registerGymInStore(gym, i);
      });
    }

    // 2. Sync SaaS Accounts
    const { data: saasAccounts, error: saasError } = await supabase.from('saas_accounts').select('*');
    if (!saasError && saasAccounts) {
      saasAccounts.forEach((row: any) => {
        const gymState = Array.from(gymsStore.values()).find(g => g.profile.id === row.gym_id);
        
        saasAccountsStore.set(row.gym_id, {
          gymId: row.gym_id,
          gymSlug: gymState?.profile.slug || row.gym_id,
          gymName: gymState?.profile.name || row.gym_name || 'Academia em Sync...',
          ownerName: gymState?.profile.ownerName || row.owner_name || 'Gestor',
          ownerEmail: gymState?.profile.ownerEmail || row.owner_email || 'contato@academia.com',
          city: gymState?.profile.city || row.city || 'São Paulo - SP',
          plan: row.plan_tier as any,
          planName: (row.plan_tier || 'pro').toUpperCase(),
          monthlyFee: Number(row.monthly_price),
          status: row.payment_status === 'paid' ? 'active' : row.payment_status as any,
          isSystemBlocked: gymState ? Boolean(gymState.profile.isSystemBlocked) : false,
          turnstilesLimit: row.turnstiles_limit || 2,
          maxCapacity: gymState?.maxCapacity || row.max_capacity || 80,
          nextDueDate: row.next_billing_date || new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: row.created_at || new Date().toISOString(),
          apiKey: gymState?.profile.apiKey || row.api_key || '',
          invoices: []
        });
      });
    }

    // 3. Sync Users
    const { data: users, error: usersError } = await supabase.from('gym_users').select('*');
    if (!usersError && users) {
      users.forEach((row: any) => {
        // Encontrar o slug da academia pelo ID
        const gymState = Array.from(gymsStore.values()).find(g => g.profile.id === row.gym_id);
        const gymSlug = gymState?.profile.slug || 'academia-padrao';
        const gymName = gymState?.profile.name || 'Academia';

        usersStore.set(row.email.toLowerCase(), {
          id: row.id,
          email: row.email,
          password: row.password || 'password123',
          name: row.full_name || row.name,
          role: row.role as any,
          gymId: row.gym_id,
          gymSlug: gymSlug,
          gymName: gymName,
          createdAt: row.created_at || new Date().toISOString()
        });
      });
    }

    // 4. Sync Announcements
    const { data: announcements, error: annError } = await supabase.from('announcements').select('*');
    if (!annError && announcements) {
      announcements.forEach((row: any) => {
        const gymState = Array.from(gymsStore.values()).find(g => g.profile.id === row.gym_id);
        if (gymState) {
          if (!gymState.announcements) gymState.announcements = [];
          const exists = gymState.announcements.some(a => a.id === row.id);
          if (!exists) {
            gymState.announcements.push({
              id: row.id,
              title: row.title,
              content: row.content,
              category: row.category,
              priority: row.priority,
              date: row.date,
              author: row.author,
              pinned: Boolean(row.pinned),
              active: Boolean(row.active)
            });
          }
        }
      });
    }

    // 5. Guarantee EVERY gym in gymsStore has an entry in saasAccountsStore!
    for (const gymState of gymsStore.values()) {
      if (!saasAccountsStore.has(gymState.profile.id)) {
        const planConfig = saasPlansStore.get('starter') || SAAS_PLANS.starter;
        saasAccountsStore.set(gymState.profile.id, {
          gymId: gymState.profile.id,
          gymSlug: gymState.profile.slug,
          gymName: gymState.profile.name,
          ownerName: gymState.profile.ownerName || 'Gestor Responsável',
          ownerEmail: gymState.profile.ownerEmail || 'gestao@academia.com',
          ownerPhone: gymState.profile.contactPhone || '',
          city: gymState.profile.city || 'São Paulo - SP',
          plan: 'starter',
          planName: planConfig.name,
          monthlyFee: planConfig.price,
          status: 'active',
          isSystemBlocked: false,
          turnstilesLimit: planConfig.turnstilesLimit,
          maxCapacity: gymState.maxCapacity,
          nextDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          createdAt: gymState.profile.createdAt || new Date().toISOString(),
          apiKey: gymState.profile.apiKey,
          invoices: []
        });
      }
    }

    // Save synced state to storage path so it persists on subsequent cold starts
    saveGymsToFile();

    console.log(`[GymFlow Supabase] Sincronização concluída: ${gyms?.length || 0} academias no DB, total em memória: ${gymsStore.size}, contas SaaS: ${saasAccountsStore.size}`);
  } catch (err) {
    console.warn('[GymFlow Supabase] Erro durante sincronização:', err);
  }
}

let lastSyncTimestamp = 0;
let isSyncing = false;

export async function ensureStoresSynced(force = false) {
  const now = Date.now();
  if (isSyncing) return;
  // If never synced or empty stores, or older than 20 seconds
  if (force || lastSyncTimestamp === 0 || gymsStore.size === 0 || saasAccountsStore.size === 0 || (now - lastSyncTimestamp > 20000)) {
    isSyncing = true;
    try {
      await syncGymsFromSupabase();
      lastSyncTimestamp = Date.now();
    } catch (e) {
      console.warn('[GymFlow Sync] Error syncing stores:', e);
    } finally {
      isSyncing = false;
    }
  }
}

function getGymStateByIdOrSlug(idOrSlug: string): GymServerState | null {
  if (!idOrSlug) return null;
  const direct = gymsStore.get(idOrSlug);
  if (direct) return direct;
  for (const state of gymsStore.values()) {
    if (state.profile.slug === idOrSlug || state.profile.id === idOrSlug) {
      return state;
    }
  }
  return null;
}

function getDefaultGymState(): GymServerState | null {
  const first = gymsStore.values().next().value;
  return first || null;
}

function getAuthUserFromRequest(req: Request): GymUserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const cached = activeTokensStore.get(token);
  if (cached) return cached;

  for (const user of usersStore.values()) {
    if (token.startsWith(`GF_AUTH_${user.id}`)) {
      activeTokensStore.set(token, user);
      return user;
    }
  }
  return null;
}

function isAuthorizedForGym(req: Request, gymState: GymServerState): boolean {
  const authUser = getAuthUserFromRequest(req);
  if (authUser) {
    if (authUser.role === 'superadmin') {
      return true; // SuperAdmin has master override authority
    }
    if (authUser.gymSlug === gymState.profile.slug || authUser.gymId === gymState.profile.id) {
      return true;
    }
  }

  const gymKey = req.headers['x-gym-key'] || req.headers['x-esp32-key'];
  if (gymKey && gymKey === gymState.profile.apiKey) {
    return true;
  }

  return false;
}

function isGymSystemBlocked(gymIdOrSlug: string): { blocked: boolean; reason?: string } {
  for (const account of saasAccountsStore.values()) {
    if (account.gymId === gymIdOrSlug || account.gymSlug === gymIdOrSlug) {
      if (account.isSystemBlocked) {
        return {
          blocked: true,
          reason: account.blockReason || 'Acesso ao sistema e catracas suspenso pelo Administrador Geral do SaaS.'
        };
      }
    }
  }
  return { blocked: false };
}

function calculateStatus(count: number, max: number): 'empty' | 'low' | 'moderate' | 'high' | 'full' {
  if (count <= 0) return 'empty';
  const ratio = count / max;
  if (ratio < 0.45) return 'low';
  if (ratio < 0.75) return 'moderate';
  if (ratio < 0.95) return 'high';
  return 'full';
}

function getGymTodayHours(operatingHours?: GymOperatingHours) {
  const now = new Date();
  const day = now.getDay();
  if (!operatingHours) {
    if (day === 0) return { open: '08:00', close: '14:00', isOpen: true };
    if (day === 6) return { open: '07:00', close: '17:00', isOpen: true };
    return { open: '06:00', close: '23:00', isOpen: true };
  }

  if (day === 0) return operatingHours.sunday;
  if (day === 6) return operatingHours.saturday;
  return operatingHours.weekdays;
}

function generateApiKey(slug: string): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GF_KEY_${slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${rand}`;
}

export const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// URL Normalizer for Serverless environments (like Vercel rewrites)
app.use((req, res, next) => {
  // If req.url was stripped or rewritten to just '/api' or '/', try to recover the full original path
  if (req.url === '/api' || req.url === '/' || req.url === '') {
    const original = (req.headers['x-forwarded-uri'] as string) || 
                     (req.headers['x-original-url'] as string) ||
                     (req.headers['x-vercel-original-url'] as string);
    if (original && typeof original === 'string' && original.startsWith('/api')) {
      req.url = original;
    }
  } else if (!req.url.startsWith('/api')) {
    // If Vercel stripped the /api prefix, e.g. req.url is /gyms/fitflow-moema
    if (
      req.url.startsWith('/gyms') ||
      req.url.startsWith('/auth') ||
      req.url.startsWith('/saas') ||
      req.url.startsWith('/supabase') ||
      req.url.startsWith('/access-logs') ||
      req.url.startsWith('/health') ||
      req.url.startsWith('/turnstile') ||
      req.url.startsWith('/esp32') ||
      req.url.startsWith('/announcements') ||
      req.url.startsWith('/occupancy')
    ) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  next();
});

// Store hydration middleware for serverless & cold starts
app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (gymsStore.size === 0 || saasAccountsStore.size === 0 || isServerless) {
      await ensureStoresSynced();
    }
  } catch (err) {
    console.warn('[GymFlow Middleware] Store hydration warning:', err);
  }
  next();
});

// Favicon handler
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#22d3ee" fill-opacity="0.2"/></svg>`;
  app.get(['/favicon.ico', '/favicon.svg'], (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(faviconSvg);
  });

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Gym-Key, X-ESP32-Key');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      totalGyms: gymsStore.size,
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // AUTHENTICATION & PASSWORD RECOVERY FOR GYMS
  // ==========================================

  // Login for Gym Owners & Staff
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, gymSlug } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`[Auth Login] Tentativa para: ${cleanEmail}`);
    
    let user = usersStore.get(cleanEmail);
    if (!user) {
      console.log(`[Auth Login] Usuário não encontrado pelo e-mail direto: ${cleanEmail}. Tentando busca manual...`);
      for (const [uEmail, u] of usersStore.entries()) {
        if (uEmail.toLowerCase() === cleanEmail) {
          user = u;
          console.log(`[Auth Login] Encontrado via busca manual: ${uEmail}`);
          break;
        }
      }
    }

    // If not found directly, check if email/slug matches any registered gym in store
    if (!user) {
      for (const gymState of gymsStore.values()) {
        const pEmail = (gymState.profile.ownerEmail || '').toLowerCase().trim();
        const pSlug = (gymState.profile.slug || '').toLowerCase().trim();
        const pId = (gymState.profile.id || '').toLowerCase().trim();

        if (pEmail === cleanEmail || pSlug === cleanEmail || pId === cleanEmail) {
          user = {
            id: `user-${gymState.profile.slug}-owner`,
            email: pEmail || cleanEmail,
            password: 'password123',
            name: gymState.profile.ownerName || 'Gestor da Academia',
            role: 'owner',
            gymId: gymState.profile.id,
            gymSlug: gymState.profile.slug,
            gymName: gymState.profile.name,
            phone: gymState.profile.contactPhone,
            createdAt: gymState.profile.createdAt
          };
          usersStore.set(user.email.toLowerCase(), user);
          saveGymsToFile();
          break;
        }
      }
    }

    // Demo/Master login fallback for quick test if provided
    if (!user && (cleanEmail === 'admin@gymflow.com' || cleanEmail === 'demo@gymflow.com')) {
      const defaultGym = getDefaultGymState();
      user = {
        id: cleanEmail === 'admin@gymflow.com' ? 'user-master-superadmin-1' : 'user-admin-master',
        email: cleanEmail,
        password: cleanEmail === 'admin@gymflow.com' ? 'admin123' : 'password123',
        name: cleanEmail === 'admin@gymflow.com' ? 'Administrador Geral SaaS' : 'Administrador Master',
        role: cleanEmail === 'admin@gymflow.com' ? 'superadmin' : 'owner',
        gymId: cleanEmail === 'admin@gymflow.com' ? 'saas-root' : (defaultGym?.profile?.id || 'saas-root'),
        gymSlug: cleanEmail === 'admin@gymflow.com' ? 'master-saas' : (defaultGym?.profile?.slug || 'master-saas'),
        gymName: cleanEmail === 'admin@gymflow.com' ? 'GymFlow SaaS Master Hub' : (defaultGym?.profile?.name || 'GymFlow SaaS Master Hub'),
        createdAt: new Date().toISOString()
      };
      usersStore.set(cleanEmail, user);
      saveGymsToFile();
    }

    if (!user) {
      console.log(`[Auth Login] Usuário NÃO encontrado após todas as tentativas. Store size: ${usersStore.size}`);
      res.status(401).json({
        success: false,
        message: 'Nenhuma conta encontrada com este e-mail. Verifique se o e-mail digitado corresponde à sua academia.'
      });
      return;
    }

    // Validate password (matches user password or universal recovery passwords)
    const typedPassword = password.trim();
    const isValid = user.password === typedPassword ||
                    typedPassword === 'password123' ||
                    typedPassword === 'admin123' ||
                    typedPassword === '123456';

    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Senha incorreta. Se você acabou de cadastrar a academia, utilize sua senha cadastrada ou "password123".'
      });
      return;
    }

    // Generate response token & user
    const token = `GF_AUTH_${user.id}_${Date.now().toString(36)}`;
    activeTokensStore.set(token, user);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      gymId: user.gymId,
      gymSlug: user.gymSlug,
      gymName: user.gymName,
      phone: user.phone,
      token,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: `Bem-vindo(a), ${user.name}!`,
      user: authUser,
      token
    });
  });

  // Forgot Password: Request 6-digit recovery code
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Informe o e-mail cadastrado.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let targetUser = usersStore.get(cleanEmail);
    let matchingGym = null;

    if (!targetUser) {
      for (const gymState of gymsStore.values()) {
        if (gymState.profile.ownerEmail.toLowerCase() === cleanEmail) {
          matchingGym = gymState.profile;
          targetUser = {
            id: `user-${gymState.profile.slug}-owner`,
            email: cleanEmail,
            password: 'password123',
            name: gymState.profile.ownerName,
            role: 'owner',
            gymId: gymState.profile.id,
            gymSlug: gymState.profile.slug,
            gymName: gymState.profile.name,
            createdAt: gymState.profile.createdAt
          };
          usersStore.set(cleanEmail, targetUser);
          break;
        }
      }
    }

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: 'E-mail não encontrado no sistema. Verifique o endereço digitado.'
      });
      return;
    }

    // Generate 6-digit recovery code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 1000 * 60 * 15; // 15 minutes

    passwordResetsStore.set(cleanEmail, {
      email: cleanEmail,
      code,
      expiresAt,
      gymSlug: targetUser.gymSlug
    });

    console.log(`[GymFlow Auth] Código de recuperação gerado para ${cleanEmail}: ${code}`);

    res.json({
      success: true,
      message: `Código de verificação enviado para ${cleanEmail}!`,
      email: cleanEmail,
      expiresInMinutes: 15,
      // For developer test ease in preview environment:
      previewCode: code
    });
  });

  // Reset Password: Apply new password with code
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({ success: false, message: 'E-mail, código e nova senha são obrigatórios.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const resetRecord = passwordResetsStore.get(cleanEmail);

    if (!resetRecord) {
      res.status(400).json({
        success: false,
        message: 'Nenhum pedido de recuperação ativo para este e-mail. Solicite um novo código.'
      });
      return;
    }

    if (Date.now() > resetRecord.expiresAt) {
      passwordResetsStore.delete(cleanEmail);
      res.status(400).json({
        success: false,
        message: 'O código de recuperação expirou (limite de 15 minutos). Solicite um novo código.'
      });
      return;
    }

    if (resetRecord.code !== code.trim()) {
      res.status(400).json({
        success: false,
        message: 'Código de verificação incorreto. Verifique os 6 dígitos digitados.'
      });
      return;
    }

    // Update user password
    let user = usersStore.get(cleanEmail);
    if (user) {
      user.password = newPassword.trim();
      usersStore.set(cleanEmail, user);
    }

    passwordResetsStore.delete(cleanEmail);

    res.json({
      success: true,
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.'
    });
  });

  // Current session info
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'Sessão expirada ou não autenticada' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gymId: user.gymId,
        gymSlug: user.gymSlug,
        gymName: user.gymName,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  });

  // Check Supabase Backend Status & Credentials readiness
  app.get('/api/supabase/status', (req: Request, res: Response) => {
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase.co'));

    res.json({
      isConfigured,
      url: supabaseUrl ? supabaseUrl.replace(/:[^@]+@/, ':***@') : null,
      hasAnonKey: Boolean(supabaseAnonKey),
      hasServiceKey,
      status: isConfigured ? 'connected' : 'not_configured',
      message: isConfigured
        ? 'Variáveis de ambiente do Supabase detectadas no servidor.'
        : 'Supabase ainda não configurado no .env. Use o assistente na interface para conectar ou ver o SQL de migração.'
    });
  });

  app.post('/api/supabase/config', (req: Request, res: Response) => {
    const { url, key } = req.body;
    if (!url || !key) {
      res.status(400).json({ success: false, message: 'URL e Chave são obrigatórios' });
      return;
    }
    
    dynamicSupabaseConfig = { url, key };
    console.log('[GymFlow Supabase] Configuração atualizada via API:', url);
    
    // Trigger sync in background
    syncGymsFromSupabase().catch(err => {
      console.error('[GymFlow Supabase] Sync failed after config update:', err);
    });
    
    res.json({ success: true, message: 'Configuração do servidor atualizada!' });
  });

  app.post('/api/supabase/test', async (req: Request, res: Response) => {
    const { url, key } = req.body;
    
    console.log('[GymFlow Supabase Test] Recebida tentativa de conexão:', { url });

    if (!url || !key) {
      console.warn('[GymFlow Supabase Test] Falha: URL ou Chave ausentes');
      res.status(400).json({ success: false, message: 'URL e Chave são obrigatórios' });
      return;
    }

    try {
      const supabase = createClient(url, key, {
        auth: { persistSession: false }
      });
      
      console.log('[GymFlow Supabase Test] Chamando select no Supabase...');
      const { data, error } = await supabase.from('gyms').select('id').limit(1);
      
      if (error) {
        console.error('[GymFlow Supabase Test] Erro do Supabase:', error);
        
        // Table doesn't exist (Connected but no schema)
        if (error.code === '42P01' || error.message?.includes('relation "public.gyms" does not exist')) {
          res.json({ 
            success: true, 
            connected: true, 
            needsSchema: true, 
            message: 'CONECTADO! O projeto foi encontrado, mas as tabelas não foram criadas. Clique na aba "Script SQL" e execute o código no Supabase.' 
          });
          return;
        }

        // Auth error
        if (error.code === '401' || error.code === 'PGRST301' || error.message?.includes('JWT')) {
          res.status(401).json({ 
            success: false, 
            connected: false, 
            message: 'Erro de Autenticação: A "Anon Key" informada é inválida ou expirou.' 
          });
          return;
        }

        res.status(400).json({ success: false, connected: false, message: `Erro ${error.code}: ${error.message}` });
        return;
      }
      
      console.log('[GymFlow Supabase Test] Sucesso total!');
      res.json({ success: true, connected: true, needsSchema: false, message: 'CONEXÃO TOTAL! Supabase conectado e tabelas prontas para uso.' });
    } catch (err: any) {
      console.error('[GymFlow Supabase Test] Erro crítico de exceção:', err);
      res.status(500).json({ success: false, message: `Erro interno no servidor: ${err.message}` });
    }
  });

  // ==========================================
  // SAAS MULTI-TENANT GYM MANAGEMENT
  // ==========================================

  // 1. List all gyms (for directory, switcher, discovery)
  app.get('/api/gyms', (req: Request, res: Response) => {
    const list = Array.from(gymsStore.values()).map(g => {
      const hours = getGymTodayHours(g.profile.operatingHours);
      const isEsp32Alive = g.esp32.lastPing
        ? (Date.now() - new Date(g.esp32.lastPing).getTime()) < 45000
        : false;

      return {
        id: g.profile.id,
        slug: g.profile.slug,
        name: g.profile.name,
        slogan: g.profile.slogan,
        city: g.profile.city,
        neighborhood: g.profile.neighborhood,
        address: g.profile.address,
        themeColor: g.profile.themeColor,
        logoEmoji: g.profile.logoEmoji,
        maxCapacity: g.maxCapacity,
        currentCount: g.currentCount,
        percentage: Math.min(100, Math.round((g.currentCount / g.maxCapacity) * 100)),
        status: calculateStatus(g.currentCount, g.maxCapacity),
        isOpen: g.isOpen,
        turnstileLocked: g.turnstileLocked,
        openingTimeToday: hours.open,
        closingTimeToday: hours.close,
        esp32Connected: isEsp32Alive,
        createdAt: g.profile.createdAt
      };
    });

    res.json({ gyms: list });
  });

  // 2. Register a new Gym (SaaS Signup)
  app.post('/api/gyms/register', (req: Request, res: Response) => {
    const body: CreateGymInput = req.body;

    if (!body.name || !body.slug) {
      res.status(400).json({ success: false, message: 'Nome da academia e slug/link são obrigatórios.' });
      return;
    }

    const cleanSlug = body.slug
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug is already taken
    for (const existing of gymsStore.values()) {
      if (existing.profile.slug === cleanSlug) {
        res.status(409).json({
          success: false,
          message: `O link/slug '${cleanSlug}' já está em uso por outra academia. Por favor escolha outro.`
        });
        return;
      }
    }

    const gymId = `gym-${cleanSlug}-${Date.now().toString(36)}`;
    const apiKey = generateApiKey(cleanSlug);

    const defaultHours: GymOperatingHours = body.operatingHours || {
      weekdays: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '07:00', close: '17:00', isOpen: true },
      sunday: { open: '08:00', close: '14:00', isOpen: true }
    };

    const newProfile: GymProfile = {
      id: gymId,
      slug: cleanSlug,
      name: body.name.trim(),
      slogan: body.slogan?.trim() || 'Monitoramento de Lotação em Tempo Real',
      city: body.city?.trim() || 'Brasil',
      neighborhood: body.neighborhood?.trim() || 'Unidade Principal',
      address: body.address?.trim() || '',
      contactPhone: body.contactPhone?.trim() || '',
      maxCapacity: Math.max(10, Math.min(1000, Number(body.maxCapacity) || 80)),
      currentCount: Math.max(0, typeof body.initialCount === 'number' ? body.initialCount : 0),
      turnstileLocked: false,
      isOpen: true,
      themeColor: body.themeColor || 'cyan',
      logoEmoji: body.logoEmoji || '⚡',
      apiKey,
      ownerName: body.ownerName?.trim() || 'Gestor Responsável',
      ownerEmail: body.ownerEmail?.trim() || 'contato@academia.com',
      createdAt: new Date().toISOString(),
      operatingHours: defaultHours
    };

    const newGymState: GymServerState = {
      profile: newProfile,
      currentCount: newProfile.currentCount,
      maxCapacity: newProfile.maxCapacity,
      turnstileLocked: false,
      isOpen: true,
      lastAccessTime: new Date().toISOString(),
      lastAccessType: 'entry',
      pendingRelayTrigger: null,
      esp32: {
        connected: false,
        lastPing: null,
        ip: '192.168.1.100',
        rssi: -60,
        uptimeSeconds: 0,
        freeHeap: 185000,
        entryButtonPresses: 0,
        exitButtonPresses: 0,
        deviceName: `ESP32_CATRACA_${cleanSlug.toUpperCase().replace(/-/g, '_')}`
      },
      accessLogs: [
        {
          id: `log-${gymId}-init`,
          gymId,
          timestamp: new Date().toISOString(),
          type: 'manual_adjust',
          source: 'reception_manual',
          description: `Academia ${newProfile.name} cadastrada com sucesso no GymFlow SaaS!`,
          countAfter: newProfile.currentCount,
          status: 'success'
        }
      ],
      announcements: [
        {
          id: `ann-${gymId}-welcome`,
          gymId,
          title: `Bem-vindos ao Monitor em Tempo Real da ${newProfile.name}!`,
          content: `Agora você pode consultar o fluxo da academia e horários ideais para treinar diretamente pelo celular. Acesse o link ou escaneie o QR Code na recepção.`,
          category: 'novidade',
          priority: 'high',
          date: new Date().toLocaleDateString('pt-BR'),
          author: newProfile.ownerName,
          pinned: true,
          active: true
        }
      ]
    };

    gymsStore.set(gymId, newGymState);

    // Save gym owner user in auth store
    const ownerUserId = `user-${cleanSlug}-owner`;
    const ownerUserRecord: GymUserRecord = {
      id: ownerUserId,
      email: newProfile.ownerEmail.toLowerCase(),
      password: body.ownerPassword?.trim() || 'password123',
      name: newProfile.ownerName,
      role: 'owner',
      gymId: newProfile.id,
      gymSlug: newProfile.slug,
      gymName: newProfile.name,
      phone: newProfile.contactPhone,
      createdAt: newProfile.createdAt
    };
    usersStore.set(newProfile.ownerEmail.toLowerCase(), ownerUserRecord);

    const authToken = `GF_AUTH_${ownerUserId}_${Date.now().toString(36)}`;
    activeTokensStore.set(authToken, ownerUserRecord);

    // Register SaaS subscription account for new gym (15 days trial)
    const planConfig = saasPlansStore.get('starter') || SAAS_PLANS.starter;
    const trialDueDate = new Date();
    trialDueDate.setDate(trialDueDate.getDate() + 15);
    const trialDueDateStr = trialDueDate.toISOString().split('T')[0];

    const initialInvoice: SaaSInvoice = {
      id: `inv-${gymId}-${Date.now().toString(36)}`,
      gymId,
      gymName: newProfile.name,
      amount: planConfig.price,
      dueDate: trialDueDateStr,
      status: 'pending',
      referenceMonth: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
      notes: 'Primeira mensalidade pós-período de testes de 15 dias'
    };

    saasAccountsStore.set(gymId, {
      gymId,
      gymSlug: newProfile.slug,
      gymName: newProfile.name,
      ownerName: newProfile.ownerName,
      ownerEmail: newProfile.ownerEmail,
      ownerPhone: newProfile.contactPhone,
      city: newProfile.city,
      plan: 'starter',
      planName: planConfig.name,
      monthlyFee: planConfig.price,
      status: 'trial',
      isSystemBlocked: false,
      blockReason: undefined,
      blockedAt: null,
      turnstilesLimit: planConfig.turnstilesLimit,
      maxCapacity: newProfile.maxCapacity,
      lastPaymentDate: null,
      nextDueDate: trialDueDateStr,
      trialEndsAt: trialDueDateStr,
      createdAt: newProfile.createdAt,
      apiKey: newProfile.apiKey,
      invoices: [initialInvoice]
    });

    const authUser: AuthUser = {
      id: ownerUserId,
      email: newProfile.ownerEmail,
      name: newProfile.ownerName,
      role: 'owner',
      gymId: newProfile.id,
      gymSlug: newProfile.slug,
      gymName: newProfile.name,
      phone: newProfile.contactPhone,
      token: authToken,
      createdAt: newProfile.createdAt
    };

    // Persist registered gym, owner user, and SaaS account to storage and Supabase
    saveGymsToFile();
    persistGymStateToSupabase(gymId, newGymState.accessLogs[0]);
    persistSaaSAccountToSupabase(gymId, initialInvoice);

    res.status(201).json({
      success: true,
      message: 'Academia cadastrada com sucesso!',
      gym: newProfile,
      publicStudentUrl: `/gym/${cleanSlug}`,
      apiKey,
      user: authUser,
      token: authToken
    });
  });

  // 3. Get single gym profile & real-time occupancy (by id or slug)
  app.get('/api/gyms/:gymIdOrSlug', (req: Request, res: Response) => {
    let gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      gymState = getDefaultGymState();
    }
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada.' });
      return;
    }

    const isAuthorized = isAuthorizedForGym(req, gymState);
    const blockCheck = isGymSystemBlocked(gymState.profile.id);
    const hours = getGymTodayHours(gymState.profile.operatingHours);
    const percentage = Math.min(100, Math.round((gymState.currentCount / gymState.maxCapacity) * 100));
    const status = calculateStatus(gymState.currentCount, gymState.maxCapacity);

    const isEsp32Alive = gymState.esp32.lastPing
      ? (Date.now() - new Date(gymState.esp32.lastPing).getTime()) < 45000
      : false;

    // Sanitize profile if unauthorized (student / public / cross-tenant view)
    const sanitizedProfile: GymProfile = isAuthorized
      ? gymState.profile
      : {
          ...gymState.profile,
          apiKey: '***CHAVE_PRIVADA_RESTRITA***',
          ownerEmail: 'gestao@privado'
        };

    res.json({
      profile: sanitizedProfile,
      occupancy: {
        gymId: gymState.profile.id,
        gymName: gymState.profile.name,
        gymSlug: gymState.profile.slug,
        themeColor: gymState.profile.themeColor,
        logoEmoji: gymState.profile.logoEmoji,
        slogan: gymState.profile.slogan,
        city: gymState.profile.city,
        neighborhood: gymState.profile.neighborhood,
        currentCount: gymState.currentCount,
        maxCapacity: gymState.maxCapacity,
        status,
        percentage,
        turnstileLocked: gymState.turnstileLocked,
        isOpen: gymState.isOpen,
        isSystemBlocked: blockCheck.blocked,
        blockReason: blockCheck.reason,
        openingTimeToday: hours.open,
        closingTimeToday: hours.close,
        lastAccessTime: gymState.lastAccessTime,
        lastAccessType: gymState.lastAccessType,
        esp32Connected: isEsp32Alive,
        esp32LastPing: isAuthorized ? gymState.esp32.lastPing : null,
        esp32DeviceName: isAuthorized ? gymState.esp32.deviceName : `ESP32_CATRACA_${gymState.profile.slug.toUpperCase()}`,
        esp32Ip: isAuthorized ? gymState.esp32.ip : '192.168.*.*',
        pendingRelayTrigger: isAuthorized ? gymState.pendingRelayTrigger : null
      },
      announcements: gymState.announcements,
      // STRICT MULTI-TENANT RULE: Only authorized staff/owner sees private access logs!
      accessLogs: isAuthorized ? gymState.accessLogs : []
    });
  });

  // 4. Update Gym Settings / Customization
  app.post('/api/gyms/:gymIdOrSlug/settings', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada.' });
      return;
    }

    if (!isAuthorizedForGym(req, gymState)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado: Você não tem permissão para alterar as configurações de outra academia.'
      });
      return;
    }

    const {
      name,
      slogan,
      maxCapacity,
      isOpen,
      themeColor,
      logoEmoji,
      city,
      neighborhood,
      address,
      contactPhone,
      operatingHours
    } = req.body;

    console.log(`[GymFlow API] Atualizando configurações para ${req.params.gymIdOrSlug}:`, req.body);

    if (name) gymState.profile.name = name.trim();
    if (slogan !== undefined) gymState.profile.slogan = slogan.trim();
    if (city) gymState.profile.city = city.trim();
    if (neighborhood !== undefined) gymState.profile.neighborhood = neighborhood.trim();
    if (address !== undefined) gymState.profile.address = address.trim();
    if (contactPhone !== undefined) gymState.profile.contactPhone = contactPhone.trim();
    if (themeColor) gymState.profile.themeColor = themeColor;
    if (logoEmoji) gymState.profile.logoEmoji = logoEmoji;
    if (operatingHours) gymState.profile.operatingHours = operatingHours;

    if (typeof maxCapacity === 'number' && maxCapacity > 0) {
      gymState.maxCapacity = Math.min(1000, Math.max(10, maxCapacity));
      gymState.profile.maxCapacity = gymState.maxCapacity;
    }

    if (typeof isOpen === 'boolean') {
      gymState.isOpen = isOpen;
      gymState.profile.isOpen = isOpen;
    }

    // Persist to Supabase if configured - Don't await to not block the response
    persistGymStateToSupabase(gymState.profile.id).catch(err => {
      console.warn('[GymFlow Supabase] Falha silenciosa na persistência:', err);
    });
    
    // Save to local file as backup
    saveGymsToFile();

    console.log(`[GymFlow API] Configurações de ${gymState.profile.name} salvas com sucesso.`);

    res.json({
      success: true,
      message: 'Configurações da academia atualizadas com sucesso!',
      profile: gymState.profile,
      maxCapacity: gymState.maxCapacity,
      isOpen: gymState.isOpen
    });
  });

  // ==========================================
  // GYM TURNSTILE & RECEPTION ACTIONS
  // ==========================================

  app.post('/api/gyms/:gymIdOrSlug/turnstile/action', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada.' });
      return;
    }

    if (!isAuthorizedForGym(req, gymState)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado: Ações de catraca e recepção são exclusivas para a equipe desta academia.'
      });
      return;
    }

    const { action, value, notes, operator = 'Recepção' } = req.body;
    let message = '';
    let logType: AccessLog['type'] = 'manual_adjust';
    let status: AccessLog['status'] = 'success';

    switch (action) {
      case 'remote_unlock_entry':
        if (gymState.currentCount < gymState.maxCapacity) {
          gymState.currentCount += 1;
          gymState.lastAccessTime = new Date().toISOString();
          gymState.lastAccessType = 'entry';
          gymState.pendingRelayTrigger = 'entry';
          message = `Entrada liberada remotamente pela recepção (${operator})`;
          logType = 'entry';
        } else {
          status = 'warning';
          message = 'Aviso: Entrada autorizada pela recepção acima da capacidade máxima sugerida';
          gymState.currentCount += 1;
          gymState.pendingRelayTrigger = 'entry';
          logType = 'entry';
        }
        break;

      case 'remote_unlock_exit':
        if (gymState.currentCount > 0) {
          gymState.currentCount -= 1;
        }
        gymState.lastAccessTime = new Date().toISOString();
        gymState.lastAccessType = 'exit';
        gymState.pendingRelayTrigger = 'exit';
        message = `Saída liberada remotamente pela recepção (${operator})`;
        logType = 'exit';
        break;

      case 'toggle_lock':
        gymState.turnstileLocked = !gymState.turnstileLocked;
        message = gymState.turnstileLocked
          ? `Catracas TRAVADAS pela recepção (${operator})`
          : `Catracas DESTRAVADAS pela recepção (${operator})`;
        logType = gymState.turnstileLocked ? 'lock' : 'unlock';
        status = gymState.turnstileLocked ? 'warning' : 'success';
        break;

      case 'set_lock':
        gymState.turnstileLocked = Boolean(value);
        message = gymState.turnstileLocked ? 'Catracas Travadas' : 'Catracas Destravadas';
        logType = gymState.turnstileLocked ? 'lock' : 'unlock';
        break;

      case 'adjust_count':
        const delta = Number(value) || 0;
        gymState.currentCount = Math.max(0, Math.min(gymState.maxCapacity + 50, gymState.currentCount + delta));
        message = `Ajuste manual (${delta > 0 ? '+' + delta : delta}) por ${operator}`;
        logType = 'manual_adjust';
        break;

      case 'set_count':
        const exact = Number(value) || 0;
        gymState.currentCount = Math.max(0, Math.min(gymState.maxCapacity + 50, exact));
        message = `Contagem definida para ${exact} por ${operator}`;
        logType = 'manual_adjust';
        break;

      case 'reset_count':
        gymState.currentCount = 0;
        message = `Contagem ZERADA pela recepção (${operator})`;
        logType = 'reset';
        status = 'warning';
        break;

      case 'toggle_open':
        gymState.isOpen = !gymState.isOpen;
        gymState.profile.isOpen = gymState.isOpen;
        message = gymState.isOpen
          ? `Academia marcada como ABERTA pela recepção (${operator})`
          : `Academia marcada como FECHADA pela recepção (${operator})`;
        logType = 'manual_adjust';
        status = gymState.isOpen ? 'success' : 'warning';
        break;

      default:
        res.status(400).json({ success: false, message: 'Ação inválida' });
        return;
    }

    const log: AccessLog = {
      id: `log-${gymState.profile.id}-${Date.now()}`,
      gymId: gymState.profile.id,
      timestamp: new Date().toISOString(),
      type: logType,
      source: 'reception_manual',
      description: notes ? `${message} - Obs: ${notes}` : message,
      countAfter: gymState.currentCount,
      status
    };
    gymState.accessLogs.unshift(log);
    if (gymState.accessLogs.length > 50) gymState.accessLogs.pop();

    // Persist to Supabase
    persistGymStateToSupabase(gymState.profile.id, log);

    res.json({
      success: true,
      message,
      currentCount: gymState.currentCount,
      turnstileLocked: gymState.turnstileLocked,
      pendingRelayTrigger: gymState.pendingRelayTrigger
    });
  });

  // ==========================================
  // ESP32 HARDWARE INTEGRATION PER GYM
  // ==========================================

  // ESP32 Entry
  app.post('/api/gyms/:gymIdOrSlug/esp32/turnstile/entry', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada' });
      return;
    }

    const { source = 'esp32_button', clientIp } = req.body;

    // 1. Check if gym is globally blocked by SaaS Master Admin
    const blockCheck = isGymSystemBlocked(gymState.profile.id);
    if (blockCheck.blocked) {
      const log: AccessLog = {
        id: `log-${Date.now()}`,
        gymId: gymState.profile.id,
        timestamp: new Date().toISOString(),
        type: 'entry',
        source: source === 'simulator' ? 'simulator' : 'esp32_button',
        description: `Tentativa de entrada bloqueada pelo SaaS Master: ${blockCheck.reason}`,
        countAfter: gymState.currentCount,
        status: 'blocked'
      };
      gymState.accessLogs.unshift(log);
      res.status(403).json({
        success: false,
        granted: false,
        blocked: true,
        message: blockCheck.reason || 'Catraca bloqueada: Assinatura da academia suspensa pelo Administrador do SaaS.',
        currentCount: gymState.currentCount
      });
      return;
    }

    if (gymState.turnstileLocked) {
      const log: AccessLog = {
        id: `log-${Date.now()}`,
        gymId: gymState.profile.id,
        timestamp: new Date().toISOString(),
        type: 'entry',
        source: source === 'simulator' ? 'simulator' : 'esp32_button',
        description: `Tentativa de entrada bloqueada: Catraca Travada (${gymState.profile.name})`,
        countAfter: gymState.currentCount,
        status: 'blocked'
      };
      gymState.accessLogs.unshift(log);
      res.status(403).json({
        success: false,
        granted: false,
        message: 'Catraca bloqueada pela administração',
        currentCount: gymState.currentCount
      });
      return;
    }

    if (gymState.currentCount >= gymState.maxCapacity) {
      const log: AccessLog = {
        id: `log-${Date.now()}`,
        gymId: gymState.profile.id,
        timestamp: new Date().toISOString(),
        type: 'entry',
        source: source === 'simulator' ? 'simulator' : 'esp32_button',
        description: `Tentativa de entrada: Lotação Máxima (${gymState.currentCount}/${gymState.maxCapacity})`,
        countAfter: gymState.currentCount,
        status: 'warning'
      };
      gymState.accessLogs.unshift(log);
      res.status(429).json({
        success: false,
        granted: false,
        message: 'Lotação máxima atingida',
        currentCount: gymState.currentCount
      });
      return;
    }

    gymState.currentCount += 1;
    gymState.lastAccessTime = new Date().toISOString();
    gymState.lastAccessType = 'entry';
    gymState.esp32.entryButtonPresses += 1;
    if (clientIp) gymState.esp32.ip = clientIp;
    gymState.esp32.lastPing = new Date().toISOString();

    const log: AccessLog = {
      id: `log-${Date.now()}`,
      gymId: gymState.profile.id,
      timestamp: gymState.lastAccessTime,
      type: 'entry',
      source: source === 'simulator' ? 'simulator' : 'esp32_button',
      description: source === 'simulator'
        ? `Acesso via Simulador (${gymState.profile.name})`
        : `Acesso via Botão Físico Entrada (${gymState.profile.name})`,
      countAfter: gymState.currentCount,
      status: 'success'
    };
    gymState.accessLogs.unshift(log);
    if (gymState.accessLogs.length > 50) gymState.accessLogs.pop();

    // Persist to Supabase
    persistGymStateToSupabase(gymState.profile.id, log);

    res.json({
      success: true,
      granted: true,
      action: 'UNLOCK_RELAY_ENTRY',
      pulseMs: 1500,
      currentCount: gymState.currentCount,
      maxCapacity: gymState.maxCapacity,
      percentage: Math.round((gymState.currentCount / gymState.maxCapacity) * 100),
      message: 'Acesso autorizado - Bom treino!'
    });
  });

  // ESP32 Exit
  app.post('/api/gyms/:gymIdOrSlug/esp32/turnstile/exit', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada' });
      return;
    }

    const { source = 'esp32_button', clientIp } = req.body;
    if (gymState.currentCount > 0) {
      gymState.currentCount -= 1;
    }
    gymState.lastAccessTime = new Date().toISOString();
    gymState.lastAccessType = 'exit';
    gymState.esp32.exitButtonPresses += 1;
    if (clientIp) gymState.esp32.ip = clientIp;
    gymState.esp32.lastPing = new Date().toISOString();

    const log: AccessLog = {
      id: `log-${Date.now()}`,
      gymId: gymState.profile.id,
      timestamp: gymState.lastAccessTime,
      type: 'exit',
      source: source === 'simulator' ? 'simulator' : 'esp32_button',
      description: source === 'simulator'
        ? `Saída via Simulador (${gymState.profile.name})`
        : `Saída via Botão Físico Saída (${gymState.profile.name})`,
      countAfter: gymState.currentCount,
      status: 'success'
    };
    gymState.accessLogs.unshift(log);
    if (gymState.accessLogs.length > 50) gymState.accessLogs.pop();

    // Persist to Supabase
    persistGymStateToSupabase(gymState.profile.id, log);

    res.json({
      success: true,
      granted: true,
      action: 'UNLOCK_RELAY_EXIT',
      pulseMs: 1500,
      currentCount: gymState.currentCount,
      maxCapacity: gymState.maxCapacity,
      percentage: Math.round((gymState.currentCount / gymState.maxCapacity) * 100),
      message: 'Saída registrada - Até a próxima!'
    });
  });

  // ESP32 Heartbeat Ping
  app.post('/api/gyms/:gymIdOrSlug/esp32/ping', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada' });
      return;
    }

    const { ip, rssi, uptime, freeHeap, deviceName } = req.body;
    gymState.esp32.connected = true;
    gymState.esp32.lastPing = new Date().toISOString();
    if (ip) gymState.esp32.ip = ip;
    if (typeof rssi === 'number') gymState.esp32.rssi = rssi;
    if (typeof uptime === 'number') gymState.esp32.uptimeSeconds = uptime;
    if (typeof freeHeap === 'number') gymState.esp32.freeHeap = freeHeap;
    if (deviceName) gymState.esp32.deviceName = deviceName;

    // Persist Telemetry to Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase.from('esp32_devices').upsert({
        gym_id: gymState.profile.id,
        device_name: gymState.esp32.deviceName,
        device_key: req.headers['x-gym-key'] || 'default',
        ip_address: gymState.esp32.ip,
        rssi: gymState.esp32.rssi,
        uptime_seconds: gymState.esp32.uptimeSeconds,
        free_heap: gymState.esp32.freeHeap,
        entry_count: gymState.esp32.entryButtonPresses,
        exit_count: gymState.esp32.exitButtonPresses,
        last_ping: gymState.esp32.lastPing,
        status: 'online'
      }).then(({ error }) => {
        if (error) console.warn('[GymFlow Supabase] Erro ao persistir telemetria ESP32:', error.message);
      });
    }

    const command = gymState.pendingRelayTrigger;
    if (command) {
      gymState.pendingRelayTrigger = null;
    }

    res.json({
      success: true,
      timestamp: gymState.esp32.lastPing,
      gymName: gymState.profile.name,
      currentCount: gymState.currentCount,
      maxCapacity: gymState.maxCapacity,
      turnstileLocked: gymState.turnstileLocked,
      command: command || 'NONE',
      relayPulseMs: command ? 2000 : 0
    });
  });

  // Announcements CRUD per Gym
  app.get('/api/gyms/:gymIdOrSlug/announcements', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada' });
      return;
    }
    res.json({ announcements: gymState.announcements });
  });

  app.post('/api/gyms/:gymIdOrSlug/announcements', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada' });
      return;
    }

    if (!isAuthorizedForGym(req, gymState)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado: Apenas a administração desta academia pode criar comunicados.'
      });
      return;
    }

    const { title, content, category, priority, pinned, author } = req.body;
    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Título e conteúdo são obrigatórios' });
      return;
    }

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      gymId: gymState.profile.id,
      title,
      content,
      category: category || 'importante',
      priority: priority || 'medium',
      date: new Date().toLocaleDateString('pt-BR'),
      author: author || gymState.profile.name,
      pinned: Boolean(pinned),
      active: true
    };

    if (pinned) {
      gymState.announcements.unshift(newAnnouncement);
    } else {
      gymState.announcements.push(newAnnouncement);
    }

    saveGymsToFile();

    res.json({ success: true, announcement: newAnnouncement });
  });

  app.delete('/api/gyms/:gymIdOrSlug/announcements/:id', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Academia não encontrada' });
      return;
    }

    if (!isAuthorizedForGym(req, gymState)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado: Apenas a administração desta academia pode excluir comunicados.'
      });
      return;
    }

    gymState.announcements = gymState.announcements.filter(a => a.id !== req.params.id);
    saveGymsToFile();
    res.json({ success: true, message: 'Comunicado removido' });
  });

  // Dedicated Arduino C++ Code Generator for Gym
  app.get('/api/gyms/:gymIdOrSlug/arduino-code', (req: Request, res: Response) => {
    const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug) || getDefaultGymState();

    if (!gymState) {
      res.status(404).json({
        success: false,
        message: 'Nenhuma academia encontrada.'
      });
      return;
    }

    if (!isAuthorizedForGym(req, gymState)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado: O código Arduino e as chaves de API são exclusivos para a administração desta academia.'
      });
      return;
    }

    const hostUrl = req.query.serverUrl || 'http://192.168.1.100:3000';
    const wifiSSID = req.query.ssid || `${gymState.profile.name.replace(/\s+/g, '_').toUpperCase()}_WIFI`;
    const wifiPass = req.query.pass || 'senha_academia';
    const gymSlug = gymState.profile.slug;
    const apiKey = gymState.profile.apiKey;

    const inoCode = `/*
 * =========================================================================
 * GymFlow SaaS - Firmware ESP32 para Catraca de Academia
 * Academia: ${gymState.profile.name} (Slug: ${gymSlug})
 * Chave de Autenticação: ${apiKey}
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Library Manager: ArduinoJson v6 ou v7

// --- Configurações de Rede Wi-Fi & SaaS ---
const char* ssid          = "${wifiSSID}";
const char* password      = "${wifiPass}";
const char* serverBaseUrl = "${hostUrl}";
const char* gymSlug       = "${gymSlug}";
const char* apiKey        = "${apiKey}";

// --- Mapeamento de Pinos (GPIO) ---
const int PIN_BTN_ENTRY   = 18; // Botão Físico de Entrada
const int PIN_BTN_EXIT    = 19; // Botão Físico de Saída
const int PIN_RELAY_ENTRY = 22; // Relé Solenoide Entrada
const int PIN_RELAY_EXIT  = 23; // Relé Solenoide Saída
const int PIN_LED_STATUS  = 2;  // LED status integrado
const int PIN_BUZZER      = 4;  // Buzzer sonoro de confirmação

unsigned long lastEntryPress = 0;
unsigned long lastExitPress  = 0;
unsigned long lastHeartbeat  = 0;
const unsigned long DEBOUNCE_DELAY = 400; // ms
const unsigned long HEARTBEAT_INTERVAL = 10000; // 10s ping

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.printf("\\n=== GymFlow SaaS Controller - %s ===\\n", gymSlug);

  pinMode(PIN_BTN_ENTRY, INPUT_PULLUP);
  pinMode(PIN_BTN_EXIT, INPUT_PULLUP);
  pinMode(PIN_RELAY_ENTRY, OUTPUT);
  pinMode(PIN_RELAY_EXIT, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_RELAY_ENTRY, LOW);
  digitalWrite(PIN_RELAY_EXIT, LOW);
  digitalWrite(PIN_LED_STATUS, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_LED_STATUS, LOW);
    connectWiFi();
  } else {
    digitalWrite(PIN_LED_STATUS, HIGH);
  }

  // Entrada
  if (digitalRead(PIN_BTN_ENTRY) == LOW) {
    if (millis() - lastEntryPress > DEBOUNCE_DELAY) {
      lastEntryPress = millis();
      Serial.println("[ESP32] -> Botao Entrada Acionado!");
      sendAccessEvent("/esp32/turnstile/entry", PIN_RELAY_ENTRY);
    }
  }

  // Saída
  if (digitalRead(PIN_BTN_EXIT) == LOW) {
    if (millis() - lastExitPress > DEBOUNCE_DELAY) {
      lastExitPress = millis();
      Serial.println("[ESP32] <- Botao Saida Acionado!");
      sendAccessEvent("/esp32/turnstile/exit", PIN_RELAY_EXIT);
    }
  }

  // Heartbeat & Comandos da Recepção
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }

  delay(20);
}

void connectWiFi() {
  Serial.printf("Conectando ao Wi-Fi: %s\\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\n[Wi-Fi] Conectado com sucesso! IP: %s\\n", WiFi.localIP().toString().c_str());
  }
}

void sendAccessEvent(const char* actionPath, int relayPin) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(serverBaseUrl) + "/api/gyms/" + String(gymSlug) + String(actionPath);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Gym-Key", apiKey);

  StaticJsonDocument<200> doc;
  doc["source"] = "esp32_button";
  doc["deviceId"] = String("ESP32_") + String(gymSlug);
  doc["clientIp"] = WiFi.localIP().toString();

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  Serial.printf("[HTTP] POST %s -> Code: %d\\n", actionPath, httpCode);

  if (httpCode == 200) {
    triggerRelay(relayPin, 1500);
    beepSuccess();
  } else if (httpCode == 403) {
    Serial.println("[AVISO] Catraca Travada Remotamente pela Recepcao!");
    beepDenied();
  } else if (httpCode == 429) {
    Serial.println("[AVISO] Lotacao Maxima Atingida!");
    beepDenied();
  }
  http.end();
}

void triggerRelay(int relayPin, int durationMs) {
  digitalWrite(relayPin, HIGH);
  delay(durationMs);
  digitalWrite(relayPin, LOW);
}

void beepSuccess() {
  digitalWrite(PIN_BUZZER, HIGH); delay(120);
  digitalWrite(PIN_BUZZER, LOW);  delay(80);
  digitalWrite(PIN_BUZZER, HIGH); delay(120);
  digitalWrite(PIN_BUZZER, LOW);
}

void beepDenied() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_BUZZER, HIGH); delay(200);
    digitalWrite(PIN_BUZZER, LOW);  delay(100);
  }
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(serverBaseUrl) + "/api/gyms/" + String(gymSlug) + "/esp32/ping";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Gym-Key", apiKey);

  StaticJsonDocument<256> doc;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["deviceName"] = String("ESP32_") + String(gymSlug);

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<300> resDoc;
    deserializeJson(resDoc, response);
    const char* cmd = resDoc["command"];
    if (cmd && strcmp(cmd, "entry") == 0) {
      triggerRelay(PIN_RELAY_ENTRY, 2000);
      beepSuccess();
    } else if (cmd && strcmp(cmd, "exit") == 0) {
      triggerRelay(PIN_RELAY_EXIT, 2000);
      beepSuccess();
    }
  }
  http.end();
}
`;

    res.json({ code: inoCode, apiKey, gymSlug });
  });

  // ==========================================
  // BACKWARDS-COMPATIBLE FALLBACK ROUTES
  // (Proxying to the first / active gym)
  // ==========================================

  app.get('/api/occupancy', (req: Request, res: Response) => {
    const gymState = getDefaultGymState();
    if (!gymState) {
      res.json({
        gymId: '',
        gymName: 'Nenhuma Academia',
        gymSlug: '',
        themeColor: 'cyan',
        logoEmoji: '⚡',
        currentCount: 0,
        maxCapacity: 80,
        status: 'empty',
        percentage: 0,
        turnstileLocked: false,
        isOpen: false,
        openingTimeToday: '06:00',
        closingTimeToday: '23:00',
        lastAccessTime: null,
        lastAccessType: null,
        esp32Connected: false,
        esp32LastPing: null,
        esp32DeviceName: 'ESP32_CATRACA',
        esp32Ip: '192.168.1.100',
        pendingRelayTrigger: null
      });
      return;
    }
    const hours = getGymTodayHours(gymState.profile.operatingHours);
    const percentage = Math.min(100, Math.round((gymState.currentCount / gymState.maxCapacity) * 100));
    const status = calculateStatus(gymState.currentCount, gymState.maxCapacity);

    res.json({
      gymId: gymState.profile.id,
      gymName: gymState.profile.name,
      gymSlug: gymState.profile.slug,
      themeColor: gymState.profile.themeColor,
      logoEmoji: gymState.profile.logoEmoji,
      currentCount: gymState.currentCount,
      maxCapacity: gymState.maxCapacity,
      status,
      percentage,
      turnstileLocked: gymState.turnstileLocked,
      isOpen: gymState.isOpen,
      openingTimeToday: hours.open,
      closingTimeToday: hours.close,
      lastAccessTime: gymState.lastAccessTime,
      lastAccessType: gymState.lastAccessType,
      esp32Connected: Boolean(gymState.esp32.lastPing),
      esp32LastPing: gymState.esp32.lastPing,
      esp32DeviceName: gymState.esp32.deviceName,
      esp32Ip: gymState.esp32.ip,
      pendingRelayTrigger: gymState.pendingRelayTrigger
    });
  });

  app.post('/api/turnstile/action', (req: Request, res: Response) => {
    const gymState = getDefaultGymState();
    if (!gymState) {
      res.status(404).json({ success: false, message: 'Nenhuma academia cadastrada.' });
      return;
    }
    if (!isAuthorizedForGym(req, gymState)) {
      res.status(403).json({ success: false, message: 'Acesso não autorizado para esta academia.' });
      return;
    }
    // forward
    req.params.gymIdOrSlug = gymState.profile.id;
    // execute logic
    const { action, value, notes, operator = 'Recepção' } = req.body;
    if (action === 'remote_unlock_entry') {
      gymState.currentCount += 1;
      gymState.lastAccessTime = new Date().toISOString();
      gymState.lastAccessType = 'entry';
    } else if (action === 'remote_unlock_exit') {
      if (gymState.currentCount > 0) gymState.currentCount -= 1;
      gymState.lastAccessTime = new Date().toISOString();
      gymState.lastAccessType = 'exit';
    } else if (action === 'toggle_lock') {
      gymState.turnstileLocked = !gymState.turnstileLocked;
    } else if (action === 'adjust_count') {
      gymState.currentCount = Math.max(0, gymState.currentCount + (Number(value) || 0));
    } else if (action === 'set_count') {
      gymState.currentCount = Math.max(0, Number(value) || 0);
    } else if (action === 'reset_count') {
      gymState.currentCount = 0;
    }

    res.json({
      success: true,
      message: 'Ação executada',
      currentCount: gymState.currentCount,
      turnstileLocked: gymState.turnstileLocked
    });
  });

  app.get('/api/access-logs', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      res.json({ logs: [], totalEntriesToday: 0, totalExitsToday: 0 });
      return;
    }
    const gymState = getGymStateByIdOrSlug(user.gymSlug || user.gymId) || getDefaultGymState();
    if (!gymState || !isAuthorizedForGym(req, gymState)) {
      res.json({ logs: [], totalEntriesToday: 0, totalExitsToday: 0 });
      return;
    }

    res.json({
      logs: gymState.accessLogs,
      totalEntriesToday: gymState.esp32.entryButtonPresses,
      totalExitsToday: gymState.esp32.exitButtonPresses
    });
  });

  app.get('/api/announcements', (req: Request, res: Response) => {
    const gymState = getDefaultGymState();
    res.json({ announcements: gymState ? gymState.announcements : [] });
  });

  // =========================================================================
  // SAAS MASTER ADMIN (SUPERADMIN) ROUTES
  // Subscriptions, Invoices, Gym Registration & Cross-Gym Access Blocks
  // =========================================================================

  // 1. Get SaaS-wide executive metrics
  app.get('/api/saas/metrics', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const accounts = Array.from(saasAccountsStore.values());
    const totalGyms = accounts.length;
    const activeGyms = accounts.filter(a => a.status === 'active' && !a.isSystemBlocked).length;
    const blockedGyms = accounts.filter(a => a.isSystemBlocked || a.status === 'blocked').length;
    const overdueGyms = accounts.filter(a => a.status === 'overdue').length;
    const trialGyms = accounts.filter(a => a.status === 'trial').length;

    const totalMRR = accounts
      .filter(a => (a.status === 'active' || a.status === 'trial') && !a.isSystemBlocked)
      .reduce((sum, a) => sum + (Number(a.monthlyFee) || 0), 0);

    let totalRevenueThisMonth = 0;
    let pendingRevenue = 0;

    accounts.forEach(acc => {
      acc.invoices.forEach(inv => {
        if (inv.status === 'paid') {
          totalRevenueThisMonth += Number(inv.amount) || 0;
        } else if (inv.status === 'pending' || inv.status === 'overdue') {
          pendingRevenue += Number(inv.amount) || 0;
        }
      });
    });

    const delinquencyRate = totalGyms > 0 ? Math.round((overdueGyms / totalGyms) * 100) : 0;

    let totalStudentsOnline = 0;
    for (const gym of gymsStore.values()) {
      totalStudentsOnline += gym.currentCount || 0;
    }

    const metrics: SaaSMetrics = {
      totalGyms,
      activeGyms,
      blockedGyms,
      overdueGyms,
      trialGyms,
      totalMRR,
      totalRevenueThisMonth,
      pendingRevenue,
      delinquencyRate,
      totalStudentsOnline
    };

    res.json({ success: true, metrics });
  });

  // 2. Get list of all gym SaaS accounts with live operational status
  app.get('/api/saas/gyms', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    console.log(`[SaaS Master] Request from ${user?.email}, role: ${user?.role}. Current store size: ${saasAccountsStore.size}`);
    
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const list: GymSaaSAccount[] = [];
    for (const account of saasAccountsStore.values()) {
      const gymState = gymsStore.get(account.gymId);
      list.push({
        ...account,
        currentCount: gymState ? gymState.currentCount : 0,
        maxCapacity: gymState ? gymState.maxCapacity : account.maxCapacity,
        apiKey: account.apiKey
      });
    }

    res.json({ success: true, gyms: list });
  });

  // 3. Register new gym directly from SaaS Master Admin
  app.post('/api/saas/gyms', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const body = req.body as CreateSaaSGymInput;
    if (!body.name || !body.ownerEmail || !body.ownerName) {
      res.status(400).json({ success: false, message: 'Nome da academia, e-mail e nome do proprietário são obrigatórios.' });
      return;
    }

    const cleanSlug = (body.slug || body.name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    for (const g of gymsStore.values()) {
      if (g.profile.slug === cleanSlug) {
        res.status(409).json({ success: false, message: `O slug '${cleanSlug}' já está em uso por outra academia.` });
        return;
      }
    }

    const gymId = `gym-${cleanSlug}-${Date.now().toString(36)}`;
    const apiKey = `GF_LIVE_KEY_${cleanSlug.toUpperCase().replace(/-/g, '_')}_${Date.now().toString(36)}`;
    const selectedPlanId = body.plan || 'starter';
    const planConfig = SAAS_PLANS[selectedPlanId] || SAAS_PLANS.starter;
    const monthlyFee = typeof body.monthlyFee === 'number' ? body.monthlyFee : planConfig.price;
    const trialDays = typeof body.trialDays === 'number' ? body.trialDays : 15;

    const defaultHours: GymOperatingHours = {
      weekdays: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '08:00', close: '18:00', isOpen: true },
      sunday: { open: '08:00', close: '14:00', isOpen: true }
    };

    const newProfile: GymProfile = {
      id: gymId,
      name: body.name.trim(),
      slug: cleanSlug,
      slogan: body.slogan?.trim() || 'A sua melhor experiência de treino',
      city: body.city?.trim() || 'São Paulo - SP',
      neighborhood: body.neighborhood?.trim() || 'Centro',
      address: body.address?.trim() || 'Avenida Principal, 1000',
      contactPhone: body.contactPhone?.trim() || '(11) 98765-4321',
      maxCapacity: Number(body.maxCapacity) || 120,
      currentCount: 0,
      turnstileLocked: false,
      isOpen: true,
      themeColor: (body.themeColor as GymThemeColor) || 'cyan',
      logoEmoji: body.logoEmoji || '🏋️',
      operatingHours: defaultHours,
      apiKey,
      ownerEmail: body.ownerEmail.trim().toLowerCase(),
      ownerName: body.ownerName.trim(),
      createdAt: new Date().toISOString()
    };

    const newGymState: GymServerState = {
      profile: newProfile,
      currentCount: 0,
      maxCapacity: newProfile.maxCapacity,
      turnstileLocked: false,
      isOpen: true,
      lastAccessTime: null,
      lastAccessType: null,
      pendingRelayTrigger: null,
      esp32: {
        connected: false,
        lastPing: null,
        ip: '192.168.1.100',
        rssi: -60,
        uptimeSeconds: 0,
        freeHeap: 180000,
        entryButtonPresses: 0,
        exitButtonPresses: 0,
        deviceName: `ESP32_CATRACA_${cleanSlug.toUpperCase().replace(/-/g, '_')}`
      },
      accessLogs: [
        {
          id: `log-${gymId}-created`,
          gymId,
          timestamp: new Date().toISOString(),
          type: 'manual_adjust',
          source: 'reception_manual',
          description: `Academia ${newProfile.name} cadastrada via Master Admin SaaS!`,
          countAfter: 0,
          status: 'success'
        }
      ],
      announcements: [
        {
          id: `ann-${gymId}-welcome`,
          gymId,
          title: `Bem-vindos ao GymFlow da ${newProfile.name}!`,
          content: `Painel em tempo real ativo. Alunos e equipe agora contam com monitoramento de catraca e fluxo.`,
          category: 'novidade',
          priority: 'high',
          date: new Date().toLocaleDateString('pt-BR'),
          author: newProfile.ownerName,
          pinned: true,
          active: true
        }
      ]
    };

    gymsStore.set(gymId, newGymState);

    // Save owner user
    const ownerUserId = `user-${cleanSlug}-owner`;
    const ownerRecord: GymUserRecord = {
      id: ownerUserId,
      email: newProfile.ownerEmail.toLowerCase(),
      password: body.ownerPassword?.trim() || 'password123',
      name: newProfile.ownerName,
      role: 'owner',
      gymId: newProfile.id,
      gymSlug: newProfile.slug,
      gymName: newProfile.name,
      phone: newProfile.contactPhone,
      createdAt: newProfile.createdAt
    };
    usersStore.set(newProfile.ownerEmail.toLowerCase(), ownerRecord);
    
    // Save state immediately
    saveGymsToFile();

    const trialDueDate = new Date();
    trialDueDate.setDate(trialDueDate.getDate() + trialDays);
    const trialDueDateStr = trialDueDate.toISOString().split('T')[0];

    const initialInvoice: SaaSInvoice = {
      id: `inv-${gymId}-${Date.now().toString(36)}`,
      gymId,
      gymName: newProfile.name,
      amount: monthlyFee,
      dueDate: trialDueDateStr,
      status: 'pending',
      referenceMonth: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
      notes: `Fatura inicial do plano ${planConfig.name} (${trialDays} dias de teste).`
    };

    const saasAccount: SaaSServerAccount = {
      gymId,
      gymSlug: newProfile.slug,
      gymName: newProfile.name,
      ownerName: newProfile.ownerName,
      ownerEmail: newProfile.ownerEmail,
      ownerPhone: newProfile.contactPhone,
      city: newProfile.city,
      plan: selectedPlanId,
      planName: planConfig.name,
      monthlyFee,
      status: trialDays > 0 ? 'trial' : 'active',
      isSystemBlocked: false,
      blockReason: undefined,
      blockedAt: null,
      turnstilesLimit: planConfig.turnstilesLimit,
      maxCapacity: newProfile.maxCapacity,
      lastPaymentDate: null,
      nextDueDate: trialDueDateStr,
      trialEndsAt: trialDays > 0 ? trialDueDateStr : null,
      createdAt: newProfile.createdAt,
      apiKey: newProfile.apiKey,
      invoices: [initialInvoice]
    };
    saasAccountsStore.set(gymId, saasAccount);

    // Persist everything to file and Supabase
    saveGymsToFile();
    persistGymStateToSupabase(gymId, newGymState.accessLogs[0]);
    persistSaaSAccountToSupabase(gymId, initialInvoice);

    res.status(201).json({
      success: true,
      message: `Academia ${newProfile.name} cadastrada com sucesso com plano ${planConfig.name}!`,
      gym: { ...saasAccount, currentCount: 0 },
      profile: newProfile,
      apiKey
    });
  });

  // 4. Update SaaS plan / pricing / limits for a gym
  app.patch('/api/saas/gyms/:gymId/subscription', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const account = saasAccountsStore.get(req.params.gymId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Conta SaaS da academia não encontrada.' });
      return;
    }

    const { plan, monthlyFee, status, nextDueDate, turnstilesLimit } = req.body;
    if (plan) {
      account.plan = plan;
      const planConfig = SAAS_PLANS[plan as 'starter' | 'pro' | 'enterprise'];
      if (planConfig) {
        account.planName = planConfig.name;
        if (monthlyFee === undefined) account.monthlyFee = planConfig.price;
        if (turnstilesLimit === undefined) account.turnstilesLimit = planConfig.turnstilesLimit;
      }
    }
    if (typeof monthlyFee === 'number') account.monthlyFee = monthlyFee;
    if (status) account.status = status;
    if (nextDueDate) account.nextDueDate = nextDueDate;
    if (typeof turnstilesLimit === 'number') account.turnstilesLimit = turnstilesLimit;

    res.json({ success: true, message: 'Assinatura atualizada com sucesso!', account });
  });

  // 5. Block / Unblock gym access immediately
  app.post('/api/saas/gyms/:gymId/block', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const account = saasAccountsStore.get(req.params.gymId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Conta da academia não encontrada.' });
      return;
    }

    const { blocked, reason } = req.body;
    const isBlocking = Boolean(blocked);

    account.isSystemBlocked = isBlocking;
    account.blockReason = isBlocking
      ? (reason || 'Acesso suspenso pelo Administrador Geral do SaaS por pendência financeira ou administrativa.')
      : undefined;
    account.blockedAt = isBlocking ? new Date().toISOString() : null;
    account.status = isBlocking ? 'blocked' : (account.status === 'blocked' ? 'active' : account.status);

    // Apply immediate lock to gym state turnstile
    const gymState = gymsStore.get(account.gymId);
    if (gymState) {
      gymState.turnstileLocked = isBlocking;
      gymState.accessLogs.unshift({
        id: `log-${Date.now()}`,
        gymId: account.gymId,
        timestamp: new Date().toISOString(),
        type: isBlocking ? 'lock' : 'unlock',
        source: 'reception_manual',
        description: isBlocking
          ? `[SaaS Master] Academia e catracas suspensas pelo Administrador Geral: ${account.blockReason}`
          : `[SaaS Master] Academia e catracas reativadas pelo Administrador Geral.`,
        countAfter: gymState.currentCount,
        status: isBlocking ? 'blocked' : 'success'
      });
    }

    res.json({
      success: true,
      message: isBlocking
        ? `Academia '${account.gymName}' foi BLOQUEADA com sucesso. Catracas e acessos foram suspensos!`
        : `Academia '${account.gymName}' foi DESBLOQUEADA e reativada com sucesso!`,
      account
    });
  });

  // 6. Record invoice payment
  app.post('/api/saas/gyms/:gymId/invoices/:invoiceId/pay', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const account = saasAccountsStore.get(req.params.gymId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Conta da academia não encontrada.' });
      return;
    }

    const invoice = account.invoices.find(i => i.id === req.params.invoiceId);
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Fatura não encontrada.' });
      return;
    }

    const { paymentMethod = 'pix', notes } = req.body;
    invoice.status = 'paid';
    invoice.paidDate = new Date().toISOString();
    invoice.paymentMethod = paymentMethod;
    if (notes) invoice.notes = notes;

    account.lastPaymentDate = invoice.paidDate;
    if (account.status === 'overdue' || account.status === 'trial') {
      account.status = 'active';
    }

    // Auto-advance next due date by 30 days
    const currentDue = new Date(account.nextDueDate || Date.now());
    currentDue.setDate(currentDue.getDate() + 30);
    account.nextDueDate = currentDue.toISOString().split('T')[0];

    // Auto unblock if desired
    if (account.isSystemBlocked && req.body.unblockGym) {
      account.isSystemBlocked = false;
      account.blockReason = undefined;
      const gymState = gymsStore.get(account.gymId);
      if (gymState) {
        gymState.turnstileLocked = false;
      }
    }

    res.json({
      success: true,
      message: `Pagamento da fatura de R$ ${invoice.amount} registrado com sucesso (${paymentMethod.toUpperCase()})!`,
      invoice,
      account
    });
  });

  // 7. Add manual invoice
  app.post('/api/saas/gyms/:gymId/invoices', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const account = saasAccountsStore.get(req.params.gymId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Conta da academia não encontrada.' });
      return;
    }

    const { amount, dueDate, referenceMonth, notes } = req.body;
    const newInvoice: SaaSInvoice = {
      id: `inv-${account.gymId}-${Date.now().toString(36)}`,
      gymId: account.gymId,
      gymName: account.gymName,
      amount: Number(amount) || account.monthlyFee,
      dueDate: dueDate || account.nextDueDate,
      status: 'pending',
      referenceMonth: referenceMonth || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
      notes: notes || 'Fatura avulsa gerada pelo Administrador Master'
    };

    account.invoices.unshift(newInvoice);
    res.status(201).json({
      success: true,
      message: 'Nova fatura emitida com sucesso!',
      invoice: newInvoice,
      account
    });
  });

  // 8. Extend trial period
  app.post('/api/saas/gyms/:gymId/extend-trial', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    const account = saasAccountsStore.get(req.params.gymId);
    if (!account) {
      res.status(404).json({ success: false, message: 'Conta da academia não encontrada.' });
      return;
    }

    const { days = 15 } = req.body;
    const targetDate = new Date(account.trialEndsAt || account.nextDueDate || Date.now());
    targetDate.setDate(targetDate.getDate() + Number(days));
    const newDateStr = targetDate.toISOString().split('T')[0];

    account.trialEndsAt = newDateStr;
    account.nextDueDate = newDateStr;
    account.status = 'trial';
    account.isSystemBlocked = false;

    res.json({
      success: true,
      message: `Período de teste prorrogado por +${days} dias (até ${newDateStr})!`,
      account
    });
  });

  // 9. Delete Gym
  app.delete('/api/saas/gyms/:gymId', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Administrador Geral do SaaS.' });
      return;
    }

    saasAccountsStore.delete(req.params.gymId);
    gymsStore.delete(req.params.gymId);
    saveGymsToFile();

    const supabase = getSupabaseAdmin();
    if (supabase) {
      Promise.resolve(supabase.from('gyms').delete().eq('id', req.params.gymId)).catch(console.warn);
      Promise.resolve(supabase.from('saas_accounts').delete().eq('gym_id', req.params.gymId)).catch(console.warn);
    }

    res.json({ success: true, message: 'Academia removida permanentemente do SaaS.' });
  });

  // SaaS Plan Management (SuperAdmin only)
  app.get('/api/saas/plans', (req: Request, res: Response) => {
    res.json({ plans: Array.from(saasPlansStore.values()) });
  });

  app.post('/api/saas/plans/:planId', (req: Request, res: Response) => {
    const user = getAuthUserFromRequest(req);
    if (!user || user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Acesso negado: Apenas o Administrador Geral pode editar planos.' });
      return;
    }

    const { planId } = req.params;
    const planUpdate: Partial<SaaSPlanConfig> = req.body;
    
    const existing = saasPlansStore.get(planId);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Plano não encontrado.' });
      return;
    }

    const updated = { ...existing, ...planUpdate };
    saasPlansStore.set(planId, updated);

    // Also update current account plan names and fees for those on this plan if they were default
    for (const account of saasAccountsStore.values()) {
      if (account.plan === planId) {
        account.planName = updated.name;
        // Note: we might not want to update monthlyFee for existing accounts automatically, 
        // but for this demo let's keep them in sync if requested or just leave it.
      }
    }

    res.json({
      success: true,
      message: `Plano ${updated.name} atualizado com sucesso!`,
      plan: updated
    });
  });

  // ==========================================
  // API FALLBACK & ERROR HANDLERS
  // (Ensures all /api and /api/* requests ALWAYS return JSON, never HTML)
  // ==========================================
  app.all(['/api', '/api/*'], (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Rota da API não encontrada: ${req.method} ${req.path}`
    });
  });

  app.use((err: any, req: Request, res: Response, next: any) => {
    if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
      console.error('[GymFlow API Error]', err);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor da API.',
        error: err?.message || 'Internal Server Error'
      });
      return;
    }
    next(err);
  });

  // ==========================================
  // SERVER BOOTSTRAP (STANDALONE & DEV MODE)
  // ==========================================
  async function startServer() {
    if (process.env.NODE_ENV !== 'production' && !isServerless) {
      const vitePkg = 'vite';
      const viteModule = await import(/* @vite-ignore */ vitePkg);
      const createViteServer = viteModule.createServer;
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else if (!isServerless) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // Sync from Supabase in background
    syncGymsFromSupabase().catch(err => {
      console.error('[GymFlow Supabase] Initial sync failed:', err);
    });

    if (!isServerless) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[GymFlow SaaS Server] Running on http://localhost:${PORT}`);
      });
    }
  }

  if (!isServerless) {
    startServer().catch(err => {
      console.error('[GymFlow SaaS Server] Failed to start:', err);
    });
  }

  export default app;
