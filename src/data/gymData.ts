import { Announcement, DaySchedule, DayCrowdStats, GymProfile, SaaSPlanConfig } from '../types';

export const DEFAULT_MAX_CAPACITY = 80;

export const INITIAL_GYMS: GymProfile[] = [
  {
    id: 'gym-fitflow-moema',
    slug: 'fitflow-moema',
    name: 'FitFlow Club Moema',
    slogan: 'Sua academia inteligente de alta performance',
    city: 'São Paulo - SP',
    neighborhood: 'Moema Nobre',
    address: 'Av. Ibirapuera, 2450',
    contactPhone: '(11) 98765-4321',
    maxCapacity: 85,
    currentCount: 38,
    turnstileLocked: false,
    isOpen: true,
    themeColor: 'cyan',
    visualTheme: 'dark',
    logoEmoji: '⚡',
    apiKey: 'GF_KEY_A0C0501F16BC4E31',
    ownerName: 'Carlos Henrique Gestor',
    ownerEmail: 'carlos@fitflow.com.br',
    createdAt: '2026-08-29T14:47:46.393Z',
    operatingHours: {
      weekdays: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '07:00', close: '17:00', isOpen: true },
      sunday: { open: '08:00', close: '14:00', isOpen: true }
    }
  },
  {
    id: 'gym-iron-muscle-ct',
    slug: 'iron-muscle-ct',
    name: 'Iron Muscle CT',
    slogan: 'Centro de Treinamento e Força Bruta',
    city: 'Curitiba - PR',
    neighborhood: 'Batel',
    address: 'Rua Bispo Dom José, 1800',
    contactPhone: '(41) 99887-1122',
    maxCapacity: 120,
    currentCount: 65,
    turnstileLocked: false,
    isOpen: true,
    themeColor: 'amber',
    visualTheme: 'dark',
    logoEmoji: '🔥',
    apiKey: 'GF_KEY_IRON_MUSCLE_8821',
    ownerName: 'Marina Silva',
    ownerEmail: 'marina@ironmuscle.com.br',
    createdAt: '2026-08-29T14:47:46.393Z',
    operatingHours: {
      weekdays: { open: '05:30', close: '23:30', isOpen: true },
      saturday: { open: '08:00', close: '18:00', isOpen: true },
      sunday: { open: '09:00', close: '14:00', isOpen: true }
    }
  },
  {
    id: 'gym-powerfit-barra',
    slug: 'powerfit-barra',
    name: 'PowerFit 24h Barra',
    slogan: 'Energia sem limites, 24 horas por dia',
    city: 'Rio de Janeiro - RJ',
    neighborhood: 'Barra da Tijuca',
    address: 'Av. das Américas, 4200',
    contactPhone: '(21) 97123-4567',
    maxCapacity: 95,
    currentCount: 22,
    turnstileLocked: false,
    isOpen: true,
    themeColor: 'emerald',
    visualTheme: 'dark',
    logoEmoji: '💪',
    apiKey: 'GF_KEY_POWERFIT_9912',
    ownerName: 'Rodrigo Fonseca',
    ownerEmail: 'rodrigo@powerfit.com.br',
    createdAt: '2026-08-29T14:47:46.393Z',
    operatingHours: {
      weekdays: { open: '00:00', close: '23:59', isOpen: true },
      saturday: { open: '00:00', close: '23:59', isOpen: true },
      sunday: { open: '00:00', close: '23:59', isOpen: true }
    }
  }
];

export const THEME_COLOR_CONFIG: Record<string, {
  name: string;
  primary: string;
  badge: string;
  glow: string;
  border: string;
  text: string;
  bgGradient: string;
}> = {
  cyan: {
    name: 'Cyan Neon',
    primary: 'bg-cyan-400 text-black',
    badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.25)]',
    border: 'border-cyan-400/40',
    text: 'text-cyan-400',
    bgGradient: 'from-cyan-500/20 via-transparent to-transparent'
  },
  emerald: {
    name: 'Verde Esmeralda',
    primary: 'bg-emerald-400 text-black',
    badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    border: 'border-emerald-400/40',
    text: 'text-emerald-400',
    bgGradient: 'from-emerald-500/20 via-transparent to-transparent'
  },
  amber: {
    name: 'Âmbar / Laranja Ouro',
    primary: 'bg-amber-400 text-black',
    badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]',
    border: 'border-amber-400/40',
    text: 'text-amber-400',
    bgGradient: 'from-amber-500/20 via-transparent to-transparent'
  },
  violet: {
    name: 'Violeta / Roxo Tech',
    primary: 'bg-violet-400 text-black',
    badge: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
    glow: 'shadow-[0_0_20px_rgba(167,139,250,0.25)]',
    border: 'border-violet-400/40',
    text: 'text-violet-400',
    bgGradient: 'from-violet-500/20 via-transparent to-transparent'
  },
  rose: {
    name: 'Rose / Vermelho Rubi',
    primary: 'bg-rose-400 text-black',
    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    glow: 'shadow-[0_0_20px_rgba(251,113,133,0.25)]',
    border: 'border-rose-400/40',
    text: 'text-rose-400',
    bgGradient: 'from-rose-500/20 via-transparent to-transparent'
  },
  blue: {
    name: 'Azul Elétrico',
    primary: 'bg-blue-400 text-black',
    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    glow: 'shadow-[0_0_20px_rgba(96,165,250,0.25)]',
    border: 'border-blue-400/40',
    text: 'text-blue-400',
    bgGradient: 'from-blue-500/20 via-transparent to-transparent'
  }
};


