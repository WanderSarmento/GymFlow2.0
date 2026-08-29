import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, Shield, Cpu, Volume2, VolumeX, RefreshCw, Plus, Sparkles, Lock, User, LogOut, Database, ChevronDown, Check, ShieldAlert } from 'lucide-react';
import { OccupancyData, GymProfile, AuthUser } from '../types';
import { GymSwitcher } from './GymSwitcher';
import { THEME_COLOR_CONFIG } from '../data/gymData';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  occupancy: OccupancyData;
  activeTab: 'student' | 'reception' | 'esp32' | 'saas_admin';
  setActiveTab: (tab: 'student' | 'reception' | 'esp32' | 'saas_admin') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  gyms: GymProfile[];
  currentGym: GymProfile | null;
  onSelectGym: (gym: GymProfile) => void;
  onOpenRegisterModal: () => void;
  onOpenShareModal: () => void;
  onOpenCustomizeModal: () => void;
  currentUser: AuthUser | null;
  onOpenLoginModal: () => void;
  onOpenSupabaseModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  occupancy,
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  soundEnabled,
  setSoundEnabled,
  gyms,
  currentGym,
  onSelectGym,
  onOpenRegisterModal,
  onOpenShareModal,
  onOpenCustomizeModal,
  currentUser,
  onOpenLoginModal,
  onOpenSupabaseModal,
  onLogout
}) => {
  const [time, setTime] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const theme = THEME_COLOR_CONFIG[currentGym?.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;
  const isSupabaseActive = isSupabaseConfigured();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#0A0A0A]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3.5">
        
        {/* Brand & Gym Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${theme.primary} shadow-md font-black shrink-0 text-xl`}>
              {currentGym?.logoEmoji || '⚡'}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
              </span>
            </div>
            
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <h1 className="font-['Outfit'] text-xl font-black tracking-tighter text-white leading-none">
                  GYM<span className={theme.text}>FLOW</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                Multi-Tenancy
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          {/* Active Gym Selector Dropdown */}
          <GymSwitcher
            gyms={gyms}
            currentGym={currentGym}
            onSelectGym={onSelectGym}
            onOpenRegisterModal={onOpenRegisterModal}
            onOpenShareModal={onOpenShareModal}
            onOpenCustomizeModal={onOpenCustomizeModal}
            isAdminMode={activeTab === 'reception'}
          />
        </div>

        {/* Desktop View Switcher Mode Tabs */}
        <nav className="hidden md:flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-1">
          <button
            id="tab-student-view"
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'student'
                ? 'bg-white text-black shadow font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Dumbbell className="h-4 w-4" />
            <span>Alunos</span>
          </button>

          <button
            id="tab-reception-view"
            type="button"
            onClick={() => setActiveTab('reception')}
            className={`flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'reception'
                ? 'bg-white text-black shadow font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span className="flex items-center gap-1.5">
              Recepção
              {occupancy.turnstileLocked && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </span>
          </button>

          <button
            id="tab-esp32-view"
            type="button"
            onClick={() => setActiveTab('esp32')}
            className={`flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'esp32'
                ? 'bg-white text-black shadow font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span className="flex items-center gap-1.5">
              ESP32 Catraca
              <span className={`h-2 w-2 rounded-full ${occupancy.esp32Connected ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
            </span>
          </button>

          {/* SaaS Master Admin Tab */}
          <button
            id="tab-saas-admin-view"
            type="button"
            onClick={() => setActiveTab('saas_admin')}
            className={`flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'saas_admin'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-black'
                : 'text-indigo-400/90 hover:text-indigo-300 hover:bg-indigo-950/40'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="flex items-center gap-1.5">
              Admin SaaS
              <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
            </span>
          </button>
        </nav>

        {/* Right utility items: Supabase, Auth, Clock, Sound, Refresh */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Supabase SQL quick trigger */}
          <button
            id="open-supabase-modal-nav-btn"
            type="button"
            title="Integração Supabase & Schema SQL"
            onClick={onOpenSupabaseModal}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isSupabaseActive
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase SQL</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
          </button>

          {/* User Auth Login / Profile Button */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-profile-btn"
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border ${
                  isSuperAdmin ? 'border-indigo-500/50 hover:border-indigo-400' : 'border-cyan-500/30 hover:border-cyan-400'
                } text-xs text-white transition-all cursor-pointer`}
              >
                <div className={`w-6 h-6 rounded-lg ${isSuperAdmin ? 'bg-indigo-500 text-white' : 'bg-cyan-400 text-black'} flex items-center justify-center font-black text-xs`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="font-bold text-white truncate max-w-[110px] leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className={`text-[10px] ${isSuperAdmin ? 'text-indigo-400 font-bold' : 'text-cyan-400'} capitalize leading-none`}>
                    {isSuperAdmin ? 'SuperAdmin SaaS' : currentUser.role === 'owner' ? 'Gestor' : currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
                    <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black ${
                      isSuperAdmin
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                    } uppercase`}>
                      {isSuperAdmin ? '👑 ADMINISTRADOR GERAL SAAS' : currentUser.gymName || 'Academia Vinculada'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setActiveTab('saas_admin');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-indigo-300 hover:text-white hover:bg-indigo-950/60 transition-colors text-left font-bold cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Painel Master SaaS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenCustomizeModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Personalizar Academia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenSupabaseModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Conectar Supabase / SQL</span>
                  </button>

                  <div className="my-1 border-t border-zinc-800/80" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="open-login-modal-btn"
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-400/50 text-zinc-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Login Academia</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl font-mono text-xs text-zinc-200">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              {occupancy.isOpen ? 'ABERTA AGORA' : 'FECHADA'}
            </span>
            <span className="text-zinc-600 font-sans">|</span>
            <span className="text-zinc-400 font-semibold">{time || '00:00:00'}</span>
          </div>

          {/* Sound Mute/Unmute Toggle */}
          <button
            id="toggle-sound-btn"
            type="button"
            aria-label={soundEnabled ? 'Silenciar Efeitos Sonoros' : 'Ativar Efeitos Sonoros'}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-zinc-900 border-zinc-700 text-cyan-400 hover:bg-zinc-800 hover:border-cyan-400/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Manual Data Sync Refresh Button */}
          <button
            id="manual-refresh-btn"
            type="button"
            aria-label="Atualizar Dados em Tempo Real"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-cyan-400/50 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
};


