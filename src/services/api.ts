import { OccupancyData, AccessLog, Announcement, DayCrowdStats, GymProfile, CreateGymInput, AuthUser, LoginCredentials, PasswordResetRequest, SupabaseConfigStatus } from '../types';
import { WEEKLY_CROWD_DATA, INITIAL_ANNOUNCEMENTS, INITIAL_GYMS, SAAS_PLANS } from '../data/gymData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

// ==========================================
// AUTHENTICATION & SESSION MANAGEMENT
// ==========================================

const AUTH_USER_KEY = 'gymflow_auth_user';
const AUTH_TOKEN_KEY = 'gymflow_auth_token';

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession(user: AuthUser, token?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Safely parses HTTP response as JSON.
 * Protects against non-OK HTML pages (e.g. 404, 502, "The page cannot be found")
 * or non-JSON payloads, preventing:
 * SyntaxError: Unexpected token 'T', "The page c"... is not valid JSON
 */
async function parseJsonResponse<T>(res: Response, fallback: T): Promise<T> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      console.warn('[GymFlow API] Resposta recebida não é JSON:', res.status, contentType, text.slice(0, 100));
      return fallback;
    }
    const text = await res.text();
    if (!text || !text.trim()) {
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn('[GymFlow API] Erro ao decodificar JSON:', err);
    return fallback;
  }
}

export async function loginUser(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: AuthUser; token?: string }> {
  const cleanEmail = (credentials.email || '').trim().toLowerCase();
  const cleanPass = (credentials.password || '').trim();
  const isMasterAdminCreds = cleanEmail === 'admin@gymflow.com' && (cleanPass === 'admin123' || cleanPass === 'password123');

  // If Supabase is connected, optionally try Supabase Auth first, fallback to API
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });
      if (data?.user && !error) {
        // Fetch matching gym profile from Supabase
        const { data: gymData } = await supabase
          .from('gyms')
          .select('*')
          .eq('owner_email', cleanEmail)
          .maybeSingle();

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.full_name || gymData?.name || 'Gestor da Academia',
          role: isMasterAdminCreds ? 'superadmin' : 'owner',
          gymId: gymData?.id || 'gym-custom',
          gymSlug: gymData?.slug || 'minha-academia',
          gymName: gymData?.name || 'Minha Academia',
          token: data.session?.access_token,
          createdAt: data.user.created_at
        };
        saveAuthSession(authUser, data.session?.access_token);
        return { success: true, message: `Bem-vindo(a) via Supabase, ${authUser.name}!`, user: authUser, token: data.session?.access_token };
      }
    } catch (err) {
      console.warn('Tentando autenticação via servidor GymFlow...', err);
    }
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (res.ok) {
      const data = await parseJsonResponse<{ success: boolean; message: string; user?: AuthUser; token?: string }>(res, {
        success: false,
        message: 'Resposta inválida do servidor.'
      });
      if (data.success && data.user) {
        saveAuthSession(data.user, data.token);
        return data;
      }
    }

    // If server returned 401 with specific message and not master admin
    if (!res.ok && !isMasterAdminCreds) {
      const data = await parseJsonResponse<{ success: boolean; message: string }>(res, {
        success: false,
        message: `Servidor da aplicação indisponível ou erro HTTP (${res.status}).`
      });
      return { success: false, message: data.message };
    }
  } catch (err: any) {
    console.warn('Falha na requisição ao backend de autenticação:', err);
  }

  // Graceful Local Fallback for SuperAdmin (Master SaaS)
  if (isMasterAdminCreds) {
    const masterUser: AuthUser = {
      id: 'user-master-superadmin-1',
      email: 'admin@gymflow.com',
      name: 'Administrador Geral SaaS',
      role: 'superadmin',
      gymId: 'saas-root',
      gymSlug: 'master-saas',
      gymName: 'GymFlow SaaS Master Hub',
      phone: '(11) 99999-0000',
      token: `GF_AUTH_user-master-superadmin-1_${Date.now().toString(36)}`,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    saveAuthSession(masterUser, masterUser.token);
    return {
      success: true,
      message: 'Bem-vindo ao Painel Master SaaS (SuperAdmin)!',
      user: masterUser,
      token: masterUser.token
    };
  }

  // Fallback for default demo gym manager (carlos@fitflow.com.br)
  if (cleanEmail === 'carlos@fitflow.com.br' && (cleanPass === 'password123' || cleanPass === 'admin123')) {
    const demoUser: AuthUser = {
      id: 'user-carlos-demo',
      email: 'carlos@fitflow.com.br',
      name: 'Carlos Henrique Gestor',
      role: 'owner',
      gymId: 'gym-fitflow-moema',
      gymSlug: 'fitflow-moema',
      gymName: 'FitFlow Club Moema',
      phone: '(11) 98765-4321',
      token: `GF_AUTH_user-carlos-demo_${Date.now().toString(36)}`,
      createdAt: '2026-08-29T14:47:46.393Z'
    };
    saveAuthSession(demoUser, demoUser.token);
    return {
      success: true,
      message: 'Bem-vindo, Carlos Henrique Gestor!',
      user: demoUser,
      token: demoUser.token
    };
  }

  return {
    success: false,
    message: 'Credenciais inválidas. Verifique o e-mail e senha digitados.'
  };
}

