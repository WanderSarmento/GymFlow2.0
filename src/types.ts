export type OccupancyStatus = 'empty' | 'low' | 'moderate' | 'high' | 'full';

export type GymThemeColor = 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'blue';

export interface GymOperatingHours {
  weekdays: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export interface GymProfile {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  city: string;
  neighborhood: string;
  address?: string;
  contactPhone?: string;
  maxCapacity: number;
  currentCount: number;
  turnstileLocked: boolean;
  isOpen: boolean;
  themeColor: GymThemeColor;
  logoEmoji: string;
  apiKey: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  operatingHours: GymOperatingHours;
}

export interface OccupancyData {
  gymId: string;
  gymName: string;
  gymSlug: string;
  themeColor: GymThemeColor;
  logoEmoji: string;
  currentCount: number;
  maxCapacity: number;
  status: OccupancyStatus;
  percentage: number;
  turnstileLocked: boolean;
  isOpen: boolean;
  closingTimeToday: string;
  openingTimeToday: string;
  lastAccessTime: string | null;
  lastAccessType: 'entry' | 'exit' | 'manual' | null;
  esp32Connected: boolean;
  esp32LastPing: string | null;
  esp32DeviceName: string;
  esp32Ip: string;
  pendingRelayTrigger: 'entry' | 'exit' | null;
  slogan?: string;
  city?: string;
  neighborhood?: string;
}

export interface AccessLog {
  id: string;
  gymId?: string;
  timestamp: string;
  type: 'entry' | 'exit' | 'manual_adjust' | 'reset' | 'lock' | 'unlock';
  source: 'esp32_button' | 'reception_manual' | 'api_sync' | 'simulator';
  description: string;
  countAfter: number;
  status: 'success' | 'blocked' | 'warning';
}

export type AnnouncementCategory = 'manutencao' | 'evento' | 'importante' | 'novidade' | 'horario';
export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Announcement {
  id: string;
  gymId?: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  date: string;
  author: string;
  pinned: boolean;
  active: boolean;
  iconName?: string;
  actionUrl?: string;
}

export interface DaySchedule {
  dayId: number; // 0 = Dom, 1 = Seg, ..., 6 = Sab
  dayName: string;
  dayShort: string;
  open: string;
  close: string;
  isOpen: boolean;
  peakHours: string[];
  quietHours: string[];
  notes?: string;
}

export interface HourlyCrowdItem {
  hour: number;
  label: string;
  occupancyPercent: number;
  level: 'low' | 'moderate' | 'peak';
  averagePeople: number;
}

export interface DayCrowdStats {
  dayId: number;
  dayName: string;
  dayShort: string;
  hours: HourlyCrowdItem[];
  bestTimes: string;
  peakTimes: string;
}

export interface ESP32Telemetry {
  online: boolean;
  lastPing: string | null;
  ipAddress: string;
  rssi: number;
  uptimeSeconds: number;
  freeHeap: number;
  entryButtonPresses: number;
  exitButtonPresses: number;
  firmwareVersion: string;
}

export interface CreateGymInput {
  name: string;
  slug: string;
  slogan?: string;
  city: string;
  neighborhood?: string;
  address?: string;
  contactPhone?: string;
  maxCapacity: number;
  initialCount?: number;
  ownerName: string;
  ownerEmail: string;
  ownerPassword?: string;
  themeColor: GymThemeColor;
  logoEmoji: string;
  operatingHours?: GymOperatingHours;
}

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'reception' | 'staff';

export type SaaSPlanId = 'starter' | 'pro' | 'enterprise' | 'custom';
export type SaaSSubscriptionStatus = 'active' | 'trial' | 'overdue' | 'blocked' | 'canceled';
export type PaymentMethod = 'pix' | 'credit_card' | 'boleto' | 'manual' | 'courtesy';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'canceled';

export interface SaaSInvoice {
  id: string;
  gymId: string;
  gymName: string;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  status: InvoiceStatus;
  referenceMonth: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface SaaSPlanConfig {
  id: SaaSPlanId;
  name: string;
  price: number;
  badge: string;
  description: string;
  turnstilesLimit: number;
  features: string[];
  recommended?: boolean;
}

export interface GymSaaSAccount {
  gymId: string;
  gymSlug: string;
  gymName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  city: string;
  plan: SaaSPlanId;
  planName: string;
  monthlyFee: number;
  status: SaaSSubscriptionStatus;
  isSystemBlocked: boolean;
  blockReason?: string;
  blockedAt?: string | null;
  turnstilesLimit: number;
  maxCapacity: number;
  currentCount: number;
  lastPaymentDate?: string | null;
  nextDueDate: string;
  trialEndsAt?: string | null;
  createdAt: string;
  apiKey: string;
  invoices: SaaSInvoice[];
}

export interface SaaSMetrics {
  totalGyms: number;
  activeGyms: number;
  blockedGyms: number;
  overdueGyms: number;
  trialGyms: number;
  totalMRR: number;
  totalRevenueThisMonth: number;
  pendingRevenue: number;
  delinquencyRate: number;
  totalStudentsOnline: number;
}

export interface CreateSaaSGymInput extends CreateGymInput {
  plan?: SaaSPlanId;
  monthlyFee?: number;
  status?: SaaSSubscriptionStatus;
  turnstilesLimit?: number;
  trialDays?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  gymId: string;
  gymSlug: string;
  gymName: string;
  avatarUrl?: string;
  phone?: string;
  token?: string;
  createdAt: string;
  isSystemBlocked?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  gymSlug?: string;
}

export interface PasswordRecoveryRequest {
  email: string;
}

export interface PasswordResetRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  url?: string;
  hasAnonKey: boolean;
  status: 'connected' | 'not_configured' | 'error';
  message?: string;
}

