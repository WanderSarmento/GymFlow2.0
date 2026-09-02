import React from 'react';
import { Users, Wifi, AlertTriangle, CheckCircle2, TrendingUp, Sparkles, Lock, ArrowUpRight, ArrowDownLeft, Timer } from 'lucide-react';
import { OccupancyData } from '../types';

interface LiveOccupancyCardProps {
  occupancy: OccupancyData;
  onSimulateEntry?: () => void;
  onSimulateExit?: () => void;
  isStudentView?: boolean;
}

export const LiveOccupancyCard: React.FC<LiveOccupancyCardProps> = ({
  occupancy,
  onSimulateEntry,
  onSimulateExit,
  isStudentView = false
}) => {
  const percentage = occupancy.percentage;
  const availableSlots = Math.max(0, occupancy.maxCapacity - occupancy.currentCount);

  // Status styling configurations
  const getStatusConfig = () => {
    if (occupancy.turnstileLocked) {
      return {
        label: 'Catracas Bloqueadas',
        badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
        colorText: 'text-rose-400',
        ringColor: 'stroke-rose-500',
        gradient: 'from-rose-500 to-red-600',
        icon: Lock,
        headline: 'Acesso temporariamente bloqueado pela administração',
        advice: 'Aguarde liberação da recepção ou comunicado oficial.',
        waitEstimate: 'Pausado'
      };
    }

    if (percentage < 45) {
      return {
        label: 'Ambiente Confortável',
        badgeBg: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400',
        colorText: 'text-cyan-400',
        ringColor: 'stroke-cyan-400',
        gradient: 'from-cyan-400 to-blue-500',
        icon: CheckCircle2,
        headline: 'Excelente momento para o seu treino!',
        advice: 'Aparelhos de musculação, halteres e esteiras livres sem fila ou revezamento.',
        waitEstimate: '0 min (Sem espera)'
      };
    } else if (percentage < 75) {
      return {
        label: 'Movimento Moderado',
        badgeBg: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
        colorText: 'text-amber-400',
        ringColor: 'stroke-amber-400',
        gradient: 'from-amber-400 to-yellow-500',
        icon: Users,
        headline: 'Fluxo regular na sala de musculação',
        advice: 'Treino fluido com leve revezamento nos aparelhos mais concorridos (Supino, Crossover).',
        waitEstimate: '1 a 3 min'
      };
    } else if (percentage < 90) {
      return {
        label: 'Sala Movimentada',
        badgeBg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        colorText: 'text-orange-400',
        ringColor: 'stroke-orange-500',
        gradient: 'from-orange-500 to-amber-600',
        icon: TrendingUp,
        headline: 'Horário com alto fluxo de alunos',
        advice: 'Recomendamos alternar séries e ajustar a ordem dos exercícios para otimizar o tempo.',
        waitEstimate: '3 a 6 min'
      };
    } else {
      return {
        label: 'Lotação Quase Máxima',
        badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        colorText: 'text-rose-400',
        ringColor: 'stroke-rose-500',
        gradient: 'from-rose-500 to-red-600',
        icon: AlertTriangle,
        headline: 'Sala de musculação com alta aglomeração',
        advice: 'Aguarde alguns minutos ou priorize treinos funcionais/aeróbicos nos espaços alternativos.',
        waitEstimate: '6 a 10 min'
      };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Gauge circle math
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Relative time format
  const formatLastAccess = (timeStr: string | null) => {
    if (!timeStr) return 'Sem registros recentes';
    const diff = Math.floor((Date.now() - new Date(timeStr).getTime()) / 1000);
    if (diff < 10) return 'Agora mesmo';
    if (diff < 60) return `Há ${diff}s`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Há ${mins} min`;
    return new Date(timeStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div id="live-occupancy-card" className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#121214] p-8 sm:p-10 transition-all duration-300">
      
      {/* Subtle status indicator dot in top right */}
      <div className="absolute right-8 top-8">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusConfig.badgeBg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.ringColor.replace('stroke', 'bg')}`}></span>
          {statusConfig.label}
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
        
        {/* Left: Minimalist Circular Gauge */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <svg className="h-44 w-44 -rotate-90 transform" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-zinc-800/50"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className={`${statusConfig.ringColor} transition-all duration-1000 ease-out`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-['Plus_Jakarta_Sans'] text-7xl font-light tracking-tighter text-white">
                {occupancy.currentCount}
              </span>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                Alunos
              </span>
            </div>
          </div>
        </div>

        {/* Right: Clean Info Section */}
        <div className="flex-1 space-y-8 text-center md:text-left">
          <div className="space-y-3">
            <h3 className="text-3xl font-light text-white tracking-tight leading-tight">
              {statusConfig.headline}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto md:mx-0">
              {statusConfig.advice}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto md:mx-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Capacidade</span>
              <div className="flex items-baseline gap-1 justify-center md:justify-start">
                <span className="text-xl font-medium text-white">{percentage}%</span>
                <span className="text-xs text-zinc-600">ocupado</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Espera</span>
              <div className="flex items-baseline gap-1 justify-center md:justify-start">
                <span className="text-xl font-medium text-white">{statusConfig.waitEstimate.split(' ')[0]}</span>
                <span className="text-xs text-zinc-600">minutos</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 justify-center md:justify-start">
            {!isStudentView && (onSimulateEntry || onSimulateExit) && (
              <div className="flex gap-2">
                <button
                  onClick={onSimulateEntry}
                  disabled={occupancy.turnstileLocked || occupancy.currentCount >= occupancy.maxCapacity}
                  className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
                >
                  Entrada
                </button>
                <button
                  onClick={onSimulateExit}
                  disabled={occupancy.currentCount <= 0}
                  className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
                >
                  Saída
                </button>
              </div>
            )}
            <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
              Leitura: {formatLastAccess(occupancy.lastAccessTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
