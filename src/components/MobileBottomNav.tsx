import React from 'react';
import { Dumbbell, Shield, Cpu, ShieldAlert } from 'lucide-react';
import { OccupancyData } from '../types';

interface MobileBottomNavProps {
  activeTab: 'student' | 'reception' | 'esp32' | 'saas_admin';
  setActiveTab: (tab: 'student' | 'reception' | 'esp32' | 'saas_admin') => void;
  occupancy: OccupancyData;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  occupancy
}) => {
  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Navegação Principal Mobile"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-800 bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-1.5 pb-1">
        
        {/* Tab 1: Alunos */}
        <button
          id="mobile-nav-student"
          type="button"
          onClick={() => setActiveTab('student')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'student'
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <Dumbbell className={`h-5 w-5 ${activeTab === 'student' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {activeTab === 'student' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full bg-cyan-400"></span>
            )}
          </div>
          <span className={`text-[11px] uppercase tracking-wider ${activeTab === 'student' ? 'font-black text-cyan-300' : 'font-semibold'}`}>
            Alunos
          </span>
        </button>

        {/* Tab 2: Recepção */}
        <button
          id="mobile-nav-reception"
          type="button"
          onClick={() => setActiveTab('reception')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2 transition-all active:scale-95 cursor-pointer relative ${
            activeTab === 'reception'
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <Shield className={`h-5 w-5 ${activeTab === 'reception' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {occupancy.turnstileLocked && (
              <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
            {activeTab === 'reception' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full bg-cyan-400"></span>
            )}
          </div>
          <span className={`text-[11px] uppercase tracking-wider ${activeTab === 'reception' ? 'font-black text-cyan-300' : 'font-semibold'}`}>
            Recepção
          </span>
        </button>

        {/* Tab 3: ESP32 Hardware */}
        <button
          id="mobile-nav-esp32"
          type="button"
          onClick={() => setActiveTab('esp32')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'esp32'
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <Cpu className={`h-5 w-5 ${activeTab === 'esp32' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className={`absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full ${occupancy.esp32Connected ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'bg-amber-400'}`}></span>
            {activeTab === 'esp32' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full bg-cyan-400"></span>
            )}
          </div>
          <span className={`text-[11px] uppercase tracking-wider ${activeTab === 'esp32' ? 'font-black text-cyan-300' : 'font-semibold'}`}>
            ESP32
          </span>
        </button>

        {/* Tab 4: Admin SaaS */}
        <button
          id="mobile-nav-saas-admin"
          type="button"
          onClick={() => setActiveTab('saas_admin')}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-2 transition-all active:scale-95 cursor-pointer ${
            activeTab === 'saas_admin'
              ? 'text-indigo-400 bg-indigo-500/15'
              : 'text-indigo-400/60 hover:text-indigo-300'
          }`}
        >
          <div className="relative">
            <ShieldAlert className={`h-5 w-5 ${activeTab === 'saas_admin' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {activeTab === 'saas_admin' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full bg-indigo-400"></span>
            )}
          </div>
          <span className={`text-[11px] uppercase tracking-wider ${activeTab === 'saas_admin' ? 'font-black text-indigo-300' : 'font-semibold'}`}>
            SaaS
          </span>
        </button>

      </div>
    </nav>
  );
};

