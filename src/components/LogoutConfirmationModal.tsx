import React from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header with Icon */}
            <div className="bg-rose-500/10 p-6 flex flex-col items-center text-center border-b border-zinc-800">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 mb-4 border border-rose-500/30">
                <LogOut className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white font-['Outfit'] tracking-tight">Confirmar Saída</h2>
              <p className="text-zinc-400 text-xs mt-2 font-medium">Você tem certeza que deseja sair da sua conta?</p>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              <button
                type="button"
                onClick={onConfirm}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sair Agora
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all border border-zinc-700 cursor-pointer"
              >
                Continuar Conectado
              </button>
            </div>

            {/* Close button top right */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
