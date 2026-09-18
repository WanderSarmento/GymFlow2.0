export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- GymLivre SaaS - Schema SQL Atualizado para Supabase (PostgreSQL)
-- Versao 2.0: Multi-Tenancy, Master SaaS Admin, Faturas e Bloqueio Remoto
-- =========================================================================

-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. TABELA: GYMS (Academias cadastradas no SaaS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.gyms (
    id TEXT PRIMARY KEY DEFAULT ('gym-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slogan TEXT DEFAULT 'Monitoramento de Lotacao em Tempo Real',
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

-- Caso a tabela gyms ja exista no seu Supabase, adicione as novas colunas:
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
    password TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reception' CHECK (role IN ('superadmin', 'owner', 'manager', 'reception', 'staff', 'trainer')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajuste de restricao de papel (role) caso a tabela ja exista:
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
-- 5. TABELA: ACCESS_LOGS (Registro de Entradas, Saidas e Catracas)
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
-- 8. TABELA: PASSWORD_RESETS (Recuperacao de Senhas)
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
-- 9. FUNCOES ATOMICAS DE CATRACA (Com Protecao de Bloqueio SaaS)
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
        RETURN jsonb_build_object('success', false, 'message', 'Academia nao encontrada');
    END IF;

    -- Bloqueio Geral Master SaaS
    IF v_gym.is_system_blocked THEN
        INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
        VALUES (v_gym.id, 'entry', p_source, 'Tentativa de entrada negada: Unidade Suspensa pelo SaaS', v_gym.current_count, 'blocked', p_client_ip);
        RETURN jsonb_build_object('success', false, 'granted', false, 'is_system_blocked', true, 'message', 'Acesso suspenso pelo administrador do SaaS: ' || COALESCE(v_gym.block_reason, 'Inadimplencia ou manutencao'));
    END IF;

    -- Bloqueio Local da Catraca pela Recepcao
    IF v_gym.turnstile_locked THEN
        INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
        VALUES (v_gym.id, 'entry', p_source, 'Tentativa de entrada bloqueada: Catraca Travada Localmente', v_gym.current_count, 'blocked', p_client_ip);
        RETURN jsonb_build_object('success', false, 'granted', false, 'message', 'Catracas travadas pela recepcao');
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
        RETURN jsonb_build_object('success', false, 'message', 'Academia nao encontrada');
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
    VALUES (v_gym.id, 'exit', p_source, 'Saida registrada via Catraca', v_new_count, 'success', p_client_ip);

    RETURN jsonb_build_object(
        'success', true, 
        'granted', true, 
        'current_count', v_new_count, 
        'max_capacity', v_gym.max_capacity,
        'percentage', round((v_new_count::numeric / v_gym.max_capacity::numeric) * 100)
    );
END;
$$ LANGUAGE plpgsql;

-- Permissoes de Execucao nas Funcoes para o cliente Supabase e hardware
GRANT EXECUTE ON FUNCTION public.record_gym_entry TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_gym_exit TO anon, authenticated, service_role;

-- =========================================================================
-- 10. VIEW PUBLICA SEGURA (SEM EXPOSICAO DE API_KEY OU DADOS PRIVADOS)
-- =========================================================================
CREATE OR REPLACE VIEW public.public_gyms AS
SELECT 
    id, slug, name, slogan, city, neighborhood, address, contact_phone, 
    max_capacity, current_count, theme_color, logo_emoji, is_open, 
    turnstile_locked, updated_at, created_at
FROM public.gyms;

GRANT SELECT ON public.public_gyms TO anon, authenticated, service_role;

-- =========================================================================
-- 11. ROW LEVEL SECURITY (RLS) BLINDADO E CONTROLE DE ACESSO
-- =========================================================================
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Limpeza de politicas legadas ou permissivas anteriores
DROP POLICY IF EXISTS "Gyms Read Policy" ON public.gyms;
DROP POLICY IF EXISTS "Gyms Insert Policy" ON public.gyms;
DROP POLICY IF EXISTS "Gyms Update Policy" ON public.gyms;
DROP POLICY IF EXISTS "Gyms Delete Policy" ON public.gyms;
DROP POLICY IF EXISTS "Gyms Public Read" ON public.gyms;
DROP POLICY IF EXISTS "Gyms Service Role Full" ON public.gyms;

DROP POLICY IF EXISTS "Gym Users All" ON public.gym_users;
DROP POLICY IF EXISTS "Gym Users Service Role Full" ON public.gym_users;
DROP POLICY IF EXISTS "Gym Users Self Read" ON public.gym_users;

DROP POLICY IF EXISTS "Access Logs All" ON public.access_logs;
DROP POLICY IF EXISTS "Access Logs Service Role Full" ON public.access_logs;
DROP POLICY IF EXISTS "Access Logs Authenticated Read" ON public.access_logs;

DROP POLICY IF EXISTS "Announcements Read" ON public.announcements;
DROP POLICY IF EXISTS "Announcements Manage" ON public.announcements;
DROP POLICY IF EXISTS "Announcements Read Active" ON public.announcements;
DROP POLICY IF EXISTS "Announcements Service Role Full" ON public.announcements;

DROP POLICY IF EXISTS "ESP32 Devices All" ON public.esp32_devices;
DROP POLICY IF EXISTS "ESP32 Devices Service Role Full" ON public.esp32_devices;

DROP POLICY IF EXISTS "SaaS Accounts All" ON public.saas_accounts;
DROP POLICY IF EXISTS "SaaS Accounts Service Role Full" ON public.saas_accounts;

DROP POLICY IF EXISTS "SaaS Invoices All" ON public.saas_invoices;
DROP POLICY IF EXISTS "SaaS Invoices Service Role Full" ON public.saas_invoices;

DROP POLICY IF EXISTS "Password Resets All" ON public.password_resets;
DROP POLICY IF EXISTS "Password Resets Service Role Full" ON public.password_resets;

-- 11.1 GYMS: Leitura publica para telas de ocupacao dos alunos; gravacao apenas por backend ou dono
CREATE POLICY "Gyms Public Read" ON public.gyms 
    FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Gyms Service Role Full" ON public.gyms 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Gyms Authenticated Update" ON public.gyms 
    FOR UPDATE TO authenticated USING (auth.uid()::text = id OR auth.jwt() ->> 'email' = owner_email) WITH CHECK (true);

-- 11.2 GYM_USERS: TOTALMENTE BLOQUEADO PARA VISITANTES ANONIMOS (Zero vazamento de credenciais)
CREATE POLICY "Gym Users Service Role Full" ON public.gym_users 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Gym Users Self Read" ON public.gym_users 
    FOR SELECT TO authenticated USING (auth.uid()::text = id OR auth.jwt() ->> 'email' = email);

-- 11.3 SAAS ACCOUNTS & INVOICES: Dados financeiros e de cobranca estritamente restritos ao backend service_role
CREATE POLICY "SaaS Accounts Service Role Full" ON public.saas_accounts 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "SaaS Invoices Service Role Full" ON public.saas_invoices 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11.4 PASSWORD RESETS: Tokens de recuperacao temporarios
CREATE POLICY "Password Resets Service Role Full" ON public.password_resets 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11.5 ANNOUNCEMENTS: Alunos anonimos so visualizam avisos ativos; gestao pelo backend service_role
CREATE POLICY "Announcements Read Active" ON public.announcements 
    FOR SELECT TO anon, authenticated, service_role USING (active = true);

CREATE POLICY "Announcements Service Role Full" ON public.announcements 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11.6 ACCESS LOGS: Somente equipe autenticada ou service_role podem consultar historico
CREATE POLICY "Access Logs Service Role Full" ON public.access_logs 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Access Logs Authenticated Read" ON public.access_logs 
    FOR SELECT TO authenticated USING (true);

-- 11.7 ESP32 DEVICES: Telemetria restrita ao backend service_role
CREATE POLICY "ESP32 Devices Service Role Full" ON public.esp32_devices 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- 12. PERMISSOES EXPLCITAS DE PRIVILEGIO MINIMO
-- =========================================================================
REVOKE ALL ON TABLE public.gym_users FROM anon;
REVOKE ALL ON TABLE public.saas_accounts FROM anon;
REVOKE ALL ON TABLE public.saas_invoices FROM anon;
REVOKE ALL ON TABLE public.password_resets FROM anon;
REVOKE ALL ON TABLE public.esp32_devices FROM anon;
REVOKE ALL ON TABLE public.access_logs FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.public_gyms TO anon;
GRANT SELECT ON public.gyms TO anon;
GRANT SELECT ON public.announcements TO anon;

GRANT SELECT ON public.public_gyms, public.gyms, public.announcements, public.access_logs TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- =========================================================================
-- 13. REALTIME (Sincronizacao em tempo real para avisos e academias)
-- =========================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gyms;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
`;
