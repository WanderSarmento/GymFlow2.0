import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfigStatus } from '../types';

let supabaseInstance: SupabaseClient | null = null;

// Clean and normalize Supabase project URL
export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // If user pasted a dashboard URL (e.g. https://supabase.com/dashboard/project/rwcqjaxwxbujkxdayifn)
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // If user pasted just the project ID (e.g. rwcqjaxwxbujkxdayifn)
  if (/^[a-z0-9]{20}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // Strip trailing endpoints like /rest/v1, /auth/v1, /gyms, trailing slashes
  url = url
    .replace(/\/rest\/v1(\/.*)?$/i, '')
    .replace(/\/auth\/v1(\/.*)?$/i, '')
    .replace(/\/+$/, '');

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
}

// Get Supabase credentials from Env or LocalStorage overrides
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('gymflow_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('gymflow_supabase_anon_key') || '' : '';

  const rawUrl = storedUrl || envUrl;
  return {
    url: cleanSupabaseUrl(rawUrl),
    anonKey: (storedKey || envKey).trim()
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.includes('supabase.co') && anonKey.length > 20);
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey || !url.includes('supabase.co')) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } catch (err) {
      console.warn('Erro ao inicializar cliente Supabase:', err);
      return null;
    }
  }

  return supabaseInstance;
}

// Reset instance if user updates custom config
export function updateSupabaseCredentials(url: string, anonKey: string): SupabaseClient | null {
  const sanitizedUrl = cleanSupabaseUrl(url);
  if (typeof window !== 'undefined') {
    if (sanitizedUrl) localStorage.setItem('gymflow_supabase_url', sanitizedUrl);
    else localStorage.removeItem('gymflow_supabase_url');

    if (anonKey) localStorage.setItem('gymflow_supabase_anon_key', anonKey.trim());
    else localStorage.removeItem('gymflow_supabase_anon_key');
  }

  supabaseInstance = null;
  return getSupabaseClient();
}

// Test connection live against Supabase
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<SupabaseConfigStatus> {
  const { url: rawUrl, anonKey } = (customUrl && customKey) ? { url: customUrl, anonKey: customKey.trim() } : getSupabaseCredentials();
  const url = cleanSupabaseUrl(rawUrl);

  console.log('[GymFlow Supabase] Iniciando teste para:', url);

  if (!url || !anonKey) {
    return {
      isConfigured: false,
      hasAnonKey: Boolean(anonKey),
      status: 'not_configured',
      message: 'Supabase URL ou Chave Anônima (anon key) não preenchidos.'
    };
  }

  // Basic validation
  if (!url.includes('.supabase.co') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return {
      isConfigured: false,
      hasAnonKey: true,
      status: 'error',
      message: 'A URL não parece ser uma URL válida de um projeto Supabase (deve terminar em .supabase.co).'
    };
  }

  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false }
    });

    // Try a simple ping to the health endpoint or a simple select
    const { error } = await testClient.from('gyms').select('id').limit(1);

    if (error) {
      console.error('[GymFlow Supabase] Erro retornado pela API:', error);
      
      // Table doesn't exist - this is a PARTIAL SUCCESS (connected but needs schema)
      if (error.code === '42P01' || error.message?.includes('relation "public.gyms" does not exist')) {
        return {
          isConfigured: true,
          url,
          hasAnonKey: true,
          status: 'connected',
          message: 'CONECTADO! O projeto foi encontrado, mas as tabelas ainda não foram criadas. Clique na aba "Script SQL" e execute o código no Supabase.'
        };
      }

      // Invalid Key
      if (error.code === '401' || error.code === 'PGRST301' || error.message?.includes('JWT')) {
        return {
          isConfigured: false,
          url,
          hasAnonKey: true,
          status: 'error',
          message: 'Erro de Autenticação: A "Anon Key" informada é inválida ou expirou.'
        };
      }

      return {
        isConfigured: false,
        url,
        hasAnonKey: true,
        status: 'error',
        message: `Erro do Supabase (${error.code}): ${error.message}`
      };
    }

    return {
      isConfigured: true,
      url,
      hasAnonKey: true,
      status: 'connected',
      message: 'CONEXÃO TOTAL! Supabase conectado e tabelas prontas para uso.'
    };
  } catch (err: any) {
    console.error('[GymFlow Supabase] Erro de rede/exceção:', err);
    const rawMsg = err?.message || String(err);
    let friendlyMessage = `Erro de rede: ${rawMsg}`;
    
    if (rawMsg.includes('Failed to fetch')) {
      friendlyMessage = 'Não foi possível alcançar o servidor do Supabase. Verifique se a URL está correta e se você tem acesso à internet.';
    } else if (rawMsg.includes('Unexpected token') || rawMsg.includes('HTML')) {
      friendlyMessage = 'A URL informada retornou uma página web em vez de uma API. Certifique-se de copiar a "Project URL" e não a URL do painel de controle.';
    }

    return {
      isConfigured: false,
      url,
      hasAnonKey: true,
      status: 'error',
      message: friendlyMessage
    };
  }
}
