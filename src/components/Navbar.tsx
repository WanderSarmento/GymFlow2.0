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
  isDirectStudentLink: boolean;
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
  onLogout,
  isDirectStudentLink
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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#0C0C0D]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Brand & Gym Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.primary} text-xl shadow-inner`}>
              {currentGym?.logoEmoji || '⚡'}
            </div>
            
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                GYM<span className="text-zinc-500">FLOW</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase mt-1">
                SaaS Platform
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Active Gym Selector Dropdown (Hidden for students) */}
          {(!isDirectStudentLink || currentUser) && (
            <GymSwitcher
              gyms={gyms}
              currentGym={currentGym}
              onSelectGym={onSelectGym}
              onOpenRegisterModal={onOpenRegisterModal}
              onOpenShareModal={onOpenShareModal}
              onOpenCustomizeModal={onOpenCustomizeModal}
              isAdminMode={activeTab === 'reception'}
            />
          )}
        </div>

        {/* Desktop View Switcher Mode Tabs (Only visible when logged in) */}
        {currentUser && (
          <nav className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
            <button
              id="tab-student-view"
              type="button"
              onClick={() => setActiveTab('student')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'student' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Alunos
            </button>
            <button
              id="tab-reception-view"
              type="button"
              onClick={() => setActiveTab('reception')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'reception' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Recepção
            </button>
            <button
              id="tab-esp32-view"
              type="button"
              onClick={() => setActiveTab('esp32')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'esp32' ? 'bg-zinc-100 text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Hardware
            </button>
            {isSuperAdmin && (
              <button
                id="tab-saas-admin-view"
                type="button"
                onClick={() => setActiveTab('saas_admin')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  activeTab === 'saas_admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                Master
              </button>
            )}
          </nav>
        )}

        {/* Right utility items: Supabase, Auth, Clock, Sound, Refresh */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 pr-4 border-r border-zinc-800/50">
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-bold ${occupancy.isOpen ? 'text-emerald-500' : 'text-zinc-600'} tracking-widest`}>
                {occupancy.isOpen ? 'ONLINE' : 'OFFLINE'}
              </span>
              <span className="text-[11px] font-medium text-zinc-500 tabular-nums">{time.split(':').slice(0, 2).join(':')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="manual-refresh-btn"
              type="button"
              aria-label="Atualizar Dados em Tempo Real"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="user-profile-btn"
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600 transition-all overflow-hidden cursor-pointer"
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </button>
              </div>
            ) : (
              <button
                id="open-login-modal-btn"
                type="button"
                onClick={onOpenLoginModal}
                className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all cursor-pointer"
              >
                Entrar
              </button>
            )}
          </div>
        </div>

        {/* User Dropdown */}
        {userDropdownOpen && currentUser && (
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

            {isSuperAdmin && (
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
            )}

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
    </header>
  );
};