export async function requestPasswordRecovery(email: string): Promise<{ success: boolean; message: string; previewCode?: string; email?: string }> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (!error) {
        return {
          success: true,
          message: `E-mail de recuperação enviado pelo Supabase Auth para ${email}. Verifique sua caixa de entrada.`
        };
      }
    } catch (err) {
      console.warn('Usando recuperação via servidor local:', err);
    }
  }

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível solicitar código de recuperação neste momento.'
    });
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro ao solicitar código de recuperação. Verifique sua conexão.'
    };
  }
}

export async function resetPasswordWithCode(payload: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível redefinir a senha neste momento.'
    });
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro ao redefinir senha. Tente novamente.'
    };
  }
}

export async function checkSupabaseStatus(): Promise<SupabaseConfigStatus> {
  const fallbackStatus: SupabaseConfigStatus = {
    isConfigured: isSupabaseConfigured(),
    hasAnonKey: isSupabaseConfigured(),
    status: isSupabaseConfigured() ? 'connected' : 'not_configured',
    message: 'Status verificado localmente.'
  };

  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) return fallbackStatus;
    return await parseJsonResponse(res, fallbackStatus);
  } catch {
    return fallbackStatus;
  }
}

function mapSupabaseGymRow(row: any): GymProfile {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    slogan: row.slogan || 'Monitoramento de Lotação em Tempo Real',
    city: row.city || 'São Paulo - SP',
    neighborhood: row.neighborhood || 'Centro',
    address: row.address || '',
    contactPhone: row.contact_phone || '',
    maxCapacity: Number(row.max_capacity) || 80,
    currentCount: Number(row.current_count) || 0,
    turnstileLocked: Boolean(row.turnstile_locked),
    isOpen: row.is_open !== false,
    themeColor: row.theme_color || 'cyan',
    visualTheme: row.visual_theme || 'dark',
    logoEmoji: row.logo_emoji || '⚡',
    operatingHours: row.operating_hours || {
      weekdays: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '07:00', close: '17:00', isOpen: true },
      sunday: { open: '08:00', close: '14:00', isOpen: true }
    },
    apiKey: row.api_key || '',
    ownerName: row.owner_name || '',
    ownerEmail: row.owner_email || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

const offlineFallbackNotified = new Set<string>();

export async function fetchGyms(): Promise<GymProfile[]> {
  try {
    const res = await fetch('/api/gyms');
    if (res.ok) {
      const data = await parseJsonResponse<{ gyms: GymProfile[] }>(res, { gyms: INITIAL_GYMS });
      if (data.gyms && data.gyms.length > 0) {
        return data.gyms;
      }
    }
  } catch (err) {
    // Attempt Supabase fallback if API route is unavailable
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('gyms').select('*').order('name');
      if (data && data.length > 0 && !error) {
        return data.map(mapSupabaseGymRow);
      }
    } catch {}
  }

  return INITIAL_GYMS;
}

