import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LiveOccupancyCard } from './components/LiveOccupancyCard';
import { CrowdPredictorChart } from './components/CrowdPredictorChart';
import { OperatingHoursCard } from './components/OperatingHoursCard';
import { AnnouncementsBoard } from './components/AnnouncementsBoard';
import { ReceptionControlPanel } from './components/ReceptionControlPanel';
import { AccessAuditLogs } from './components/AccessAuditLogs';
import { ESP32HardwarePanel } from './components/ESP32HardwarePanel';
import { StudentWorkoutPlanner } from './components/StudentWorkoutPlanner';
import { GymRegistrationModal } from './components/GymRegistrationModal';
import { GymShareModal } from './components/GymShareModal';
import { GymCustomizerModal } from './components/GymCustomizerModal';
import { GymLoginModal } from './components/GymLoginModal';
import { SupabaseIntegrationModal } from './components/SupabaseIntegrationModal';
import { SaaSAdminDashboard } from './components/SaaSAdminDashboard';
import { LogoutConfirmationModal } from './components/LogoutConfirmationModal';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchGyms,
  fetchGymDetails,
  fetchOccupancy,
  fetchAccessLogs,
  fetchAnnouncements,
  triggerESP32Entry,
  triggerESP32Exit,
  sendTurnstileAction,
  createAnnouncement,
  deleteAnnouncement,
  updateGymSettings,
  getStoredAuthUser,
  clearAuthSession
} from './services/api';
import { OccupancyData, AccessLog, Announcement, GymProfile, AuthUser } from './types';
import { INITIAL_GYMS, THEME_COLOR_CONFIG } from './data/gymData';
import { Dumbbell, Shield, Cpu, Share2, Plus, Sparkles, Building2, ExternalLink, Sliders, ShieldAlert, Lock, AlertTriangle, Smartphone, Database } from 'lucide-react';

const DEFAULT_EMPTY_OCCUPANCY: OccupancyData = {
  gymId: '',
  gymName: 'Nenhuma Academia Cadastrada',
  gymSlug: '',
  themeColor: 'cyan',
  logoEmoji: '⚡',
  slogan: 'Monitoramento de Lotação em Tempo Real',
  city: '',
  neighborhood: '',
  currentCount: 0,
  maxCapacity: 80,
  status: 'empty',
  percentage: 0,
  turnstileLocked: false,
  isOpen: false,
  closingTimeToday: '23:00',
  openingTimeToday: '06:00',
  lastAccessTime: null,
  lastAccessType: null,
  esp32Connected: false,
  esp32LastPing: null,
  esp32DeviceName: 'ESP32_CATRACA',
  esp32Ip: '192.168.1.100',
  pendingRelayTrigger: null
};

