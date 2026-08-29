-- =========================================================================
-- GymFlow SaaS - Schema SQL Completo para Supabase (PostgreSQL)
-- Plataforma Multi-Tenant de Monitoramento de Lotação e Catracas ESP32
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

-- Índices de performance para busca por slug e chave de API do ESP32
CREATE INDEX IF NOT EXISTS idx_gyms_slug ON public.gyms(slug);
CREATE INDEX IF NOT EXISTS idx_gyms_api_key ON public.gyms(api_key);
CREATE INDEX IF NOT EXISTS idx_gyms_owner_email ON public.gyms(owner_email);

-- =========================================================================
-- 2. TABELA: GYM_USERS (Gestores, Recepcionistas e Funcionários)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.gym_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id TEXT NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reception' CHECK (role IN ('owner', 'manager', 'reception', 'staff', 'trainer')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gym_users_gym_id ON public.gym_users(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_users_email ON public.gym_users(email);

-- =========================================================================
-- 3. TABELA: ACCESS_LOGS (Registro de Entradas, Saídas e Catracas)
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
-- 4. TABELA: ANNOUNCEMENTS (Mural de Avisos e Notícias da Academia)
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
-- 5. TABELA: ESP32_DEVICES (Telemetria e Heartbeats do Hardware)
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
-- 6. TABELA: PASSWORD_RESETS (Códigos de Recuperação de Senha)
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
-- 7. FUNÇÕES E TRIGGERS AUTOMÁTICOS
-- =========================================================================

-- Trigger para atualizar timestamp de modificação
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gyms_updated_at ON public.gyms;
CREATE TRIGGER trg_gyms_updated_at
BEFORE UPDATE ON public.gyms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Função Atômica: Registrar Entrada via Catraca / Recepção
CREATE OR REPLACE FUNCTION public.record_gym_entry(p_gym_id TEXT, p_source TEXT DEFAULT 'esp32_button', p_client_ip TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_gym public.gyms%ROWTYPE;
    v_new_count INTEGER;
BEGIN
    SELECT * INTO v_gym FROM public.gyms WHERE id = p_gym_id OR slug = p_gym_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academia não encontrada');
    END IF;

    IF v_gym.turnstile_locked THEN
        INSERT INTO public.access_logs (gym_id, type, source, description, count_after, status, client_ip)
        VALUES (v_gym.id, 'entry', p_source, 'Tentativa de entrada bloqueada: Catraca Travada', v_gym.current_count, 'blocked', p_client_ip);
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

-- Função Atômica: Registrar Saída via Catraca / Recepção
CREATE OR REPLACE FUNCTION public.record_gym_exit(p_gym_id TEXT, p_source TEXT DEFAULT 'esp32_button', p_client_ip TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_gym public.gyms%ROWTYPE;
    v_new_count INTEGER;
BEGIN
    SELECT * INTO v_gym FROM public.gyms WHERE id = p_gym_id OR slug = p_gym_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academia não encontrada');
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

-- =========================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- 8.1. Academias: Leitura pública para a tela dos alunos; Modificação por gestores/donos
CREATE POLICY "Public Read Gyms" ON public.gyms
    FOR SELECT USING (true);

CREATE POLICY "Owners and Staff can update Gym" ON public.gyms
    FOR ALL USING (auth.uid() = owner_id OR auth.uid() IN (SELECT user_id FROM public.gym_users WHERE gym_id = public.gyms.id));

-- 8.2. Comunicados: Leitura pública dos ativos para os alunos; Gestão pela equipe
CREATE POLICY "Public Read Announcements" ON public.announcements
    FOR SELECT USING (active = true);

CREATE POLICY "Staff can manage Announcements" ON public.announcements
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.gym_users WHERE gym_id = public.announcements.gym_id) OR auth.uid() IN (SELECT owner_id FROM public.gyms WHERE id = public.announcements.gym_id));

-- 8.3. Logs de Acesso: Acesso restrito a gestores e recepcionistas autenticados
CREATE POLICY "Staff can view Access Logs" ON public.access_logs
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.gym_users WHERE gym_id = public.access_logs.gym_id) OR auth.uid() IN (SELECT owner_id FROM public.gyms WHERE id = public.access_logs.gym_id));

-- =========================================================================
-- 9. DADOS INICIAIS DE EXEMPLO (SEED DATA)
-- =========================================================================

INSERT INTO public.gyms (id, slug, name, slogan, city, neighborhood, address, contact_phone, max_capacity, current_count, theme_color, logo_emoji, owner_name, owner_email)
VALUES 
('gym-fitflow-moema', 'fitflow-moema', 'FitFlow Club Moema', 'Sua academia inteligente de alta performance', 'São Paulo - SP', 'Moema Nobre', 'Av. Ibirapuera, 2450', '(11) 98765-4321', 85, 38, 'cyan', '⚡', 'Carlos Henrique Gestor', 'carlos@fitflow.com.br'),
('gym-iron-muscle-ct', 'iron-muscle-ct', 'Iron Muscle CT', 'Centro de Treinamento Especializado em Hipertrofia & Força', 'Curitiba - PR', 'Batel', 'Rua das Palmeiras, 780', '(41) 99123-4567', 60, 47, 'amber', '🔥', 'Renato Iron Treinador', 'renato@ironmuscle.com.br'),
('gym-powerfit-barra', 'powerfit-barra', 'PowerFit 24h Barra', 'Treino sem limites a qualquer hora do dia ou da noite', 'Rio de Janeiro - RJ', 'Barra da Tijuca', 'Av. das Américas, 4200', '(21) 98456-7890', 120, 24, 'emerald', '💎', 'Juliana Lima', 'juliana@powerfit24h.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.announcements (gym_id, title, content, category, priority, date, author, pinned)
VALUES
('gym-fitflow-moema', 'Manutenção Preventiva das Catracas e Rede', 'No próximo domingo às 05h realizaremos a atualização do firmware das catracas inteligentes ESP32.', 'manutencao', 'high', '28/08/2026', 'Coordenação Técnica', true),
('gym-fitflow-moema', 'Novo App de Lotação GymFlow no Ar!', 'Alunos agora podem acompanhar o fluxo de treino em tempo real direto pelo smartphone.', 'novidade', 'medium', '28/08/2026', 'Recepção', true)
ON CONFLICT DO NOTHING;
