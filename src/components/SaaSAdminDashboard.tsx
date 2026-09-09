import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Key,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Ban,
  Calendar,
  Layers,
  ArrowUpRight,
  Trash2,
  Edit3,
  UserCheck,
  Receipt,
  Eye,
  Zap,
  Info,
  LogOut
} from 'lucide-react';
import {
  SaaSMetrics,
  GymSaaSAccount,
  SaaSInvoice,
  CreateSaaSGymInput,
  SaaSPlanId,
  AuthUser,
  GymProfile,
  SaaSPlanConfig
} from '../types';
import {
  fetchSaaSMetrics,
  fetchSaaSGyms,
  createSaaSGym,
  updateSaaSSubscription,
  toggleSaaSGymBlock,
  paySaaSInvoice,
  createSaaSInvoice,
  extendSaaSTrial,
  deleteSaaSGym,
  fetchSaaSPlans,
  updateSaaSPlan
} from '../services/api';
import { SAAS_PLANS } from '../data/gymData';

interface SaaSAdminDashboardProps {
  currentUser: AuthUser | null;
  onSelectGym: (gym: GymProfile) => void;
  onOpenLoginModal?: () => void;
  onClose?: () => void;
  onLogout?: () => void;
}

export function SaaSAdminDashboard({ currentUser, onSelectGym, onOpenLoginModal, onClose, onLogout }: SaaSAdminDashboardProps) {
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
  const [gyms, setGyms] = useState<GymSaaSAccount[]>([]);
  const [plans, setPlans] = useState<SaaSPlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'gyms' | 'invoices' | 'new_gym' | 'plans'>('gyms');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'blocked' | 'overdue'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modal States
  const [selectedGymForInvoices, setSelectedGymForInvoices] = useState<GymSaaSAccount | null>(null);
  const [selectedGymForBlock, setSelectedGymForBlock] = useState<GymSaaSAccount | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [selectedGymForPlan, setSelectedGymForPlan] = useState<GymSaaSAccount | null>(null);
  const [editingPlan, setEditingPlan] = useState<SaaSPlanConfig | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Gym Form State
  const [newGymForm, setNewGymForm] = useState<CreateSaaSGymInput>({
    name: '',
    slug: '',
    slogan: 'A sua melhor experiência de treino',
    city: 'São Paulo - SP',
    neighborhood: 'Centro',
    address: 'Av. Paulista, 1500',
    contactPhone: '(11) 98765-4321',
    maxCapacity: 150,
    themeColor: 'cyan',
    logoEmoji: '🏋️',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: 'password123',
    plan: 'pro',
    monthlyFee: 299,
    trialDays: 15
  });

  // Load SaaS Data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [m, g, p] = await Promise.all([fetchSaaSMetrics(), fetchSaaSGyms(), fetchSaaSPlans()]);
      if (m) setMetrics(m);
      if (g) setGyms(g);
      if (p?.plans) setPlans(p.plans);
    } catch (err) {
      console.error('Erro ao carregar dados do SaaS Master:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.role]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Actions: Block / Unblock Gym
  const handleToggleBlock = async (gym: GymSaaSAccount, willBlock: boolean) => {
    setActionLoading(true);
    try {
      const res = await toggleSaaSGymBlock(gym.gymId, willBlock, willBlock ? blockReasonInput : undefined);
      if (res.success) {
        showNotification('success', res.message);
        setSelectedGymForBlock(null);
        setBlockReasonInput('');
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao alterar bloqueio');
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Pay Invoice
  const handlePayInvoice = async (gymId: string, invoiceId: string, method: string, unblock: boolean) => {
    setActionLoading(true);
    try {
      const res = await paySaaSInvoice(gymId, invoiceId, { paymentMethod: method, unblockGym: unblock });
      if (res.success) {
        showNotification('success', res.message);
        // Refresh local modal selection
        if (selectedGymForInvoices && selectedGymForInvoices.gymId === gymId && res.account) {
          setSelectedGymForInvoices(res.account);
        }
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao liquidar fatura');
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Add New Manual Invoice
  const handleAddManualInvoice = async (gymId: string, amount: number, dueDate: string, month: string) => {
    setActionLoading(true);
    try {
      const res = await createSaaSInvoice(gymId, { amount, dueDate, referenceMonth: month });
      if (res.success) {
        showNotification('success', res.message);
        if (selectedGymForInvoices && selectedGymForInvoices.gymId === gymId && res.account) {
          setSelectedGymForInvoices(res.account);
        }
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao gerar fatura');
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Extend Trial
  const handleExtendTrial = async (gymId: string, days: number) => {
    setActionLoading(true);
    try {
      const res = await extendSaaSTrial(gymId, days);
      if (res.success) {
        showNotification('success', res.message);
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao prorrogar teste');
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Update Plan
  const handleUpdatePlan = async (gymId: string, plan: SaaSPlanId, fee: number, limit: number) => {
    setActionLoading(true);
    try {
      const res = await updateSaaSSubscription(gymId, { plan, monthlyFee: fee, turnstilesLimit: limit });
      if (res.success) {
        showNotification('success', res.message);
        setSelectedGymForPlan(null);
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao alterar plano');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSaaSPlanDetails = async (planId: string, planData: Partial<SaaSPlanConfig>) => {
    setActionLoading(true);
    try {
      const res = await updateSaaSPlan(planId, planData);
      if (res.success) {
        showNotification('success', res.message);
        setEditingPlan(null);
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao atualizar plano');
    } finally {
      setActionLoading(false);
    }
  };

  // Actions: Create New Gym
  const handleCreateGymSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await createSaaSGym(newGymForm);
      if (res.success && res.profile) {
        showNotification('success', res.message);
        setNewGymForm({
          name: '',
          slug: '',
          slogan: 'A sua melhor experiência de treino',
          city: 'São Paulo - SP',
          neighborhood: 'Centro',
          address: 'Av. Paulista, 1500',
          contactPhone: '(11) 98765-4321',
          maxCapacity: 150,
          themeColor: 'cyan',
          logoEmoji: '🏋️',
          ownerName: '',
          ownerEmail: '',
          ownerPassword: 'password123',
          plan: 'pro',
          monthlyFee: 299,
          trialDays: 15
        });
        
        // Redirect to the newly created gym's reception
        onSelectGym(res.profile);
      } else if (res.success) {
        // Fallback if profile is missing
        showNotification('success', res.message);
        setActiveTab('gyms');
        await loadData(true);
      } else {
        showNotification('error', res.message);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao cadastrar academia');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Gyms List
  const filteredGyms = gyms.filter(gym => {
    const matchesSearch =
      gym.gymName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'blocked'
        ? gym.isSystemBlocked || gym.status === 'blocked'
        : gym.status === statusFilter;

    const matchesPlan = planFilter === 'all' ? true : gym.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // All Invoices Flat List for Invoices Tab
  const allInvoices = gyms.flatMap(g =>
    (g.invoices || []).map(inv => ({
      ...inv,
      gymName: g.gymName,
      ownerEmail: g.ownerEmail,
      ownerPhone: g.ownerPhone,
      isGymBlocked: g.isSystemBlocked
    }))
  ).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      
      {/* SaaS Master Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 border border-indigo-500/30 p-6 shadow-2xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              Painel do Administrador Geral SaaS
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Gestão Central GymFlow SaaS</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700">
                MASTER SUPERADMIN
              </span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Controle global de assinaturas, bloqueio imediato de catracas por inadimplência, faturamento recorrente (MRR) e cadastro de novas academias clientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{refreshing ? 'Sincronizando...' : 'Atualizar Dados'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new_gym')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Academia</span>
            </button>

            {onLogout && (
              <button
                id="saas-header-logout-btn"
                type="button"
                onClick={onLogout}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer"
                title="Sair da Conta de Administrador Geral e voltar ao login geral"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* SuperAdmin Authentication State Warning */}
        {(!currentUser || currentUser.role !== 'superadmin') && (
          <div className="mt-4 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-start gap-2.5">
              <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block sm:inline mr-1">Autenticação de Administrador Geral Necessária:</strong>
                {currentUser 
                  ? `Você está conectado como "${currentUser.name}" (${currentUser.role}), sem privilégio de Administrador Geral do SaaS.` 
                  : 'Você ainda não fez login com a conta Master do SaaS.'}
                <div className="text-[11px] text-amber-300/80 mt-0.5">
                  Faça login com suas credenciais de Administrador Geral para gerenciar faturas, bloqueios e todas as academias.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: MRR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between hover:border-indigo-500/30 transition-colors group">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] sm:text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">MRR (Recorrência)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              R$ {metrics?.totalMRR?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 flex items-center gap-1 flex-wrap">
              <span className="text-emerald-400 font-semibold">R$ {metrics?.totalRevenueThisMonth?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span> 
              <span>faturados no mês</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Gyms */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between hover:border-indigo-500/30 transition-colors group">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] sm:text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Academias Conectadas</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {metrics?.totalGyms || 0} <span className="text-xs text-zinc-500 font-normal">unidades</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-emerald-400 font-medium">{metrics?.activeGyms || 0} ativas</span>
              <span className="text-zinc-700">•</span>
              <span className="text-amber-400 font-medium">{metrics?.trialGyms || 0} em teste</span>
            </div>
          </div>
        </div>

        {/* Card 3: Inadimplência / Bloqueios */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between hover:border-indigo-500/30 transition-colors group">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] sm:text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Status Financeiro</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className={metrics && metrics.blockedGyms > 0 ? 'text-rose-400' : 'text-zinc-200'}>
                {metrics?.blockedGyms || 0}
              </span>
              <span className="text-xs text-zinc-500 font-normal">bloqueadas</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 flex flex-wrap gap-1">
              <span>Inadimplência:</span> 
              <strong className="text-rose-400">{metrics?.delinquencyRate || 0}%</strong> 
              <span className="text-zinc-700">•</span>
              <span>{metrics?.overdueGyms || 0} atrasadas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Alunos Online no Brasil */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between hover:border-indigo-500/30 transition-colors group">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] sm:text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Tráfego em Tempo Real</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-400 tracking-tight">
              {metrics?.totalStudentsOnline || 0}
            </div>
            <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-1">
              Alunos atravessando catracas GymFlow agora
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => setActiveTab('gyms')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === 'gyms'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Academias ({gyms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Faturas & Cobrança</span>
          {metrics && metrics.overdueGyms > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px]">
              {metrics.overdueGyms}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('new_gym')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === 'new_gym'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Novo Cadastro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Planos</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GESTÃO DE ACADEMIAS */}
      {/* ========================================================================= */}
      {activeTab === 'gyms' && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar academia, cidade ou gestor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-[11px] sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] sm:text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Status: Todos</option>
                <option value="active">🟢 Ativas</option>
                <option value="trial">🟡 Teste</option>
                <option value="blocked">🔴 Bloqueadas</option>
                <option value="overdue">🟠 Atrasadas</option>
              </select>

              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] sm:text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Plano: Todos</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Gyms Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Carregando carteira de academias clientes...
            </div>
          ) : gyms.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto text-2xl shadow-lg">
                ✨
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <p className="font-bold text-lg text-white">Sistema Pronto para Novos Cadastros</p>
                <p className="text-xs text-zinc-400">
                  Todos os dados de exemplo foram removidos. O sistema está completamente limpo para você cadastrar as novas academias clientes do SaaS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('new_gym')}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Nova Academia Agora
              </button>
            </div>
          ) : filteredGyms.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-zinc-400 space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="font-medium text-white">Nenhuma academia encontrada</p>
              <p className="text-xs text-zinc-500">Tente ajustar seus termos de busca ou filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredGyms.map(gym => {
                const planInfo = SAAS_PLANS[gym.plan] || SAAS_PLANS.starter;
                const isBlocked = gym.isSystemBlocked || gym.status === 'blocked';
                const hasPendingInvoice = gym.invoices?.some(i => i.status === 'pending');

                return (
                  <div
                    key={gym.gymId}
                    className={`rounded-2xl border transition p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                      isBlocked
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : gym.status === 'trial'
                        ? 'bg-amber-950/10 border-amber-500/30'
                        : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Left: Gym Info & Owner */}
                    <div className="space-y-2 flex-1 w-full lg:w-auto">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base sm:text-lg font-bold text-white tracking-tight">{gym.gymName}</span>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20 uppercase tracking-wide">
                              <Lock className="w-3 h-3" />
                              Bloqueada
                            </span>
                          ) : gym.status === 'trial' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">
                              <Clock className="w-3 h-3" />
                              Trial {gym.trialEndsAt ? `- Expira ${new Date(gym.trialEndsAt).toLocaleDateString('pt-BR')}` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-wide">
                              <CheckCircle2 className="w-3 h-3" />
                              Adimplente
                            </span>
                          )}

                          <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700/50 uppercase tracking-tight">
                            {gym.planName || gym.plan.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-3 text-[11px] sm:text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-600">Gestor:</span>
                          <span className="text-zinc-300 font-medium">{gym.ownerName}</span>
                        </div>
                        <span className="hidden sm:inline text-zinc-800">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-600">Email:</span>
                          <span className="text-zinc-300 font-medium">{gym.ownerEmail}</span>
                        </div>
                        <span className="hidden sm:inline text-zinc-800">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-600">Cidade:</span>
                          <span className="text-zinc-300 font-medium">{gym.city}</span>
                        </div>
                      </div>

                      {/* Block Reason Warning if blocked */}
                      {isBlocked && gym.blockReason && (
                        <div className="mt-2 text-[11px] text-rose-300 bg-rose-500/5 border border-rose-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span><strong>Restrição de Acesso:</strong> {gym.blockReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Plan, Hardware & Billing Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row gap-4 sm:gap-6 text-xs py-4 lg:py-0 border-y lg:border-y-0 lg:border-x border-zinc-800/60 lg:px-6 w-full lg:w-auto">
                      <div className="space-y-0.5">
                        <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Mensalidade</div>
                        <div className="text-sm font-bold text-white flex items-baseline gap-1">
                          R$ {gym.monthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-zinc-600 font-normal">/mês</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Vencimento</div>
                        <div className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500/70" />
                          {gym.nextDueDate ? new Date(gym.nextDueDate).toLocaleDateString('pt-BR') : 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-0.5 col-span-2 sm:col-span-1">
                        <div className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Hardware</div>
                        <div className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-500/70" />
                          <span>{gym.turnstilesLimit || planInfo.turnstilesLimit} Catracas</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Master Control Actions */}
                    <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap lg:flex-nowrap justify-start lg:justify-end">
                      
                      {/* View Invoices / Register Payment */}
                      <button
                        type="button"
                        onClick={() => setSelectedGymForInvoices(gym)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <Receipt className="w-4 h-4 text-indigo-400" />
                        <span className="lg:hidden xl:inline">Faturas ({gym.invoices?.length || 0})</span>
                        <span className="hidden lg:inline xl:hidden">Financ.</span>
                      </button>

                      {/* Upgrade / Change Plan */}
                      <button
                        type="button"
                        onClick={() => setSelectedGymForPlan(gym)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span className="lg:hidden xl:inline">Mudar Plano</span>
                        <span className="hidden lg:inline xl:hidden">Plano</span>
                      </button>

                      {/* Extend Trial */}
                      {gym.status === 'trial' && (
                        <button
                          type="button"
                          onClick={() => handleExtendTrial(gym.gymId, 15)}
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
                          title="Adicionar +15 dias de teste grátis"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="lg:hidden xl:inline">+15d Trial</span>
                          <span className="hidden lg:inline xl:hidden">+15d</span>
                        </button>
                      )}

                      {/* Block / Unblock Toggle Button */}
                      {isBlocked ? (
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(gym, false)}
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <Unlock className="w-4 h-4" />
                          <span>Liberar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGymForBlock(gym);
                            setBlockReasonInput('Atraso no pagamento da mensalidade');
                          }}
                          className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Bloquear</span>
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CENTRAL DE FATURAS & PAGAMENTOS */}
      {/* ========================================================================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Fluxo de Caixa & Inadimplência</h3>
                <p className="text-[11px] text-zinc-500">Monitoramento global de todas as faturas emitidas no sistema.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Pendente Total</div>
                  <div className="text-sm font-bold text-rose-400">R$ {metrics?.pendingRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="w-px h-8 bg-zinc-800 hidden sm:block"></div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Faturado Mês</div>
                  <div className="text-sm font-bold text-emerald-400">R$ {metrics?.totalRevenueThisMonth?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-zinc-800/40 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-5 py-4 border-b border-zinc-800">Academia / Referência</th>
                      <th className="px-5 py-4 border-b border-zinc-800">Vencimento</th>
                      <th className="px-5 py-4 border-b border-zinc-800">Valor</th>
                      <th className="px-5 py-4 border-b border-zinc-800">Status</th>
                      <th className="px-5 py-4 border-b border-zinc-800 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {allInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-zinc-500 text-xs italic">Nenhuma fatura encontrada no histórico.</td>
                      </tr>
                    ) : (
                      allInvoices
                        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                        .map(inv => (
                          <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-5 py-4">
                              <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{inv.gymName}</div>
                              <div className="text-[10px] text-zinc-500 font-medium">Ref: {inv.referenceMonth}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-xs text-zinc-300">
                                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-xs font-bold text-zinc-100">
                                R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {inv.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Quitada
                                </span>
                              ) : inv.status === 'overdue' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20 uppercase">
                                  <AlertTriangle className="w-3 h-3" />
                                  Atrasada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase">
                                  <Clock className="w-3 h-3" />
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {inv.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handlePayInvoice(inv.gymId, inv.id, 'pix', true)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
                                >
                                  Baixa PIX
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* ========================================================================= */}
      {/* TAB 3: CADASTRAR NOVA ACADEMIA */}
      {/* ========================================================================= */}
      {activeTab === 'new_gym' && (
        <div className="max-w-3xl mx-auto rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Plus className="w-3.5 h-3.5" />
              Onboarding Direto de Nova Academia Cliente
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Ativação de Nova Unidade</h2>
            <p className="text-xs text-zinc-500">
              Configure os parâmetros operacionais, credenciais do gestor e provisionamento de hardware.
            </p>
          </div>

          <form onSubmit={handleCreateGymSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nome da Academia Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BodyTech Moema"
                  value={newGymForm.name}
                  onChange={e => setNewGymForm({ ...newGymForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800/80 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Slug URL / Identificador *</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="ex: bodytech-moema"
                    value={newGymForm.slug}
                    onChange={e => setNewGymForm({ ...newGymForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="flex-1 px-4 py-3 bg-zinc-800/80 border border-zinc-700 rounded-l-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="px-3 py-3 bg-zinc-900 border border-l-0 border-zinc-700 rounded-r-xl text-[10px] text-zinc-500 font-mono">.gymflow.app</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome do Proprietário / Gestor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rodrigo Mendonça"
                  value={newGymForm.ownerName}
                  onChange={e => setNewGymForm({ ...newGymForm, ownerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">E-mail de Login do Gestor *</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: gestao@bodytechmoema.com.br"
                  value={newGymForm.ownerEmail}
                  onChange={e => setNewGymForm({ ...newGymForm, ownerEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Senha Provisória</label>
                <input
                  type="text"
                  value={newGymForm.ownerPassword}
                  onChange={e => setNewGymForm({ ...newGymForm, ownerPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={newGymForm.contactPhone}
                  onChange={e => setNewGymForm({ ...newGymForm, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Cidade - Estado</label>
                <input
                  type="text"
                  placeholder="São Paulo - SP"
                  value={newGymForm.city}
                  onChange={e => setNewGymForm({ ...newGymForm, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Plan Selection Tier */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="block text-xs font-semibold text-white">Plano SaaS Inicial</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['starter', 'pro', 'enterprise'] as SaaSPlanId[]).map(planKey => {
                  const p = SAAS_PLANS[planKey];
                  const isSelected = newGymForm.plan === planKey;
                  return (
                    <button
                      key={planKey}
                      type="button"
                      onClick={() => setNewGymForm({ ...newGymForm, plan: planKey, monthlyFee: p.price })}
                      className={`p-3.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <div className="text-sm font-bold text-indigo-400 mt-1">R$ {p.price}/mês</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Até {p.turnstilesLimit} catracas</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Mensalidade Customizada (R$)</label>
                <input
                  type="number"
                  value={newGymForm.monthlyFee}
                  onChange={e => setNewGymForm({ ...newGymForm, monthlyFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Dias de Teste Gratuito (Trial)</label>
                <select
                  value={newGymForm.trialDays}
                  onChange={e => setNewGymForm({ ...newGymForm, trialDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={0}>Sem Teste (Cobrança Imediata)</option>
                  <option value={7}>7 Dias de Teste</option>
                  <option value={15}>15 Dias de Teste (Padrão)</option>
                  <option value={30}>30 Dias de Teste</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('gyms')}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Finalizar Cadastro e Gerar Acessos</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONFIGURAÇÃO DE PLANOS */}
      {/* TAB 4: CONFIGURAÇÃO DE PLANOS */}
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Catálogo de Planos SaaS</h2>
              <p className="text-xs text-zinc-500">Configure os níveis de serviço, precificação e limites operacionais para as unidades clientes.</p>
            </div>
            <div className="p-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1">
              <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Modo Edição</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(plans.length > 0 ? plans : Object.values(SAAS_PLANS)).map(plan => (
              <div key={plan.id} className="group relative flex flex-col bg-zinc-900/50 rounded-3xl border border-zinc-800/80 hover:border-indigo-500/40 transition-all duration-300 overflow-hidden">
                {/* Visual Header */}
                <div className="h-24 bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent opacity-50" />
                
                <div className="px-6 pb-8 -mt-12 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl group-hover:border-indigo-500/50 transition-colors">
                      <Layers className="w-6 h-6 text-indigo-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlan(plan)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80">{plan.badge}</span>
                    <h3 className="text-2xl font-black text-white tracking-tighter">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-zinc-500">R$</span>
                      <span className="text-4xl font-black text-white">{plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">/ mês</span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-400 mb-8 flex-1 italic">
                    "{plan.description}"
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-px flex-1 bg-zinc-800" />
                      Entregas
                      <div className="h-px flex-1 bg-zinc-800" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-zinc-300">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          </div>
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">Capacidade de Hardware</span>
                      <span className="text-xs font-black text-amber-500">{plan.turnstilesLimit} Catracas</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="w-full py-4 rounded-2xl bg-zinc-950 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest transition-all duration-300 border border-zinc-800 hover:border-indigo-500 shadow-lg shadow-black/40 flex items-center justify-center gap-2"
                  >
                    <Settings2 className="w-4 h-4" />
                    Gerenciar Plano
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal: Edit SaaS Plan */}
      {editingPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Plano SaaS</h3>
                  <p className="text-xs text-zinc-400">Modificar definições de {editingPlan.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingPlan(null)} className="text-zinc-500 hover:text-white transition">✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const features = formData.get('features')?.toString().split('\n').filter(f => f.trim()) || [];
              
              handleUpdateSaaSPlanDetails(editingPlan.id, {
                name: formData.get('name')?.toString(),
                price: Number(formData.get('price')),
                badge: formData.get('badge')?.toString(),
                description: formData.get('description')?.toString(),
                turnstilesLimit: Number(formData.get('turnstilesLimit')),
                features
              });
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do Plano</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={editingPlan.name}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Preço Mensal (R$)</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editingPlan.price}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Badge / Selo</label>
                  <input
                    name="badge"
                    type="text"
                    required
                    defaultValue={editingPlan.badge}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Limite de Catracas</label>
                  <input
                    name="turnstilesLimit"
                    type="number"
                    required
                    defaultValue={editingPlan.turnstilesLimit}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descrição Curta</label>
                <textarea
                  name="description"
                  required
                  rows={2}
                  defaultValue={editingPlan.description}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex justify-between">
                  <span>Recursos Inclusos</span>
                  <span className="text-[10px] text-zinc-600">Um por linha</span>
                </label>
                <textarea
                  name="features"
                  required
                  rows={4}
                  defaultValue={editingPlan.features.join('\n')}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GERENCIAR FATURAS DA ACADEMIA */}
      {/* ========================================================================= */}
      {selectedGymForInvoices && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  <span>Faturas de {selectedGymForInvoices.gymName}</span>
                </h3>
                <p className="text-xs text-zinc-400">Histórico de cobrança e quitação de mensalidades.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGymForInvoices(null)}
                className="text-zinc-500 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Invoices List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {selectedGymForInvoices.invoices?.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">Nenhuma fatura emitida ainda.</div>
              ) : (
                selectedGymForInvoices.invoices?.map(inv => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">({inv.referenceMonth})</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Vencimento: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                        {inv.paidDate && ` • Pago em ${new Date(inv.paidDate).toLocaleDateString('pt-BR')}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status === 'paid' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          ✓ QUITADA ({inv.paymentMethod?.toUpperCase() || 'PIX'})
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePayInvoice(selectedGymForInvoices.gymId, inv.id, 'pix', true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition shadow"
                        >
                          Confirmar Pagamento PIX
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Emit New Invoice Form */}
            <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-2">
              <div className="text-xs font-semibold text-zinc-300">Emitir Nova Fatura Manual</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Valor R$"
                  defaultValue={selectedGymForInvoices.monthlyFee}
                  id="manualAmountInput"
                  className="w-28 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                />
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  id="manualDueDateInput"
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const amount = Number((document.getElementById('manualAmountInput') as HTMLInputElement)?.value) || selectedGymForInvoices.monthlyFee;
                    const dueDate = (document.getElementById('manualDueDateInput') as HTMLInputElement)?.value;
                    const month = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                    handleAddManualInvoice(selectedGymForInvoices.gymId, amount, dueDate, month);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Emitir
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGymForInvoices(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BLOQUEAR ACADEMIA */}
      {/* ========================================================================= */}
      {selectedGymForBlock && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Bloquear Acesso da Academia</h3>
                <p className="text-xs text-zinc-400">{selectedGymForBlock.gymName}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Ao bloquear, <strong>todas as catracas físicas (ESP32) travarão instantaneamente</strong> e nenhum aluno ou funcionário conseguirá liberar acessos até a regularização.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Motivo do Bloqueio *</label>
              <textarea
                rows={2}
                value={blockReasonInput}
                onChange={e => setBlockReasonInput(e.target.value)}
                placeholder="Ex: Mensalidade vencida há mais de 10 dias sem comprovante de quitação."
                className="w-full px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedGymForBlock(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleToggleBlock(selectedGymForBlock, true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-lg shadow-rose-600/30"
              >
                {actionLoading ? 'Aplicando...' : 'Confirmar Bloqueio Imediato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALTERAR PLANO / LIMITES */}
      {/* ========================================================================= */}
      {selectedGymForPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Alterar Plano & Limites</h3>
                <p className="text-xs text-zinc-400">{selectedGymForPlan.gymName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGymForPlan(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {(['starter', 'pro', 'enterprise'] as SaaSPlanId[]).map(planKey => {
                const p = SAAS_PLANS[planKey];
                return (
                  <div
                    key={planKey}
                    className="p-3.5 rounded-xl bg-zinc-800/70 border border-zinc-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[11px] text-zinc-400">R$ {p.price}/mês • Até {p.turnstilesLimit} catracas</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdatePlan(selectedGymForPlan.gymId, planKey, p.price, p.turnstilesLimit)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                    >
                      Aplicar Plano
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