export async function registerGym(input: CreateGymInput): Promise<{ success: boolean; message: string; gym?: GymProfile; publicStudentUrl?: string; apiKey?: string; user?: AuthUser; token?: string }> {
  try {
    const res = await fetch('/api/gyms/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await parseJsonResponse<{ success: boolean; message: string; gym?: GymProfile; publicStudentUrl?: string; apiKey?: string; user?: AuthUser; token?: string }>(res, {
      success: false,
      message: 'Não foi possível registrar a academia. Resposta inválida do servidor.'
    });
    if (data.success && data.user) {
      saveAuthSession(data.user, data.token);
    }
    return data;
  } catch (err) {
    console.error('Erro no cadastro da academia:', err);
    return { success: false, message: 'Não foi possível registrar a academia. Tente novamente.' };
  }
}

export async function fetchGymDetails(gymIdOrSlug: string): Promise<{ profile: GymProfile; occupancy: OccupancyData; announcements: Announcement[]; accessLogs: AccessLog[] } | null> {
  try {
    const res = await fetch(`/api/gyms/${encodeURIComponent(gymIdOrSlug)}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await parseJsonResponse<{ profile: GymProfile; occupancy: OccupancyData; announcements: Announcement[]; accessLogs: AccessLog[] } | null>(res, null);
      if (data) return data;
    }
  } catch {
    // Graceful fallback to Supabase or local initial dataset
  }

  // Fallback 1: Direct query to Supabase if credentials exist
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: gymRow, error } = await supabase
        .from('gyms')
        .select('*')
        .or(`slug.eq.${gymIdOrSlug},id.eq.${gymIdOrSlug}`)
        .maybeSingle();

      if (gymRow && !error) {
        const profile = mapSupabaseGymRow(gymRow);
        const { data: annRows } = await supabase
          .from('announcements')
          .select('*')
          .eq('gym_id', gymRow.id)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });

        const { data: logRows } = await supabase
          .from('access_logs')
          .select('*')
          .eq('gym_id', gymRow.id)
          .order('timestamp', { ascending: false })
          .limit(30);

        const announcements: Announcement[] = (annRows || []).map((a: any) => ({
          id: a.id,
          gymId: a.gym_id,
          title: a.title,
          content: a.content,
          category: a.category,
          priority: a.priority,
          date: a.date,
          author: a.author,
          pinned: Boolean(a.pinned),
          active: a.active !== false
        }));

        const accessLogs: AccessLog[] = (logRows || []).map((l: any) => ({
          id: l.id,
          gymId: l.gym_id,
          timestamp: l.timestamp,
          type: l.type,
          source: l.source,
          description: l.description,
          countAfter: Number(l.count_after),
          status: l.status
        }));

        const maxCap = Math.max(1, profile.maxCapacity);
        const pct = Math.min(100, Math.round((profile.currentCount / maxCap) * 100));

        return {
          profile,
          occupancy: {
            gymId: profile.id,
            gymName: profile.name,
            gymSlug: profile.slug,
            themeColor: profile.themeColor,
            logoEmoji: profile.logoEmoji,
            slogan: profile.slogan,
            city: profile.city,
            neighborhood: profile.neighborhood,
            visualTheme: profile.visualTheme || 'dark',
            currentCount: profile.currentCount,
            maxCapacity: profile.maxCapacity,
            status: pct > 85 ? 'high' : pct > 50 ? 'moderate' : 'low',
            percentage: pct,
            turnstileLocked: profile.turnstileLocked,
            isOpen: profile.isOpen,
            openingTimeToday: profile.operatingHours.weekdays.open,
            closingTimeToday: profile.operatingHours.weekdays.close,
            lastAccessTime: accessLogs[0]?.timestamp || new Date().toISOString(),
            lastAccessType: (accessLogs[0]?.type === 'entry' ? 'entry' : accessLogs[0]?.type === 'exit' ? 'exit' : 'manual'),
            esp32Connected: true,
            esp32LastPing: new Date().toISOString(),
            esp32DeviceName: `ESP32_${profile.slug.toUpperCase()}`,
            esp32Ip: '192.168.1.100',
            pendingRelayTrigger: null
          },
          announcements: announcements.length > 0 ? announcements : INITIAL_ANNOUNCEMENTS.map(a => ({ ...a, gymId: profile.id })),
          accessLogs
        };
      }
    } catch {
      // Fall through to initial dataset
    }
  }

  // Fallback 2: Local demo dataset
  if (!offlineFallbackNotified.has(gymIdOrSlug)) {
    offlineFallbackNotified.add(gymIdOrSlug);
    console.info(`[GymFlow] Operando com dados locais para academia '${gymIdOrSlug}'.`);
  }

  const found = INITIAL_GYMS.find(g => g.slug === gymIdOrSlug || g.id === gymIdOrSlug) || INITIAL_GYMS[0];
  if (!found) return null;

  return {
    profile: found,
    occupancy: {
      gymId: found.id,
      gymName: found.name,
      gymSlug: found.slug,
      themeColor: found.themeColor,
      logoEmoji: found.logoEmoji,
      slogan: found.slogan,
      city: found.city,
      neighborhood: found.neighborhood,
      visualTheme: found.visualTheme || 'dark',
      currentCount: found.currentCount,
      maxCapacity: found.maxCapacity,
      status: 'low',
      percentage: Math.round((found.currentCount / found.maxCapacity) * 100),
      turnstileLocked: false,
      isOpen: found.isOpen,
      openingTimeToday: found.operatingHours.weekdays.open,
      closingTimeToday: found.operatingHours.weekdays.close,
      lastAccessTime: new Date().toISOString(),
      lastAccessType: 'entry',
      esp32Connected: true,
      esp32LastPing: new Date().toISOString(),
      esp32DeviceName: `ESP32_CATRACA_${found.slug.toUpperCase()}`,
      esp32Ip: '192.168.1.145',
      pendingRelayTrigger: null
    },
    announcements: INITIAL_ANNOUNCEMENTS.map(a => ({ ...a, gymId: found.id })),
    accessLogs: []
  };
}

export async function updateGymSettings(gymIdOrSlug: string, settings: Partial<GymProfile>): Promise<{ success: boolean; message: string; profile?: GymProfile }> {
  try {
    const res = await fetch(`/api/gyms/${encodeURIComponent(gymIdOrSlug)}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    return await parseJsonResponse(res, { success: false, message: 'Erro ao salvar alterações no servidor.' });
  } catch (err) {
    console.error('Erro ao atualizar configurações da academia:', err);
    return { success: false, message: 'Erro ao salvar alterações.' };
  }
}

export async function fetchOccupancy(gymIdOrSlug?: string): Promise<OccupancyData> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}` : '/api/occupancy';
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Falha ao carregar dados de lotação');
    const data = await parseJsonResponse<any>(res, null);
    if (!data) throw new Error('Dados de lotação inválidos');
    return data.occupancy || data;
  } catch (err) {
    console.warn('Usando estado local para lotação:', err);
    const fallbackGym = INITIAL_GYMS[0];
    return {
      gymId: fallbackGym.id,
      gymName: fallbackGym.name,
      gymSlug: fallbackGym.slug,
      themeColor: fallbackGym.themeColor,
      logoEmoji: fallbackGym.logoEmoji,
      slogan: fallbackGym.slogan,
      city: fallbackGym.city,
      neighborhood: fallbackGym.neighborhood,
      visualTheme: fallbackGym.visualTheme || 'dark',
      currentCount: fallbackGym.currentCount,
      maxCapacity: fallbackGym.maxCapacity,
      status: 'low',
      percentage: Math.round((fallbackGym.currentCount / fallbackGym.maxCapacity) * 100),
      turnstileLocked: false,
      isOpen: true,
      closingTimeToday: '23:00',
      openingTimeToday: '06:00',
      lastAccessTime: new Date().toISOString(),
      lastAccessType: 'entry',
      esp32Connected: true,
      esp32LastPing: new Date().toISOString(),
      esp32DeviceName: `ESP32_CATRACA_${fallbackGym.slug.toUpperCase()}`,
      esp32Ip: '192.168.1.145',
      pendingRelayTrigger: null
    };
  }
}

export async function triggerESP32Entry(gymIdOrSlug?: string, isSimulator = true): Promise<{ success: boolean; message: string; currentCount: number }> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/esp32/turnstile/entry` : '/api/esp32/turnstile/entry';
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ source: isSimulator ? 'simulator' : 'esp32_button' })
    });
    return await parseJsonResponse(res, { success: false, message: 'Servidor temporariamente indisponível', currentCount: 0 });
  } catch (err) {
    console.error('Erro ao enviar entrada ESP32:', err);
    return { success: false, message: 'Erro de conexão com o servidor', currentCount: 0 };
  }
}

