import React, { useState } from 'react';
import { 
  X, 
  Save, 
  CheckCircle2, 
  Sliders, 
  Sparkles, 
  Clock, 
  Users, 
  Palette, 
  MapPin, 
  Phone, 
  Sun,
  Moon,
  Building2,
  Check
} from 'lucide-react';
import { GymProfile, GymThemeColor } from '../types';
import { THEME_COLOR_CONFIG, ALL_THEME_OPTIONS } from '../data/gymData';
import { updateGymSettings } from '../services/api';

interface GymCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gym: GymProfile;
  onGymUpdated: (updated: GymProfile) => void;
}

const EMOJI_OPTIONS = ['⚡', '🔥', '💪', '🌿', '🏋️', '🥊', '🏆', '💎', '🚀', '⭐', '🎯', '✨'];
const COLOR_CATEGORIES = [
  { id: 'todos', label: 'Todas as Cores' },
  { id: 'azul', label: 'Azul & Ciano' },
  { id: 'verde', label: 'Verde' },
  { id: 'laranja', label: 'Laranja' },
  { id: 'roxo', label: 'Roxo' },
  { id: 'vermelho', label: 'Vermelho' }
] as const;

export const GymCustomizerModal: React.FC<GymCustomizerModalProps> = ({
  isOpen,
  onClose,
  gym,
  onGymUpdated
}) => {
  const [colorCategory, setColorCategory] = useState<string>('todos');
  const [formData, setFormData] = useState({
    name: gym.name,
    slogan: gym.slogan || '',
    city: gym.city || '',
    neighborhood: gym.neighborhood || '',
    address: gym.address || '',
    contactPhone: gym.contactPhone || '',
    maxCapacity: gym.maxCapacity,
    themeColor: (gym.themeColor || 'cyan') as GymThemeColor,
    logoEmoji: gym.logoEmoji || '⚡',
    visualTheme: gym.visualTheme || 'dark',
    isOpen: gym.isOpen !== false,
    operatingHours: gym.operatingHours || {
      weekdays: { open: '06:00', close: '23:00', isOpen: true },
      saturday: { open: '07:00', close: '17:00', isOpen: true },
      sunday: { open: '08:00', close: '14:00', isOpen: true }
    }
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updateGymSettings(gym.slug || gym.id, formData);
      if (res.success && res.profile) {
        setSuccess(true);
        onGymUpdated(res.profile);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Erro ao salvar alterações');
      }
    } catch (err) {
      setError('Erro de comunicação com o servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-7 my-8 text-white">
        
        {/* Close Button */}
        <button
          id="close-customizer-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl">
            {formData.logoEmoji}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Personalizar Academia
            </h2>
            <p className="text-xs text-zinc-400">
              Altere os dados, cores e horários exibidos no painel e para os alunos.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Alterações salvas com sucesso!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Gym Name & Slogan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nome da Unidade
              </label>
              <input
                id="edit-gym-name-input"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Slogan / Subtítulo
              </label>
              <input
                id="edit-gym-slogan-input"
                type="text"
                value={formData.slogan}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Capacity & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Capacidade Máxima
              </label>
              <input
                id="edit-gym-capacity-input"
                type="number"
                min="10"
                max="1000"
                value={formData.maxCapacity}
                onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Cidade
              </label>
              <input
                id="edit-gym-city-input"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Bairro / Unidade
              </label>
              <input
                id="edit-gym-neighborhood-input"
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Emoji Selection */}
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800">
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Ícone / Emoji da Unidade
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, logoEmoji: emoji })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all ${
                    formData.logoEmoji === emoji
                      ? 'bg-cyan-500/20 border-2 border-cyan-400 scale-105 shadow-sm'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Expanded Visual Color Theme Selection */}
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" /> Cores do Tema Visual ({ALL_THEME_OPTIONS.length} Opções)
              </label>
              <span className="text-[10px] text-zinc-400">
                Personalize a cor da sua academia
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {COLOR_CATEGORIES.map((cat) => {
                const isActive = colorCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setColorCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-700 text-white shadow-sm border border-zinc-600'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {ALL_THEME_OPTIONS.filter((key) => {
                if (colorCategory === 'todos') return true;
                return THEME_COLOR_CONFIG[key].category === colorCategory;
              }).map((colorKey) => {
                const cfg = THEME_COLOR_CONFIG[colorKey];
                const isSelected = formData.themeColor === colorKey;
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setFormData({ ...formData, themeColor: colorKey })}
                    className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all group ${
                      isSelected
                        ? `bg-zinc-800 ${cfg.border} ring-1 ${cfg.ring} text-white font-semibold shadow-md`
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: cfg.hex, boxShadow: isSelected ? `0 0 8px ${cfg.hex}` : undefined }}
                      />
                      <span className="truncate text-[11px]">{cfg.name}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Live Theme Preview Box */}
            {(() => {
              const currentCfg = THEME_COLOR_CONFIG[formData.themeColor] || THEME_COLOR_CONFIG.cyan;
              return (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Pré-visualização do Tema:</span>
                    <span className={`font-semibold ${currentCfg.text}`}>
                      {currentCfg.name} ({currentCfg.hex})
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${currentCfg.primary} shadow-sm`}>
                        {formData.logoEmoji}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {formData.name || 'Sua Academia'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${currentCfg.badge}`}>
                            Ocupação 42%
                          </span>
                          <span className="text-[10px] text-zinc-400 truncate">
                            {formData.city || 'São Paulo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 shadow-sm transition-transform active:scale-95 ${currentCfg.primary}`}
                    >
                      Entrada Liberada
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Visual Theme Selection */}
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800">
            <label className="block text-[11px] font-semibold text-zinc-300 mb-2.5 uppercase tracking-wider">
              Ambiente e Visibilidade (Tema)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visualTheme: 'dark' })}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  formData.visualTheme === 'dark'
                    ? 'bg-zinc-800 border-cyan-400 text-white shadow-lg shadow-black/20'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  formData.visualTheme === 'dark' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-600'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Modo Dark</div>
                  <div className="text-[10px] opacity-60">Ideal para baixa luz</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, visualTheme: 'light' })}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  formData.visualTheme === 'light'
                    ? 'bg-white border-cyan-500 text-zinc-900 shadow-lg shadow-black/10'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  formData.visualTheme === 'light' ? 'bg-cyan-100 text-cyan-600' : 'bg-zinc-800 text-zinc-600'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Contraste Alto</div>
                  <div className="text-[10px] opacity-60">Ideal para recepções claras</div>
                </div>
              </button>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Horários de Funcionamento
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Segunda a Sexta</span>
                <input
                  type="text"
                  placeholder="06:00 - 23:00"
                  value={`${formData.operatingHours.weekdays.open} - ${formData.operatingHours.weekdays.close}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-').map(s => s.trim());
                    if (parts.length === 2) {
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          weekdays: { open: parts[0], close: parts[1], isOpen: true }
                        }
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-[11px]"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Sábado</span>
                <input
                  type="text"
                  placeholder="07:00 - 17:00"
                  value={`${formData.operatingHours.saturday.open} - ${formData.operatingHours.saturday.close}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-').map(s => s.trim());
                    if (parts.length === 2) {
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          saturday: { open: parts[0], close: parts[1], isOpen: true }
                        }
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-[11px]"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Domingo</span>
                <input
                  type="text"
                  placeholder="08:00 - 14:00"
                  value={`${formData.operatingHours.sunday.open} - ${formData.operatingHours.sunday.close}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-').map(s => s.trim());
                    if (parts.length === 2) {
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          sunday: { open: parts[0], close: parts[1], isOpen: true }
                        }
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="save-gym-settings-btn"
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : (
                <>
                  <Save className="w-3.5 h-3.5" /> Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
