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
  Info
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
}

export function SaaSAdminDashboard({ currentUser, onSelectGym, onOpenLoginModal, onClose }: SaaSAdminDashboardProps) {
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
    themeColor: '#22c55e',
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
      if (res.success) {
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
          themeColor: '#22c55e',
          logoEmoji: '🏋️',
          ownerName: '',
          ownerEmail: '',
          ownerPassword: 'password123',
          plan: 'pro',
          monthlyFee: 299,
          trialDays: 15
        });
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

          <div className="flex items-center gap-2.5 self-stretch md:self-auto">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{refreshing ? 'Sincronizando...' : 'Atualizar Dados'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new_gym')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Academia</span>
            </button>
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
                  Faça login com a conta <strong>admin@gymflow.com</strong> (senha: <code>admin123</code>) para gerenciar faturas, bloqueios e todas as academias.
                </div>
              </div>
            </div>

            {onOpenLoginModal && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs whitespace-nowrap shadow transition-all cursor-pointer shrink-0"
              >
                Fazer Login como SuperAdmin
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: MRR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">MRR (Receita Recorrente)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              R$ {metrics?.totalMRR?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">R$ {metrics?.totalRevenueThisMonth?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span> recebidos no mês
            </div>
          </div>
        </div>

        {/* Card 2: Total Gyms */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Academias Conectadas</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {metrics?.totalGyms || 0} <span className="text-xs text-zinc-500 font-normal">unidades</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-medium">{metrics?.activeGyms || 0} ativas</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">{metrics?.trialGyms || 0} em teste</span>
            </div>
          </div>
        </div>

        {/* Card 3: Inadimplência / Bloqueios */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Inadimplência & Bloqueios</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
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
            <div className="text-[11px] text-zinc-400 mt-1">
              Taxa de atraso: <strong className="text-rose-400">{metrics?.delinquencyRate || 0}%</strong> ({metrics?.overdueGyms || 0} pendentes)
            </div>
          </div>
        </div>

        {/* Card 4: Alunos Online no Brasil */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-medium">Alunos Treinando Agora</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-400 tracking-tight">
              {metrics?.totalStudentsOnline || 0}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Catracas transmitindo telemetria em tempo real
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('gyms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'gyms'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Gestão de Academias ({gyms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Central de Faturas & Pagamentos</span>
          {metrics && metrics.overdueGyms > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {metrics.overdueGyms}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('new_gym')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'new_gym'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Academia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Configuração de Planos</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GESTÃO DE ACADEMIAS */}
      {/* ========================================================================= */}
      {activeTab === 'gyms' && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por academia, cidade, proprietário ou e-mail..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">🟢 Ativas</option>
                <option value="trial">🟡 Em Teste (Trial)</option>
                <option value="blocked">🔴 Bloqueadas</option>
                <option value="overdue">🟠 Em Atraso</option>
              </select>

              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Todos os Planos</option>
                <option value="starter">Starter (R$ 149)</option>
                <option value="pro">Pro (R$ 299)</option>
                <option value="enterprise">Enterprise (R$ 599)</option>
              </select>
            </div>
          </div>

          {/* Gyms Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Carregando carteira de academias clientes...
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
                    <div className="space-y-1.5 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-white">{gym.gymName}</span>
                        
                        {/* Status Badge */}
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                            <Lock className="w-2.5 h-2.5" />
                            BLOQUEADA / SUSPENSA
                          </span>
                        ) : gym.status === 'trial' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" />
                            TRIAL (Até {gym.trialEndsAt ? new Date(gym.trialEndsAt).toLocaleDateString('pt-BR') : '15 dias'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            ATIVA & ADIMPLENTE
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium border border-zinc-700">
                          {gym.planName || gym.plan.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                        <span>👤 {gym.ownerName}</span>
                        <span>•</span>
                        <span>✉️ {gym.ownerEmail}</span>
                        {gym.ownerPhone && (
                          <>
                            <span>•</span>
                            <span>📱 {gym.ownerPhone}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>📍 {gym.city}</span>
                      </div>

                      {/* Block Reason Warning if blocked */}
                      {isBlocked && gym.blockReason && (
                        <div className="mt-1 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Motivo: {gym.blockReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Plan, Hardware & Billing Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-zinc-400 py-2 sm:py-0 border-y sm:border-y-0 sm:border-x border-zinc-800 sm:px-4">
                      <div>
                        <div className="text-zinc-500 text-[10px]">MENSALIDADE</div>
                        <div className="text-sm font-bold text-white">
                          R$ {gym.monthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-zinc-500 text-[10px]">VENCIMENTO</div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          {gym.nextDueDate ? new Date(gym.nextDueDate).toLocaleDateString('pt-BR') : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-zinc-500 text-[10px]">LIMITE CATRACAS</div>
                        <div className="text-xs font-semibold text-zinc-200">
                          Até {gym.turnstilesLimit || planInfo.turnstilesLimit} catracas
                        </div>
                      </div>
                    </div>

                    {/* Right: Master Control Actions */}
                    <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-end">
                      
                      {/* View Invoices / Register Payment */}
                      <button
                        type="button"
                        onClick={() => setSelectedGymForInvoices(gym)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                      >
                        <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Faturas ({gym.invoices?.length || 0})</span>
                      </button>

                      {/* Upgrade / Change Plan */}
                      <button
                        type="button"
                        onClick={() => setSelectedGymForPlan(gym)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                      >
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Alterar Plano</span>
                      </button>

                      {/* Extend Trial */}
                      {gym.status === 'trial' && (
                        <button
                          type="button"
                          onClick={() => handleExtendTrial(gym.gymId, 15)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30 transition"
                          title="Adicionar +15 dias de teste grátis"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>+15d Teste</span>
                        </button>
                      )}

                      {/* Block / Unblock Toggle Button */}
                      {isBlocked ? (
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(gym, false)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Desbloquear Acesso</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGymForBlock(gym);
                            setBlockReasonInput('Atraso no pagamento da mensalidade');
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition"
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
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
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Todas as Faturas e Mensalidades dos Clientes</h3>
              <p className="text-xs text-zinc-400">Auditoria completa de faturas geradas, recebidas via PIX/Cartão e faturas pendentes.</p>
            </div>
            <div className="text-xs text-zinc-300 font-semibold px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700">
              Total Faturado: <span className="text-emerald-400">R$ {metrics?.totalRevenueThisMonth?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/90">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-800/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Academia / Cliente</th>
                    <th className="p-3.5">Ref. Mês</th>
                    <th className="p-3.5">Valor</th>
                    <th className="p-3.5">Vencimento</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Pagamento</th>
                    <th className="p-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {allInvoices.map(inv => {
                    const isPaid = inv.status === 'paid';
                    const isPending = inv.status === 'pending';

                    return (
                      <tr key={inv.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{inv.gymName}</div>
                          <div className="text-[10px] text-zinc-500">{inv.ownerEmail}</div>
                        </td>
                        <td className="p-3.5 font-mono">{inv.referenceMonth}</td>
                        <td className="p-3.5 font-bold text-white">
                          R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-zinc-300">
                          {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3.5">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5" /> PAGA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              <Clock className="w-2.5 h-2.5" /> PENDENTE
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-zinc-400 text-[11px]">
                          {inv.paidDate ? (
                            <span>{new Date(inv.paidDate).toLocaleDateString('pt-BR')} ({inv.paymentMethod?.toUpperCase() || 'PIX'})</span>
                          ) : (
                            <span className="text-zinc-600">Aguardando quitação</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handlePayInvoice(inv.gymId, inv.id, 'pix', true)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Dar Baixa (PIX)</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
            <h2 className="text-xl font-bold text-white tracking-tight">Cadastro de Academia no SaaS</h2>
            <p className="text-xs text-zinc-400">
              Gera automaticamente as credenciais do proprietário, provisiona a chave API de hardware para a catraca e cria o contrato SaaS inicial.
            </p>
          </div>

          <form onSubmit={handleCreateGymSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nome da Academia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BodyTech Moema"
                  value={newGymForm.name}
                  onChange={e => setNewGymForm({ ...newGymForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Slug URL (Identificador) *</label>
                <input
                  type="text"
                  placeholder="Ex: bodytech-moema (opcional, gerado automático)"
                  value={newGymForm.slug}
                  onChange={e => setNewGymForm({ ...newGymForm, slug: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
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
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Configuração Global de Planos SaaS</h3>
              <p className="text-xs text-zinc-400">Edite os preços, descrições e recursos disponíveis para as academias em cada plano.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(plans.length > 0 ? plans : Object.values(SAAS_PLANS)).map(plan => (
              <div key={plan.id} className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 flex flex-col h-full hover:border-indigo-500/50 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{plan.badge}</span>
                    <h4 className="text-xl font-bold text-white tracking-tight">{plan.name}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-black text-white">
                    R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <span className="text-sm text-zinc-500 font-normal">/mês</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-6 flex-1">
                  {plan.description}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recursos Inclusos</div>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-zinc-300 pt-1 border-t border-zinc-800 mt-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Limite de {plan.turnstilesLimit} catracas</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPlan(plan)}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar Definições
                </button>
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
