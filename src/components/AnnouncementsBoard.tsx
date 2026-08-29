import React, { useState } from 'react';
import {
  Bell,
  Wrench,
  Trophy,
  AlertTriangle,
  Sparkles,
  Clock,
  Pin,
  Plus,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';
import { Announcement, AnnouncementCategory, AnnouncementPriority } from '../types';

interface AnnouncementsBoardProps {
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Partial<Announcement>) => Promise<boolean>;
  onDeleteAnnouncement: (id: string) => Promise<boolean>;
  isAdminMode?: boolean;
}

export const AnnouncementsBoard: React.FC<AnnouncementsBoardProps> = ({
  announcements,
  onAddAnnouncement,
  onDeleteAnnouncement,
  isAdminMode = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New announcement form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('manutencao');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('medium');
  const [formPinned, setFormPinned] = useState(false);
  const [formAuthor, setFormAuthor] = useState('Administração FitFlow');

  const getCategoryConfig = (category: AnnouncementCategory) => {
    switch (category) {
      case 'manutencao':
        return { label: 'Manutenção', icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' };
      case 'evento':
        return { label: 'Evento & Desafio', icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' };
      case 'importante':
        return { label: 'Importante', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' };
      case 'novidade':
        return { label: 'Novidade', icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' };
      case 'horario':
        return { label: 'Horário Especial', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' };
      default:
        return { label: 'Geral', icon: Bell, color: 'text-gray-400', bg: 'bg-gray-800/40 border-gray-700' };
    }
  };

  const filteredAnnouncements = announcements.filter(item => {
    const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setIsSubmitting(true);
    const success = await onAddAnnouncement({
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      priority: formPriority,
      pinned: formPinned,
      author: formAuthor.trim() || 'Equipe GymFlow'
    });

    setIsSubmitting(false);
    if (success) {
      setFormTitle('');
      setFormContent('');
      setIsModalOpen(false);
    }
  };

  return (
    <div id="announcements-board" className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 border border-gray-800 text-cyan-400">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Comunicação Oficial
            </h3>
            <h2 className="text-lg font-black font-['Outfit'] text-white">
              Mural de Avisos & Comunicados
            </h2>
          </div>
        </div>

        {/* Action Button: Create Announcement (Only visible in Admin / Reception mode) */}
        {isAdminMode && (
          <div className="flex items-center gap-2">
            <button
              id="btn-open-new-announcement"
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white hover:bg-gray-200 text-black px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Novo Comunicado</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Category Pill Filters (Horizontally scrollable with touch-friendly 44px targets) */}
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll py-1 max-w-full">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'manutencao', label: 'Manutenção 🔧' },
            { id: 'evento', label: 'Eventos 🏆' },
            { id: 'importante', label: 'Avisos ⚠️' },
            { id: 'horario', label: 'Horários ⏰' },
            { id: 'novidade', label: 'Novidades ✨' }
          ].map(cat => (
            <button
              key={cat.id}
              id={`filter-cat-${cat.id}`}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-[44px] min-w-[44px] shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.3)] font-black'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input (16px base font to prevent auto zoom) */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            id="search-announcements"
            type="text"
            placeholder="Buscar avisos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] rounded-2xl bg-gray-950 border border-gray-800 pl-10 pr-3.5 py-2.5 text-base sm:text-xs text-gray-200 placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="mt-5 space-y-3.5">
        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-950/40 p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-gray-600 mb-2" />
            <p className="text-sm font-bold text-gray-400">Nenhum comunicado encontrado nesta categoria</p>
            <p className="text-xs text-gray-500 mt-0.5">Tente selecionar outro filtro ou limpar a busca.</p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => {
            const config = getCategoryConfig(item.category);
            const CategoryIcon = config.icon;

            return (
              <article
                key={item.id}
                id={`announcement-${item.id}`}
                className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                  item.pinned
                    ? 'bg-gray-900/90 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.06)]'
                    : 'bg-gray-950/80 border-gray-800/80 hover:border-gray-700'
                }`}
              >
                {/* Top header line */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.color}`}>
                      <CategoryIcon className="h-3 w-3" />
                      {config.label}
                    </span>

                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/20">
                        <Pin className="h-3 w-3" />
                        Fixado
                      </span>
                    )}

                    {item.priority === 'urgent' && (
                      <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                        Urgente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-gray-500">
                      {item.date}
                    </span>

                    {isAdminMode && (
                      <button
                        id={`delete-announcement-${item.id}`}
                        type="button"
                        onClick={() => onDeleteAnnouncement(item.id)}
                        title="Excluir comunicado"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-['Outfit'] text-base font-black text-white leading-snug">
                  {item.title}
                </h3>

                {/* Content */}
                <p className="mt-1.5 text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {item.content}
                </p>

                {/* Footer / Author */}
                <div className="mt-3.5 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-800/80 pt-2.5">
                  <span>Publicado por: <strong className="text-gray-300 font-semibold">{item.author}</strong></span>
                  <span className="text-gray-500 font-mono">GymFlow System</span>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal: Create Announcement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3.5 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto touch-scroll rounded-3xl border border-gray-800 bg-gray-950 p-5 sm:p-8 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                  <Bell className="h-4 w-4" />
                </div>
                <h3 className="font-['Outfit'] text-lg font-black text-white">
                  Novo Comunicado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                  Título do Comunicado *
                </label>
                <input
                  id="input-ann-title"
                  type="text"
                  required
                  placeholder="Ex: Manutenção na Esteira 04 ou Horário de Feriado"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                    Categoria
                  </label>
                  <select
                    id="select-ann-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                    className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="manutencao">🔧 Manutenção</option>
                    <option value="evento">🏆 Evento / Desafio</option>
                    <option value="importante">⚠️ Importante</option>
                    <option value="horario">⏰ Horário Especial</option>
                    <option value="novidade">✨ Novidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                    Prioridade
                  </label>
                  <select
                    id="select-ann-priority"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                  Mensagem Completa *
                </label>
                <textarea
                  id="textarea-ann-content"
                  required
                  rows={4}
                  placeholder="Escreva os detalhes, prazos, orientações aos alunos..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                    Autor / Setor
                  </label>
                  <input
                    id="input-ann-author"
                    type="text"
                    placeholder="Ex: Recepção Central"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2 text-base sm:text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 sm:pt-4 min-h-[44px]">
                  <input
                    id="checkbox-ann-pinned"
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-700 bg-gray-900 text-cyan-400 focus:ring-cyan-400 cursor-pointer"
                  />
                  <label htmlFor="checkbox-ann-pinned" className="text-gray-300 font-bold text-xs cursor-pointer">
                    Fixar no topo
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-xs font-bold uppercase text-gray-400 hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-announcement"
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-xl bg-white hover:bg-gray-200 text-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
