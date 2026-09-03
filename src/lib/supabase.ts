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
  const { url: rawUrl, anonKey } = customUrl && customKey ? { url: customUrl, anonKey: customKey.trim() } : getSupabaseCredentials();
  const url = cleanSupabaseUrl(rawUrl);

  if (!url || !anonKey) {
    return {
      isConfigured: false,
      hasAnonKey: Boolean(anonKey),
      status: 'not_configured',
      message: 'Supabase URL ou Chave Anônima (anon key) não preenchidos.'
    };
  }

  try {
    const testClient = createClient(url, anonKey);
    // Simple light query to check connection
    const { error } = await testClient.from('gyms').select('count', { count: 'exact', head: true });

    if (error) {
      // If table doesn't exist yet, it's connected to Supabase project, but needs schema migration
      if (error.code === '42P01' || error.message.includes('relation "public.gyms" does not exist')) {
        return {
          isConfigured: true,
          url,
          hasAnonKey: true,
          status: 'connected',
          message: 'Conectado ao Supabase com sucesso! (Aviso: Execute o Script SQL para criar as tabelas)'
        };
      }
      return {
        isConfigured: false,
        url,
        hasAnonKey: true,
        status: 'error',
        message: `Falha na autenticação Supabase: ${error.message}`
      };
    }

    return {
      isConfigured: true,
      url,
      hasAnonKey: true,
      status: 'connected',
      message: 'Conexão com o Supabase estabelecida e tabelas verificadas com sucesso!'
    };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    let friendlyMessage = `Erro de rede ou URL inválida: ${rawMsg}`;
    
    if (rawMsg.includes('Unexpected token') || rawMsg.includes('is not valid JSON') || rawMsg.includes('The page')) {
      friendlyMessage = 'A URL informada não respondeu com a API REST do Supabase (o servidor retornou uma página web/HTML em vez de JSON). Certifique-se de usar a URL do projeto (https://[projeto].supabase.co) e não o link do painel/dashboard.';
    } else if (rawMsg.includes('Failed to fetch')) {
      friendlyMessage = 'Não foi possível conectar ao endereço do Supabase. Verifique a conexão com a internet e se a URL está correta.';
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
