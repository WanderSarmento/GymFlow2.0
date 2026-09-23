import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Phone, MapPin, Calendar } from 'lucide-react';
import { GYM_SCHEDULE, THEME_COLOR_CONFIG } from '../data/gymData';
import { GymProfile } from '../types';

interface OperatingHoursCardProps {
  gym?: GymProfile;
  minimal?: boolean;
}

export const OperatingHoursCard: React.FC<OperatingHoursCardProps> = ({ gym, minimal = false }) => {
  const currentDay = new Date().getDay(); // 0 = Dom, 1 = Seg, ...
  const currentHour = new Date().getHours();
  const currentMinutes = new Date().getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinutes;

  const theme = THEME_COLOR_CONFIG[gym?.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;

  // Build schedule based on gym profile operating hours if available
  const schedule = GYM_SCHEDULE.map(item => {
    if (gym?.operatingHours) {
      let dayConfig;
      if (item.dayId === 0) dayConfig = gym.operatingHours.sunday;
      else if (item.dayId === 6) dayConfig = gym.operatingHours.saturday;
      else dayConfig = gym.operatingHours.weekdays;
      
      if (dayConfig) {
        return { 
          ...item, 
          open: dayConfig.open, 
          close: dayConfig.close,
          isOpen: dayConfig.isOpen,
          hasBreak: dayConfig.hasBreak,
          breakOpen: dayConfig.breakOpen,
          breakClose: dayConfig.breakClose
        };
      }
    }
    return { ...item, isOpen: true };
  });

  const todaySchedule = schedule.find(item => item.dayId === currentDay) || schedule[1];
  
  const checkIsOpen = (sched: any) => {
    if (!sched.isOpen) return false;
    
    const parseTime = (timeStr: string) => {
      const [h, m] = (timeStr || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const openTotalMin = parseTime(sched.open);
    const closeTotalMin = parseTime(sched.close);
    
    if (sched.hasBreak && sched.breakOpen && sched.breakClose) {
      const breakOpenTotalMin = parseTime(sched.breakOpen);
      const breakCloseTotalMin = parseTime(sched.breakClose);
      
      const inFirstShift = currentTimeMinutes >= openTotalMin && currentTimeMinutes < breakOpenTotalMin;
      const inSecondShift = currentTimeMinutes >= breakCloseTotalMin && currentTimeMinutes < closeTotalMin;
      return inFirstShift || inSecondShift;
    }
    
    return currentTimeMinutes >= openTotalMin && currentTimeMinutes < closeTotalMin;
  };

  const isOpenNow = checkIsOpen(todaySchedule);

  const formatHours = (sched: any) => {
    if (!sched.isOpen) return 'Fechado';
    if (sched.hasBreak) {
      return `${sched.open}-${sched.breakOpen} e ${sched.breakClose}-${sched.close}`;
    }
    return `${sched.open} às ${sched.close}`;
  };

  if (minimal) {
    return (
      <div id="operating-hours-card-minimal" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 ${theme.text}`}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-tight">{todaySchedule.dayName}</span>
              <span className={`inline-flex h-1.5 w-1.5 rounded-full ${isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isOpenNow ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOpenNow ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            <p className="text-sm font-black text-zinc-300 font-mono mt-0.5">
              {formatHours(todaySchedule)}
            </p>
          </div>
        </div>
        
        <div className="hidden sm:block text-right">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Status da Unidade</span>
          <span className="text-[11px] font-bold text-zinc-400 italic">Previsão: {todaySchedule.peakHours[0] || '18h-20h (Pico)'}</span>
        </div>
      </div>
    );
  }

  return (
    <div id="operating-hours-card" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Informações da Unidade
            </h3>
            <h2 className="text-lg font-black font-['Outfit'] text-white">
              {gym?.name || 'Horários de Funcionamento'}
            </h2>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border uppercase tracking-wider ${
          isOpenNow 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          <span className={`h-2 w-2 rounded-full ${isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
          {isOpenNow ? 'Aberto' : 'Fechado'}
        </span>
      </div>

      {/* Week Schedule Table / Cards */}
      <div className="space-y-2">
        {schedule.map((item) => {
          const isToday = item.dayId === currentDay;
          const dayIsOpen = checkIsOpen(item);

          return (
            <div
              key={item.dayId}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all text-xs ${
                isToday
                  ? 'bg-zinc-900 border border-cyan-400/40 text-white shadow-[0_0_15px_rgba(34,211,238,0.08)]'
                  : 'bg-zinc-950/70 border border-zinc-800/80 text-zinc-300 hover:bg-zinc-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-24 font-bold ${isToday ? 'text-cyan-400' : 'text-zinc-200'}`}>
                  {item.dayName}
                </span>
                {isToday && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    dayIsOpen ? 'bg-cyan-400 text-black' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    Hoje {dayIsOpen ? '• Aberto' : '• Fechado'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white text-[11px]">
                  {formatHours(item)}
                </span>
                <span className="hidden sm:inline-block text-[11px] text-zinc-500 font-mono">
                  (Pico: {item.peakHours[0] || '18h-20h'})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Gym Info / Emergency Reception Contacts */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-zinc-800 text-xs">
        <div className="flex items-center gap-2.5 rounded-2xl bg-zinc-950/80 p-3 border border-zinc-800 text-zinc-300">
          <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="truncate">
            {gym?.address 
              ? `${gym.address} - ${gym.neighborhood || gym.city}` 
              : gym?.neighborhood 
                ? `${gym.neighborhood}, ${gym.city}` 
                : 'Av. Principal das Acácias, 1200 - Centro'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-zinc-950/80 p-3 border border-zinc-800 text-zinc-300">
          <Phone className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>Recepção: {gym?.contactPhone || '(11) 98765-4321 / Ramal 101'}</span>
        </div>
      </div>
    </div>
  );
};
