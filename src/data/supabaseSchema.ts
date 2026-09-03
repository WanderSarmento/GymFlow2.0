export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- GymFlow SaaS - Schema SQL Atualizado para Supabase (PostgreSQL)
-- Versão 2.0: Multi-Tenancy, Master SaaS Admin, Faturas e Bloqueio Remoto
-- =========================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. TABELA: GYMS (Academias cadastradas no SaaS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.gyms (
    id TEXT PRIMARY KEY DEFAULT ('gym-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slogan TEXT DEFAULT 'Monitoramento de Lotação em Tempo Real',
    city TEXT NOT NULL,
    neighborhood TEXT DEFAULT 'Unidade Principal',
    address TEXT,
    contact_phone TEXT,
    max_capacity INTEGER NOT NULL DEFAULT 80 CHECK (max_capacity > 0),
    current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
    turnstile_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    is_system_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason TEXT,
    blocked_at TIMESTAMPTZ,
    theme_color TEXT NOT NULL DEFAULT 'cyan' CHECK (theme_color IN ('cyan', 'emerald', 'violet', 'amber', 'rose', 'blue')),
    logo_emoji TEXT NOT NULL DEFAULT '⚡',
    api_key TEXT UNIQUE NOT NULL DEFAULT ('GF_KEY_' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 16))),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    operating_hours JSONB DEFAULT '{
        "weekdays": {"open": "06:00", "close": "23:00", "isOpen": true},
        "saturday": {"open": "07:00", "close": "17:00", "isOpen": true},
        "sunday": {"open": "08:00", "close": "14:00", "isOpen": true}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caso a tabela gyms já exista no seu Supabase, adicione as novas colunas:
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS is_system_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gyms_slug ON public.gyms(slug);
CREATE INDEX IF NOT EXISTS idx_gyms_api_key ON public.gyms(api_key);
CREATE INDEX IF NOT EXISTS idx_gyms_owner_email ON public.gyms(owner_email);

-- =========================================================================
-- 2. TABELA: GYM_USERS (Gestores, Recepcionistas e SuperAdmin)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.gym_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id TEXT NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reception' CHECK (role IN ('superadmin', 'owner', 'manager', 'reception', 'staff', 'trainer')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajuste de restrição de papel (role) caso a tabela já exista:
DO $$ 
BEGIN
    ALTER TABLE public.gym_users DROP CONSTRAINT IF EXISTS gym_users_role_check;
    ALTER TABLE public.gym_users ADD CONSTRAINT gym_users_role_check 
        CHECK (role IN ('superadmin', 'owner', 'manager', 'reception', 'staff', 'trainer'));
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_gym_users_gym_id ON public.gym_users(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_users_email ON public.gym_users(email);

-- =========================================================================
-- 3. TABELA: SAAS_ACCOUNTS (Assinaturas, Planos e Faturamento das Academias)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.saas_accounts (
    id TEXT PRIMARY KEY DEFAULT ('saas-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)),
    gym_id TEXT NOT NULL UNIQUE REFERENCES public.gyms(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL DEFAULT 'pro' CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
    monthly_price NUMERIC(10,2) NOT NULL DEFAULT 199.00,
    payment_status TEXT NOT NULL DEFAULT 'trial' CHECK (payment_status IN ('trial', 'paid', 'pending', 'overdue', 'cancelled')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    next_billing_date DATE,
    trial_ends_at DATE,
    pix_key TEXT,
    auto_block_on_overdue BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_accounts_gym_id ON public.saas_accounts(gym_id);
CREATE INDEX IF NOT EXISTS idx_saas_accounts_payment_status ON public.saas_accounts(payment_status);

-- =========================================================================
-- 4. TABELA: SAAS_INVOICES (Faturas e Mensalidades Geradas pelo SaaS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.saas_invoices (
    id TEXT PRIMARY KEY DEFAULT ('inv-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)),
    gym_id TEXT NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    reference_month TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'cancelled')),
    pix_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_gym_id ON public.saas_invoices(gym_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON public.saas_invoices(status);

-- =========================================================================
-- 5. TABELA: ACCESS_LOGS (Registro de Entradas, Saídas e Catracas)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id TEXT NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'manual_adjust', 'reset', 'lock', 'unlock')),
    source TEXT NOT NULL CHECK (source IN ('esp32_button', 'reception_manual', 'api_sync', 'simulator')),
    description TEXT NOT NULL,
    count_after INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'blocked', 'warning')),
    client_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_gym_id_timestamp ON public.access_logs(gym_id, timestamp DESC);

-- =========================================================================
-- 6. TABELA: ANNOUNCEMENTS (Mural de Avisos da Academia)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id TEXT NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'importante' CHECK (category IN ('manutencao', 'evento', 'importante', 'novidade', 'horario')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    date TEXT NOT NULL,
    author TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_gym_id ON public.announcements(gym_id, pinned DESC, created_at DESC);

-- =========================================================================
-- 7. TABELA: ESP32_DEVICES (Telemetria e Heartbeats do Hardware)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.esp32_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id TEXT NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_key TEXT NOT NULL,
    ip_address TEXT,
    rssi INTEGER,
    uptime_seconds BIGINT DEFAULT 0,
    free_heap BIGINT DEFAULT 0,
    entry_count BIGINT DEFAULT 0,
    exit_count BIGINT DEFAULT 0,
    last_ping TIMESTAMPTZ,
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esp32_devices_gym_id ON public.esp32_devices(gym_id);

-- =========================================================================
-- 8. TABELA: PASSWORD_RESETS (Recuperação de Senhas)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    gym_slug TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets(email, code);

-- =========================================================================
-- 9. FUNÇÕES ATÔMICAS DE CATRACA (Com Proteção de Bloqueio SaaS)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.record_gym_entry(p_gym_id TEXT, p_source TEXT DEFAULT 'esp32_button', p_client_ip TEXT DEFAULT NULL)
RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gym public.gyms%ROWTYPE;
    v_new_count INTEGER;
BEGIN
    SELECT * INTO v_gym FROM public.gyms WHERE id = p_gym_id OR slug = p_gym_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academia não encontrada');
    END IF;

    -- Bloqueio Geral Master SaaS
    IF v_gym.is_system_blocked THEN
        INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
        VALUES (v_gym.id, 'entry', p_source, 'Tentativa de entrada negada: Unidade Suspensa pelo SaaS', v_gym.current_count, 'blocked', p_client_ip);
        RETURN jsonb_build_object('success', false, 'granted', false, 'is_system_blocked', true, 'message', 'Acesso suspenso pelo administrador do SaaS: ' || COALESCE(v_gym.block_reason, 'Inadimplência ou manutenção'));
    END IF;

    -- Bloqueio Local da Catraca pela Recepção
    IF v_gym.turnstile_locked THEN
        INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
        VALUES (v_gym.id, 'entry', p_source, 'Tentativa de entrada bloqueada: Catraca Travada Localmente', v_gym.current_count, 'blocked', p_client_ip);
        RETURN jsonb_build_object('success', false, 'granted', false, 'message', 'Catracas travadas pela recepção');
    END IF;

    v_new_count := v_gym.current_count + 1;
    
    UPDATE public.gyms 
    SET current_count = v_new_count, updated_at = NOW() 
    WHERE id = v_gym.id;

    INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
    VALUES (v_gym.id, 'entry', p_source, 'Acesso liberado via Catraca', v_new_count, 'success', p_client_ip);

    RETURN jsonb_build_object(
        'success', true, 
        'granted', true, 
        'current_count', v_new_count, 
        'max_capacity', v_gym.max_capacity,
        'percentage', round((v_new_count::numeric / v_gym.max_capacity::numeric) * 100)
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.record_gym_exit(p_gym_id TEXT, p_source TEXT DEFAULT 'esp32_button', p_client_ip TEXT DEFAULT NULL)
RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gym public.gyms%ROWTYPE;
    v_new_count INTEGER;
BEGIN
    SELECT * INTO v_gym FROM public.gyms WHERE id = p_gym_id OR slug = p_gym_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academia não encontrada');
    END IF;

    -- Bloqueio Geral Master SaaS
    IF v_gym.is_system_blocked THEN
        RETURN jsonb_build_object('success', false, 'granted', false, 'is_system_blocked', true, 'message', 'Unidade suspensa pelo SaaS');
    END IF;

    v_new_count := GREATEST(0, v_gym.current_count - 1);
    
    UPDATE public.gyms 
    SET current_count = v_new_count, updated_at = NOW() 
    WHERE id = v_gym.id;

    INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
    VALUES (v_gym.id, 'exit', p_source, 'Saída registrada via Catraca', v_new_count, 'success', p_client_ip);

    RETURN jsonb_build_object(
        'success', true, 
        'granted', true, 
        'current_count', v_new_count, 
        'max_capacity', v_gym.max_capacity,
        'percentage', round((v_new_count::numeric / v_gym.max_capacity::numeric) * 100)
    );
END;
$$ LANGUAGE plpgsql;

-- Permissões de Execução nas Funções para o cliente Supabase e hardware
GRANT EXECUTE ON FUNCTION public.record_gym_entry TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_gym_exit TO anon, authenticated, service_role;

-- =========================================================================
-- 10. ROW LEVEL SECURITY (RLS) E PERMISSÕES DE ACESSO
-- =========================================================================
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Políticas para GYMS (Leitura pública para alunos e recepção; gravação irrestrita para gestão/catracas)
DROP POLICY IF EXISTS "Gyms Read Policy" ON public.gyms;
CREATE POLICY "Gyms Read Policy" ON public.gyms FOR SELECT TO anon, authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Gyms Insert Policy" ON public.gyms;
CREATE POLICY "Gyms Insert Policy" ON public.gyms FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Gyms Update Policy" ON public.gyms;
CREATE POLICY "Gyms Update Policy" ON public.gyms FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Políticas para GYM_USERS
DROP POLICY IF EXISTS "Gym Users All" ON public.gym_users;
CREATE POLICY "Gym Users All" ON public.gym_users FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Políticas para ACCESS_LOGS (Permite envio de logs por catracas e leitura pelo painel)
DROP POLICY IF EXISTS "Access Logs All" ON public.access_logs;
CREATE POLICY "Access Logs All" ON public.access_logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Políticas para ANNOUNCEMENTS (Mural de avisos)
DROP POLICY IF EXISTS "Announcements Read" ON public.announcements;
CREATE POLICY "Announcements Read" ON public.announcements FOR SELECT TO anon, authenticated, service_role USING (true);

DROP POLICY IF EXISTS "Announcements Manage" ON public.announcements;
CREATE POLICY "Announcements Manage" ON public.announcements FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Políticas para ESP32_DEVICES (Telemetria)
DROP POLICY IF EXISTS "ESP32 Devices All" ON public.esp32_devices;
CREATE POLICY "ESP32 Devices All" ON public.esp32_devices FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Políticas para SAAS_ACCOUNTS & SAAS_INVOICES
DROP POLICY IF EXISTS "SaaS Accounts All" ON public.saas_accounts;
CREATE POLICY "SaaS Accounts All" ON public.saas_accounts FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "SaaS Invoices All" ON public.saas_invoices;
CREATE POLICY "SaaS Invoices All" ON public.saas_invoices FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Políticas para PASSWORD_RESETS
DROP POLICY IF EXISTS "Password Resets All" ON public.password_resets;
CREATE POLICY "Password Resets All" ON public.password_resets FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- 11. CONCESSÃO DE PERMISSÕES DE TABELA (SCHEMA PUBLIC)
-- =========================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
`;
