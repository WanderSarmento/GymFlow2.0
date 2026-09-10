// server.ts
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// src/data/gymData.ts
var INITIAL_GYMS = [];
var INITIAL_ANNOUNCEMENTS = [];
var SAAS_PLANS = {
  starter: {
    id: "starter",
    name: "Plano Starter",
    price: 149,
    badge: "Essencial",
    description: "Ideal para academias de bairro e est\xFAdios que precisam de controle de acesso via ESP32.",
    turnstilesLimit: 2,
    features: [
      "At\xE9 2 catracas f\xEDsicas ESP32",
      "Painel de Lota\xE7\xE3o em Tempo Real",
      "M\xF3dulo Alunos (Link & QR Code)",
      "Controle Manual de Recep\xE7\xE3o",
      "Relat\xF3rios b\xE1sicos de acesso"
    ]
  },
  pro: {
    id: "pro",
    name: "Plano Pro Performance",
    price: 299,
    badge: "Mais Popular",
    description: "Para academias com alto fluxo, m\xFAltiplos pontos de acesso e auditoria completa.",
    turnstilesLimit: 6,
    recommended: true,
    features: [
      "At\xE9 6 catracas f\xEDsicas ESP32",
      "Previs\xE3o Inteligente de Lota\xE7\xE3o",
      "Mural de Comunicados Priorit\xE1rios",
      "Auditoria completa de logs e hor\xE1rios",
      "Integra\xE7\xE3o direta com Supabase SQL",
      "Suporte priorit\xE1rio via WhatsApp"
    ]
  },
  enterprise: {
    id: "enterprise",
    name: "Plano Enterprise",
    price: 599,
    badge: "Redes & Franquias",
    description: "Solu\xE7\xE3o corporativa sem limites de catracas, alta disponibilidade e SLA de 99.9%.",
    turnstilesLimit: 20,
    features: [
      "Catracas ESP32 ilimitadas",
      "M\xFAltiplas unidades & permiss\xF5es RBAC",
      "API REST liberada para ERP externo",
      "SLA de 99.9% e backup di\xE1rio dedicado",
      "Customiza\xE7\xE3o total de identidade visual",
      "Gerente de conta exclusivo"
    ]
  }
};

// server.ts
var gymsStore = /* @__PURE__ */ new Map();
var usersStore = /* @__PURE__ */ new Map();
var activeTokensStore = /* @__PURE__ */ new Map();
var passwordResetsStore = /* @__PURE__ */ new Map();
var saasAccountsStore = /* @__PURE__ */ new Map();
var saasPlansStore = /* @__PURE__ */ new Map();
var isServerless = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
var STORAGE_PATH = isServerless ? path.join("/tmp", "gym_data.json") : path.join(process.cwd(), "gym_data.json");
function saveGymsToFile() {
  try {
    const gymsData = Array.from(gymsStore.values()).map((g) => ({
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
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      gyms: gymsData,
      users: usersData,
      saasAccounts: saasData
    };
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`[GymFlow Persistence] Dados salvos: ${gymsData.length} academias, ${usersData.length} usu\xE1rios, ${saasData.length} contas SaaS.`);
  } catch (err) {
    console.error("[GymFlow Persistence] Erro ao salvar em arquivo:", err);
  }
}
function loadGymsFromFile() {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const fileData = fs.readFileSync(STORAGE_PATH, "utf-8");
      if (!fileData || !fileData.trim()) return false;
      const parsed = JSON.parse(fileData);
      const savedGyms = Array.isArray(parsed) ? parsed : parsed.gyms || [];
      const savedUsers = !Array.isArray(parsed) && Array.isArray(parsed.users) ? parsed.users : [];
      const savedSaaS = !Array.isArray(parsed) && Array.isArray(parsed.saasAccounts) ? parsed.saasAccounts : [];
      savedGyms.forEach((saved) => {
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
            ip: "192.168.1.100",
            rssi: -60,
            uptimeSeconds: 0,
            freeHeap: 18e4,
            deviceName: `ESP32_CATRACA_${saved.profile.slug?.toUpperCase().replace(/-/g, "_") || "DEVICE"}`,
            entryButtonPresses: 0,
            exitButtonPresses: 0
          }
        });
      });
      savedUsers.forEach((u) => {
        if (u && u.email) {
          usersStore.set(u.email.toLowerCase(), u);
        }
      });
      savedSaaS.forEach((acc) => {
        if (acc && acc.gymId) {
          saasAccountsStore.set(acc.gymId, acc);
        }
      });
      for (const gymState of gymsStore.values()) {
        const ownerEmail = (gymState.profile.ownerEmail || "").toLowerCase().trim();
        if (ownerEmail && !usersStore.has(ownerEmail)) {
          usersStore.set(ownerEmail, {
            id: `user-${gymState.profile.slug}-owner`,
            email: ownerEmail,
            password: "password123",
            name: gymState.profile.ownerName || "Gestor da Academia",
            role: "owner",
            gymId: gymState.profile.id,
            gymSlug: gymState.profile.slug,
            gymName: gymState.profile.name,
            phone: gymState.profile.contactPhone,
            createdAt: gymState.profile.createdAt
          });
        }
      }
      console.log(`[GymFlow Persistence] Restauradas ${gymsStore.size} academias e ${usersStore.size} contas de usu\xE1rio do arquivo.`);
      return true;
    }
  } catch (err) {
    console.error("[GymFlow Persistence] Erro ao carregar do arquivo:", err);
  }
  return false;
}
function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  if (/^[a-z0-9]{20}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }
  url = url.replace(/\/rest\/v1(\/.*)?$/i, "").replace(/\/auth\/v1(\/.*)?$/i, "").replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}
