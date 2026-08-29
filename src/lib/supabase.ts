import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfigStatus } from '../types';

let supabaseInstance: SupabaseClient | null = null;

// Get Supabase credentials from Env or LocalStorage overrides
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('gymflow_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('gymflow_supabase_anon_key') || '' : '';

  return {
    url: storedUrl || envUrl,
    anonKey: storedKey || envKey
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
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('gymflow_supabase_url', url.trim());
    else localStorage.removeItem('gymflow_supabase_url');

    if (anonKey) localStorage.setItem('gymflow_supabase_anon_key', anonKey.trim());
    else localStorage.removeItem('gymflow_supabase_anon_key');
  }

  supabaseInstance = null;
  return getSupabaseClient();
}

// Test connection live against Supabase
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<SupabaseConfigStatus> {
  const { url, anonKey } = customUrl && customKey ? { url: customUrl, anonKey: customKey } : getSupabaseCredentials();

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
    return {
      isConfigured: false,
      url,
      hasAnonKey: true,
      status: 'error',
      message: `Erro de rede ou URL inválida: ${err?.message || err}`
    };
  }
}