export default function App() {
  const [gyms, setGyms] = useState<GymProfile[]>(INITIAL_GYMS);
  const [currentGym, setCurrentGym] = useState<GymProfile | null>(INITIAL_GYMS.length > 0 ? INITIAL_GYMS[0] : null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [activeTab, setActiveTab] = useState<'student' | 'reception' | 'esp32' | 'saas_admin'>('reception');
  const [receptionSubTab, setReceptionSubTab] = useState<'announcements' | 'audit'>('announcements');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDirectStudentLink, setIsDirectStudentLink] = useState(false);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register' | 'forgot_request'>('login');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState(() => isSupabaseConfigured());
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'error' | 'not_configured'>('not_configured');

  // Core occupancy and telemetry state
  const [occupancy, setOccupancy] = useState<OccupancyData>(DEFAULT_EMPTY_OCCUPANCY);

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function checkSupabase() {
      try {
        const response = await fetch('/api/supabase/status');
        const data = await response.json();
        if (data.isConfigured) {
          setIsSupabaseActive(true);
          setSupabaseStatus('connected');
        } else {
          setIsSupabaseActive(isSupabaseConfigured());
          setSupabaseStatus(isSupabaseConfigured() ? 'connected' : 'not_configured');
        }
      } catch (err) {
        console.warn('Falha ao verificar status do Supabase no servidor');
        setIsSupabaseActive(isSupabaseConfigured());
      }
    }
    checkSupabase();
  }, [isSupabaseModalOpen]);

  // 1. Initial URL detection and Gym listing load
  useEffect(() => {
    async function initGyms() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const gymParam = urlParams.get('gym') || (window.location.hash.includes('gym=') ? window.location.hash.split('gym=')[1]?.split('&')[0] : null);
        const viewParam = urlParams.get('view')?.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();

        // Check if accessing SuperAdmin/SaaS Master via pathname, query, or hash
        // Be more precise to avoid accidental triggers
        const isSuperAdminRoute =
          viewParam === 'saas' ||
          viewParam === 'admin' ||
          viewParam === 'superadmin' ||
          viewParam === 'master' ||
          pathname === '/admin' ||
          pathname === '/admin/' ||
          pathname === '/superadmin' ||
          pathname === '/superadmin/' ||
          pathname === '/saas' ||
          pathname === '/saas/' ||
          pathname === '/master' ||
          pathname === '/master/' ||
          hash === '#admin' ||
          hash === '#superadmin' ||
          hash === '#saas' ||
          hash === '#master';

        if (isSuperAdminRoute) {
          // If accessing admin route but not logged in, we'll keep the tab but show the gate
          // If already logged in, we'll show the dashboard
          setActiveTab('saas_admin');
        } else if (viewParam === 'student' || pathname.startsWith('/aluno') || pathname.startsWith('/student')) {
          setActiveTab('student');
          if (gymParam) setIsDirectStudentLink(true);
        } else if (viewParam === 'reception' || pathname.startsWith('/recepcao') || pathname.startsWith('/reception')) {
          setActiveTab('reception');
        } else if (viewParam === 'esp32' || pathname.startsWith('/hardware') || pathname.startsWith('/esp32')) {
          setActiveTab('esp32');
        } else {
          // Default for root link / no params: Reception (which shows login portal if no user)
          setActiveTab('reception');
          
          // If hitting root link without being logged in, open the login modal automatically
          if (!getStoredAuthUser()) {
            setTimeout(() => {
              setIsLoginModalOpen(true);
            }, 100);
          }
        }

        const allGyms = await fetchGyms();
        if (allGyms && allGyms.length > 0) {
          setGyms(allGyms);
          let selected = allGyms[0];
          if (gymParam) {
            const match = allGyms.find(g => g.slug === gymParam || g.id === gymParam);
            if (match) selected = match;
          }
          setCurrentGym(selected);
        } else {
          setGyms([]);
          setCurrentGym(null);
        }
      } catch (err) {
        console.error('[GymFlow Init] Erro crítico na inicialização:', err);
        setGyms([]);
        setCurrentGym(null);
      }
    }
    initGyms().finally(() => setIsInitialLoading(false));
  }, []);

  // 2. Load gym data whenever currentGym changes or polled
  const loadGymData = useCallback(async (gymSlug: string, silent = false) => {
    if (!gymSlug) return;
    if (!silent) setIsRefreshing(true);
    try {
      const details = await fetchGymDetails(gymSlug);
      if (details) {
        if (details.profile) {
          setCurrentGym(details.profile);
        }

        if (details.occupancy) {
          setOccupancy(details.occupancy);
        }

        if (details.announcements) {
          setAnnouncements(details.announcements);
        }

        if (details.accessLogs) {
          setAccessLogs(details.accessLogs);
        }
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados da academia:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [occupancy.lastAccessTime]);

  // Initial load when currentGym is ready
  useEffect(() => {
    if (currentGym?.slug) {
      loadGymData(currentGym.slug, false);
    }
  }, [currentGym?.slug]);

  // Real-time polling every 3 seconds for active gym
  useEffect(() => {
    if (!currentGym?.slug) return;
    const interval = setInterval(() => {
      loadGymData(currentGym.slug, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentGym?.slug, loadGymData]);

  // Safe URL Param Update Helper (prevents iframe SecurityError / DOMException crashes)
  const safeUpdateUrlParam = (param: string, value: string | null) => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const url = new URL(window.location.href);
        if (value === null) {
          url.searchParams.delete(param);
        } else {
          url.searchParams.set(param, value);
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.debug('[GymFlow] URL update gracefully bypassed in sandbox:', e);
    }
  };

  // Switch active gym
  const handleSelectGym = (gym: GymProfile) => {
    setCurrentGym(gym);
    safeUpdateUrlParam('gym', gym.slug);
    loadGymData(gym.slug, false);
  };

  // Gym creation callback
  const handleGymCreated = (newGym: GymProfile) => {
    setGyms(prev => [newGym, ...prev.filter(g => g.id !== newGym.id)]);
    setCurrentGym(newGym);
    if (currentUser?.role !== 'superadmin') {
      setActiveTab('reception');
    }
    safeUpdateUrlParam('gym', newGym.slug);
    loadGymData(newGym.slug, false);
  };

  // Gym update callback
  const handleGymUpdated = (updatedGym: GymProfile) => {
    setGyms(prev => prev.map(g => g.id === updatedGym.id ? updatedGym : g));
    setCurrentGym(updatedGym);
    loadGymData(updatedGym.slug, true);
  };

  // Auth Handlers
  const handleLoginSuccess = (user: AuthUser) => {
    console.log('[GymFlow Auth] Login Success! User Object:', {
      id: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      gymSlug: user.gymSlug,
      gymName: user.gymName
    });
    setCurrentUser(user);
    
    // Auto-direct based on role
    if (user.role === 'superadmin') {
      setActiveTab('saas_admin');
    } else {
      setActiveTab('reception');
    }

    if (user.gymSlug) {
      const match = gyms.find(g => g.slug === user.gymSlug || g.id === user.gymId);
      if (match) {
        handleSelectGym(match);
      }
    }
  };

  const handleLogout = () => {
    setIsLogoutConfirmationOpen(true);
  };

  const performLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setIsLogoutConfirmationOpen(false);
    // After logout, reset to 'reception' tab which will show the Welcome/Login Portal if no user
    setActiveTab('reception');
    setIsDirectStudentLink(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('admin');
      url.searchParams.delete('saas');
      url.searchParams.delete('gym');
      url.hash = '';
      const newPath = url.pathname.includes('/master') || url.pathname.includes('/saas') ? '/' : url.pathname;
      window.history.replaceState({}, '', newPath + (url.search ? url.search : ''));
    } catch {}
  };

  // Handlers for ESP32 Simulation
  const handleSimulateEntry = async () => {
    if (!currentGym) return;
    const res = await triggerESP32Entry(currentGym.slug, true);
    await loadGymData(currentGym.slug, true);
    return res;
  };

  const handleSimulateExit = async () => {
    if (!currentGym) return;
    const res = await triggerESP32Exit(currentGym.slug, true);
    await loadGymData(currentGym.slug, true);
    return res;
  };

  // Handlers for Reception Actions
  const handleTurnstileAction = async (action: string, value?: any, notes?: string) => {
    if (!currentGym) return;
    const res = await sendTurnstileAction(currentGym.slug, action, value, notes);
    await loadGymData(currentGym.slug, true);
    return res;
  };

  const handleUpdateCapacity = async (maxCapacity: number) => {
    if (!currentGym) return;
    const res = await updateGymSettings(currentGym.slug, { maxCapacity });
    if (res.success && res.profile) {
      handleGymUpdated(res.profile);
    }
    return res;
  };

  // Announcements CRUD
  const handleAddAnnouncement = async (item: Partial<Announcement>): Promise<boolean> => {
    if (!currentGym) return false;
    const created = await createAnnouncement(currentGym.slug, item);
    if (created) {
      setAnnouncements(prev => [created, ...prev]);
      return true;
    }
    return false;
  };

  const handleDeleteAnnouncement = async (id: string): Promise<boolean> => {
    if (!currentGym) return false;
    const success = await deleteAnnouncement(currentGym.slug, id);
    if (success) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      return true;
    }
    return false;
  };

  // Filtered gyms list based on user role
  const visibleGyms = React.useMemo(() => {
    if (!currentUser) return gyms; // Show all if not logged in (e.g. initial loading or student view)
    if (currentUser.role === 'superadmin') return gyms;
    return gyms.filter(g => g.id === currentUser.gymId || g.slug === currentUser.gymSlug);
  }, [gyms, currentUser]);

  const theme = THEME_COLOR_CONFIG[currentGym?.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;
  const visualTheme = currentGym?.visualTheme || 'dark';

  return (
    <div 
      data-theme={visualTheme}
      className={`min-h-screen flex flex-col selection:bg-indigo-500/30 font-['Outfit'] transition-colors duration-500 ${
        visualTheme === 'light' 
          ? 'bg-white text-zinc-900' 
          : 'bg-[#0C0C0D] text-white'
      }`}
    >
      
      {/* SaaS Student Dedicated Header Banner if accessed directly via student URL */}
      {isDirectStudentLink && currentGym && (
        <div className="bg-gradient-to-r from-cyan-950/80 via-zinc-900 to-cyan-950/80 border-b border-cyan-500/20 px-4 py-2 text-center text-xs text-zinc-300 flex items-center justify-center gap-2">
          <span className="text-base">{currentGym.logoEmoji}</span>
          <span>Você está visualizando a lotação oficial de <strong className="text-white">{currentGym.name}</strong></span>
          <button 
            type="button"
            onClick={() => setIsDirectStudentLink(false)}
            className="ml-2 text-[10px] text-cyan-400 hover:underline font-semibold"
          >
            (Trocar de academia)
          </button>
        </div>
      )}

      {/* Top Banner Alert if the selected gym is blocked / suspended by SaaS Admin */}
      {currentGym && (occupancy.isSystemBlocked || currentGym.isSystemBlocked) && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/50 px-4 py-3 text-center text-xs text-rose-200 flex items-center justify-center gap-2.5 shadow-lg">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong className="text-white">ACESSO AO SISTEMA SUSPENSO:</strong> Esta unidade ({currentGym.name}) está com as catracas bloqueadas pelo administrador geral do SaaS.
            {occupancy.blockReason && <span className="ml-1 opacity-90 font-medium">Motivo: {occupancy.blockReason}</span>}
          </span>
          {currentUser?.role === 'superadmin' && (
            <span className="ml-2 text-[10px] opacity-70 italic">(Acesso SuperAdmin Detectado)</span>
          )}
        </div>
      )}

      {/* Top Fixed Header Navbar (Hidden for students and login screen) */}
      {currentUser && !isDirectStudentLink && activeTab !== 'student' && (
        <Navbar
          occupancy={occupancy}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRefresh={() => currentGym && loadGymData(currentGym.slug, false)}
          isRefreshing={isRefreshing}
          gyms={visibleGyms}
          currentGym={currentGym}
          onSelectGym={handleSelectGym}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenCustomizeModal={() => setIsCustomizeModalOpen(true)}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          isDirectStudentLink={isDirectStudentLink}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 mx-auto max-w-7xl w-full px-6 py-8 pb-32 md:pb-8 ${(isDirectStudentLink || activeTab === 'student') && !isInitialLoading ? 'pt-12' : ''}`}>
        
        {/* Initial Loading Screen */}
        {isInitialLoading && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4 animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl border-4 border-zinc-800 border-t-cyan-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-xs">⚡</div>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] animate-pulse text-center">Sincronizando GymLivre...</p>
          </div>
        )}

        {/* Unified Login Portal (Only shown if not logged in and not looking at a specific gym via URL/student mode) */}
        {!isInitialLoading && !currentUser && !isDirectStudentLink && activeTab !== 'student' && activeTab !== 'saas_admin' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-white text-black rounded-3xl flex items-center justify-center text-3xl font-black mb-6 shadow-2xl">
                ⚡
              </div>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white leading-[1.1]">
                Olá! Seja muito <span className="text-cyan-400">Bem-vindo</span> ao GymLivre
              </h2>
              <p className="text-zinc-400 text-sm sm:text-lg max-w-lg mx-auto font-medium leading-relaxed">
                A solução completa para monitorar a lotação da sua unidade e oferecer a melhor experiência para seus alunos em tempo real.
              </p>
            </div>

            <div className="w-full max-w-sm p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Acesse sua Conta</h3>
                <p className="text-xs text-zinc-500">Gerencie sua academia ou acesse o painel master.</p>
              </div>

              <button
                id="portal-login-btn"
                type="button"
                onClick={() => {
                  setLoginModalMode('login');
                  setIsLoginModalOpen(true);
                }}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 cursor-pointer"
              >
                Entrar no Painel
              </button>

              <div className="flex items-center gap-4 py-1">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">OU</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-2">Esqueceu sua senha de acesso?</p>
                <button
                  type="button"
                  id="portal-forgot-password-btn"
                  onClick={() => {
                    setLoginModalMode('forgot_request');
                    setIsLoginModalOpen(true);
                  }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Recuperar a senha
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Student View (Alunos) - Purely Informational */}
        {currentGym && (activeTab === 'student' || isDirectStudentLink) && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col items-center text-center space-y-2 mb-4">
              <div className="text-4xl mb-2 relative">
                {currentGym.logoEmoji || '⚡'}
              </div>
              <div className="flex flex-col items-center">
                <h3 className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Seja Bem-vindo</h3>
                <h2 className="text-3xl font-black text-white leading-tight">{currentGym.name}</h2>
              </div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">Situação em Tempo Real</p>
            </div>
            
            <LiveOccupancyCard occupancy={occupancy} isStudentView={true} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OperatingHoursCard gym={currentGym} />
              <AnnouncementsBoard 
                announcements={announcements}
                isAdminMode={false}
              />
            </div>
          </div>
        )}

        {/* Empty state for students when gym is not found via direct link */}
        {!isInitialLoading && !currentUser && isDirectStudentLink && !currentGym && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in fade-in duration-300 py-12">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl shadow-xl">
              🔍
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-2xl font-bold text-white">Academia não encontrada</h3>
              <p className="text-zinc-400 text-sm">
                O link acessado parece estar incorreto ou a academia ainda não foi cadastrada no sistema.
              </p>
            </div>
            <button
              onClick={() => {
                setIsDirectStudentLink(false);
                setActiveTab('reception');
                const url = new URL(window.location.href);
                url.searchParams.delete('gym');
                url.searchParams.delete('view');
                window.history.replaceState({}, '', url.toString());
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Ir para o Portal de Acesso
            </button>
          </div>
        )}

        {/* Tab 2: Reception View (Controle Manual de Catracas & Gestão da Unidade - Restrita a Usuários Autenticados) */}
        {currentUser && currentGym && activeTab === 'reception' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Live Occupancy Status Card with quick sim */}
            <LiveOccupancyCard
              occupancy={occupancy}
              onSimulateEntry={handleSimulateEntry}
              onSimulateExit={handleSimulateExit}
            />

            {/* Reception Controls */}
            <ReceptionControlPanel
              occupancy={occupancy}
              onAction={handleTurnstileAction}
              onUpdateCapacity={handleUpdateCapacity}
              onOpenShareModal={() => setIsShareModalOpen(true)}
              onOpenCustomizeModal={() => setIsCustomizeModalOpen(true)}
            />

            {/* Sub-Tabs: Mural vs Auditoria */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 w-fit">
                <button
                  onClick={() => setReceptionSubTab('announcements')}
                  className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    receptionSubTab === 'announcements'
                      ? 'bg-zinc-100 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Mural de Avisos
                </button>
                <button
                  onClick={() => setReceptionSubTab('audit')}
                  className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    receptionSubTab === 'audit'
                      ? 'bg-zinc-100 text-black shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Auditoria & Logs
                </button>
              </div>
              
              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest px-1">
                {receptionSubTab === 'announcements' ? '📢 Gestão de Comunicados' : '📋 Registros de Telemetria'}
              </div>
            </div>

            <div className="pt-2">
              {receptionSubTab === 'announcements' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AnnouncementsBoard
                    announcements={announcements}
                    onAddAnnouncement={handleAddAnnouncement}
                    onDeleteAnnouncement={handleDeleteAnnouncement}
                    isAdminMode={true}
                  />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AccessAuditLogs accessLogs={accessLogs} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: ESP32 Hardware Panel & Firmware Generator (Restrita a Usuários Autenticados) */}
        {currentUser && currentGym && activeTab === 'esp32' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Live Occupancy Status Card */}
            <LiveOccupancyCard
              occupancy={occupancy}
              onSimulateEntry={handleSimulateEntry}
              onSimulateExit={handleSimulateExit}
            />

            {/* ESP32 Hardware Simulator & Code Generator tailored for this Gym */}
            <ESP32HardwarePanel
              occupancy={occupancy}
              onSimulateEntry={handleSimulateEntry}
              onSimulateExit={handleSimulateExit}
              currentGym={currentGym}
            />
          </div>
        )}

        {/* Empty state when logged in but no gym exists yet and viewing student, reception or esp32 */}
        {!isInitialLoading && currentUser && !currentGym && activeTab !== 'saas_admin' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in duration-300 py-12">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl shadow-xl">
              🏢
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-2xl font-bold text-white">Nenhuma academia cadastrada</h3>
              <p className="text-zinc-400 text-sm">
              Você ainda não possui unidades cadastradas. Se você é um administrador, acesse o painel de gerenciamento para cadastrar sua academia.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Cadastrar Nova Academia
              </button>
            </div>
          </div>
        )}

        {/* Gate state when viewing saas_admin without being logged in */}
        {!isInitialLoading && !currentUser && activeTab === 'saas_admin' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-300 py-12">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-2xl font-bold text-white font-['Outfit']">Painel SaaS Master</h3>
              <p className="text-zinc-400 text-sm">
                Área restrita ao Administrador Geral do GymLivre. Conecte-se para gerenciar todas as academias cadastradas, assinaturas e faturamento.
              </p>
            </div>
            <button
              id="admin-gate-login-btn"
              onClick={() => {
                setLoginModalMode('login');
                setIsLoginModalOpen(true);
              }}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Entrar como Administrador Geral
            </button>
          </div>
        )}

        {/* Tab 4: SaaS Master SuperAdmin Dashboard (Only when logged in as SuperAdmin or viewing saas_admin) */}
        {currentUser && activeTab === 'saas_admin' && (
          <SaaSAdminDashboard
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onSelectGym={(gym) => {
              handleSelectGym(gym);
              setActiveTab('reception');
            }}
          />
        )}

      </main>

      {/* Footer Oficial GymLivre com créditos de desenvolvimento */}
      <footer className="w-full border-t border-zinc-800/80 bg-[#0A0A0B]/90 backdrop-blur-md py-6 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white tracking-wider text-sm flex items-center gap-1">
              GYM<span className="text-cyan-400">LIVRE</span>
            </span>
            <span className="text-zinc-700 hidden sm:inline">•</span>
            <span className="text-zinc-400 text-[11px]">Sistema de Gestão de Lotação & Controle de Catracas</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <span>Software desenvolvido por</span>
            <span className="font-semibold text-zinc-100 hover:text-cyan-400 transition-colors">Wander Sarmento</span>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (Hidden on Desktop & Hidden for Students) */}
      {currentUser && !isDirectStudentLink && activeTab !== 'student' && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          occupancy={occupancy}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutConfirmationOpen}
        onClose={() => setIsLogoutConfirmationOpen(false)}
        onConfirm={performLogout}
      />

      {/* SaaS Modal 1: Register New Gym */}
      <GymRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onGymCreated={handleGymCreated}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* SaaS Modal 2: Share Gym Student Link & QR Code */}
      {currentGym && (
        <GymShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          gym={currentGym}
        />
      )}

      {/* SaaS Modal 3: Customize Gym Profile */}
      {currentGym && (
        <GymCustomizerModal
          isOpen={isCustomizeModalOpen}
          onClose={() => setIsCustomizeModalOpen(false)}
          gym={currentGym}
          onGymUpdated={handleGymUpdated}
        />
      )}

      {/* SaaS Modal 4: Gym Login, Self-Service Registration & Password Recovery */}
      <GymLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onGymCreated={handleGymCreated}
        onOpenRegisterModal={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
        currentGym={currentGym || undefined}
        availableGyms={gyms}
        initialMode={loginModalMode}
      />

    </div>
  );
}
