import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  Share2, 
  QrCode, 
  Smartphone, 
  Tv, 
  MessageCircle,
  Link as LinkIcon,
  ShieldCheck
} from 'lucide-react';
import { GymProfile } from '../types';
import { THEME_COLOR_CONFIG } from '../data/gymData';

interface GymShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gym: GymProfile;
}

export const GymShareModal: React.FC<GymShareModalProps> = ({
  isOpen,
  onClose,
  gym
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}${window.location.pathname}?gym=${gym.slug}&view=student`;
  const theme = THEME_COLOR_CONFIG[gym.themeColor || 'cyan'] || THEME_COLOR_CONFIG.cyan;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🏋️ Olá! Acompanhe o fluxo e a lotação da ${gym.name} em tempo real antes de vir treinar:\n${publicUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-7 my-8 text-white">
        
        {/* Close button */}
        <button
          id="close-share-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl">
            {gym.logoEmoji || '⚡'}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Link dos Alunos - {gym.name}
            </h2>
            <p className="text-xs text-zinc-400">
              Disponibilize para seus alunos acompanharem a lotação em tempo real pelo celular.
            </p>
          </div>
        </div>

        {/* URL Box */}
        <div className="bg-zinc-800/70 border border-zinc-700 rounded-xl p-3.5 mb-5 space-y-2">
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-cyan-400" /> Link Próprio Exclusivo:
          </span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={publicUrl}
              className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 select-all focus:outline-none"
            />
            <button
              id="copy-modal-link-btn"
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* QR Code & Share Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Simulated QR Code Card */}
          <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800 flex flex-col items-center justify-center text-center">
            {/* SVG Stylized QR Code */}
            <div className="p-2.5 bg-white rounded-xl shadow-md mb-2 flex items-center justify-center">
              <svg className="w-24 h-24 text-black" viewBox="0 0 100 100" fill="currentColor">
                {/* Visual QR Code Matrix */}
                <rect x="0" y="0" width="30" height="30" />
                <rect x="5" y="5" width="20" height="20" fill="white" />
                <rect x="10" y="10" width="10" height="10" />

                <rect x="70" y="0" width="30" height="30" />
                <rect x="75" y="5" width="20" height="20" fill="white" />
                <rect x="80" y="10" width="10" height="10" />

                <rect x="0" y="70" width="30" height="30" />
                <rect x="5" y="75" width="20" height="20" fill="white" />
                <rect x="10" y="80" width="10" height="10" />

                <rect x="40" y="10" width="10" height="20" />
                <rect x="55" y="5" width="10" height="10" />
                <rect x="45" y="45" width="15" height="15" />
                <rect x="70" y="45" width="20" height="10" />
                <rect x="40" y="70" width="20" height="10" />
                <rect x="70" y="70" width="10" height="25" />
                <rect x="85" y="85" width="15" height="15" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-zinc-300">QR Code da Recepção</span>
            <span className="text-[10px] text-zinc-500">Imprima e coloque no balcão</span>
          </div>

          {/* Quick Sharing actions */}
          <div className="flex flex-col justify-between gap-2">
            <button
              id="share-whatsapp-btn"
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Compartilhar no WhatsApp
            </button>

            <a
              id="open-student-view-tab-btn"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-zinc-700"
            >
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              Abrir Visão do Aluno
            </a>

            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-zinc-400">
              <span className="text-cyan-400 font-semibold block mb-0.5">🔒 Modo Seguro Aluno</span>
              Os alunos veem apenas a lotação e avisos, sem botões técnicos ou dados da catraca.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
