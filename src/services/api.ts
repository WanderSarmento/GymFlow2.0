import { OccupancyData, AccessLog, Announcement, DayCrowdStats, GymProfile, CreateGymInput, AuthUser, LoginCredentials, PasswordResetRequest, SupabaseConfigStatus } from '../types';
import { WEEKLY_CROWD_DATA, INITIAL_ANNOUNCEMENTS, INITIAL_GYMS } from '../data/gymData';
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

export async function loginUser(credentials: LoginCredentials): Promise<{ success: boolean; message: string; user?: AuthUser; token?: string }> {
  // If Supabase is connected, optionally try Supabase Auth first, fallback to API
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (data?.user && !error) {
        // Fetch matching gym profile from Supabase
        const { data: gymData } = await supabase
          .from('gyms')
          .select('*')
          .eq('owner_email', credentials.email)
          .maybeSingle();

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || credentials.email,
          name: data.user.user_metadata?.full_name || gymData?.name || 'Gestor da Academia',
          role: 'owner',
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
    const data = await res.json();
    if (data.success && data.user) {
      saveAuthSession(data.user, data.token);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Não foi possível conectar ao servidor de autenticação.'
    };
  }
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
    return await res.json();
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
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: 'Erro ao redefinir senha. Tente novamente.'
    };
  }
}

export async function checkSupabaseStatus(): Promise<SupabaseConfigStatus> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) throw new Error('Falha ao checar status');
    return await res.json();
  } catch {
    return {
      isConfigured: isSupabaseConfigured(),
      hasAnonKey: isSupabaseConfigured(),
      status: isSupabaseConfigured() ? 'connected' : 'not_configured',
      message: 'Status verificado localmente.'
    };
  }
}

export async function fetchGyms(): Promise<GymProfile[]> {
  try {
    const res = await fetch('/api/gyms');
    if (!res.ok) throw new Error('Falha ao listar academias');
    const data = await res.json();
    return data.gyms;
  } catch (err) {
    console.warn('Usando academias iniciais offline:', err);
    return INITIAL_GYMS;
  }
}

export async function registerGym(input: CreateGymInput): Promise<{ success: boolean; message: string; gym?: GymProfile; publicStudentUrl?: string; apiKey?: string; user?: AuthUser; token?: string }> {
  try {
    const res = await fetch('/api/gyms/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
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
    if (!res.ok) throw new Error('Academia não encontrada');
    return await res.json();
  } catch (err) {
    console.warn(`Fallback para academia '${gymIdOrSlug}':`, err);
    const found = INITIAL_GYMS.find(g => g.slug === gymIdOrSlug || g.id === gymIdOrSlug) || INITIAL_GYMS[0];
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
}

export async function updateGymSettings(gymIdOrSlug: string, settings: Partial<GymProfile>): Promise<{ success: boolean; message: string; profile?: GymProfile }> {
  try {
    const res = await fetch(`/api/gyms/${encodeURIComponent(gymIdOrSlug)}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    return await res.json();
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
    const data = await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    if (!res.ok) throw new Error('Falha ao obter logs de acesso');
    const data = await res.json();
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
    if (!res.ok) throw new Error('Falha ao obter comunicados');
    const data = await res.json();
    return data.announcements || [];
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
    if (!res.ok) throw new Error('Erro ao criar comunicado');
    const data = await res.json();
    return data.announcement;
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
    const data = await res.json();
    return data.code;
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

export async function fetchSaaSMetrics(): Promise<import('../types').SaaSMetrics | null> {
  try {
    const res = await fetch('/api/saas/metrics', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Não autorizado para métricas do SaaS');
    const data = await res.json();
    return data.metrics;
  } catch (err) {
    console.error('Erro ao buscar métricas SaaS:', err);
    return null;
  }
}

export async function fetchSaaSGyms(): Promise<import('../types').GymSaaSAccount[]> {
  try {
    const res = await fetch('/api/saas/gyms', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Não autorizado para gerenciar academias');
    const data = await res.json();
    return data.gyms || [];
  } catch (err) {
    console.error('Erro ao buscar contas SaaS de academias:', err);
    return [];
  }
}

export async function createSaaSGym(input: import('../types').CreateSaaSGymInput): Promise<{ success: boolean; message: string; gym?: import('../types').GymSaaSAccount; apiKey?: string }> {
  try {
    const res = await fetch('/api/saas/gyms', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input)
    });
    const data = await res.json();
    return data;
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao remover academia do sistema' };
  }
}