export const GYM_SCHEDULE: DaySchedule[] = [
  {
    dayId: 0,
    dayName: 'Domingo',
    dayShort: 'Dom',
    open: '08:00',
    close: '14:00',
    isOpen: true,
    peakHours: ['10:00 às 12:00'],
    quietHours: ['08:00 às 09:30', '12:30 às 14:00'],
    notes: 'Sala de musculação e esteiras livres. Sem aulas coletivas.'
  },
  {
    dayId: 1,
    dayName: 'Segunda-feira',
    dayShort: 'Seg',
    open: '06:00',
    close: '23:00',
    isOpen: true,
    peakHours: ['06:30 às 08:30', '18:00 às 20:30'],
    quietHours: ['10:30 às 15:30', '21:30 às 23:00'],
    notes: 'Dia mais movimentado da semana.'
  },
  {
    dayId: 2,
    dayName: 'Terça-feira',
    dayShort: 'Ter',
    open: '06:00',
    close: '23:00',
    isOpen: true,
    peakHours: ['07:00 às 08:30', '18:00 às 20:00'],
    quietHours: ['11:00 às 16:00', '21:00 às 23:00']
  },
  {
    dayId: 3,
    dayName: 'Quarta-feira',
    dayShort: 'Qua',
    open: '06:00',
    close: '23:00',
    isOpen: true,
    peakHours: ['06:30 às 08:30', '18:00 às 20:30'],
    quietHours: ['10:00 às 15:00', '21:30 às 23:00']
  },
  {
    dayId: 4,
    dayName: 'Quinta-feira',
    dayShort: 'Qui',
    open: '06:00',
    close: '23:00',
    isOpen: true,
    peakHours: ['07:00 às 08:30', '18:00 às 20:00'],
    quietHours: ['11:00 às 16:00', '21:00 às 23:00']
  },
  {
    dayId: 5,
    dayName: 'Sexta-feira',
    dayShort: 'Sex',
    open: '06:00',
    close: '22:00',
    isOpen: true,
    peakHours: ['06:30 às 08:30', '17:30 às 19:30'],
    quietHours: ['12:00 às 16:30', '20:00 às 22:00'],
    notes: 'Movimento noturno reduzido após as 20h.'
  },
  {
    dayId: 6,
    dayName: 'Sábado',
    dayShort: 'Sáb',
    open: '07:00',
    close: '17:00',
    isOpen: true,
    peakHours: ['09:30 às 12:30'],
    quietHours: ['07:00 às 09:00', '14:00 às 17:00'],
    notes: 'Aulas de Spinning às 10h e Dança às 11h.'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

// Helper to generate hourly crowd data by day of the week
export const WEEKLY_CROWD_DATA: Record<number, DayCrowdStats> = {
  1: { // Segunda
    dayId: 1,
    dayName: 'Segunda-feira',
    dayShort: 'Seg',
    bestTimes: '10:30 - 15:30 e após 21:30',
    peakTimes: '06:30 - 08:30 e 18:00 - 20:30',
    hours: [
      { hour: 6, label: '06:00', occupancyPercent: 68, level: 'moderate', averagePeople: 54 },
      { hour: 7, label: '07:00', occupancyPercent: 88, level: 'peak', averagePeople: 70 },
      { hour: 8, label: '08:00', occupancyPercent: 78, level: 'moderate', averagePeople: 62 },
      { hour: 9, label: '09:00', occupancyPercent: 52, level: 'moderate', averagePeople: 41 },
      { hour: 10, label: '10:00', occupancyPercent: 32, level: 'low', averagePeople: 25 },
      { hour: 11, label: '11:00', occupancyPercent: 28, level: 'low', averagePeople: 22 },
      { hour: 12, label: '12:00', occupancyPercent: 44, level: 'low', averagePeople: 35 },
      { hour: 13, label: '13:00', occupancyPercent: 38, level: 'low', averagePeople: 30 },
      { hour: 14, label: '14:00', occupancyPercent: 30, level: 'low', averagePeople: 24 },
      { hour: 15, label: '15:00', occupancyPercent: 35, level: 'low', averagePeople: 28 },
      { hour: 16, label: '16:00', occupancyPercent: 48, level: 'low', averagePeople: 38 },
      { hour: 17, label: '17:00', occupancyPercent: 72, level: 'moderate', averagePeople: 57 },
      { hour: 18, label: '18:00', occupancyPercent: 94, level: 'peak', averagePeople: 75 },
      { hour: 19, label: '19:00', occupancyPercent: 96, level: 'peak', averagePeople: 77 },
      { hour: 20, label: '20:00', occupancyPercent: 82, level: 'peak', averagePeople: 65 },
      { hour: 21, label: '21:00', occupancyPercent: 56, level: 'moderate', averagePeople: 45 },
      { hour: 22, label: '22:00', occupancyPercent: 26, level: 'low', averagePeople: 20 }
    ]
  },
  2: { // Terca
    dayId: 2,
    dayName: 'Terça-feira',
    dayShort: 'Ter',
    bestTimes: '11:00 - 16:00 e após 21:00',
    peakTimes: '07:00 - 08:30 e 18:00 - 20:00',
    hours: [
      { hour: 6, label: '06:00', occupancyPercent: 60, level: 'moderate', averagePeople: 48 },
      { hour: 7, label: '07:00', occupancyPercent: 82, level: 'peak', averagePeople: 65 },
      { hour: 8, label: '08:00', occupancyPercent: 72, level: 'moderate', averagePeople: 57 },
      { hour: 9, label: '09:00', occupancyPercent: 46, level: 'low', averagePeople: 37 },
      { hour: 10, label: '10:00', occupancyPercent: 30, level: 'low', averagePeople: 24 },
      { hour: 11, label: '11:00', occupancyPercent: 25, level: 'low', averagePeople: 20 },
      { hour: 12, label: '12:00', occupancyPercent: 40, level: 'low', averagePeople: 32 },
      { hour: 13, label: '13:00', occupancyPercent: 34, level: 'low', averagePeople: 27 },
      { hour: 14, label: '14:00', occupancyPercent: 28, level: 'low', averagePeople: 22 },
      { hour: 15, label: '15:00', occupancyPercent: 33, level: 'low', averagePeople: 26 },
      { hour: 16, label: '16:00', occupancyPercent: 45, level: 'low', averagePeople: 36 },
      { hour: 17, label: '17:00', occupancyPercent: 68, level: 'moderate', averagePeople: 54 },
      { hour: 18, label: '18:00', occupancyPercent: 88, level: 'peak', averagePeople: 70 },
      { hour: 19, label: '19:00', occupancyPercent: 90, level: 'peak', averagePeople: 72 },
      { hour: 20, label: '20:00', occupancyPercent: 75, level: 'moderate', averagePeople: 60 },
      { hour: 21, label: '21:00', occupancyPercent: 48, level: 'low', averagePeople: 38 },
      { hour: 22, label: '22:00', occupancyPercent: 22, level: 'low', averagePeople: 18 }
    ]
  },
  3: { // Quarta
    dayId: 3,
    dayName: 'Quarta-feira',
    dayShort: 'Qua',
    bestTimes: '10:00 - 15:00 e após 21:30',
    peakTimes: '06:30 - 08:30 e 18:00 - 20:30',
    hours: [
      { hour: 6, label: '06:00', occupancyPercent: 65, level: 'moderate', averagePeople: 52 },
      { hour: 7, label: '07:00', occupancyPercent: 85, level: 'peak', averagePeople: 68 },
      { hour: 8, label: '08:00', occupancyPercent: 74, level: 'moderate', averagePeople: 59 },
      { hour: 9, label: '09:00', occupancyPercent: 48, level: 'low', averagePeople: 38 },
      { hour: 10, label: '10:00', occupancyPercent: 30, level: 'low', averagePeople: 24 },
      { hour: 11, label: '11:00', occupancyPercent: 26, level: 'low', averagePeople: 21 },
      { hour: 12, label: '12:00', occupancyPercent: 42, level: 'low', averagePeople: 33 },
      { hour: 13, label: '13:00', occupancyPercent: 36, level: 'low', averagePeople: 29 },
      { hour: 14, label: '14:00', occupancyPercent: 31, level: 'low', averagePeople: 25 },
      { hour: 15, label: '15:00', occupancyPercent: 36, level: 'low', averagePeople: 29 },
      { hour: 16, label: '16:00', occupancyPercent: 50, level: 'moderate', averagePeople: 40 },
      { hour: 17, label: '17:00', occupancyPercent: 74, level: 'moderate', averagePeople: 59 },
      { hour: 18, label: '18:00', occupancyPercent: 92, level: 'peak', averagePeople: 73 },
      { hour: 19, label: '19:00', occupancyPercent: 94, level: 'peak', averagePeople: 75 },
      { hour: 20, label: '20:00', occupancyPercent: 78, level: 'moderate', averagePeople: 62 },
      { hour: 21, label: '21:00', occupancyPercent: 52, level: 'moderate', averagePeople: 41 },
      { hour: 22, label: '22:00', occupancyPercent: 24, level: 'low', averagePeople: 19 }
    ]
  },
  4: { // Quinta
    dayId: 4,
    dayName: 'Quinta-feira',
    dayShort: 'Qui',
    bestTimes: '11:00 - 16:00 e após 21:00',
    peakTimes: '07:00 - 08:30 e 18:00 - 20:00',
    hours: [
      { hour: 6, label: '06:00', occupancyPercent: 58, level: 'moderate', averagePeople: 46 },
      { hour: 7, label: '07:00', occupancyPercent: 80, level: 'peak', averagePeople: 64 },
      { hour: 8, label: '08:00', occupancyPercent: 70, level: 'moderate', averagePeople: 56 },
      { hour: 9, label: '09:00', occupancyPercent: 44, level: 'low', averagePeople: 35 },
      { hour: 10, label: '10:00', occupancyPercent: 28, level: 'low', averagePeople: 22 },
      { hour: 11, label: '11:00', occupancyPercent: 24, level: 'low', averagePeople: 19 },
      { hour: 12, label: '12:00', occupancyPercent: 38, level: 'low', averagePeople: 30 },
      { hour: 13, label: '13:00', occupancyPercent: 32, level: 'low', averagePeople: 25 },
      { hour: 14, label: '14:00', occupancyPercent: 27, level: 'low', averagePeople: 21 },
      { hour: 15, label: '15:00', occupancyPercent: 31, level: 'low', averagePeople: 24 },
      { hour: 16, label: '16:00', occupancyPercent: 44, level: 'low', averagePeople: 35 },
      { hour: 17, label: '17:00', occupancyPercent: 66, level: 'moderate', averagePeople: 53 },
      { hour: 18, label: '18:00', occupancyPercent: 86, level: 'peak', averagePeople: 69 },
      { hour: 19, label: '19:00', occupancyPercent: 88, level: 'peak', averagePeople: 70 },
      { hour: 20, label: '20:00', occupancyPercent: 74, level: 'moderate', averagePeople: 59 },
      { hour: 21, label: '21:00', occupancyPercent: 46, level: 'low', averagePeople: 37 },
      { hour: 22, label: '22:00', occupancyPercent: 20, level: 'low', averagePeople: 16 }
    ]
  },
  5: { // Sexta
    dayId: 5,
    dayName: 'Sexta-feira',
    dayShort: 'Sex',
    bestTimes: '12:00 - 16:30 e após 20:00',
    peakTimes: '06:30 - 08:30 e 17:30 - 19:30',
    hours: [
      { hour: 6, label: '06:00', occupancyPercent: 62, level: 'moderate', averagePeople: 49 },
      { hour: 7, label: '07:00', occupancyPercent: 82, level: 'peak', averagePeople: 65 },
      { hour: 8, label: '08:00', occupancyPercent: 68, level: 'moderate', averagePeople: 54 },
      { hour: 9, label: '09:00', occupancyPercent: 42, level: 'low', averagePeople: 33 },
      { hour: 10, label: '10:00', occupancyPercent: 28, level: 'low', averagePeople: 22 },
      { hour: 11, label: '11:00', occupancyPercent: 24, level: 'low', averagePeople: 19 },
      { hour: 12, label: '12:00', occupancyPercent: 36, level: 'low', averagePeople: 29 },
      { hour: 13, label: '13:00', occupancyPercent: 30, level: 'low', averagePeople: 24 },
      { hour: 14, label: '14:00', occupancyPercent: 25, level: 'low', averagePeople: 20 },
      { hour: 15, label: '15:00', occupancyPercent: 30, level: 'low', averagePeople: 24 },
      { hour: 16, label: '16:00', occupancyPercent: 46, level: 'low', averagePeople: 37 },
      { hour: 17, label: '17:00', occupancyPercent: 70, level: 'moderate', averagePeople: 56 },
      { hour: 18, label: '18:00', occupancyPercent: 84, level: 'peak', averagePeople: 67 },
      { hour: 19, label: '19:00', occupancyPercent: 76, level: 'moderate', averagePeople: 60 },
      { hour: 20, label: '20:00', occupancyPercent: 45, level: 'low', averagePeople: 36 },
      { hour: 21, label: '21:00', occupancyPercent: 25, level: 'low', averagePeople: 20 }
    ]
  },
  6: { // Sabado
    dayId: 6,
    dayName: 'Sábado',
    dayShort: 'Sáb',
    bestTimes: '07:00 - 09:00 e após 14:00',
    peakTimes: '09:30 - 12:30',
    hours: [
      { hour: 7, label: '07:00', occupancyPercent: 22, level: 'low', averagePeople: 18 },
      { hour: 8, label: '08:00', occupancyPercent: 44, level: 'low', averagePeople: 35 },
      { hour: 9, label: '09:00', occupancyPercent: 70, level: 'moderate', averagePeople: 56 },
      { hour: 10, label: '10:00', occupancyPercent: 92, level: 'peak', averagePeople: 73 },
      { hour: 11, label: '11:00', occupancyPercent: 95, level: 'peak', averagePeople: 76 },
      { hour: 12, label: '12:00', occupancyPercent: 80, level: 'peak', averagePeople: 64 },
      { hour: 13, label: '13:00', occupancyPercent: 55, level: 'moderate', averagePeople: 44 },
      { hour: 14, label: '14:00', occupancyPercent: 32, level: 'low', averagePeople: 25 },
      { hour: 15, label: '15:00', occupancyPercent: 24, level: 'low', averagePeople: 19 },
      { hour: 16, label: '16:00', occupancyPercent: 18, level: 'low', averagePeople: 14 }
    ]
  },
  0: { // Domingo
    dayId: 0,
    dayName: 'Domingo',
    dayShort: 'Dom',
    bestTimes: '08:00 - 09:30 e após 12:30',
    peakTimes: '10:00 - 12:00',
    hours: [
      { hour: 8, label: '08:00', occupancyPercent: 24, level: 'low', averagePeople: 19 },
      { hour: 9, label: '09:00', occupancyPercent: 50, level: 'moderate', averagePeople: 40 },
      { hour: 10, label: '10:00', occupancyPercent: 78, level: 'peak', averagePeople: 62 },
      { hour: 11, label: '11:00', occupancyPercent: 82, level: 'peak', averagePeople: 65 },
      { hour: 12, label: '12:00', occupancyPercent: 58, level: 'moderate', averagePeople: 46 },
      { hour: 13, label: '13:00', occupancyPercent: 30, level: 'low', averagePeople: 24 }
    ]
  }
};

export const SAAS_PLANS: Record<string, SaaSPlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Plano Starter',
    price: 149,
    badge: 'Essencial',
    description: 'Ideal para academias de bairro e estúdios que precisam de controle de acesso via ESP32.',
    turnstilesLimit: 2,
    features: [
      'Até 2 catracas físicas ESP32',
      'Painel de Lotação em Tempo Real',
      'Módulo Alunos (Link & QR Code)',
      'Controle Manual de Recepção',
      'Relatórios básicos de acesso'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Plano Pro Performance',
    price: 299,
    badge: 'Mais Popular',
    description: 'Para academias com alto fluxo, múltiplos pontos de acesso e auditoria completa.',
    turnstilesLimit: 6,
    recommended: true,
    features: [
      'Até 6 catracas físicas ESP32',
      'Previsão Inteligente de Lotação',
      'Mural de Comunicados Prioritários',
      'Auditoria completa de logs e horários',
      'Integração direta com Supabase SQL',
      'Suporte prioritário via WhatsApp'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Plano Enterprise',
    price: 599,
    badge: 'Redes & Franquias',
    description: 'Solução corporativa sem limites de catracas, alta disponibilidade e SLA de 99.9%.',
    turnstilesLimit: 20,
    features: [
      'Catracas ESP32 ilimitadas',
      'Múltiplas unidades & permissões RBAC',
      'API REST liberada para ERP externo',
      'SLA de 99.9% e backup diário dedicado',
      'Customização total de identidade visual',
      'Gerente de conta exclusivo'
    ]
  }
};
