import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserMinus, Hash, ChevronRight, CheckCircle2 } from 'lucide-react';
import { OccupancyData } from '../types';
import { sendTurnstileAction } from '../services/api';

interface RemoteControlPanelProps {
  gymSlug: string;
  occupancy: OccupancyData;
  onActionComplete?: () => void;
  operatorName?: string;
}

export const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({
  gymSlug,
  occupancy,
  onActionComplete,
  operatorName = 'Instrutor'
}) => {
  const [quickValue, setQuickValue] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleAction = async (type: 'entry' | 'exit' | 'adjust', val: number = 1) => {
    const actionId = `${type}-${Date.now()}`;
    setIsProcessing(actionId);
    
    try {
      let action: 'entry' | 'exit' | 'adjust_count' = 'adjust_count';
      let finalVal = val;

      if (type === 'entry') {
        action = 'adjust_count';
        finalVal = 1;
      } else if (type === 'exit') {
        action = 'adjust_count';
        finalVal = -1;
      }

      const res = await sendTurnstileAction(gymSlug, action, finalVal, operatorName);
      
      if (res.success) {
        setLastAction(type === 'entry' ? '+1 Aluno' : type === 'exit' ? '-1 Aluno' : `Ajuste: ${val}`);
        if (onActionComplete) onActionComplete();
        setTimeout(() => setLastAction(null), 2000);
      }
    } catch (err) {
      console.error('Erro no controle remoto:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(quickValue, 10);
    if (!isNaN(val) && val !== 0) {
      handleAction('adjust', val);
      setQuickValue('');
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Controle Remoto
          </h3>
          <p className="text-zinc-500 text-xs mt-1">Ajuste rápido de fluxo para personais</p>
        </div>
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-green-500/30"
            >
              <CheckCircle2 size={12} />
              {lastAction}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-4 h-32">
        {/* Botão de Entrada */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!!isProcessing}
          onClick={() => handleAction('entry')}
          className="relative group overflow-hidden bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 border border-cyan-400/30 disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <UserPlus size={32} className="text-white" />
          <span className="text-white font-black text-xl">+1 ENTRADA</span>
        </motion.button>

        {/* Botão de Saída */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!!isProcessing}
          onClick={() => handleAction('exit')}
          className="relative group overflow-hidden bg-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 border border-zinc-700 shadow-lg disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <UserMinus size={32} className="text-zinc-300" />
          <span className="text-zinc-300 font-black text-xl">-1 SAÍDA</span>
        </motion.button>
      </div>

      {/* Ajuste Numérico Rápido */}
      <form onSubmit={handleQuickSubmit} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <Hash size={16} />
          </div>
          <input
            type="number"
            placeholder="Ajuste rápido (ex: 5 ou -3)"
            value={quickValue}
            onChange={(e) => setQuickValue(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-700"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={!quickValue || !!isProcessing}
          className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-xl border border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronRight size={20} />
        </motion.button>
      </form>

      {/* Indicador de Lotação Atual */}
      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Presentes</div>
            <div className="text-white font-mono font-bold">{occupancy.currentCount}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Vagas</div>
            <div className="text-cyan-500 font-mono font-bold">{Math.max(0, occupancy.maxCapacity - occupancy.currentCount)}</div>
          </div>
        </div>
        
        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${occupancy.percentage}%` }}
            className={`h-full ${occupancy.percentage > 90 ? 'bg-red-500' : 'bg-cyan-500'}`}
          />
        </div>
      </div>
    </div>
  );
};