export async function triggerESP32Exit(gymIdOrSlug?: string, isSimulator = true): Promise<{ success: boolean; message: string; currentCount: number }> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/esp32/turnstile/exit` : '/api/esp32/turnstile/exit';
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ source: isSimulator ? 'simulator' : 'esp32_button' })
    });
    return await parseJsonResponse(res, { success: false, message: 'Servidor temporariamente indisponível', currentCount: 0 });
  } catch (err) {
    console.error('Erro ao enviar saída ESP32:', err);
    return { success: false, message: 'Erro de conexão com o servidor', currentCount: 0 };
  }
}

export async function sendTurnstileAction(
  gymIdOrSlug?: string,
  action: string = 'toggle_lock',
  value?: any,
  notes?: string
): Promise<{ success: boolean; message: string; currentCount: number; turnstileLocked?: boolean }> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/turnstile/action` : '/api/turnstile/action';
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, value, notes, operator: 'Recepção (Painel Web)' })
    });
    return await parseJsonResponse(res, { success: false, message: 'Erro de comunicação com o servidor', currentCount: 0 });
  } catch (err) {
    console.error('Erro ao executar ação na catraca:', err);
    return { success: false, message: 'Erro de comunicação', currentCount: 0 };
  }
}

export async function fetchAccessLogs(gymIdOrSlug?: string): Promise<AccessLog[]> {
  try {
    if (gymIdOrSlug) {
      const data = await fetchGymDetails(gymIdOrSlug);
      return data?.accessLogs || [];
    }
    const res = await fetch('/api/access-logs', {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const data = await parseJsonResponse<{ logs: AccessLog[] }>(res, { logs: [] });
    return data.logs || [];
  } catch (err) {
    return [];
  }
}

export async function fetchAnnouncements(gymIdOrSlug?: string): Promise<Announcement[]> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/announcements` : '/api/announcements';
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return INITIAL_ANNOUNCEMENTS;
    const data = await parseJsonResponse<{ announcements: Announcement[] }>(res, { announcements: INITIAL_ANNOUNCEMENTS });
    return data.announcements || INITIAL_ANNOUNCEMENTS;
  } catch (err) {
    return INITIAL_ANNOUNCEMENTS;
  }
}

export async function createAnnouncement(gymIdOrSlug: string, announcement: Partial<Announcement>): Promise<Announcement | null> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/announcements` : '/api/announcements';
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(announcement)
    });
    if (!res.ok) return null;
    const data = await parseJsonResponse<{ announcement: Announcement } | null>(res, null);
    return data?.announcement || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function deleteAnnouncement(gymIdOrSlug: string, id: string): Promise<boolean> {
  try {
    const url = gymIdOrSlug ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/announcements/${id}` : `/api/announcements/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchESP32ArduinoCode(gymIdOrSlug?: string, serverUrl?: string, ssid?: string, pass?: string): Promise<string> {
  try {
    const params = new URLSearchParams();
    if (serverUrl) params.append('serverUrl', serverUrl);
    if (ssid) params.append('ssid', ssid);
    if (pass) params.append('pass', pass);

    const endpoint = gymIdOrSlug
      ? `/api/gyms/${encodeURIComponent(gymIdOrSlug)}/arduino-code?${params.toString()}`
      : `/api/esp32/arduino-code?${params.toString()}`;

    const res = await fetch(endpoint, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Erro ao gerar código');
    const data = await parseJsonResponse<{ code: string } | null>(res, null);
    return data?.code || '// Falha ao carregar código C++ do ESP32';
  } catch (err) {
    return '// Falha ao carregar código C++ do ESP32 (Acesso restrito à administração da academia)';
  }
}

export function getCrowdDataForDay(dayId: number): DayCrowdStats {
  return WEEKLY_CROWD_DATA[dayId] || WEEKLY_CROWD_DATA[1];
}

// ==========================================
// SAAS MASTER ADMIN (SUPERADMIN) SERVICES
// ==========================================

// Fallback Mock Data Generators for SaaS SuperAdmin
function getLocalFallbackSaaSGyms(): import('../types').GymSaaSAccount[] {
  return INITIAL_GYMS.map((gym, idx) => {
    const planKey = (idx === 0 ? 'pro' : idx === 1 ? 'enterprise' : 'starter') as import('../types').SaaSPlanId;
    const planConfig = SAAS_PLANS[planKey] || SAAS_PLANS.starter;
    return {
      gymId: gym.id,
      gymName: gym.name,
      gymSlug: gym.slug,
      ownerName: gym.ownerName || 'Carlos Gestor',
      ownerEmail: gym.ownerEmail || 'gestor@academia.com.br',
      ownerPhone: gym.contactPhone || '(11) 98765-4321',
      city: gym.city || 'São Paulo - SP',
      plan: planKey,
      planName: planConfig.name,
      monthlyFee: planConfig.price,
      status: 'active' as const,
      isSystemBlocked: false,
      turnstilesLimit: planConfig.turnstilesLimit,
      maxCapacity: gym.maxCapacity,
      currentCount: gym.currentCount,
      nextDueDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      trialEndsAt: new Date(Date.now() + 15 * 86400000).toISOString(),
      apiKey: gym.apiKey || `GF_KEY_${gym.slug.toUpperCase()}`,
      invoices: [
        {
          id: `inv-${gym.slug}-1`,
          gymId: gym.id,
          gymName: gym.name,
          amount: planConfig.price,
          dueDate: new Date(Date.now() + 20 * 86400000).toISOString(),
          status: 'paid' as const,
          paidDate: new Date().toISOString(),
          referenceMonth: 'Março / 2026',
          paymentMethod: 'pix'
        }
      ],
      createdAt: gym.createdAt || new Date().toISOString()
    };
  });
}

function getLocalFallbackSaaSMetrics(): import('../types').SaaSMetrics {
  const gyms = getLocalFallbackSaaSGyms();
  const totalMRR = gyms.reduce((acc, g) => acc + (g.monthlyFee || 0), 0);
  return {
    totalGyms: gyms.length,
    activeGyms: gyms.length,
    blockedGyms: 0,
    overdueGyms: 0,
    trialGyms: 0,
    totalMRR,
    totalRevenueThisMonth: totalMRR,
    pendingRevenue: 0,
    delinquencyRate: 0,
    totalStudentsOnline: gyms.reduce((acc, g) => acc + (g.currentCount || 0), 0)
  };
}

export async function fetchSaaSMetrics(): Promise<import('../types').SaaSMetrics | null> {
  try {
    const res = await fetch('/api/saas/metrics', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await parseJsonResponse<{ metrics: import('../types').SaaSMetrics } | null>(res, null);
      if (data?.metrics) return data.metrics;
    }
  } catch (err) {
    console.warn('Backend de métricas indisponível, usando fallback local:', err);
  }
  return getLocalFallbackSaaSMetrics();
}

export async function fetchSaaSGyms(): Promise<import('../types').GymSaaSAccount[]> {
  try {
    const res = await fetch('/api/saas/gyms', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await parseJsonResponse<{ gyms: import('../types').GymSaaSAccount[] }>(res, { gyms: [] });
      if (data.gyms && data.gyms.length > 0) return data.gyms;
    }
  } catch (err) {
    console.warn('Backend de academias SaaS indisponível, usando fallback local:', err);
  }
  return getLocalFallbackSaaSGyms();
}

export async function createSaaSGym(input: import('../types').CreateSaaSGymInput): Promise<{ success: boolean; message: string; gym?: import('../types').GymSaaSAccount; apiKey?: string }> {
  try {
    const res = await fetch('/api/saas/gyms', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input)
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível cadastrar a academia no SaaS. Resposta do servidor indisponível.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao cadastrar academia no SaaS' };
  }
}

export async function updateSaaSSubscription(
  gymId: string,
  payload: { plan?: string; monthlyFee?: number; status?: string; nextDueDate?: string; turnstilesLimit?: number }
): Promise<{ success: boolean; message: string; account?: import('../types').GymSaaSAccount }> {
  try {
    const res = await fetch(`/api/saas/gyms/${encodeURIComponent(gymId)}/subscription`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível atualizar a assinatura no servidor.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao atualizar assinatura' };
  }
}

export async function toggleSaaSGymBlock(
  gymId: string,
  blocked: boolean,
  reason?: string
): Promise<{ success: boolean; message: string; account?: import('../types').GymSaaSAccount }> {
  try {
    const res = await fetch(`/api/saas/gyms/${encodeURIComponent(gymId)}/block`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ blocked, reason })
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível alterar o bloqueio da academia no servidor.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao alterar bloqueio da academia' };
  }
}

export async function paySaaSInvoice(
  gymId: string,
  invoiceId: string,
  payload: { paymentMethod?: string; notes?: string; unblockGym?: boolean }
): Promise<{ success: boolean; message: string; invoice?: import('../types').SaaSInvoice; account?: import('../types').GymSaaSAccount }> {
  try {
    const res = await fetch(`/api/saas/gyms/${encodeURIComponent(gymId)}/invoices/${encodeURIComponent(invoiceId)}/pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível registrar o pagamento no servidor.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao registrar pagamento da fatura' };
  }
}

export async function createSaaSInvoice(
  gymId: string,
  payload: { amount?: number; dueDate?: string; referenceMonth?: string; notes?: string }
): Promise<{ success: boolean; message: string; invoice?: import('../types').SaaSInvoice; account?: import('../types').GymSaaSAccount }> {
  try {
    const res = await fetch(`/api/saas/gyms/${encodeURIComponent(gymId)}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível emitir a fatura no servidor.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao emitir fatura avulsa' };
  }
}

export async function extendSaaSTrial(
  gymId: string,
  days = 15
): Promise<{ success: boolean; message: string; account?: import('../types').GymSaaSAccount }> {
  try {
    const res = await fetch(`/api/saas/gyms/${encodeURIComponent(gymId)}/extend-trial`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ days })
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível estender o período de teste no servidor.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao estender período de teste' };
  }
}

export async function deleteSaaSGym(gymId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/saas/gyms/${encodeURIComponent(gymId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível remover a academia do sistema.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao remover academia do sistema' };
  }
}

export async function fetchSaaSPlans(): Promise<{ plans: import('../types').SaaSPlanConfig[] }> {
  try {
    const res = await fetch('/api/saas/plans', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await parseJsonResponse<{ plans: import('../types').SaaSPlanConfig[] }>(res, { plans: [] });
      if (data.plans && data.plans.length > 0) return data;
    }
  } catch (err: any) {
    console.warn('Backend de planos SaaS indisponível, usando planos locais:', err);
  }
  return { plans: Object.values(SAAS_PLANS) };
}

export async function updateSaaSPlan(
  planId: string, 
  plan: Partial<import('../types').SaaSPlanConfig>
): Promise<{ success: boolean; message: string; plan?: import('../types').SaaSPlanConfig }> {
  try {
    const res = await fetch(`/api/saas/plans/${encodeURIComponent(planId)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(plan)
    });
    return await parseJsonResponse(res, {
      success: false,
      message: 'Não foi possível atualizar o plano no servidor.'
    });
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao atualizar plano SaaS' };
  }
}


