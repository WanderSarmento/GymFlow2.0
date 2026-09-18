import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Unlock,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  UserMinus,
  RotateCcw,
  Sliders,
  AlertOctagon,
  CheckCircle2,
  Users,
  Activity,
  Zap,
  Info,
  Clock,
  Share2,
  Power,
  Loader2,
  Hash,
  ChevronRight
} from 'lucide-react';
import { OccupancyData, AccessLog } from '../types';

interface ReceptionControlPanelProps {
  occupancy: OccupancyData;
  onAction: (action: string, value?: any, notes?: string) => Promise<any>;
  onUpdateCapacity: (capacity: number) => Promise<any>;
  onOpenShareModal: () => void;
  onOpenCustomizeModal: () => void;
}

export const ReceptionControlPanel: React.FC<ReceptionControlPanelProps> = ({
  occupancy,
  onAction,
  onUpdateCapacity,
  onOpenShareModal,
  onOpenCustomizeModal
}) => {
  const [guestName, setGuestName] = useState('');
  const [guestReason, setGuestReason] = useState('Aula Experimental');
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [customCountInput, setCustomCountInput] = useState<string>(String(occupancy.currentCount));
  const [maxCapacityInput, setMaxCapacityInput] = useState<string>(String(occupancy.maxCapacity));
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);
  const isCapacityFocusedRef = useRef(false);
  const isCountFocusedRef = useRef(false);

  // Keep inputs synchronized whenever occupancy updates from server or actions, unless the user is actively typing
  useEffect(() => {
    if (occupancy.maxCapacity && !isCapacityFocusedRef.current) {
      setMaxCapacityInput(String(occupancy.maxCapacity));
    }
  }, [occupancy.maxCapacity]);

  useEffect(() => {
    if (!isCountFocusedRef.current) {
      setCustomCountInput(String(occupancy.currentCount));
    }
  }, [occupancy.currentCount]);

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
    if (!isNaN(num) && num >= 10) {
      setIsSavingCapacity(true);
      const res = await onUpdateCapacity(num);
      setIsSavingCapacity(false);
      if (res && res.success) {
        showFeedback(res.message || `Capacidade máxima ajustada para ${num} pessoas.`);
      } else if (res && res.message) {
        showFeedback(res.message);
      } else {
        showFeedback(`Capacidade máxima ajustada para ${num} pessoas.`);
      }
    } else {
      showFeedback('Informe uma capacidade máxima válida (mínimo 10 pessoas).');
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
                Painel Unificado
              </h3>
              <h2 className="text-lg font-black font-['Outfit'] text-white">
                Controle de Fluxo & Catracas
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="reception-toggle-open-btn"
              type="button"
              onClick={() => handleTriggerAction('toggle_open')}
              disabled={isExecuting}
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-95 ${
                occupancy.isOpen
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{occupancy.isOpen ? 'Aberta' : 'Fechada'}</span>
            </button>

            <button
              id="reception-share-link-btn"
              type="button"
              onClick={onOpenShareModal}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-colors cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>Link Alunos</span>
            </button>

            <button
              id="reception-edit-profile-btn"
              type="button"
              onClick={onOpenCustomizeModal}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-colors cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Editar Perfil</span>
            </button>

            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] sm:text-xs font-bold uppercase tracking-wider border ${
              occupancy.turnstileLocked
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
            }`}>
              {occupancy.turnstileLocked ? (
                <>
                  <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Travadas</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Liberadas</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Unified Quick Control (Remote-Style Big Buttons) */}
        <div className="mt-6 grid grid-cols-2 gap-4 h-40">
          {/* Big Entry Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={isExecuting || occupancy.turnstileLocked}
            onClick={() => handleTriggerAction('remote_unlock_entry')}
            className="relative group overflow-hidden bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 border border-cyan-400/30 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <UserPlus size={40} className="text-white" />
            <span className="text-white font-black text-xl sm:text-2xl tracking-tighter">ENTRADA +1</span>
            <div className="absolute bottom-2 right-3 text-[10px] font-bold text-cyan-200 uppercase opacity-60">Pulso Físico</div>
          </motion.button>

          {/* Big Exit Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={isExecuting || occupancy.currentCount <= 0}
            onClick={() => handleTriggerAction('remote_unlock_exit')}
            className="relative group overflow-hidden bg-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-2 border border-zinc-700 shadow-lg disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <UserMinus size={40} className="text-zinc-300" />
            <span className="text-zinc-300 font-black text-xl sm:text-2xl tracking-tighter">SAÍDA -1</span>
            <div className="absolute bottom-2 right-3 text-[10px] font-bold text-zinc-500 uppercase opacity-60">Registrar</div>
          </motion.button>
        </div>

        {/* Fast Adjustment & Calibration Bar */}
        <div className="mt-6 rounded-2xl bg-gray-950 p-4 sm:p-5 border border-gray-800">
          <div className="flex flex-col gap-4">
            
            {/* Quick +/- buttons */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2.5">
                Calibragem de Contagem:
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
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 text-xs font-bold uppercase transition-colors cursor-pointer active:scale-95"
                  title="Zerar contagem da sala"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Set exact count & max capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 border-t border-gray-800">
              
              {/* Exact Count Adjustment */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                  Definir Contagem Exata:
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={customCountInput}
                    onFocus={() => { isCountFocusedRef.current = true; }}
                    onBlur={() => { isCountFocusedRef.current = false; }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSetExactCount();
                      }
                    }}
                    onChange={(e) => setCustomCountInput(e.target.value)}
                    className="flex-1 min-w-0 min-h-[48px] rounded-2xl bg-gray-900 border border-gray-800 px-4 py-2 text-lg sm:text-sm font-mono text-white text-center focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/20"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={handleSetExactCount}
                    className="min-h-[48px] px-6 rounded-2xl bg-gray-800 hover:bg-gray-700 text-xs font-black uppercase text-white transition-all cursor-pointer active:scale-95 border border-gray-700 shadow-sm"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Max Capacity Adjustment */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                  Capacidade Máxima:
                </span>
                <div className="flex gap-2">
                  <input
                    id="reception-max-capacity-input"
                    type="number"
                    min="10"
                    max="2000"
                    value={maxCapacityInput}
                    onFocus={() => { isCapacityFocusedRef.current = true; }}
                    onBlur={() => {
                      isCapacityFocusedRef.current = false;
                      const num = parseInt(maxCapacityInput, 10);
                      if (!isNaN(num) && num >= 10 && num !== occupancy.maxCapacity && !isSavingCapacity) {
                        handleSaveMaxCapacity();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveMaxCapacity();
                      }
                    }}
                    onChange={(e) => setMaxCapacityInput(e.target.value)}
                    className="flex-1 min-w-0 min-h-[48px] rounded-2xl bg-gray-900 border border-gray-800 px-4 py-2 text-lg sm:text-sm font-mono text-white text-center focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/20"
                    placeholder="80"
                  />
                  <button
                    id="reception-save-max-capacity-btn"
                    type="button"
                    onClick={handleSaveMaxCapacity}
                    disabled={isSavingCapacity}
                    className="min-h-[48px] px-6 rounded-2xl bg-white hover:bg-gray-100 disabled:opacity-50 text-xs font-black uppercase text-black transition-all cursor-pointer active:scale-95 shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                  >
                    {isSavingCapacity ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Virtual Action Buttons Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Guest / Special Pass */}
          <button
            id="reception-btn-guest-entry"
            type="button"
            disabled={isExecuting || occupancy.turnstileLocked}
            onClick={() => setIsGuestModalOpen(true)}
            className="group relative flex items-center gap-4 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-gray-950 to-black p-5 text-left transition-all hover:border-amber-400 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-md shrink-0">
              <UserPlus className="h-6 w-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-['Outfit'] text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                Entrada Convidado
              </h3>
              <p className="text-[10px] text-gray-400">
                Aula experimental ou visitante com log
              </p>
            </div>
          </button>

          {/* Emergency Lock Toggle */}
          <button
            id="reception-btn-emergency-lock"
            type="button"
            disabled={isExecuting}
            onClick={() => handleTriggerAction('toggle_lock')}
            className={`group relative flex items-center gap-4 rounded-3xl border p-5 text-left transition-all active:scale-[0.98] ${
              occupancy.turnstileLocked
                ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-950/20 via-gray-950 to-black hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                : 'border-red-500/50 bg-gradient-to-br from-red-950/20 via-gray-950 to-black hover:border-red-400 hover:shadow-lg'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md shrink-0 ${
              occupancy.turnstileLocked ? 'bg-cyan-400 text-black' : 'bg-red-500 text-white'
            }`}>
              {occupancy.turnstileLocked ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-['Outfit'] text-sm font-black text-white">
                {occupancy.turnstileLocked ? 'Destravar Fluxo' : 'Travar Catracas'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {occupancy.turnstileLocked ? 'Clique para reabrir' : 'Bloqueio total de emergência'}
              </p>
            </div>
          </button>
        </div>

      </div>

      {/* Modal: Guest / Experimental Class Entry (Rendered via Portal) */}
      {isGuestModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
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
        </div>,
        document.body
      )}

    </div>
  );
};
