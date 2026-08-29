import React, { useState } from 'react';
import {
  Shield,
  Unlock,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  RotateCcw,
  Sliders,
  AlertOctagon,
  CheckCircle2,
  Users,
  Activity,
  Zap,
  Info,
  Clock
} from 'lucide-react';
import { OccupancyData, AccessLog } from '../types';

interface ReceptionControlPanelProps {
  occupancy: OccupancyData;
  onAction: (action: string, value?: any, notes?: string) => Promise<any>;
  onUpdateCapacity: (capacity: number) => Promise<any>;
}

export const ReceptionControlPanel: React.FC<ReceptionControlPanelProps> = ({
  occupancy,
  onAction,
  onUpdateCapacity
}) => {
  const [guestName, setGuestName] = useState('');
  const [guestReason, setGuestReason] = useState('Aula Experimental');
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [customCountInput, setCustomCountInput] = useState<string>(String(occupancy.currentCount));
  const [maxCapacityInput, setMaxCapacityInput] = useState<string>(String(occupancy.maxCapacity));
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleTriggerAction = async (action: string, value?: any, notes?: string) => {
    setIsExecuting(true);
    const res = await onAction(action, value, notes);
    setIsExecuting(false);
    if (res && res.message) {
      showFeedback(res.message);
    }
  };

  const handleGuestEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const note = `Convidado: ${guestName || 'Visitante'} (${guestReason})`;
    await handleTriggerAction('remote_unlock_entry', null, note);
    setGuestName('');
    setIsGuestModalOpen(false);
  };

  const handleSetExactCount = async () => {
    const num = parseInt(customCountInput, 10);
    if (!isNaN(num) && num >= 0) {
      await handleTriggerAction('set_count', num, 'Ajuste manual pela recepção');
    }
  };

  const handleSaveMaxCapacity = async () => {
    const num = parseInt(maxCapacityInput, 10);
    if (!isNaN(num) && num > 0) {
      await onUpdateCapacity(num);
      showFeedback(`Capacidade máxima ajustada para ${num} pessoas.`);
    }
  };

  return (
    <div id="reception-control-panel" className="space-y-6">
      
      {/* Feedback Toast Banner */}
      {actionFeedback && (
        <div className="flex items-center gap-3 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 p-4 text-cyan-300 shadow-xl animate-in fade-in slide-in-from-top-2">
          <Zap className="h-5 w-5 shrink-0 text-cyan-400" />
          <span className="text-xs font-bold">{actionFeedback}</span>
        </div>
      )}

      {/* Reception Command Dashboard */}
      <div className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Gerenciamento de Acesso
              </h3>
              <h2 className="text-lg font-black font-['Outfit'] text-white">
                Controle Manual & Remoto de Catracas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border ${
              occupancy.turnstileLocked
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
            }`}>
              {occupancy.turnstileLocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Catracas Travadas</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Catracas Liberadas</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Big Virtual Action Buttons Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Button 1: Remote Entry Release */}
          <button
            id="reception-btn-unlock-entry"
            type="button"
            disabled={isExecuting || occupancy.turnstileLocked}
            onClick={() => handleTriggerAction('remote_unlock_entry')}
            className="group relative flex flex-col justify-between rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/40 via-gray-950 to-black p-6 text-left transition-all hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-black shadow-lg shadow-cyan-400/20">
                <ArrowUpRight className="h-6 w-6 stroke-[3]" />
              </div>
              <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[10px] font-black text-cyan-400 uppercase tracking-wider border border-cyan-400/30">
                Pulso +1
              </span>
            </div>
            <div className="mt-5">
              <h3 className="font-['Outfit'] text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                Liberar Entrada
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Aciona relé da catraca física e soma +1 aluno
              </p>
            </div>
          </button>

          {/* Button 2: Remote Exit Release */}
          <button
            id="reception-btn-unlock-exit"
            type="button"
            disabled={isExecuting || occupancy.currentCount <= 0}
            onClick={() => handleTriggerAction('remote_unlock_exit')}
            className="group relative flex flex-col justify-between rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-black p-6 text-left transition-all hover:border-gray-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-800 text-white shadow-md">
                <ArrowDownLeft className="h-6 w-6 stroke-[3]" />
              </div>
              <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[10px] font-bold text-gray-300 uppercase tracking-wider border border-gray-700">
                Pulso -1
              </span>
            </div>
            <div className="mt-5">
              <h3 className="font-['Outfit'] text-base font-black text-white group-hover:text-gray-200 transition-colors">
                Liberar Saída
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Registra saída e subtrai -1 aluno da sala
              </p>
            </div>
          </button>

          {/* Button 3: Guest / Special Pass */}
          <button
            id="reception-btn-guest-entry"
            type="button"
            disabled={isExecuting || occupancy.turnstileLocked}
            onClick={() => setIsGuestModalOpen(true)}
            className="group relative flex flex-col justify-between rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-gray-950 to-black p-6 text-left transition-all hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-md">
                <UserPlus className="h-6 w-6 stroke-[3]" />
              </div>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider border border-amber-500/30">
                Visitante
              </span>
            </div>
            <div className="mt-5">
              <h3 className="font-['Outfit'] text-base font-black text-white group-hover:text-amber-300 transition-colors">
                Entrada Convidado
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Liberar aula experimental ou visitante com log
              </p>
            </div>
          </button>

          {/* Button 4: Emergency Lock Toggle */}
          <button
            id="reception-btn-emergency-lock"
            type="button"
            disabled={isExecuting}
            onClick={() => handleTriggerAction('toggle_lock')}
            className={`group relative flex flex-col justify-between rounded-3xl border p-6 text-left transition-all active:scale-[0.98] ${
              occupancy.turnstileLocked
                ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-950/40 via-gray-950 to-black hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                : 'border-red-500/50 bg-gradient-to-br from-red-950/40 via-gray-950 to-black hover:border-red-400 hover:shadow-lg hover:shadow-red-500/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-md ${
                occupancy.turnstileLocked ? 'bg-cyan-400 text-black' : 'bg-red-500 text-white'
              }`}>
                {occupancy.turnstileLocked ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                occupancy.turnstileLocked ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {occupancy.turnstileLocked ? 'Destravar' : 'Segurança'}
              </span>
            </div>
            <div className="mt-5">
              <h3 className="font-['Outfit'] text-base font-black text-white">
                {occupancy.turnstileLocked ? 'Destravar Catracas' : 'Travar Catracas'}
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                {occupancy.turnstileLocked ? 'Clique para reabrir o fluxo' : 'Bloqueia passagem física e remota'}
              </p>
            </div>
          </button>

        </div>

        {/* Fast Adjustment & Calibration Bar */}
        <div className="mt-6 rounded-2xl bg-gray-950 p-4 sm:p-5 border border-gray-800">
          <div className="flex flex-col gap-4">
            
            {/* Quick +/- buttons */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2.5">
                Ajuste Rápido de Contagem:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerAction('adjust_count', -5)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3.5 py-2 text-xs font-mono font-bold text-gray-300 transition-colors cursor-pointer active:scale-95"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAction('adjust_count', -1)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3.5 py-2 text-xs font-mono font-bold text-gray-300 transition-colors cursor-pointer active:scale-95"
                >
                  -1
                </button>
                <div className="min-h-[44px] px-4 py-2 bg-black border border-gray-800 rounded-xl flex items-center justify-center gap-1.5">
                  <span className="text-xs text-gray-500">Atual: </span>
                  <strong className="text-base font-mono text-cyan-400 font-bold">{occupancy.currentCount}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerAction('adjust_count', 1)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3.5 py-2 text-xs font-mono font-bold text-gray-300 transition-colors cursor-pointer active:scale-95"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAction('adjust_count', 5)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3.5 py-2 text-xs font-mono font-bold text-gray-300 transition-colors cursor-pointer active:scale-95"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerAction('reset_count')}
                  className="min-h-[44px] flex items-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 text-xs font-bold uppercase transition-colors cursor-pointer active:scale-95 ml-auto sm:ml-0"
                  title="Zerar contagem da sala"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Zerar Sala</span>
                </button>
              </div>
            </div>

            {/* Set exact count & max capacity */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-gray-800">
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Definir exato:</span>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={customCountInput}
                  onChange={(e) => setCustomCountInput(e.target.value)}
                  className="w-20 min-h-[44px] rounded-xl bg-gray-900 border border-gray-800 px-2 py-2 text-base sm:text-xs font-mono text-white text-center focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSetExactCount}
                  className="min-h-[44px] rounded-xl bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-bold uppercase text-white transition-colors cursor-pointer active:scale-95"
                >
                  Aplicar
                </button>
              </div>

              <div className="flex items-center gap-2 sm:border-l sm:border-gray-800 sm:pl-3">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Capacidade Máx:</span>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={maxCapacityInput}
                  onChange={(e) => setMaxCapacityInput(e.target.value)}
                  className="w-20 min-h-[44px] rounded-xl bg-gray-900 border border-gray-800 px-2 py-2 text-base sm:text-xs font-mono text-white text-center focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveMaxCapacity}
                  className="min-h-[44px] rounded-xl bg-white hover:bg-gray-200 px-4 py-2 text-xs font-bold uppercase text-black transition-colors cursor-pointer active:scale-95"
                >
                  Salvar
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Modal: Guest / Experimental Class Entry */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-950 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="font-['Outfit'] text-base font-black text-white">
                  Liberar Convidado
                </h3>
              </div>
            </div>

            <form onSubmit={handleGuestEntry} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                  Nome do Aluno / Visitante
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo ou Convidado #04"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                  Motivo da Liberação
                </label>
                <select
                  value={guestReason}
                  onChange={(e) => setGuestReason(e.target.value)}
                  className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="Aula Experimental">Aula Experimental (1ª vez)</option>
                  <option value="Convidado de Aluno VIP">Convidado de Aluno VIP</option>
                  <option value="Esqueceu a Biometria/Tag">Esqueceu Biometria / Tag de Acesso</option>
                  <option value="Avaliação Física / Personal">Avaliação Física com Personal</option>
                  <option value="Visita Comercial">Visita Comercial às Instalações</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-xs font-bold uppercase text-gray-400 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 text-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Liberar Catraca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
