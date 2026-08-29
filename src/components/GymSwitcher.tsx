import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Check, 
  Share2, 
  Sparkles, 
  Sliders, 
  QrCode, 
  ExternalLink,
  Users
} from 'lucide-react';
import { GymProfile } from '../types';
import { THEME_COLOR_CONFIG } from '../data/gymData';

interface GymSwitcherProps {
  gyms: GymProfile[];
  currentGym: GymProfile | null;
  onSelectGym: (gym: GymProfile) => void;
  onOpenRegisterModal: () => void;
  onOpenShareModal: () => void;
  onOpenCustomizeModal: () => void;
  isAdminMode: boolean;
}

export const GymSwitcher: React.FC<GymSwitcherProps> = ({
  gyms,
  currentGym,
  onSelectGym,
  onOpenRegisterModal,
  onOpenShareModal,
  onOpenCustomizeModal,
  isAdminMode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentGym) {
    return (
      <button
        id="gym-switcher-empty-register-btn"
        type="button"
        onClick={onOpenRegisterModal}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
      >
        <Plus className="w-4 h-4 text-cyan-400" />
        <span>+ Cadastrar Academia</span>
      </button>
    );
  }

  const theme = THEME_COLOR_CONFIG[currentGym.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Gym Pill Trigger */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          id="gym-switcher-trigger-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-zinc-900/90 hover:bg-zinc-800 text-white transition-all shadow-sm ${theme.border} text-xs sm:text-sm font-medium`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="text-base sm:text-lg leading-none">{currentGym.logoEmoji || '⚡'}</span>
          <div className="flex flex-col text-left">
            <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-[180px] leading-tight">
              {currentGym.name}
            </span>
            <span className="text-[10px] text-zinc-400 truncate max-w-[120px] sm:max-w-[180px] leading-tight">
              {currentGym.city ? `${currentGym.city} • ${currentGym.slug}` : currentGym.slug}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Quick Action Buttons */}
        <button
          id="share-student-link-quick-btn"
          type="button"
          onClick={onOpenShareModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium transition-colors"
          title="Compartilhar link da academia para alunos"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Link Alunos</span>
        </button>

        {isAdminMode && (
          <button
            id="customize-gym-quick-btn"
            type="button"
            onClick={onOpenCustomizeModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            title="Personalizar dados e cores da academia"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Editar Academia</span>
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          <div className="px-3 py-2 border-b border-zinc-800/80 mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Academias Cadastradas
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
              {gyms.length} ativas
            </span>
          </div>

          {/* List of Gyms */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {gyms.map((g) => {
              const isSelected = g.id === currentGym.id;
              const gTheme = THEME_COLOR_CONFIG[g.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;

              return (
                <button
                  key={g.id}
                  id={`select-gym-${g.slug}-btn`}
                  type="button"
                  onClick={() => {
                    onSelectGym(g);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isSelected 
                      ? 'bg-zinc-800 text-white font-medium border border-zinc-700' 
                      : 'hover:bg-zinc-800/50 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl shrink-0">{g.logoEmoji || '⚡'}</span>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                        {g.name}
                        {isSelected && <span className={`w-1.5 h-1.5 rounded-full ${gTheme.primary.split(' ')[0]}`} />}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {g.neighborhood || g.city || g.slug} • Max: {g.maxCapacity}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* SaaS Actions inside dropdown */}
          <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1">
            <button
              id="dropdown-open-register-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenRegisterModal();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Academia (SaaS)</span>
            </button>

            <button
              id="dropdown-open-share-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenShareModal();
              }}
              className="w-full sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Compartilhar Link da Academia</span>
            </button>

            {isAdminMode && (
              <button
                id="dropdown-open-customize-btn"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomizeModal();
                }}
                className="w-full sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Sliders className="w-4 h-4 text-zinc-400" />
                <span>Personalizar Dados da Academia</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
