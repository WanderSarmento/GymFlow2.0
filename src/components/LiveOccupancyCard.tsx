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
    <div id="live-occupancy-card" className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-black p-6 sm:p-8 shadow-2xl">
      
      {/* Background ambient decorative glow */}
      <div className={`absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl opacity-15 bg-gradient-to-br ${statusConfig.gradient}`}></div>
      
      {/* Header bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Ocupação Atual em Tempo Real
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-medium text-gray-300">
                Hoje das {occupancy.openingTimeToday} às {occupancy.closingTimeToday}
              </span>
              <span className="inline-block h-1 w-1 rounded-full bg-gray-600"></span>
              <span className="text-xs text-green-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Aberto agora
              </span>
            </div>
          </div>
        </div>

        {/* ESP32 Hardware Status Tag (Only visible in admin / staff mode) */}
        {!isStudentView && (
          <div className="flex items-center gap-2 rounded-full bg-gray-900 px-3.5 py-1 text-xs border border-gray-800">
            <span className="relative flex h-2 w-2">
              {occupancy.esp32Connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${occupancy.esp32Connected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-mono text-gray-300 text-[11px]">
              ESP32: {occupancy.esp32Connected ? 'Sincronizado' : 'Conectando...'}
            </span>
            <Wifi className="h-3 w-3 text-gray-500 ml-0.5" />
          </div>
        )}
      </div>

      {/* Main Stats and Circular Gauge Section */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
        
        {/* Left: Circular Animated Progress Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <svg className="h-48 w-48 -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background Track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-gray-800"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated Value Stroke */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className={`${statusConfig.ringColor} transition-all duration-700 ease-out`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center value overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-['Outfit'] text-6xl font-black italic tracking-tighter text-white">
                {occupancy.currentCount}
              </span>
              <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                Pessoas
              </span>
              <span className="mt-1 text-[11px] font-mono text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                {percentage}% da Capacidade
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-gray-400 text-xs">
              Capacidade recomendada: <strong className="text-white font-bold">{occupancy.maxCapacity}</strong>
            </p>
          </div>
        </div>

        {/* Right: Detailed occupancy breakdown and advice */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold border mb-3 transition-colors uppercase tracking-wider">
              <span className={`inline-flex items-center gap-1.5 ${statusConfig.colorText}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </span>
            </div>
            <h3 className="font-['Outfit'] text-2xl font-black text-white leading-tight">
              {statusConfig.headline}
            </h3>
            <p className="mt-1.5 text-sm text-gray-300 leading-relaxed">
              {statusConfig.advice}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-2xl bg-gray-900/60 p-3.5 border border-gray-800">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <Users className="h-3.5 w-3.5 text-cyan-400" />
                <span>Presentes</span>
              </div>
              <p className="mt-1.5 text-2xl font-black font-mono text-white italic">
                {occupancy.currentCount} <span className="text-xs text-gray-500 font-normal not-italic">alunos</span>
              </p>
            </div>

            <div className="rounded-2xl bg-gray-900/60 p-3.5 border border-gray-800">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span>Vagas Livres</span>
              </div>
              <p className="mt-1.5 text-2xl font-black font-mono text-green-400 italic">
                {availableSlots} <span className="text-xs text-gray-500 font-normal not-italic">vagas</span>
              </p>
            </div>

            <div className="rounded-2xl bg-gray-900/60 p-3.5 border border-gray-800 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <Timer className="h-3.5 w-3.5 text-amber-400" />
                <span>Espera Média</span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-gray-200">
                {statusConfig.waitEstimate}
              </p>
            </div>
          </div>

          {/* Last access telemetry ticker */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-950/90 px-4 py-2.5 text-xs border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400">
              {isStudentView ? (
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  <Sparkles className="h-3.5 w-3.5" /> Monitoramento em Tempo Real
                </span>
              ) : occupancy.lastAccessType === 'entry' ? (
                <span className="flex items-center gap-1 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Entrada Registrada
                </span>
              ) : occupancy.lastAccessType === 'exit' ? (
                <span className="flex items-center gap-1 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  <ArrowDownLeft className="h-3.5 w-3.5" /> Saída Registrada
                </span>
              ) : (
                <span className="text-gray-300 font-semibold uppercase tracking-wider text-[11px]">Acesso via Catraca</span>
              )}
              <span className="text-gray-700">•</span>
              <span className="text-gray-400 font-mono">Última leitura: {formatLastAccess(occupancy.lastAccessTime)}</span>
            </div>

            {/* Quick interactive trigger buttons for instant preview testing */}
            {!isStudentView && (onSimulateEntry || onSimulateExit) && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest hidden sm:inline font-bold">Simular:</span>
                {onSimulateEntry && (
                  <button
                    id="quick-sim-entry-btn"
                    type="button"
                    onClick={onSimulateEntry}
                    disabled={occupancy.turnstileLocked || occupancy.currentCount >= occupancy.maxCapacity}
                    className="flex min-h-[44px] items-center gap-1 rounded-xl bg-white text-black px-3 py-1.5 text-xs font-bold uppercase hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    title="Simular passagem de entrada no botão físico do ESP32"
                  >
                    +1 Entrada
                  </button>
                )}
                {onSimulateExit && (
                  <button
                    id="quick-sim-exit-btn"
                    type="button"
                    onClick={onSimulateExit}
                    disabled={occupancy.currentCount <= 0}
                    className="flex min-h-[44px] items-center gap-1 rounded-xl bg-gray-800 text-white px-3 py-1.5 text-xs font-bold uppercase hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    title="Simular passagem de saída no botão físico do ESP32"
                  >
                    -1 Saída
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lock alert notice if turnstile is locked */}
      {occupancy.turnstileLocked && (
        <div className="relative z-10 mt-3 flex items-center gap-3 rounded-2xl bg-red-500/10 p-4 border border-red-500/50 text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="text-xs">
            <p className="font-bold uppercase tracking-wider text-red-400">Catraca em Modo Travado pela Recepção</p>
            <p className="text-red-300/80 mt-0.5">Novos acessos físicos no ESP32 estão bloqueados até o destravamento remoto.</p>
          </div>
        </div>
      )}

    </div>
  );
};
