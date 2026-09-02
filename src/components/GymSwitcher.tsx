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
      <button
        id="gym-switcher-trigger-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg leading-none opacity-80 group-hover:opacity-100 transition-opacity">
          {currentGym.logoEmoji || '⚡'}
        </span>
        <div className="flex flex-col text-left">
          <span className="font-bold text-xs truncate max-w-[120px] sm:max-w-[160px] leading-tight">
            {currentGym.name}
          </span>
          <span className="text-[10px] text-zinc-500 truncate max-w-[120px] sm:max-w-[160px] leading-tight font-medium uppercase tracking-wider">
            {currentGym.city || currentGym.slug}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          <div className="px-3 py-2 border-b border-zinc-800/80 mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              ACADEMIAS ({gyms.length})
            </span>
          </div>

          {/* List of Gyms */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {gyms.map((g) => {
              const isSelected = g.id === currentGym.id;
              
              return (
                <button
                  key={g.id}
                  id={`select-gym-${g.slug}-btn`}
                  type="button"
                  onClick={() => {
                    onSelectGym(g);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isSelected 
                      ? 'bg-zinc-900 text-white border border-zinc-800' 
                      : 'hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-lg shrink-0 opacity-80">{g.logoEmoji || '⚡'}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">
                        {g.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate font-medium">
                        {g.city || g.slug}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-2" />
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors uppercase tracking-widest"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Academia</span>
            </button>

            <button
              id="dropdown-open-share-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenShareModal();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors uppercase tracking-widest"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Link Público</span>
            </button>

            {isAdminMode && (
              <button
                id="dropdown-open-customize-btn"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomizeModal();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors uppercase tracking-widest"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configurar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