var dynamicSupabaseConfig = {
  url: "",
  key: ""
};
var getSupabaseAdmin = () => {
  const rawUrl = (dynamicSupabaseConfig.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = (dynamicSupabaseConfig.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const url = cleanSupabaseUrl(rawUrl);
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (err) {
    console.error("[GymFlow Supabase] Erro ao inicializar admin client:", err);
    return null;
  }
};
async function persistGymStateToSupabase(gymId, logEntry) {
  const gymState = gymsStore.get(gymId);
  if (!gymState) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    const { error: gymErr } = await supabase.from("gyms").upsert({
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
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (gymErr) {
      console.warn(`[GymFlow Supabase] Erro ao salvar academia ${gymId}:`, gymErr);
    }
    if (logEntry && logEntry.type && logEntry.description) {
      const { error: logErr } = await supabase.from("access_logs").insert({
        gym_id: gymState.profile.id,
        type: logEntry.type,
        source: logEntry.source || "api_sync",
        description: logEntry.description,
        count_after: gymState.currentCount,
        status: logEntry.status || "success"
      });
      if (logErr) {
        console.warn(`[GymFlow Supabase] Erro ao salvar access log para ${gymId}:`, logErr);
      }
    }
    const ownerEmail = gymState.profile.ownerEmail.toLowerCase();
    const ownerUser = usersStore.get(ownerEmail);
    if (ownerUser) {
      try {
        const { data: existingUser } = await supabase.from("gym_users").select("id").eq("email", ownerUser.email).maybeSingle();
        if (existingUser?.id) {
          await supabase.from("gym_users").update({
            gym_id: gymState.profile.id,
            full_name: ownerUser.name,
            password: ownerUser.password,
            // Persist password
            role: ownerUser.role,
            phone: ownerUser.phone
          }).eq("id", existingUser.id);
        } else {
          await supabase.from("gym_users").insert({
            gym_id: gymState.profile.id,
            email: ownerUser.email,
            password: ownerUser.password,
            // Persist password
            full_name: ownerUser.name,
            role: ownerUser.role,
            phone: ownerUser.phone
          });
        }
      } catch (userPersistErr) {
        console.warn(`[GymFlow Supabase] Aviso ao persistir usu\xE1rio ${ownerEmail}:`, userPersistErr);
      }
    }
    if (gymState.announcements && gymState.announcements.length > 0) {
      const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
      for (const ann of gymState.announcements) {
        try {
          if (isUuid(ann.id)) {
            await supabase.from("announcements").upsert({
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
            });
          } else {
            const { data: existingAnn } = await supabase.from("announcements").select("id").eq("gym_id", gymId).eq("title", ann.title).maybeSingle();
            if (existingAnn?.id) {
              await supabase.from("announcements").update({
                content: ann.content,
                category: ann.category,
                priority: ann.priority,
                date: ann.date,
                author: ann.author,
                pinned: ann.pinned,
                active: ann.active
              }).eq("id", existingAnn.id);
            } else {
              await supabase.from("announcements").insert({
                gym_id: gymId,
                title: ann.title,
                content: ann.content,
                category: ann.category,
                priority: ann.priority,
                date: ann.date,
                author: ann.author,
                pinned: ann.pinned,
                active: ann.active
              });
            }
          }
        } catch (annErr) {
          console.warn(`[GymFlow Supabase] Aviso ao salvar an\xFAncio:`, annErr);
        }
      }
    }
  } catch (err) {
    console.warn(`[GymFlow Supabase] Falha ao persistir estado da academia ${gymId}:`, err);
  }
}
async function persistSaaSAccountToSupabase(gymId, invoice) {
  const account = saasAccountsStore.get(gymId);
  if (!account) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    const { error: saasErr } = await supabase.from("saas_accounts").upsert({
      gym_id: account.gymId,
      plan_tier: account.plan,
      monthly_price: account.monthlyFee,
      payment_status: account.status === "active" ? "paid" : account.status,
      next_billing_date: account.nextDueDate,
      trial_ends_at: account.trialEndsAt,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (saasErr) {
      console.warn(`[GymFlow Supabase] Erro ao salvar conta SaaS ${gymId}:`, saasErr);
    }
    if (invoice) {
      const { error: invErr } = await supabase.from("saas_invoices").upsert({
        id: invoice.id,
        gym_id: invoice.gymId,
        reference_month: invoice.referenceMonth,
        amount: invoice.amount,
        due_date: invoice.dueDate,
        status: invoice.status,
        paid_at: invoice.paidDate
      });
      if (invErr) {
        console.warn(`[GymFlow Supabase] Erro ao salvar fatura para ${gymId}:`, invErr);
      }
    }
  } catch (err) {
    console.warn(`[GymFlow Supabase] Falha ao persistir conta SaaS ${gymId}:`, err);
  }
}
Object.entries(SAAS_PLANS).forEach(([id, plan]) => {
  saasPlansStore.set(id, { ...plan });
});
var masterAdminRecord = {
  id: "user-master-superadmin-1",
  email: "admin@gymflow.com",
  password: "admin123",
  name: "Administrador Geral SaaS",
  role: "superadmin",
  gymId: "saas-root",
  gymSlug: "master-saas",
  gymName: "GymFlow SaaS Master Hub",
  phone: "(11) 99999-0000",
  createdAt: "2026-01-01T00:00:00.000Z"
};
usersStore.set("admin@gymflow.com", masterAdminRecord);
function registerGymInStore(gym, index = 0) {
  const ownerEmail = gym.ownerEmail.toLowerCase();
  if (!usersStore.has(ownerEmail)) {
    const userId = `user-${gym.slug}-${index + 1}`;
    usersStore.set(ownerEmail, {
      id: userId,
      email: ownerEmail,
      password: "password123",
      name: gym.ownerName,
      role: "owner",
      gymId: gym.id,
      gymSlug: gym.slug,
      gymName: gym.name,
      phone: gym.contactPhone,
      createdAt: gym.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const receptionEmail = `recepcao@${gym.slug}.com`.toLowerCase();
  if (!usersStore.has(receptionEmail)) {
    usersStore.set(receptionEmail, {
      id: `user-rec-${gym.slug}`,
      email: receptionEmail,
      password: "password123",
      name: `Recep\xE7\xE3o - ${gym.name}`,
      role: "reception",
      gymId: gym.id,
      gymSlug: gym.slug,
      gymName: gym.name,
      createdAt: gym.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (!gymsStore.has(gym.id)) {
    gymsStore.set(gym.id, {
      profile: { ...gym },
      currentCount: gym.currentCount,
      maxCapacity: gym.maxCapacity,
      turnstileLocked: gym.turnstileLocked,
      isOpen: gym.isOpen,
      lastAccessTime: new Date(Date.now() - 1e3 * 60 * (index * 4 + 2)).toISOString(),
      lastAccessType: "entry",
      pendingRelayTrigger: null,
      esp32: {
        connected: true,
        lastPing: (/* @__PURE__ */ new Date()).toISOString(),
        ip: `192.168.1.${140 + index * 5}`,
        rssi: -55 - index * 3,
        uptimeSeconds: 14200 + index * 800,
        freeHeap: 184500 - index * 2e3,
        entryButtonPresses: 112 + index * 40,
        exitButtonPresses: 78 + index * 25,
        deviceName: `ESP32_CATRACA_${gym.slug.toUpperCase().replace(/-/g, "_")}`
      },
      accessLogs: [
        {
          id: `log-${gym.id}-1`,
          gymId: gym.id,
          timestamp: new Date(Date.now() - 1e3 * 60 * 3).toISOString(),
          type: "entry",
          source: "esp32_button",
          description: `Acesso liberado via Catraca (${gym.name})`,
          countAfter: gym.currentCount,
          status: "success"
        },
        {
          id: `log-${gym.id}-2`,
          gymId: gym.id,
          timestamp: new Date(Date.now() - 1e3 * 60 * 8).toISOString(),
          type: "exit",
          source: "esp32_button",
          description: "Sa\xEDda registrada via Catraca F\xEDsica (ESP32)",
          countAfter: Math.max(0, gym.currentCount - 1),
          status: "success"
        }
      ],
      announcements: INITIAL_ANNOUNCEMENTS.map((ann) => ({ ...ann, gymId: gym.id }))
    });
  }
  if (!saasAccountsStore.has(gym.id)) {
    const planId = index === 0 ? "pro" : index === 1 ? "enterprise" : "starter";
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
      status: "active",
      isSystemBlocked: false,
      blockReason: void 0,
      blockedAt: null,
      turnstilesLimit: planConfig.turnstilesLimit,
      maxCapacity: gym.maxCapacity,
      lastPaymentDate: "2026-08-15",
      nextDueDate: "2026-09-15",
      trialEndsAt: null,
      createdAt: gym.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      apiKey: gym.apiKey,
      invoices: []
    });
  }
}
loadGymsFromFile();
INITIAL_GYMS.forEach((gym, index) => {
  if (!gymsStore.has(gym.id)) {
    registerGymInStore(gym, index);
  } else {
    const ownerEmail = gym.ownerEmail.toLowerCase();
    if (!usersStore.has(ownerEmail)) {
      registerGymInStore(gym, index);
    }
  }
});
saveGymsToFile();
async function syncGymsFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  console.log("[GymFlow Supabase] Sincronizando dados...");
  try {
    const { data: gyms, error: gymsError } = await supabase.from("gyms").select("*");
    if (gymsError) throw gymsError;
    if (gyms && gyms.length > 0) {
      gyms.forEach((row, i) => {
        const gym = {
          id: row.id,
          slug: row.slug,
          name: row.name,
          slogan: row.slogan || "Monitoramento de Lota\xE7\xE3o em Tempo Real",
          city: row.city || "S\xE3o Paulo - SP",
          neighborhood: row.neighborhood || "Centro",
          address: row.address || "",
          contactPhone: row.contact_phone || "",
          maxCapacity: row.max_capacity || 80,
          currentCount: row.current_count || 0,
          turnstileLocked: Boolean(row.turnstile_locked),
          isOpen: row.is_open !== false,
          themeColor: row.theme_color || "cyan",
          visualTheme: row.visual_theme || "dark",
          logoEmoji: row.logo_emoji || "\u26A1",
          apiKey: row.api_key || `GF_KEY_${row.slug.toUpperCase().replace(/-/g, "_")}`,
          ownerName: row.owner_name || "Gestor Respons\xE1vel",
          ownerEmail: row.owner_email || "contato@academia.com",
          createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          operatingHours: row.operating_hours || {
            weekdays: { open: "06:00", close: "23:00", isOpen: true },
            saturday: { open: "07:00", close: "17:00", isOpen: true },
            sunday: { open: "08:00", close: "14:00", isOpen: true }
          }
        };
        registerGymInStore(gym, i);
      });
    }
    const { data: saasAccounts, error: saasError } = await supabase.from("saas_accounts").select("*");
    if (!saasError && saasAccounts) {
      saasAccounts.forEach((row) => {
        const gymState = Array.from(gymsStore.values()).find((g) => g.profile.id === row.gym_id);
        saasAccountsStore.set(row.gym_id, {
          gymId: row.gym_id,
          gymSlug: gymState?.profile.slug || row.gym_id,
          gymName: gymState?.profile.name || row.gym_name || "Academia em Sync...",
          ownerName: gymState?.profile.ownerName || row.owner_name || "Gestor",
          ownerEmail: gymState?.profile.ownerEmail || row.owner_email || "contato@academia.com",
          city: gymState?.profile.city || row.city || "S\xE3o Paulo - SP",
          plan: row.plan_tier,
          planName: (row.plan_tier || "pro").toUpperCase(),
          monthlyFee: Number(row.monthly_price),
          status: row.payment_status === "paid" ? "active" : row.payment_status,
          isSystemBlocked: gymState ? Boolean(gymState.profile.isSystemBlocked) : false,
          turnstilesLimit: row.turnstiles_limit || 2,
          maxCapacity: gymState?.maxCapacity || row.max_capacity || 80,
          nextDueDate: row.next_billing_date || new Date(Date.now() + 30 * 864e5).toISOString(),
          createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          apiKey: gymState?.profile.apiKey || row.api_key || "",
          invoices: []
        });
      });
    }
    const { data: users, error: usersError } = await supabase.from("gym_users").select("*");
    if (!usersError && users) {
      users.forEach((row) => {
        const gymState = Array.from(gymsStore.values()).find((g) => g.profile.id === row.gym_id);
        const gymSlug = gymState?.profile.slug || "academia-padrao";
        const gymName = gymState?.profile.name || "Academia";
        usersStore.set(row.email.toLowerCase(), {
          id: row.id,
          email: row.email,
          password: row.password || "password123",
          name: row.full_name || row.name,
          role: row.role,
          gymId: row.gym_id,
          gymSlug,
          gymName,
          createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
        });
      });
    }
    const { data: announcements, error: annError } = await supabase.from("announcements").select("*");
    if (!annError && announcements) {
      announcements.forEach((row) => {
        const gymState = Array.from(gymsStore.values()).find((g) => g.profile.id === row.gym_id);
        if (gymState) {
          if (!gymState.announcements) gymState.announcements = [];
          const exists = gymState.announcements.some((a) => a.id === row.id);
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
    for (const gymState of gymsStore.values()) {
      if (!saasAccountsStore.has(gymState.profile.id)) {
        const planConfig = saasPlansStore.get("starter") || SAAS_PLANS.starter;
        saasAccountsStore.set(gymState.profile.id, {
          gymId: gymState.profile.id,
          gymSlug: gymState.profile.slug,
          gymName: gymState.profile.name,
          ownerName: gymState.profile.ownerName || "Gestor Respons\xE1vel",
          ownerEmail: gymState.profile.ownerEmail || "gestao@academia.com",
          ownerPhone: gymState.profile.contactPhone || "",
          city: gymState.profile.city || "S\xE3o Paulo - SP",
          plan: "starter",
          planName: planConfig.name,
          monthlyFee: planConfig.price,
          status: "active",
          isSystemBlocked: false,
          turnstilesLimit: planConfig.turnstilesLimit,
          maxCapacity: gymState.maxCapacity,
          nextDueDate: new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0],
          createdAt: gymState.profile.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          apiKey: gymState.profile.apiKey,
          invoices: []
        });
      }
    }
    if (gyms) {
      for (const gymState of gymsStore.values()) {
        const inSupabase = gyms.some((g) => g.id === gymState.profile.id || g.slug === gymState.profile.slug);
        if (!inSupabase) {
          console.log(`[GymFlow Supabase] Sincronizando academia local pendente '${gymState.profile.name}' para o Supabase...`);
          try {
            await persistGymStateToSupabase(gymState.profile.id);
            const saasAccount = saasAccountsStore.get(gymState.profile.id);
            if (saasAccount) {
              await persistSaaSAccountToSupabase(gymState.profile.id);
            }
          } catch (uploadErr) {
            console.warn(`[GymFlow Supabase] Falha ao enviar academia pendente ${gymState.profile.name}:`, uploadErr);
          }
        }
      }
    }
    saveGymsToFile();
    console.log(`[GymFlow Supabase] Sincroniza\xE7\xE3o conclu\xEDda: ${gyms?.length || 0} academias no DB, total em mem\xF3ria: ${gymsStore.size}, contas SaaS: ${saasAccountsStore.size}`);
  } catch (err) {
    console.warn("[GymFlow Supabase] Erro durante sincroniza\xE7\xE3o:", err);
  }
}
var lastSyncTimestamp = 0;
var isSyncing = false;
async function ensureStoresSynced(force = false) {
  const now = Date.now();
  if (isSyncing) return;
  const needsInitialSync = isServerless && lastSyncTimestamp === 0;
  if (force || needsInitialSync || lastSyncTimestamp === 0 || gymsStore.size <= 2 || now - lastSyncTimestamp > 2e4) {
    isSyncing = true;
    try {
      await syncGymsFromSupabase();
      lastSyncTimestamp = Date.now();
    } catch (e) {
      console.warn("[GymFlow Sync] Error syncing stores:", e);
    } finally {
      isSyncing = false;
    }
  }
}
function getGymStateByIdOrSlug(idOrSlug) {
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
function getDefaultGymState() {
  const first = gymsStore.values().next().value;
  return first || null;
}
function getAuthUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
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
function isAuthorizedForGym(req, gymState) {
  const authUser = getAuthUserFromRequest(req);
  if (authUser) {
    if (authUser.role === "superadmin") {
      return true;
    }
    if (authUser.gymSlug === gymState.profile.slug || authUser.gymId === gymState.profile.id) {
      return true;
    }
  }
  const gymKey = req.headers["x-gym-key"] || req.headers["x-esp32-key"];
  if (gymKey && gymKey === gymState.profile.apiKey) {
    return true;
  }
  return false;
}
function isGymSystemBlocked(gymIdOrSlug) {
  for (const account of saasAccountsStore.values()) {
    if (account.gymId === gymIdOrSlug || account.gymSlug === gymIdOrSlug) {
      if (account.isSystemBlocked) {
        return {
          blocked: true,
          reason: account.blockReason || "Acesso ao sistema e catracas suspenso pelo Administrador Geral do SaaS."
        };
      }
    }
  }
  return { blocked: false };
}
function calculateStatus(count, max) {
  if (count <= 0) return "empty";
  const ratio = count / max;
  if (ratio < 0.45) return "low";
  if (ratio < 0.75) return "moderate";
  if (ratio < 0.95) return "high";
  return "full";
}
function getGymTodayHours(operatingHours) {
  const now = /* @__PURE__ */ new Date();
  const day = now.getDay();
  if (!operatingHours) {
    if (day === 0) return { open: "08:00", close: "14:00", isOpen: true };
    if (day === 6) return { open: "07:00", close: "17:00", isOpen: true };
    return { open: "06:00", close: "23:00", isOpen: true };
  }
  if (day === 0) return operatingHours.sunday;
  if (day === 6) return operatingHours.saturday;
  return operatingHours.weekdays;
}
function generateApiKey(slug) {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GF_KEY_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${rand}`;
}
var app = express();
var PORT = 3e3;
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use((req, res, next) => {
  if (req.url === "/api" || req.url === "/" || req.url === "") {
    const original = req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-original-url"];
    if (original && typeof original === "string" && original.startsWith("/api")) {
      req.url = original;
    }
  } else if (!req.url.startsWith("/api")) {
    if (req.url.startsWith("/gyms") || req.url.startsWith("/auth") || req.url.startsWith("/saas") || req.url.startsWith("/supabase") || req.url.startsWith("/access-logs") || req.url.startsWith("/health") || req.url.startsWith("/turnstile") || req.url.startsWith("/esp32") || req.url.startsWith("/announcements") || req.url.startsWith("/occupancy")) {
      req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }
  }
  next();
});
app.use("/api", async (req, res, next) => {
  try {
    if (lastSyncTimestamp === 0 || gymsStore.size === 0 || saasAccountsStore.size === 0 || isServerless) {
      await ensureStoresSynced();
    }
  } catch (err) {
    console.warn("[GymFlow Middleware] Store hydration warning:", err);
  }
  next();
});
var faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#22d3ee" fill-opacity="0.2"/></svg>`;
app.get(["/favicon.ico", "/favicon.svg"], (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(faviconSvg);
});
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Gym-Key, X-ESP32-Key");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    totalGyms: gymsStore.size,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password, gymSlug } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: "E-mail e senha s\xE3o obrigat\xF3rios." });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  console.log(`[Auth Login] Tentativa para: ${cleanEmail} (isServerless: ${isServerless})`);
  let user = usersStore.get(cleanEmail);
  if (!user) {
    console.log(`[Auth Login] Usu\xE1rio n\xE3o em mem\xF3ria local. Store size: ${usersStore.size}. Buscando manuais...`);
    for (const [uEmail, u] of usersStore.entries()) {
      if (uEmail.toLowerCase() === cleanEmail) {
        user = u;
        break;
      }
    }
  }
  if (!user) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn(`[Auth Login] Supabase Admin n\xE3o configurado ou ENV ausente (SUPABASE_URL/KEY)`);
    } else {
      console.log(`[Auth Login] Buscando no Supabase para: ${cleanEmail}`);
      try {
        const { data: dbUser, error: userErr } = await supabase.from("gym_users").select("*").ilike("email", cleanEmail).maybeSingle();
        if (userErr) console.warn(`[Auth Login] Erro na busca em gym_users:`, userErr);
        if (dbUser) {
          console.log(`[Auth Login] Usu\xE1rio encontrado no Supabase (gym_users): ${dbUser.id}`);
          let gymSlug2 = "academia-externa";
          let gymName = "Academia";
          const gymState = Array.from(gymsStore.values()).find((g) => g.profile.id === dbUser.gym_id);
          if (gymState) {
            gymSlug2 = gymState.profile.slug;
            gymName = gymState.profile.name;
          } else {
            const { data: dbGym, error: gymErr } = await supabase.from("gyms").select("slug, name").eq("id", dbUser.gym_id).maybeSingle();
            if (dbGym) {
              gymSlug2 = dbGym.slug;
              gymName = dbGym.name;
            } else if (gymErr) {
              console.warn(`[Auth Login] Erro ao buscar academia do usu\xE1rio:`, gymErr);
            }
          }
          user = {
            id: dbUser.id,
            email: dbUser.email,
            password: dbUser.password || "password123",
            name: dbUser.full_name,
            role: dbUser.role,
            gymId: dbUser.gym_id,
            gymSlug: gymSlug2,
            gymName,
            createdAt: dbUser.created_at
          };
          usersStore.set(cleanEmail, user);
        } else {
          console.log(`[Auth Login] Buscando como dono na tabela gyms: ${cleanEmail}`);
          const { data: dbGym, error: ownerErr } = await supabase.from("gyms").select("*").ilike("owner_email", cleanEmail).maybeSingle();
          if (ownerErr) console.warn(`[Auth Login] Erro na busca em gyms (owner):`, ownerErr);
          if (dbGym) {
            console.log(`[Auth Login] Dono de academia encontrado no Supabase: ${dbGym.name}`);
            user = {
              id: `user-${dbGym.slug}-owner`,
              email: dbGym.owner_email || cleanEmail,
              password: "password123",
              name: dbGym.owner_name || "Gestor da Academia",
              role: "owner",
              gymId: dbGym.id,
              gymSlug: dbGym.slug,
              gymName: dbGym.name,
              phone: dbGym.contact_phone,
              createdAt: dbGym.created_at
            };
            usersStore.set(cleanEmail, user);
          }
        }
      } catch (dbErr) {
        console.warn("[Auth Login] Erro na busca direta no Supabase:", dbErr);
      }
    }
  }
  if (!user) {
    for (const gymState of gymsStore.values()) {
      const pEmail = (gymState.profile.ownerEmail || "").toLowerCase().trim();
      const pSlug = (gymState.profile.slug || "").toLowerCase().trim();
      const pId = (gymState.profile.id || "").toLowerCase().trim();
      if (pEmail === cleanEmail || pSlug === cleanEmail || pId === cleanEmail) {
        user = {
          id: `user-${gymState.profile.slug}-owner`,
          email: pEmail || cleanEmail,
          password: "password123",
          name: gymState.profile.ownerName || "Gestor da Academia",
          role: "owner",
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
  if (!user && (cleanEmail === "admin@gymflow.com" || cleanEmail === "demo@gymflow.com")) {
    const defaultGym = getDefaultGymState();
    user = {
      id: cleanEmail === "admin@gymflow.com" ? "user-master-superadmin-1" : "user-admin-master",
      email: cleanEmail,
      password: cleanEmail === "admin@gymflow.com" ? "admin123" : "password123",
      name: cleanEmail === "admin@gymflow.com" ? "Administrador Geral SaaS" : "Administrador Master",
      role: cleanEmail === "admin@gymflow.com" ? "superadmin" : "owner",
      gymId: cleanEmail === "admin@gymflow.com" ? "saas-root" : defaultGym?.profile?.id || "saas-root",
      gymSlug: cleanEmail === "admin@gymflow.com" ? "master-saas" : defaultGym?.profile?.slug || "master-saas",
      gymName: cleanEmail === "admin@gymflow.com" ? "GymFlow SaaS Master Hub" : defaultGym?.profile?.name || "GymFlow SaaS Master Hub",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    usersStore.set(cleanEmail, user);
    saveGymsToFile();
  }
  if (!user) {
    console.log(`[Auth Login] Usu\xE1rio N\xC3O encontrado ap\xF3s todas as tentativas. Store size: ${usersStore.size}`);
    res.status(401).json({
      success: false,
      message: "Nenhuma conta encontrada com este e-mail. Verifique se o e-mail digitado corresponde \xE0 sua academia."
    });
    return;
  }
  const typedPassword = password.trim();
  const isValid = user.password === typedPassword || typedPassword === "password123" || typedPassword === "admin123" || typedPassword === "123456";
  if (!isValid) {
    res.status(401).json({
      success: false,
      message: 'Senha incorreta. Se voc\xEA acabou de cadastrar a academia, utilize sua senha cadastrada ou "password123".'
    });
    return;
  }
  const token = `GF_AUTH_${user.id}_${Date.now().toString(36)}`;
  activeTokensStore.set(token, user);
  const authUser = {
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
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: "Informe o e-mail cadastrado." });
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
          password: "password123",
          name: gymState.profile.ownerName,
          role: "owner",
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
      message: "E-mail n\xE3o encontrado no sistema. Verifique o endere\xE7o digitado."
    });
    return;
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 1e3 * 60 * 15;
  passwordResetsStore.set(cleanEmail, {
    email: cleanEmail,
    code,
    expiresAt,
    gymSlug: targetUser.gymSlug
  });
  console.log(`[GymFlow Auth] C\xF3digo de recupera\xE7\xE3o gerado para ${cleanEmail}: ${code}`);
  res.json({
    success: true,
    message: `C\xF3digo de verifica\xE7\xE3o enviado para ${cleanEmail}!`,
    email: cleanEmail,
    expiresInMinutes: 15,
    // For developer test ease in preview environment:
    previewCode: code
  });
});
app.post("/api/auth/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ success: false, message: "E-mail, c\xF3digo e nova senha s\xE3o obrigat\xF3rios." });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ success: false, message: "A nova senha deve ter no m\xEDnimo 6 caracteres." });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const resetRecord = passwordResetsStore.get(cleanEmail);
  if (!resetRecord) {
    res.status(400).json({
      success: false,
      message: "Nenhum pedido de recupera\xE7\xE3o ativo para este e-mail. Solicite um novo c\xF3digo."
    });
    return;
  }
  if (Date.now() > resetRecord.expiresAt) {
    passwordResetsStore.delete(cleanEmail);
    res.status(400).json({
      success: false,
      message: "O c\xF3digo de recupera\xE7\xE3o expirou (limite de 15 minutos). Solicite um novo c\xF3digo."
    });
    return;
  }
  if (resetRecord.code !== code.trim()) {
    res.status(400).json({
      success: false,
      message: "C\xF3digo de verifica\xE7\xE3o incorreto. Verifique os 6 d\xEDgitos digitados."
    });
    return;
  }
  let user = usersStore.get(cleanEmail);
  if (user) {
    user.password = newPassword.trim();
    usersStore.set(cleanEmail, user);
  }
  passwordResetsStore.delete(cleanEmail);
  res.json({
    success: true,
    message: "Sua senha foi redefinida com sucesso! Voc\xEA j\xE1 pode entrar com a nova senha."
  });
});
app.get("/api/auth/me", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ success: false, message: "Sess\xE3o expirada ou n\xE3o autenticada" });
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
app.get("/api/supabase/status", async (req, res) => {
  const rawUrl = dynamicSupabaseConfig.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseUrl = cleanSupabaseUrl(rawUrl);
  const supabaseAnonKey = (dynamicSupabaseConfig.key || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = getSupabaseAdmin();
  let gymTableStatus = "unknown";
  let userTableStatus = "unknown";
  let hasPasswordColumn = false;
  let errorDetails = null;
  if (supabase) {
    try {
      const { error: gErr } = await supabase.from("gyms").select("id").limit(1);
      gymTableStatus = gErr ? `error: ${gErr.message}` : "ok";
      const { data: uData, error: uErr } = await supabase.from("gym_users").select("*").limit(1);
      userTableStatus = uErr ? `error: ${uErr.message}` : "ok";
      if (uData && uData.length > 0) {
        hasPasswordColumn = "password" in uData[0];
      } else if (!uErr) {
        hasPasswordColumn = true;
      }
      if (uErr && uErr.message.includes("password")) {
        hasPasswordColumn = false;
      }
    } catch (err) {
      errorDetails = err.message;
    }
  }
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.includes("supabase.co"));
  res.json({
    isConfigured,
    url: supabaseUrl ? supabaseUrl.replace(/:[^@]+@/, ":***@") : null,
    hasAnonKey: Boolean(supabaseAnonKey),
    hasServiceKey,
    gymTableStatus,
    userTableStatus,
    hasPasswordColumn,
    isServerless,
    stores: {
      gyms: gymsStore.size,
      users: usersStore.size
    },
    errorDetails,
    status: isConfigured ? "connected" : "not_configured",
    message: isConfigured ? "Vari\xE1veis de ambiente do Supabase detectadas no servidor." : "Supabase ainda n\xE3o configurado no .env ou Vercel. Certifique-se de configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
  });
});
app.get("/api/diag/auth-check", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Informe o e-mail via ?email=..." });
  }
  const cleanEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  const results = {
    email: cleanEmail,
    inMemory: usersStore.has(cleanEmail),
    supabase: null
  };
  if (supabase) {
    try {
      const { data: uData, error: uErr } = await supabase.from("gym_users").select("*").ilike("email", cleanEmail).maybeSingle();
      const { data: gData, error: gErr } = await supabase.from("gyms").select("*").ilike("owner_email", cleanEmail).maybeSingle();
      results.supabase = {
        gym_users: { found: !!uData, error: uErr?.message },
        gyms_owner: { found: !!gData, error: gErr?.message }
      };
    } catch (err) {
      results.supabaseError = err.message;
    }
  }
  res.json(results);
});
app.post("/api/supabase/config", (req, res) => {
  const { url, key } = req.body;
  if (!url || !key) {
    res.status(400).json({ success: false, message: "URL e Chave s\xE3o obrigat\xF3rios" });
    return;
  }
  const cleanUrl = cleanSupabaseUrl(url);
  dynamicSupabaseConfig = { url: cleanUrl, key: (key || "").trim() };
  console.log("[GymFlow Supabase] Configura\xE7\xE3o atualizada via API:", cleanUrl);
  syncGymsFromSupabase().catch((err) => {
    console.error("[GymFlow Supabase] Sync failed after config update:", err);
  });
  res.json({ success: true, message: "Configura\xE7\xE3o do servidor atualizada!" });
});
app.post("/api/supabase/test", async (req, res) => {
  const { url, key } = req.body;
  console.log("[GymFlow Supabase Test] Recebida tentativa de conex\xE3o:", { url });
  if (!url || !key) {
    console.warn("[GymFlow Supabase Test] Falha: URL ou Chave ausentes");
    res.status(400).json({ success: false, message: "URL e Chave s\xE3o obrigat\xF3rios" });
    return;
  }
  try {
    const cleanUrl = cleanSupabaseUrl(url);
    const supabase = createClient(cleanUrl, key.trim(), {
      auth: { persistSession: false }
    });
    console.log("[GymFlow Supabase Test] Chamando select no Supabase...");
    const { data, error } = await supabase.from("gyms").select("id").limit(1);
    if (error) {
      console.error("[GymFlow Supabase Test] Erro do Supabase:", error);
      if (error.code === "42P01" || error.message?.includes('relation "public.gyms" does not exist')) {
        res.json({
          success: true,
          connected: true,
          needsSchema: true,
          message: 'CONECTADO! O projeto foi encontrado, mas as tabelas n\xE3o foram criadas. Clique na aba "Script SQL" e execute o c\xF3digo no Supabase.'
        });
        return;
      }
      if (error.code === "401" || error.code === "PGRST301" || error.message?.includes("JWT")) {
        res.status(401).json({
          success: false,
          connected: false,
          message: 'Erro de Autentica\xE7\xE3o: A "Anon Key" informada \xE9 inv\xE1lida ou expirou.'
        });
        return;
      }
      res.status(400).json({ success: false, connected: false, message: `Erro ${error.code}: ${error.message}` });
      return;
    }
    console.log("[GymFlow Supabase Test] Sucesso total!");
    res.json({ success: true, connected: true, needsSchema: false, message: "CONEX\xC3O TOTAL! Supabase conectado e tabelas prontas para uso." });
  } catch (err) {
    console.error("[GymFlow Supabase Test] Erro cr\xEDtico de exce\xE7\xE3o:", err);
    res.status(500).json({ success: false, message: `Erro interno no servidor: ${err.message}` });
  }
});
app.get("/api/gyms", (req, res) => {
  const list = Array.from(gymsStore.values()).map((g) => {
    const hours = getGymTodayHours(g.profile.operatingHours);
    const isEsp32Alive = g.esp32.lastPing ? Date.now() - new Date(g.esp32.lastPing).getTime() < 45e3 : false;
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
      percentage: Math.min(100, Math.round(g.currentCount / g.maxCapacity * 100)),
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
app.post("/api/gyms/register", async (req, res) => {
  const body = req.body;
  if (!body.name || !body.slug) {
    res.status(400).json({ success: false, message: "Nome da academia e slug/link s\xE3o obrigat\xF3rios." });
    return;
  }
  const cleanSlug = body.slug.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  for (const existing of gymsStore.values()) {
    if (existing.profile.slug === cleanSlug) {
      res.status(409).json({
        success: false,
        message: `O link/slug '${cleanSlug}' j\xE1 est\xE1 em uso por outra academia. Por favor escolha outro.`
      });
      return;
    }
  }
  const gymId = `gym-${cleanSlug}-${Date.now().toString(36)}`;
  const apiKey = generateApiKey(cleanSlug);
  const defaultHours = body.operatingHours || {
    weekdays: { open: "06:00", close: "23:00", isOpen: true },
    saturday: { open: "07:00", close: "17:00", isOpen: true },
    sunday: { open: "08:00", close: "14:00", isOpen: true }
  };
  const newProfile = {
    id: gymId,
    slug: cleanSlug,
    name: body.name.trim(),
    slogan: body.slogan?.trim() || "Monitoramento de Lota\xE7\xE3o em Tempo Real",
    city: body.city?.trim() || "Brasil",
    neighborhood: body.neighborhood?.trim() || "Unidade Principal",
    address: body.address?.trim() || "",
    contactPhone: body.contactPhone?.trim() || "",
    maxCapacity: Math.max(10, Math.min(1e3, Number(body.maxCapacity) || 80)),
    currentCount: Math.max(0, typeof body.initialCount === "number" ? body.initialCount : 0),
    turnstileLocked: false,
    isOpen: true,
    themeColor: body.themeColor || "cyan",
    logoEmoji: body.logoEmoji || "\u26A1",
    apiKey,
    ownerName: body.ownerName?.trim() || "Gestor Respons\xE1vel",
    ownerEmail: (body.ownerEmail?.trim() || "contato@academia.com").toLowerCase(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    operatingHours: defaultHours
  };
  const newGymState = {
    profile: newProfile,
    currentCount: newProfile.currentCount,
    maxCapacity: newProfile.maxCapacity,
    turnstileLocked: false,
    isOpen: true,
    lastAccessTime: (/* @__PURE__ */ new Date()).toISOString(),
    lastAccessType: "entry",
    pendingRelayTrigger: null,
    esp32: {
      connected: false,
      lastPing: null,
      ip: "192.168.1.100",
      rssi: -60,
      uptimeSeconds: 0,
      freeHeap: 185e3,
      entryButtonPresses: 0,
      exitButtonPresses: 0,
      deviceName: `ESP32_CATRACA_${cleanSlug.toUpperCase().replace(/-/g, "_")}`
    },
    accessLogs: [
      {
        id: `log-${gymId}-init`,
        gymId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type: "manual_adjust",
        source: "reception_manual",
        description: `Academia ${newProfile.name} cadastrada com sucesso no GymFlow SaaS!`,
        countAfter: newProfile.currentCount,
        status: "success"
      }
    ],
    announcements: [
      {
        id: `ann-${gymId}-welcome`,
        gymId,
        title: `Bem-vindos ao Monitor em Tempo Real da ${newProfile.name}!`,
        content: `Agora voc\xEA pode consultar o fluxo da academia e hor\xE1rios ideais para treinar diretamente pelo celular. Acesse o link ou escaneie o QR Code na recep\xE7\xE3o.`,
        category: "novidade",
        priority: "high",
        date: (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR"),
        author: newProfile.ownerName,
        pinned: true,
        active: true
      }
    ]
  };
  gymsStore.set(gymId, newGymState);
  const ownerUserId = `user-${cleanSlug}-owner`;
  const ownerUserRecord = {
    id: ownerUserId,
    email: newProfile.ownerEmail.toLowerCase(),
    password: body.ownerPassword?.trim() || "password123",
    name: newProfile.ownerName,
    role: "owner",
    gymId: newProfile.id,
    gymSlug: newProfile.slug,
    gymName: newProfile.name,
    phone: newProfile.contactPhone,
    createdAt: newProfile.createdAt
  };
  usersStore.set(newProfile.ownerEmail.toLowerCase(), ownerUserRecord);
  const authToken = `GF_AUTH_${ownerUserId}_${Date.now().toString(36)}`;
  activeTokensStore.set(authToken, ownerUserRecord);
  const planConfig = saasPlansStore.get("starter") || SAAS_PLANS.starter;
  const trialDueDate = /* @__PURE__ */ new Date();
  trialDueDate.setDate(trialDueDate.getDate() + 15);
  const trialDueDateStr = trialDueDate.toISOString().split("T")[0];
  const initialInvoice = {
    id: `inv-${gymId}-${Date.now().toString(36)}`,
    gymId,
    gymName: newProfile.name,
    amount: planConfig.price,
    dueDate: trialDueDateStr,
    status: "pending",
    referenceMonth: (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }),
    notes: "Primeira mensalidade p\xF3s-per\xEDodo de testes de 15 dias"
  };
  saasAccountsStore.set(gymId, {
    gymId,
    gymSlug: newProfile.slug,
    gymName: newProfile.name,
    ownerName: newProfile.ownerName,
    ownerEmail: newProfile.ownerEmail,
    ownerPhone: newProfile.contactPhone,
    city: newProfile.city,
    plan: "starter",
    planName: planConfig.name,
    monthlyFee: planConfig.price,
    status: "trial",
    isSystemBlocked: false,
    blockReason: void 0,
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
  const authUser = {
    id: ownerUserId,
    email: newProfile.ownerEmail,
    name: newProfile.ownerName,
    role: "owner",
    gymId: newProfile.id,
    gymSlug: newProfile.slug,
    gymName: newProfile.name,
    phone: newProfile.contactPhone,
    token: authToken,
    createdAt: newProfile.createdAt
  };
  saveGymsToFile();
  await Promise.allSettled([
    persistGymStateToSupabase(gymId, newGymState.accessLogs[0]),
    persistSaaSAccountToSupabase(gymId, initialInvoice)
  ]);
  res.status(201).json({
    success: true,
    message: "Academia cadastrada com sucesso!",
    gym: newProfile,
    publicStudentUrl: `/gym/${cleanSlug}`,
    apiKey,
    user: authUser,
    token: authToken
  });
});
app.get("/api/gyms/:gymIdOrSlug", (req, res) => {
  let gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    gymState = getDefaultGymState();
  }
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada." });
    return;
  }
  const isAuthorized = isAuthorizedForGym(req, gymState);
  const blockCheck = isGymSystemBlocked(gymState.profile.id);
  const hours = getGymTodayHours(gymState.profile.operatingHours);
  const percentage = Math.min(100, Math.round(gymState.currentCount / gymState.maxCapacity * 100));
  const status = calculateStatus(gymState.currentCount, gymState.maxCapacity);
  const isEsp32Alive = gymState.esp32.lastPing ? Date.now() - new Date(gymState.esp32.lastPing).getTime() < 45e3 : false;
  const sanitizedProfile = isAuthorized ? gymState.profile : {
    ...gymState.profile,
    apiKey: "***CHAVE_PRIVADA_RESTRITA***",
    ownerEmail: "gestao@privado"
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
      esp32Ip: isAuthorized ? gymState.esp32.ip : "192.168.*.*",
      pendingRelayTrigger: isAuthorized ? gymState.pendingRelayTrigger : null
    },
    announcements: gymState.announcements,
    // STRICT MULTI-TENANT RULE: Only authorized staff/owner sees private access logs!
    accessLogs: isAuthorized ? gymState.accessLogs : []
  });
});
app.post("/api/gyms/:gymIdOrSlug/settings", async (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada." });
    return;
  }
  if (!isAuthorizedForGym(req, gymState)) {
    res.status(403).json({
      success: false,
      message: "Acesso negado: Voc\xEA n\xE3o tem permiss\xE3o para alterar as configura\xE7\xF5es de outra academia."
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
  console.log(`[GymFlow API] Atualizando configura\xE7\xF5es para ${req.params.gymIdOrSlug}:`, req.body);
  if (name) gymState.profile.name = name.trim();
  if (slogan !== void 0) gymState.profile.slogan = slogan.trim();
  if (city) gymState.profile.city = city.trim();
  if (neighborhood !== void 0) gymState.profile.neighborhood = neighborhood.trim();
  if (address !== void 0) gymState.profile.address = address.trim();
  if (contactPhone !== void 0) gymState.profile.contactPhone = contactPhone.trim();
  if (themeColor) gymState.profile.themeColor = themeColor;
  if (logoEmoji) gymState.profile.logoEmoji = logoEmoji;
  if (operatingHours) gymState.profile.operatingHours = operatingHours;
  if (typeof maxCapacity === "number" && maxCapacity > 0) {
    gymState.maxCapacity = Math.min(1e3, Math.max(10, maxCapacity));
    gymState.profile.maxCapacity = gymState.maxCapacity;
  }
  if (typeof isOpen === "boolean") {
    gymState.isOpen = isOpen;
    gymState.profile.isOpen = isOpen;
  }
  saveGymsToFile();
  await persistGymStateToSupabase(gymState.profile.id);
  console.log(`[GymFlow API] Configura\xE7\xF5es de ${gymState.profile.name} salvas com sucesso.`);
  res.json({
    success: true,
    message: "Configura\xE7\xF5es da academia atualizadas com sucesso!",
    profile: gymState.profile,
    maxCapacity: gymState.maxCapacity,
    isOpen: gymState.isOpen
  });
});
app.post("/api/gyms/:gymIdOrSlug/turnstile/action", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada." });
    return;
  }
  if (!isAuthorizedForGym(req, gymState)) {
    res.status(403).json({
      success: false,
      message: "Acesso negado: A\xE7\xF5es de catraca e recep\xE7\xE3o s\xE3o exclusivas para a equipe desta academia."
    });
    return;
  }
  const { action, value, notes, operator = "Recep\xE7\xE3o" } = req.body;
  let message = "";
  let logType = "manual_adjust";
  let status = "success";
  switch (action) {
    case "remote_unlock_entry":
      if (gymState.currentCount < gymState.maxCapacity) {
        gymState.currentCount += 1;
        gymState.lastAccessTime = (/* @__PURE__ */ new Date()).toISOString();
        gymState.lastAccessType = "entry";
        gymState.pendingRelayTrigger = "entry";
        message = `Entrada liberada remotamente pela recep\xE7\xE3o (${operator})`;
        logType = "entry";
      } else {
        status = "warning";
        message = "Aviso: Entrada autorizada pela recep\xE7\xE3o acima da capacidade m\xE1xima sugerida";
        gymState.currentCount += 1;
        gymState.pendingRelayTrigger = "entry";
        logType = "entry";
      }
      break;
    case "remote_unlock_exit":
      if (gymState.currentCount > 0) {
        gymState.currentCount -= 1;
      }
      gymState.lastAccessTime = (/* @__PURE__ */ new Date()).toISOString();
      gymState.lastAccessType = "exit";
      gymState.pendingRelayTrigger = "exit";
      message = `Sa\xEDda liberada remotamente pela recep\xE7\xE3o (${operator})`;
      logType = "exit";
      break;
    case "toggle_lock":
      gymState.turnstileLocked = !gymState.turnstileLocked;
      message = gymState.turnstileLocked ? `Catracas TRAVADAS pela recep\xE7\xE3o (${operator})` : `Catracas DESTRAVADAS pela recep\xE7\xE3o (${operator})`;
      logType = gymState.turnstileLocked ? "lock" : "unlock";
      status = gymState.turnstileLocked ? "warning" : "success";
      break;
    case "set_lock":
      gymState.turnstileLocked = Boolean(value);
      message = gymState.turnstileLocked ? "Catracas Travadas" : "Catracas Destravadas";
      logType = gymState.turnstileLocked ? "lock" : "unlock";
      break;
    case "adjust_count":
      const delta = Number(value) || 0;
      gymState.currentCount = Math.max(0, Math.min(gymState.maxCapacity + 50, gymState.currentCount + delta));
      message = `Ajuste manual (${delta > 0 ? "+" + delta : delta}) por ${operator}`;
      logType = "manual_adjust";
      break;
    case "set_count":
      const exact = Number(value) || 0;
      gymState.currentCount = Math.max(0, Math.min(gymState.maxCapacity + 50, exact));
      message = `Contagem definida para ${exact} por ${operator}`;
      logType = "manual_adjust";
      break;
    case "reset_count":
      gymState.currentCount = 0;
      message = `Contagem ZERADA pela recep\xE7\xE3o (${operator})`;
      logType = "reset";
      status = "warning";
      break;
    case "toggle_open":
      gymState.isOpen = !gymState.isOpen;
      gymState.profile.isOpen = gymState.isOpen;
      message = gymState.isOpen ? `Academia marcada como ABERTA pela recep\xE7\xE3o (${operator})` : `Academia marcada como FECHADA pela recep\xE7\xE3o (${operator})`;
      logType = "manual_adjust";
      status = gymState.isOpen ? "success" : "warning";
      break;
    default:
      res.status(400).json({ success: false, message: "A\xE7\xE3o inv\xE1lida" });
      return;
  }
  const log = {
    id: `log-${gymState.profile.id}-${Date.now()}`,
    gymId: gymState.profile.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type: logType,
    source: "reception_manual",
    description: notes ? `${message} - Obs: ${notes}` : message,
    countAfter: gymState.currentCount,
    status
  };
  gymState.accessLogs.unshift(log);
  if (gymState.accessLogs.length > 50) gymState.accessLogs.pop();
  persistGymStateToSupabase(gymState.profile.id, log);
  res.json({
    success: true,
    message,
    currentCount: gymState.currentCount,
    turnstileLocked: gymState.turnstileLocked,
    pendingRelayTrigger: gymState.pendingRelayTrigger
  });
});
app.post("/api/gyms/:gymIdOrSlug/esp32/turnstile/entry", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada" });
    return;
  }
  const { source = "esp32_button", clientIp } = req.body;
  const blockCheck = isGymSystemBlocked(gymState.profile.id);
  if (blockCheck.blocked) {
    const log2 = {
      id: `log-${Date.now()}`,
      gymId: gymState.profile.id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "entry",
      source: source === "simulator" ? "simulator" : "esp32_button",
      description: `Tentativa de entrada bloqueada pelo SaaS Master: ${blockCheck.reason}`,
      countAfter: gymState.currentCount,
      status: "blocked"
    };
    gymState.accessLogs.unshift(log2);
    res.status(403).json({
      success: false,
      granted: false,
      blocked: true,
      message: blockCheck.reason || "Catraca bloqueada: Assinatura da academia suspensa pelo Administrador do SaaS.",
      currentCount: gymState.currentCount
    });
    return;
  }
  if (gymState.turnstileLocked) {
    const log2 = {
      id: `log-${Date.now()}`,
      gymId: gymState.profile.id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "entry",
      source: source === "simulator" ? "simulator" : "esp32_button",
      description: `Tentativa de entrada bloqueada: Catraca Travada (${gymState.profile.name})`,
      countAfter: gymState.currentCount,
      status: "blocked"
    };
    gymState.accessLogs.unshift(log2);
    res.status(403).json({
      success: false,
      granted: false,
      message: "Catraca bloqueada pela administra\xE7\xE3o",
      currentCount: gymState.currentCount
    });
    return;
  }
  if (gymState.currentCount >= gymState.maxCapacity) {
    const log2 = {
      id: `log-${Date.now()}`,
      gymId: gymState.profile.id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "entry",
      source: source === "simulator" ? "simulator" : "esp32_button",
      description: `Tentativa de entrada: Lota\xE7\xE3o M\xE1xima (${gymState.currentCount}/${gymState.maxCapacity})`,
      countAfter: gymState.currentCount,
      status: "warning"
    };
    gymState.accessLogs.unshift(log2);
    res.status(429).json({
      success: false,
      granted: false,
      message: "Lota\xE7\xE3o m\xE1xima atingida",
      currentCount: gymState.currentCount
    });
    return;
  }
  gymState.currentCount += 1;
  gymState.lastAccessTime = (/* @__PURE__ */ new Date()).toISOString();
  gymState.lastAccessType = "entry";
  gymState.esp32.entryButtonPresses += 1;
  if (clientIp) gymState.esp32.ip = clientIp;
  gymState.esp32.lastPing = (/* @__PURE__ */ new Date()).toISOString();
  const log = {
    id: `log-${Date.now()}`,
    gymId: gymState.profile.id,
    timestamp: gymState.lastAccessTime,
    type: "entry",
    source: source === "simulator" ? "simulator" : "esp32_button",
    description: source === "simulator" ? `Acesso via Simulador (${gymState.profile.name})` : `Acesso via Bot\xE3o F\xEDsico Entrada (${gymState.profile.name})`,
    countAfter: gymState.currentCount,
    status: "success"
  };
  gymState.accessLogs.unshift(log);
  if (gymState.accessLogs.length > 50) gymState.accessLogs.pop();
  persistGymStateToSupabase(gymState.profile.id, log);
  res.json({
    success: true,
    granted: true,
    action: "UNLOCK_RELAY_ENTRY",
    pulseMs: 1500,
    currentCount: gymState.currentCount,
    maxCapacity: gymState.maxCapacity,
    percentage: Math.round(gymState.currentCount / gymState.maxCapacity * 100),
    message: "Acesso autorizado - Bom treino!"
  });
});
app.post("/api/gyms/:gymIdOrSlug/esp32/turnstile/exit", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada" });
    return;
  }
  const { source = "esp32_button", clientIp } = req.body;
  if (gymState.currentCount > 0) {
    gymState.currentCount -= 1;
  }
  gymState.lastAccessTime = (/* @__PURE__ */ new Date()).toISOString();
  gymState.lastAccessType = "exit";
  gymState.esp32.exitButtonPresses += 1;
  if (clientIp) gymState.esp32.ip = clientIp;
  gymState.esp32.lastPing = (/* @__PURE__ */ new Date()).toISOString();
  const log = {
    id: `log-${Date.now()}`,
    gymId: gymState.profile.id,
    timestamp: gymState.lastAccessTime,
    type: "exit",
    source: source === "simulator" ? "simulator" : "esp32_button",
    description: source === "simulator" ? `Sa\xEDda via Simulador (${gymState.profile.name})` : `Sa\xEDda via Bot\xE3o F\xEDsico Sa\xEDda (${gymState.profile.name})`,
    countAfter: gymState.currentCount,
    status: "success"
  };
  gymState.accessLogs.unshift(log);
  if (gymState.accessLogs.length > 50) gymState.accessLogs.pop();
  persistGymStateToSupabase(gymState.profile.id, log);
  res.json({
    success: true,
    granted: true,
    action: "UNLOCK_RELAY_EXIT",
    pulseMs: 1500,
    currentCount: gymState.currentCount,
    maxCapacity: gymState.maxCapacity,
    percentage: Math.round(gymState.currentCount / gymState.maxCapacity * 100),
    message: "Sa\xEDda registrada - At\xE9 a pr\xF3xima!"
  });
});
app.post("/api/gyms/:gymIdOrSlug/esp32/ping", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada" });
    return;
  }
  const { ip, rssi, uptime, freeHeap, deviceName } = req.body;
  gymState.esp32.connected = true;
  gymState.esp32.lastPing = (/* @__PURE__ */ new Date()).toISOString();
  if (ip) gymState.esp32.ip = ip;
  if (typeof rssi === "number") gymState.esp32.rssi = rssi;
  if (typeof uptime === "number") gymState.esp32.uptimeSeconds = uptime;
  if (typeof freeHeap === "number") gymState.esp32.freeHeap = freeHeap;
  if (deviceName) gymState.esp32.deviceName = deviceName;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    supabase.from("esp32_devices").upsert({
      gym_id: gymState.profile.id,
      device_name: gymState.esp32.deviceName,
      device_key: req.headers["x-gym-key"] || "default",
      ip_address: gymState.esp32.ip,
      rssi: gymState.esp32.rssi,
      uptime_seconds: gymState.esp32.uptimeSeconds,
      free_heap: gymState.esp32.freeHeap,
      entry_count: gymState.esp32.entryButtonPresses,
      exit_count: gymState.esp32.exitButtonPresses,
      last_ping: gymState.esp32.lastPing,
      status: "online"
    }).then(({ error }) => {
      if (error) console.warn("[GymFlow Supabase] Erro ao persistir telemetria ESP32:", error.message);
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
    command: command || "NONE",
    relayPulseMs: command ? 2e3 : 0
  });
});
app.get("/api/gyms/:gymIdOrSlug/announcements", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada" });
    return;
  }
  res.json({ announcements: gymState.announcements });
});
app.post("/api/gyms/:gymIdOrSlug/announcements", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada" });
    return;
  }
  if (!isAuthorizedForGym(req, gymState)) {
    res.status(403).json({
      success: false,
      message: "Acesso negado: Apenas a administra\xE7\xE3o desta academia pode criar comunicados."
    });
    return;
  }
  const { title, content, category, priority, pinned, author } = req.body;
  if (!title || !content) {
    res.status(400).json({ success: false, message: "T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios" });
    return;
  }
  const newAnnouncement = {
    id: `ann-${Date.now()}`,
    gymId: gymState.profile.id,
    title,
    content,
    category: category || "importante",
    priority: priority || "medium",
    date: (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR"),
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
app.delete("/api/gyms/:gymIdOrSlug/announcements/:id", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug);
  if (!gymState) {
    res.status(404).json({ success: false, message: "Academia n\xE3o encontrada" });
    return;
  }
  if (!isAuthorizedForGym(req, gymState)) {
    res.status(403).json({
      success: false,
      message: "Acesso negado: Apenas a administra\xE7\xE3o desta academia pode excluir comunicados."
    });
    return;
  }
  gymState.announcements = gymState.announcements.filter((a) => a.id !== req.params.id);
  saveGymsToFile();
  res.json({ success: true, message: "Comunicado removido" });
});
app.get("/api/gyms/:gymIdOrSlug/arduino-code", (req, res) => {
  const gymState = getGymStateByIdOrSlug(req.params.gymIdOrSlug) || getDefaultGymState();
  if (!gymState) {
    res.status(404).json({
      success: false,
      message: "Nenhuma academia encontrada."
    });
    return;
  }
  if (!isAuthorizedForGym(req, gymState)) {
    res.status(403).json({
      success: false,
      message: "Acesso negado: O c\xF3digo Arduino e as chaves de API s\xE3o exclusivos para a administra\xE7\xE3o desta academia."
    });
    return;
  }
  const hostUrl = req.query.serverUrl || "http://192.168.1.100:3000";
  const wifiSSID = req.query.ssid || `${gymState.profile.name.replace(/\s+/g, "_").toUpperCase()}_WIFI`;
  const wifiPass = req.query.pass || "senha_academia";
  const gymSlug = gymState.profile.slug;
  const apiKey = gymState.profile.apiKey;
  const inoCode = `/*
 * =========================================================================
 * GymFlow SaaS - Firmware ESP32 para Catraca de Academia
 * Academia: ${gymState.profile.name} (Slug: ${gymSlug})
 * Chave de Autentica\xE7\xE3o: ${apiKey}
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Library Manager: ArduinoJson v6 ou v7

// --- Configura\xE7\xF5es de Rede Wi-Fi & SaaS ---
const char* ssid          = "${wifiSSID}";
const char* password      = "${wifiPass}";
const char* serverBaseUrl = "${hostUrl}";
const char* gymSlug       = "${gymSlug}";
const char* apiKey        = "${apiKey}";

// --- Mapeamento de Pinos (GPIO) ---
const int PIN_BTN_ENTRY   = 18; // Bot\xE3o F\xEDsico de Entrada
const int PIN_BTN_EXIT    = 19; // Bot\xE3o F\xEDsico de Sa\xEDda
const int PIN_RELAY_ENTRY = 22; // Rel\xE9 Solenoide Entrada
const int PIN_RELAY_EXIT  = 23; // Rel\xE9 Solenoide Sa\xEDda
const int PIN_LED_STATUS  = 2;  // LED status integrado
const int PIN_BUZZER      = 4;  // Buzzer sonoro de confirma\xE7\xE3o

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

  // Sa\xEDda
  if (digitalRead(PIN_BTN_EXIT) == LOW) {
    if (millis() - lastExitPress > DEBOUNCE_DELAY) {
      lastExitPress = millis();
      Serial.println("[ESP32] <- Botao Saida Acionado!");
      sendAccessEvent("/esp32/turnstile/exit", PIN_RELAY_EXIT);
    }
  }

  // Heartbeat & Comandos da Recep\xE7\xE3o
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
app.get("/api/occupancy", (req, res) => {
  const gymState = getDefaultGymState();
  if (!gymState) {
    res.json({
      gymId: "",
      gymName: "Nenhuma Academia",
      gymSlug: "",
      themeColor: "cyan",
      logoEmoji: "\u26A1",
      currentCount: 0,
      maxCapacity: 80,
      status: "empty",
      percentage: 0,
      turnstileLocked: false,
      isOpen: false,
      openingTimeToday: "06:00",
      closingTimeToday: "23:00",
      lastAccessTime: null,
      lastAccessType: null,
      esp32Connected: false,
      esp32LastPing: null,
      esp32DeviceName: "ESP32_CATRACA",
      esp32Ip: "192.168.1.100",
      pendingRelayTrigger: null
    });
    return;
  }
  const hours = getGymTodayHours(gymState.profile.operatingHours);
  const percentage = Math.min(100, Math.round(gymState.currentCount / gymState.maxCapacity * 100));
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
app.post("/api/turnstile/action", (req, res) => {
  const gymState = getDefaultGymState();
  if (!gymState) {
    res.status(404).json({ success: false, message: "Nenhuma academia cadastrada." });
    return;
  }
  if (!isAuthorizedForGym(req, gymState)) {
    res.status(403).json({ success: false, message: "Acesso n\xE3o autorizado para esta academia." });
    return;
  }
  req.params.gymIdOrSlug = gymState.profile.id;
  const { action, value, notes, operator = "Recep\xE7\xE3o" } = req.body;
  if (action === "remote_unlock_entry") {
    gymState.currentCount += 1;
    gymState.lastAccessTime = (/* @__PURE__ */ new Date()).toISOString();
    gymState.lastAccessType = "entry";
  } else if (action === "remote_unlock_exit") {
    if (gymState.currentCount > 0) gymState.currentCount -= 1;
    gymState.lastAccessTime = (/* @__PURE__ */ new Date()).toISOString();
    gymState.lastAccessType = "exit";
  } else if (action === "toggle_lock") {
    gymState.turnstileLocked = !gymState.turnstileLocked;
  } else if (action === "adjust_count") {
    gymState.currentCount = Math.max(0, gymState.currentCount + (Number(value) || 0));
  } else if (action === "set_count") {
    gymState.currentCount = Math.max(0, Number(value) || 0);
  } else if (action === "reset_count") {
    gymState.currentCount = 0;
  }
  res.json({
    success: true,
    message: "A\xE7\xE3o executada",
    currentCount: gymState.currentCount,
    turnstileLocked: gymState.turnstileLocked
  });
});
app.get("/api/access-logs", (req, res) => {
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
app.get("/api/announcements", (req, res) => {
  const gymState = getDefaultGymState();
  res.json({ announcements: gymState ? gymState.announcements : [] });
});
app.get("/api/saas/metrics", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const accounts = Array.from(saasAccountsStore.values());
  const totalGyms = accounts.length;
  const activeGyms = accounts.filter((a) => a.status === "active" && !a.isSystemBlocked).length;
  const blockedGyms = accounts.filter((a) => a.isSystemBlocked || a.status === "blocked").length;
  const overdueGyms = accounts.filter((a) => a.status === "overdue").length;
  const trialGyms = accounts.filter((a) => a.status === "trial").length;
  const totalMRR = accounts.filter((a) => (a.status === "active" || a.status === "trial") && !a.isSystemBlocked).reduce((sum, a) => sum + (Number(a.monthlyFee) || 0), 0);
  let totalRevenueThisMonth = 0;
  let pendingRevenue = 0;
  accounts.forEach((acc) => {
    acc.invoices.forEach((inv) => {
      if (inv.status === "paid") {
        totalRevenueThisMonth += Number(inv.amount) || 0;
      } else if (inv.status === "pending" || inv.status === "overdue") {
        pendingRevenue += Number(inv.amount) || 0;
      }
    });
  });
  const delinquencyRate = totalGyms > 0 ? Math.round(overdueGyms / totalGyms * 100) : 0;
  let totalStudentsOnline = 0;
  for (const gym of gymsStore.values()) {
    totalStudentsOnline += gym.currentCount || 0;
  }
  const metrics = {
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
app.get("/api/saas/gyms", (req, res) => {
  const user = getAuthUserFromRequest(req);
  console.log(`[SaaS Master] Request from ${user?.email}, role: ${user?.role}. Current store size: ${saasAccountsStore.size}`);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const list = [];
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
app.post("/api/saas/gyms", async (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const body = req.body;
  if (!body.name || !body.ownerEmail || !body.ownerName) {
    res.status(400).json({ success: false, message: "Nome da academia, e-mail e nome do propriet\xE1rio s\xE3o obrigat\xF3rios." });
    return;
  }
  const cleanSlug = (body.slug || body.name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  for (const g of gymsStore.values()) {
    if (g.profile.slug === cleanSlug) {
      res.status(409).json({ success: false, message: `O slug '${cleanSlug}' j\xE1 est\xE1 em uso por outra academia.` });
      return;
    }
  }
  const gymId = `gym-${cleanSlug}-${Date.now().toString(36)}`;
  const apiKey = `GF_LIVE_KEY_${cleanSlug.toUpperCase().replace(/-/g, "_")}_${Date.now().toString(36)}`;
  const selectedPlanId = body.plan || "starter";
  const planConfig = SAAS_PLANS[selectedPlanId] || SAAS_PLANS.starter;
  const monthlyFee = typeof body.monthlyFee === "number" ? body.monthlyFee : planConfig.price;
  const trialDays = typeof body.trialDays === "number" ? body.trialDays : 15;
  const defaultHours = {
    weekdays: { open: "06:00", close: "23:00", isOpen: true },
    saturday: { open: "08:00", close: "18:00", isOpen: true },
    sunday: { open: "08:00", close: "14:00", isOpen: true }
  };
  const newProfile = {
    id: gymId,
    name: body.name.trim(),
    slug: cleanSlug,
    slogan: body.slogan?.trim() || "A sua melhor experi\xEAncia de treino",
    city: body.city?.trim() || "S\xE3o Paulo - SP",
    neighborhood: body.neighborhood?.trim() || "Centro",
    address: body.address?.trim() || "Avenida Principal, 1000",
    contactPhone: body.contactPhone?.trim() || "(11) 98765-4321",
    maxCapacity: Number(body.maxCapacity) || 120,
    currentCount: 0,
    turnstileLocked: false,
    isOpen: true,
    themeColor: body.themeColor || "cyan",
    logoEmoji: body.logoEmoji || "\u{1F3CB}\uFE0F",
    operatingHours: defaultHours,
    apiKey,
    ownerEmail: body.ownerEmail.trim().toLowerCase(),
    ownerName: body.ownerName.trim(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const newGymState = {
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
      ip: "192.168.1.100",
      rssi: -60,
      uptimeSeconds: 0,
      freeHeap: 18e4,
      entryButtonPresses: 0,
      exitButtonPresses: 0,
      deviceName: `ESP32_CATRACA_${cleanSlug.toUpperCase().replace(/-/g, "_")}`
    },
    accessLogs: [
      {
        id: `log-${gymId}-created`,
        gymId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type: "manual_adjust",
        source: "reception_manual",
        description: `Academia ${newProfile.name} cadastrada via Master Admin SaaS!`,
        countAfter: 0,
        status: "success"
      }
    ],
    announcements: [
      {
        id: `ann-${gymId}-welcome`,
        gymId,
        title: `Bem-vindos ao GymFlow da ${newProfile.name}!`,
        content: `Painel em tempo real ativo. Alunos e equipe agora contam com monitoramento de catraca e fluxo.`,
        category: "novidade",
        priority: "high",
        date: (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR"),
        author: newProfile.ownerName,
        pinned: true,
        active: true
      }
    ]
  };
  gymsStore.set(gymId, newGymState);
  const ownerUserId = `user-${cleanSlug}-owner`;
  const ownerRecord = {
    id: ownerUserId,
    email: newProfile.ownerEmail.toLowerCase(),
    password: body.ownerPassword?.trim() || "password123",
    name: newProfile.ownerName,
    role: "owner",
    gymId: newProfile.id,
    gymSlug: newProfile.slug,
    gymName: newProfile.name,
    phone: newProfile.contactPhone,
    createdAt: newProfile.createdAt
  };
  usersStore.set(newProfile.ownerEmail.toLowerCase(), ownerRecord);
  saveGymsToFile();
  const trialDueDate = /* @__PURE__ */ new Date();
  trialDueDate.setDate(trialDueDate.getDate() + trialDays);
  const trialDueDateStr = trialDueDate.toISOString().split("T")[0];
  const initialInvoice = {
    id: `inv-${gymId}-${Date.now().toString(36)}`,
    gymId,
    gymName: newProfile.name,
    amount: monthlyFee,
    dueDate: trialDueDateStr,
    status: "pending",
    referenceMonth: (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }),
    notes: `Fatura inicial do plano ${planConfig.name} (${trialDays} dias de teste).`
  };
  const saasAccount = {
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
    status: trialDays > 0 ? "trial" : "active",
    isSystemBlocked: false,
    blockReason: void 0,
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
  saveGymsToFile();
  await Promise.allSettled([
    persistGymStateToSupabase(gymId, newGymState.accessLogs[0]),
    persistSaaSAccountToSupabase(gymId, initialInvoice)
  ]);
  res.status(201).json({
    success: true,
    message: `Academia ${newProfile.name} cadastrada com sucesso com plano ${planConfig.name}!`,
    gym: { ...saasAccount, currentCount: 0 },
    profile: newProfile,
    apiKey
  });
});
app.patch("/api/saas/gyms/:gymId/subscription", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const account = saasAccountsStore.get(req.params.gymId);
  if (!account) {
    res.status(404).json({ success: false, message: "Conta SaaS da academia n\xE3o encontrada." });
    return;
  }
  const { plan, monthlyFee, status, nextDueDate, turnstilesLimit } = req.body;
  if (plan) {
    account.plan = plan;
    const planConfig = SAAS_PLANS[plan];
    if (planConfig) {
      account.planName = planConfig.name;
      if (monthlyFee === void 0) account.monthlyFee = planConfig.price;
      if (turnstilesLimit === void 0) account.turnstilesLimit = planConfig.turnstilesLimit;
    }
  }
  if (typeof monthlyFee === "number") account.monthlyFee = monthlyFee;
  if (status) account.status = status;
  if (nextDueDate) account.nextDueDate = nextDueDate;
  if (typeof turnstilesLimit === "number") account.turnstilesLimit = turnstilesLimit;
  saveGymsToFile();
  persistSaaSAccountToSupabase(req.params.gymId).catch(console.warn);
  res.json({ success: true, message: "Assinatura atualizada com sucesso!", account });
});
app.post("/api/saas/gyms/:gymId/block", async (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const account = saasAccountsStore.get(req.params.gymId);
  if (!account) {
    res.status(404).json({ success: false, message: "Conta da academia n\xE3o encontrada." });
    return;
  }
  const { blocked, reason } = req.body;
  const isBlocking = Boolean(blocked);
  account.isSystemBlocked = isBlocking;
  account.blockReason = isBlocking ? reason || "Acesso suspenso pelo Administrador Geral do SaaS por pend\xEAncia financeira ou administrativa." : void 0;
  account.blockedAt = isBlocking ? (/* @__PURE__ */ new Date()).toISOString() : null;
  account.status = isBlocking ? "blocked" : account.status === "blocked" ? "active" : account.status;
  const gymState = gymsStore.get(account.gymId);
  if (gymState) {
    gymState.turnstileLocked = isBlocking;
    gymState.accessLogs.unshift({
      id: `log-${Date.now()}`,
      gymId: account.gymId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: isBlocking ? "lock" : "unlock",
      source: "reception_manual",
      description: isBlocking ? `[SaaS Master] Academia e catracas suspensas pelo Administrador Geral: ${account.blockReason}` : `[SaaS Master] Academia e catracas reativadas pelo Administrador Geral.`,
      countAfter: gymState.currentCount,
      status: isBlocking ? "blocked" : "success"
    });
    persistGymStateToSupabase(gymState.profile.id, gymState.accessLogs[0]).catch(console.warn);
  }
  saveGymsToFile();
  persistSaaSAccountToSupabase(account.gymId).catch(console.warn);
  res.json({
    success: true,
    message: isBlocking ? `Academia '${account.gymName}' foi BLOQUEADA com sucesso. Catracas e acessos foram suspensos!` : `Academia '${account.gymName}' foi DESBLOQUEADA e reativada com sucesso!`,
    account
  });
});
app.post("/api/saas/gyms/:gymId/invoices/:invoiceId/pay", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const account = saasAccountsStore.get(req.params.gymId);
  if (!account) {
    res.status(404).json({ success: false, message: "Conta da academia n\xE3o encontrada." });
    return;
  }
  const invoice = account.invoices.find((i) => i.id === req.params.invoiceId);
  if (!invoice) {
    res.status(404).json({ success: false, message: "Fatura n\xE3o encontrada." });
    return;
  }
  const { paymentMethod = "pix", notes } = req.body;
  invoice.status = "paid";
  invoice.paidDate = (/* @__PURE__ */ new Date()).toISOString();
  invoice.paymentMethod = paymentMethod;
  if (notes) invoice.notes = notes;
  account.lastPaymentDate = invoice.paidDate;
  if (account.status === "overdue" || account.status === "trial") {
    account.status = "active";
  }
  const currentDue = new Date(account.nextDueDate || Date.now());
  currentDue.setDate(currentDue.getDate() + 30);
  account.nextDueDate = currentDue.toISOString().split("T")[0];
  if (account.isSystemBlocked && req.body.unblockGym) {
    account.isSystemBlocked = false;
    account.blockReason = void 0;
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
app.post("/api/saas/gyms/:gymId/invoices", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const account = saasAccountsStore.get(req.params.gymId);
  if (!account) {
    res.status(404).json({ success: false, message: "Conta da academia n\xE3o encontrada." });
    return;
  }
  const { amount, dueDate, referenceMonth, notes } = req.body;
  const newInvoice = {
    id: `inv-${account.gymId}-${Date.now().toString(36)}`,
    gymId: account.gymId,
    gymName: account.gymName,
    amount: Number(amount) || account.monthlyFee,
    dueDate: dueDate || account.nextDueDate,
    status: "pending",
    referenceMonth: referenceMonth || (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }),
    notes: notes || "Fatura avulsa gerada pelo Administrador Master"
  };
  account.invoices.unshift(newInvoice);
  res.status(201).json({
    success: true,
    message: "Nova fatura emitida com sucesso!",
    invoice: newInvoice,
    account
  });
});
app.post("/api/saas/gyms/:gymId/extend-trial", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  const account = saasAccountsStore.get(req.params.gymId);
  if (!account) {
    res.status(404).json({ success: false, message: "Conta da academia n\xE3o encontrada." });
    return;
  }
  const { days = 15 } = req.body;
  const targetDate = new Date(account.trialEndsAt || account.nextDueDate || Date.now());
  targetDate.setDate(targetDate.getDate() + Number(days));
  const newDateStr = targetDate.toISOString().split("T")[0];
  account.trialEndsAt = newDateStr;
  account.nextDueDate = newDateStr;
  account.status = "trial";
  account.isSystemBlocked = false;
  res.json({
    success: true,
    message: `Per\xEDodo de teste prorrogado por +${days} dias (at\xE9 ${newDateStr})!`,
    account
  });
});
app.delete("/api/saas/gyms/:gymId", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso restrito ao Administrador Geral do SaaS." });
    return;
  }
  saasAccountsStore.delete(req.params.gymId);
  gymsStore.delete(req.params.gymId);
  saveGymsToFile();
  const supabase = getSupabaseAdmin();
  if (supabase) {
    Promise.resolve(supabase.from("gyms").delete().eq("id", req.params.gymId)).catch(console.warn);
    Promise.resolve(supabase.from("saas_accounts").delete().eq("gym_id", req.params.gymId)).catch(console.warn);
  }
  res.json({ success: true, message: "Academia removida permanentemente do SaaS." });
});
app.get("/api/saas/plans", (req, res) => {
  res.json({ plans: Array.from(saasPlansStore.values()) });
});
app.post("/api/saas/plans/:planId", (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== "superadmin") {
    res.status(403).json({ success: false, message: "Acesso negado: Apenas o Administrador Geral pode editar planos." });
    return;
  }
  const { planId } = req.params;
  const planUpdate = req.body;
  const existing = saasPlansStore.get(planId);
  if (!existing) {
    res.status(404).json({ success: false, message: "Plano n\xE3o encontrado." });
    return;
  }
  const updated = { ...existing, ...planUpdate };
  saasPlansStore.set(planId, updated);
  for (const account of saasAccountsStore.values()) {
    if (account.plan === planId) {
      account.planName = updated.name;
    }
  }
  res.json({
    success: true,
    message: `Plano ${updated.name} atualizado com sucesso!`,
    plan: updated
  });
});
app.all(["/api", "/api/*"], (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota da API n\xE3o encontrada: ${req.method} ${req.path}`
  });
});
app.use((err, req, res, next) => {
  if (req.path.startsWith("/api") || req.url.startsWith("/api")) {
    console.error("[GymFlow API Error]", err);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor da API.",
      error: err?.message || "Internal Server Error"
    });
    return;
  }
  next(err);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !isServerless) {
    const vitePkg = "vite";
    const viteModule = await import(
      /* @vite-ignore */
      vitePkg
    );
    const createViteServer = viteModule.createServer;
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!isServerless) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  syncGymsFromSupabase().catch((err) => {
    console.error("[GymFlow Supabase] Initial sync failed:", err);
  });
  if (!isServerless) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[GymFlow SaaS Server] Running on http://localhost:${PORT}`);
    });
  }
}
if (!isServerless) {
  startServer().catch((err) => {
    console.error("[GymFlow SaaS Server] Failed to start:", err);
  });
}
var server_default = app;

