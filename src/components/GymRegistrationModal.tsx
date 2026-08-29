import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  ArrowRight, 
  X, 
  Link as LinkIcon, 
  Clock, 
  Users, 
  ShieldCheck, 
  Cpu, 
  QrCode
} from 'lucide-react';
import { CreateGymInput, GymProfile } from '../types';
import { THEME_COLOR_CONFIG } from '../data/gymData';
import { registerGym } from '../services/api';

interface GymRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGymCreated: (gym: GymProfile) => void;
}

const EMOJI_OPTIONS = ['⚡', '🔥', '💪', '🌿', '🏋️', '🥊', '🏆', '💎', '🚀', '⭐', '🎯', '✨'];
const THEME_OPTIONS = ['cyan', 'emerald', 'amber', 'violet', 'rose', 'blue'] as const;

export const GymRegistrationModal: React.FC<GymRegistrationModalProps> = ({
  isOpen,
  onClose,
  onGymCreated
}) => {
  const [formData, setFormData] = useState<CreateGymInput>({
    name: '',
    slug: '',
    slogan: 'Sala de Musculação & Treinamento',
    city: 'São Paulo',
    neighborhood: 'Centro',
    address: '',
    contactPhone: '',
    maxCapacity: 80,
    initialCount: 15,
    themeColor: 'cyan',
    logoEmoji: '⚡',
    ownerName: '',
    ownerEmail: '',
    operatingHours: {
      weekdays: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '07:00', close: '17:00', isOpen: true },
      sunday: { open: '08:00', close: '14:00', isOpen: true }
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGym, setCreatedGym] = useState<GymProfile | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === generatedSlug.slice(0, -1) ? generatedSlug : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Por favor informe o nome da academia.');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Por favor informe um link/slug personalizado para os alunos.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerGym(formData);
      if (res.success && res.gym) {
        setCreatedGym(res.gym);
        onGymCreated(res.gym);
      } else {
        setError(res.message || 'Erro ao cadastrar academia.');
      }
    } catch (err: any) {
      setError('Erro de conexão ao cadastrar academia.');
    } finally {
      setLoading(false);
    }
  };

  const publicUrl = createdGym 
    ? `${window.location.origin}${window.location.pathname}?gym=${createdGym.slug}&view=student`
    : `${window.location.origin}${window.location.pathname}?gym=${formData.slug || 'sua-academia'}&view=student`;

  const copyToClipboard = (text: string, type: 'link' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-white">
        
        {/* Close Button */}
        <button
          id="close-registration-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdGym ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shadow-inner">
                🏢
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-1">
                  <Sparkles className="w-3 h-3" /> SaaS GymFlow Multi-Tenancy
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Cadastre sua Academia
                </h2>
                <p className="text-sm text-zinc-400">
                  Crie o link exclusivo para seus alunos e integre com a catraca ESP32.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Gym Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nome da Academia *
                  </label>
                  <input
                    id="gym-name-input"
                    type="text"
                    required
                    placeholder="Ex: Iron Gym Moema"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Slug / Link do Aluno *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-zinc-500 font-mono">/gym/</span>
                    <input
                      id="gym-slug-input"
                      type="text"
                      required
                      placeholder="iron-gym-moema"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full pl-14 pr-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-cyan-300 font-mono placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Slogan & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Slogan ou Subtítulo
                  </label>
                  <input
                    id="gym-slogan-input"
                    type="text"
                    placeholder="Ex: Centro de Treinamento e Musculação"
                    value={formData.slogan}
                    onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Capacidade Máxima
                  </label>
                  <input
                    id="gym-capacity-input"
                    type="number"
                    min="10"
                    max="1000"
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Location & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Cidade
                  </label>
                  <input
                    id="gym-city-input"
                    type="text"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Bairro / Unidade
                  </label>
                  <input
                    id="gym-neighborhood-input"
                    type="text"
                    placeholder="Moema / Jardins"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="gym-phone-input"
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Branding: Theme & Emoji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">
                    Ícone / Emoji da Marca
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, logoEmoji: emoji })}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          formData.logoEmoji === emoji
                            ? 'bg-cyan-500/20 border-2 border-cyan-400 scale-105 shadow-md'
                            : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-2">
                    Cor Tema Visual
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map((colorKey) => {
                      const cfg = THEME_COLOR_CONFIG[colorKey];
                      const isSelected = formData.themeColor === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setFormData({ ...formData, themeColor: colorKey })}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-zinc-700 border-cyan-400 text-white font-semibold'
                              : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.primary.split(' ')[0]}`} />
                          <span className="truncate">{cfg.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Responsible Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nome do Responsável / Gestor
                  </label>
                  <input
                    id="gym-owner-name-input"
                    type="text"
                    placeholder="Ex: Carlos Mendonça"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    E-mail do Gestor
                  </label>
                  <input
                    id="gym-owner-email-input"
                    type="email"
                    placeholder="gestao@suaacademia.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Live Link Preview */}
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-cyan-300 truncate">
                  <LinkIcon className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span className="text-zinc-400">Link do Aluno:</span>
                  <span className="font-mono font-medium truncate">{publicUrl}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="submit-gym-registration-btn"
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>Criando Academia...</>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Cadastrar Academia
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* SUCCESS SCREEN */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
              ✨
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Academia Cadastrada com Sucesso!
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              A unidade <strong className="text-white">{createdGym.name}</strong> já está ativa no GymFlow SaaS com monitoramento de catraca em tempo real.
            </p>

            {/* Link Box */}
            <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-5 mb-5 text-left space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" /> Link Próprio dos Alunos:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-cyan-300 font-mono text-xs truncate">
                    {publicUrl}
                  </div>
                  <button
                    id="copy-student-link-btn"
                    type="button"
                    onClick={() => copyToClipboard(publicUrl, 'link')}
                    className="px-3.5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" /> Chave de Hardware ESP32 (API Key):
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-amber-300 font-mono text-xs truncate">
                    {createdGym.apiKey}
                  </div>
                  <button
                    id="copy-api-key-btn"
                    type="button"
                    onClick={() => copyToClipboard(createdGym.apiKey, 'key')}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copiedKey ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedKey ? 'Copiada!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Finish CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="open-gym-dashboard-btn"
                type="button"
                onClick={() => {
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
              >
                Ir para o Painel da Academia <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
