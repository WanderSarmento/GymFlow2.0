import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Phone, MapPin, Calendar } from 'lucide-react';
import { GYM_SCHEDULE, THEME_COLOR_CONFIG } from '../data/gymData';
import { GymProfile } from '../types';

interface OperatingHoursCardProps {
  gym?: GymProfile;
}

export const OperatingHoursCard: React.FC<OperatingHoursCardProps> = ({ gym }) => {
  const currentDay = new Date().getDay(); // 0 = Dom, 1 = Seg, ...
  const currentHour = new Date().getHours();
  const currentMinutes = new Date().getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinutes;

  const theme = THEME_COLOR_CONFIG[gym?.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;

  // Build schedule based on gym profile operating hours if available
  const schedule = GYM_SCHEDULE.map(item => {
    if (gym?.operatingHours) {
      if (item.dayId === 0 && gym.operatingHours.sunday) {
        return { ...item, open: gym.operatingHours.sunday.open, close: gym.operatingHours.sunday.close };
      } else if (item.dayId === 6 && gym.operatingHours.saturday) {
        return { ...item, open: gym.operatingHours.saturday.open, close: gym.operatingHours.saturday.close };
      } else if (gym.operatingHours.weekdays) {
        return { ...item, open: gym.operatingHours.weekdays.open, close: gym.operatingHours.weekdays.close };
      }
    }
    return item;
  });

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

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Aberto
        </span>
      </div>

      {/* Week Schedule Table / Cards */}
      <div className="space-y-2">
        {schedule.map((item) => {
          const isToday = item.dayId === currentDay;

          // Parse open and close to check if currently open
          const [openH, openM] = item.open.split(':').map(Number);
          const [closeH, closeM] = item.close.split(':').map(Number);
          const openTotalMin = (openH || 6) * 60 + (openM || 0);
          const closeTotalMin = (closeH || 23) * 60 + (closeM || 0);
          const isOpenNow = isToday && (currentTimeMinutes >= openTotalMin && currentTimeMinutes < closeTotalMin);

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
                  <span className="rounded-full bg-cyan-400 text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    Hoje {isOpenNow ? '• Aberto' : '• Fechado'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white text-xs">
                  {item.open} às {item.close}
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