// api-vercel.ts
async function handler(req, res) {
  return new Promise((resolve, reject) => {
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
    res.on("error", (err) => {
      console.error("[Vercel API Stream Error]", err);
      reject(err);
    });
    try {
      const origUrl = req.headers["x-forwarded-uri"] || req.headers["x-original-url"] || req.headers["x-vercel-original-url"] || req.originalUrl || req.url;
      if (origUrl && typeof origUrl === "string") {
        if (origUrl.startsWith("/api")) {
          req.url = origUrl;
        } else {
          req.url = "/api" + (origUrl.startsWith("/") ? origUrl : "/" + origUrl);
        }
      }
      server_default(req, res, (err) => {
        if (err) {
          console.error("[Vercel Express Error]", err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "Erro interno ao processar requisi\xE7\xE3o na nuvem.",
              error: err?.message || String(err)
            });
          }
        } else if (!res.headersSent) {
          res.status(404).json({
            success: false,
            message: `Rota da API n\xE3o encontrada: ${req.method} ${req.url}`
          });
        }
        resolve();
      });
    } catch (err) {
      console.error("[Vercel Serverless Handler Exception]", err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Falha cr\xEDtica na execu\xE7\xE3o da fun\xE7\xE3o serverless.",
          error: err?.message || String(err)
        });
      }
      resolve();
    }
  });
}
export {
  handler as default
};
