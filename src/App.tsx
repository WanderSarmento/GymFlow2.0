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
import { soundFx } from './utils/audio';
import { INITIAL_GYMS, THEME_COLOR_CONFIG } from './data/gymData';
import { Dumbbell, Shield, Cpu, Share2, Plus, Sparkles, Building2, ExternalLink, Sliders, ShieldAlert, Lock, AlertTriangle, Smartphone } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'student' | 'reception' | 'esp32' | 'saas_admin'>('student');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDirectStudentLink, setIsDirectStudentLink] = useState(false);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Core occupancy and telemetry state
  const [occupancy, setOccupancy] = useState<OccupancyData>(DEFAULT_EMPTY_OCCUPANCY);

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // 1. Initial URL detection and Gym listing load
  useEffect(() => {
    async function initGyms() {
      const urlParams = new URLSearchParams(window.location.search);
      const gymParam = urlParams.get('gym') || (window.location.hash.includes('gym=') ? window.location.hash.split('gym=')[1]?.split('&')[0] : null);
      const viewParam = urlParams.get('view');

      if (viewParam === 'student') {
        setActiveTab('student');
        if (gymParam) setIsDirectStudentLink(true);
      } else if (viewParam === 'reception') {
        setActiveTab('reception');
      } else if (viewParam === 'esp32') {
        setActiveTab('esp32');
      } else if (viewParam === 'saas' || viewParam === 'admin' || viewParam === 'superadmin') {
        setActiveTab('saas_admin');
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
    }
    initGyms();
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
          // Play sound effect on new access event if count changed
          if (details.occupancy.lastAccessTime !== occupancy.lastAccessTime) {
            if (soundEnabled) {
              if (details.occupancy.lastAccessType === 'entry') soundFx.playEntry();
              else if (details.occupancy.lastAccessType === 'exit') soundFx.playExit();
            }
          }
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
  }, [occupancy.lastAccessTime, soundEnabled]);

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

  // Switch active gym
  const handleSelectGym = (gym: GymProfile) => {
    setCurrentGym(gym);
    // Update URL param without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('gym', gym.slug);
    window.history.replaceState({}, '', url.toString());
    loadGymData(gym.slug, false);
  };

  // Gym creation callback
  const handleGymCreated = (newGym: GymProfile) => {
    setGyms(prev => [newGym, ...prev.filter(g => g.id !== newGym.id)]);
    setCurrentGym(newGym);
    const url = new URL(window.location.href);
    url.searchParams.set('gym', newGym.slug);
    window.history.replaceState({}, '', url.toString());
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
    setCurrentUser(user);
    if (user.gymSlug) {
      const match = gyms.find(g => g.slug === user.gymSlug || g.id === user.gymId);
      if (match) {
        handleSelectGym(match);
      }
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  // Handlers for ESP32 Simulation
  const handleSimulateEntry = async () => {
    if (!currentGym) return;
    if (soundEnabled) soundFx.playEntry();
    const res = await triggerESP32Entry(currentGym.slug, true);
    await loadGymData(currentGym.slug, true);
    return res;
  };

  const handleSimulateExit = async () => {
    if (!currentGym) return;
    if (soundEnabled) soundFx.playExit();
    const res = await triggerESP32Exit(currentGym.slug, true);
    await loadGymData(currentGym.slug, true);
    return res;
  };

  // Handlers for Reception Actions
  const handleTurnstileAction = async (action: string, value?: any, notes?: string) => {
    if (!currentGym) return;
    if (soundEnabled) {
      if (action.includes('entry')) soundFx.playEntry();
      else if (action.includes('exit')) soundFx.playExit();
      else if (action.includes('lock')) soundFx.playAlert();
    }
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

  const theme = THEME_COLOR_CONFIG[currentGym?.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;

  return (
    <div className="min-h-screen bg-[#0C0C0D] text-white selection:bg-indigo-500/30 font-['Outfit']">
      
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
            <button
              type="button"
              onClick={() => setActiveTab('saas_admin')}
              className="ml-3 px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white font-bold text-[10px] border border-rose-400 transition"
            >
              Gerenciar no Painel Master
            </button>
          )}
        </div>
      )}

      {/* Top Fixed Header Navbar */}
      <Navbar
        occupancy={occupancy}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={() => currentGym && loadGymData(currentGym.slug, false)}
        isRefreshing={isRefreshing}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        gyms={gyms}
        currentGym={currentGym}
        onSelectGym={handleSelectGym}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenCustomizeModal={() => setIsCustomizeModalOpen(true)}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-6 py-8 pb-32 sm:pb-8">
        
        {/* Onboarding View (Empty State) */}
        {!currentGym && activeTab !== 'saas_admin' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                Cadastre sua Academia
              </h2>
              <p className="text-zinc-500 text-sm sm:text-lg max-w-xl mx-auto font-medium">
                Sua plataforma SaaS para monitoramento de lotação em tempo real.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                id="onboarding-register-gym-btn"
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 cursor-pointer"
              >
                Nova Academia
              </button>

              <button
                id="onboarding-login-btn"
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 text-zinc-400 font-bold text-sm border border-zinc-800 hover:text-white hover:border-zinc-600 transition-all cursor-pointer"
              >
                Entrar
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Student View (Alunos) */}
        {currentGym && activeTab === 'student' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Real-time Occupancy Visual Meter */}
            <LiveOccupancyCard
              occupancy={occupancy}
              isStudentView={true}
            />

            {/* Weekly Movement Prediction Chart & Best Hours */}
            <CrowdPredictorChart />

            {/* Workout Optimizer & Operating Hours Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <StudentWorkoutPlanner occupancy={occupancy} />
              </div>
              <div className="lg:col-span-5">
                <OperatingHoursCard gym={currentGym} />
              </div>
            </div>

            {/* Gym Notice Board & Announcements (Read-only for students) */}
            <AnnouncementsBoard
              announcements={announcements}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              isAdminMode={false}
            />
          </div>
        )}

        {/* Tab 2: Reception View (Controle Manual de Catracas & Gestão da Unidade) */}
        {currentGym && activeTab === 'reception' && (
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
            />

            {/* Announcements manager */}
            <AnnouncementsBoard
              announcements={announcements}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              isAdminMode={true}
            />

            {/* Auditoria e Telemetria: Registro de Acessos em Tempo Real no final da página */}
            <AccessAuditLogs accessLogs={accessLogs} />
          </div>
        )}

        {/* Tab 3: ESP32 Hardware Panel & Firmware Generator */}
        {currentGym && activeTab === 'esp32' && (
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

        {/* Tab 4: SaaS Master SuperAdmin Dashboard */}
        {activeTab === 'saas_admin' && (
          <SaaSAdminDashboard
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onSelectGym={(gym) => {
              handleSelectGym(gym);
              setActiveTab('reception');
            }}
          />
        )}

      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Hidden on Desktop) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        occupancy={occupancy}
      />

      {/* SaaS Modal 1: Register New Gym */}
      <GymRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onGymCreated={handleGymCreated}
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
      />

      {/* SaaS Modal 5: Supabase Connection & SQL Schema Export */}
      <SupabaseIntegrationModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

    </div>
  );
}
