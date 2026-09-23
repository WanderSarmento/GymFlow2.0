import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Loader2,
  GripHorizontal,
  RotateCcw
} from 'lucide-react';
import { Announcement, AnnouncementCategory, AnnouncementPriority, GymProfile } from '../types';

interface AnnouncementsBoardProps {
  announcements: Announcement[];
  gym?: GymProfile;
  onAddAnnouncement?: (announcement: Partial<Announcement>) => Promise<boolean>;
  onUpdateAnnouncement?: (id: string, announcement: Partial<Announcement>) => Promise<boolean>;
  onDeleteAnnouncement?: (id: string) => Promise<boolean>;
  isAdminMode?: boolean;
}

export const AnnouncementsBoard: React.FC<AnnouncementsBoardProps> = ({
  announcements,
  gym,
  onAddAnnouncement = async () => false,
  onUpdateAnnouncement = async () => false,
  onDeleteAnnouncement = async () => false,
  isAdminMode = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New announcement form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('manutencao');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('medium');
  const [formPinned, setFormPinned] = useState(false);
  const [formAuthor, setFormAuthor] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Modal position & draggable state
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });

  // Handle escape key to close modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Drag listeners
  const startDrag = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: modalPos.x,
      initialY: modalPos.y
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setModalPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !e.touches[0]) return;
      const dx = e.touches[0].clientX - dragStartRef.current.startX;
      const dy = e.touches[0].clientY - dragStartRef.current.startY;
      setModalPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy
      });
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;
    startDrag(e.clientX, e.clientY);
  };

  const handleHeaderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return;
    if (e.touches[0]) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

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

  const handleEdit = (announcement: Announcement) => {
    setModalPos({ x: 0, y: 0 });
    setEditingId(announcement.id);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormCategory(announcement.category);
    setFormPriority(announcement.priority);
    setFormPinned(announcement.pinned);
    setFormAuthor(announcement.author);
    setFormActive(announcement.active !== false);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setModalPos({ x: 0, y: 0 });
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('manutencao');
    setFormPriority('medium');
    setFormPinned(false);
    setFormAuthor('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setIsSubmitting(true);
    
    let success = false;
    
    if (editingId) {
      success = await onUpdateAnnouncement(editingId, {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        pinned: formPinned,
        author: formAuthor.trim() || 'Equipe GymLivre',
        active: formActive
      });
    } else {
      success = await onAddAnnouncement({
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        pinned: formPinned,
        author: formAuthor.trim() || 'Equipe GymLivre'
      });
    }

    setIsSubmitting(false);
    if (success) {
      setFormTitle('');
      setFormContent('');
      setEditingId(null);
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDeleteAnnouncement(id);
    } finally {
      setDeletingId(null);
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
              onClick={handleAddNew}
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
        {/* Render actual gym operating hours if the category is 'horario' */}
        {selectedCategory === 'horario' && gym?.operatingHours && (
          <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-1 px-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Horários Registrados da Unidade</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Seg a Sex */}
              <div className={`p-4 rounded-2xl border transition-all ${gym.operatingHours.weekdays.isOpen ? 'bg-zinc-900/60 border-cyan-500/20 shadow-sm' : 'bg-zinc-950/40 border-gray-800/50 grayscale opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Segunda a Sexta</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${gym.operatingHours.weekdays.isOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></span>
                </div>
                <div className="text-lg font-black text-white font-mono tracking-tighter leading-tight">
                  {!gym.operatingHours.weekdays.isOpen ? (
                    'Fechado'
                  ) : gym.operatingHours.weekdays.hasBreak ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase">
                        <span>Turno 1:</span>
                        <span>{gym.operatingHours.weekdays.open} - {gym.operatingHours.weekdays.breakOpen}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs opacity-90">
                        <span>Turno 2:</span>
                        <span>{gym.operatingHours.weekdays.breakClose} - {gym.operatingHours.weekdays.close}</span>
                      </div>
                    </div>
                  ) : (
                    `${gym.operatingHours.weekdays.open} às ${gym.operatingHours.weekdays.close}`
                  )}
                </div>
              </div>

              {/* Sábado */}
              <div className={`p-4 rounded-2xl border transition-all ${gym.operatingHours.saturday.isOpen ? 'bg-zinc-900/60 border-cyan-500/20 shadow-sm' : 'bg-zinc-950/40 border-gray-800/50 grayscale opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Sábado</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${gym.operatingHours.saturday.isOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></span>
                </div>
                <div className="text-lg font-black text-white font-mono tracking-tighter leading-tight">
                  {!gym.operatingHours.saturday.isOpen ? (
                    'Fechado'
                  ) : gym.operatingHours.saturday.hasBreak ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase">
                        <span>Turno 1:</span>
                        <span>{gym.operatingHours.saturday.open} - {gym.operatingHours.saturday.breakOpen}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs opacity-90">
                        <span>Turno 2:</span>
                        <span>{gym.operatingHours.saturday.breakClose} - {gym.operatingHours.saturday.close}</span>
                      </div>
                    </div>
                  ) : (
                    `${gym.operatingHours.saturday.open} às ${gym.operatingHours.saturday.close}`
                  )}
                </div>
              </div>

              {/* Domingo */}
              <div className={`p-4 rounded-2xl border transition-all ${gym.operatingHours.sunday.isOpen ? 'bg-zinc-900/60 border-cyan-500/20 shadow-sm' : 'bg-zinc-950/40 border-gray-800/50 grayscale opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Domingo</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${gym.operatingHours.sunday.isOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></span>
                </div>
                <div className="text-lg font-black text-white font-mono tracking-tighter leading-tight">
                  {!gym.operatingHours.sunday.isOpen ? (
                    'Fechado'
                  ) : gym.operatingHours.sunday.hasBreak ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs opacity-60 font-bold uppercase">
                        <span>Turno 1:</span>
                        <span>{gym.operatingHours.sunday.open} - {gym.operatingHours.sunday.breakOpen}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs opacity-90">
                        <span>Turno 2:</span>
                        <span>{gym.operatingHours.sunday.breakClose} - {gym.operatingHours.sunday.close}</span>
                      </div>
                    </div>
                  ) : (
                    `${gym.operatingHours.sunday.open} às ${gym.operatingHours.sunday.close}`
                  )}
                </div>
              </div>
            </div>

            {filteredAnnouncements.length > 0 && (
              <div className="mt-8 mb-4 border-t border-gray-800 pt-6 px-1 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Avisos Relacionados</span>
              </div>
            )}
          </div>
        )}

        {announcements.length === 0 && selectedCategory !== 'horario' ? (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-950/40 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-white">Nenhum comunicado publicado</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Avisos importantes, manutenções e novidades cadastrados pela administração aparecerão neste mural.
            </p>
            {isAdminMode && (
              <button
                type="button"
                onClick={handleAddNew}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-black hover:bg-cyan-300 transition-colors shadow-lg shadow-cyan-400/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Publicar Primeiro Comunicado
              </button>
            )}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
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

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-gray-500">
                        {item.date}
                      </span>

                      {/* Botoes removidos para o rodape */}
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
                  
                  {isAdminMode && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        id={`edit-announcement-footer-${item.id}`}
                        type="button"
                        onClick={() => handleEdit(item)}
                        title="Editar comunicado"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-gray-800 transition-all active:scale-95 bg-gray-900/30 border border-gray-800/50"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-announcement-footer-${item.id}`}
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        title="Excluir comunicado"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all active:scale-95 bg-gray-900/30 border border-gray-800/50 disabled:opacity-50"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal: Create Announcement (Rendered via Portal directly to body, framed higher & draggable) */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 pt-3 sm:pt-6 md:pt-8 pb-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDraggingRef.current) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            style={{
              transform: `translate3d(${modalPos.x}px, ${modalPos.y}px, 0)`
            }}
            className="w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col rounded-3xl border border-gray-800 bg-gray-950 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-shadow"
          >
            {/* Modal Header - Draggable & Fixed at top of modal */}
            <div
              onMouseDown={handleHeaderMouseDown}
              onTouchStart={handleHeaderTouchStart}
              className="flex items-center justify-between border-b border-gray-800 p-4 sm:p-5 cursor-grab active:cursor-grabbing select-none bg-zinc-950/90 backdrop-blur-md shrink-0"
              title="Clique e arraste pelo cabeçalho para mover a janela"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shrink-0">
                  {editingId ? <Wrench className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base sm:text-lg font-black text-white leading-tight">
                    {editingId ? 'Editar Comunicado' : 'Novo Comunicado'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium mt-0.5">
                    <GripHorizontal className="h-3 w-3 text-cyan-400/70" />
                    <span>Arraste pelo topo para mover</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {(modalPos.x !== 0 || modalPos.y !== 0) && (
                  <button
                    type="button"
                    onClick={() => setModalPos({ x: 0, y: 0 })}
                    title="Recentralizar na posição original"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Recentralizar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer transition-colors"
                  title="Fechar (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable content */}
            <div className="flex-1 overflow-y-auto touch-scroll p-4 sm:p-6 py-4 space-y-4 custom-scrollbar">
              <form id="announcement-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label htmlFor="input-ann-title" className="block text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-[10px] sm:text-[11px]">
                    Título do Comunicado *
                  </label>
                  <input
                    id="input-ann-title"
                    type="text"
                    required
                    placeholder="Ex: Manutenção na Esteira 04 ou Horário de Feriado"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full min-h-[44px] rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="select-ann-category" className="block text-gray-400 font-bold uppercase tracking-wider mb-1 text-[10px] sm:text-[11px]">
                      Categoria
                    </label>
                    <select
                      id="select-ann-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as AnnouncementCategory)}
                      className="w-full min-h-[42px] rounded-2xl bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                    >
                      <option value="manutencao">🔧 Manutenção</option>
                      <option value="evento">🏆 Evento / Desafio</option>
                      <option value="importante">⚠️ Importante</option>
                      <option value="horario">⏰ Horário Especial</option>
                      <option value="novidade">✨ Novidade</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="select-ann-priority" className="block text-gray-400 font-bold uppercase tracking-wider mb-1 text-[10px] sm:text-[11px]">
                      Prioridade
                    </label>
                    <select
                      id="select-ann-priority"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                      className="w-full min-h-[42px] rounded-2xl bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="textarea-ann-content" className="block text-gray-400 font-bold uppercase tracking-wider mb-1 text-[10px] sm:text-[11px]">
                    Mensagem Completa *
                  </label>
                  <textarea
                    id="textarea-ann-content"
                    required
                    rows={3}
                    placeholder="Escreva os detalhes, prazos, orientações aos alunos..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full rounded-2xl bg-gray-900 border border-gray-800 px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
                  <div>
                    <label htmlFor="input-ann-author" className="block text-gray-400 font-bold uppercase tracking-wider mb-1 text-[10px] sm:text-[11px]">
                      Autor / Setor
                    </label>
                    <input
                      id="input-ann-author"
                      type="text"
                      placeholder="Ex: Recepção Central"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="w-full min-h-[42px] rounded-2xl bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-1 sm:pt-3">
                    <div className="relative flex items-center">
                      <input
                        id="checkbox-ann-pinned"
                        type="checkbox"
                        checked={formPinned}
                        onChange={(e) => setFormPinned(e.target.checked)}
                        className="h-5 w-5 rounded-lg border-gray-700 bg-gray-900 text-cyan-400 focus:ring-cyan-400 cursor-pointer transition-all"
                      />
                    </div>
                    <label htmlFor="checkbox-ann-pinned" className="text-gray-300 font-bold text-xs cursor-pointer select-none">
                      Fixar no topo
                    </label>
                  </div>

                  {editingId && (
                    <div className="flex items-center gap-2.5 pt-1 sm:pt-3">
                      <div className="relative flex items-center">
                        <input
                          id="checkbox-ann-active"
                          type="checkbox"
                          checked={formActive}
                          onChange={(e) => setFormActive(e.target.checked)}
                          className="h-5 w-5 rounded-lg border-gray-700 bg-gray-900 text-emerald-400 focus:ring-emerald-400 cursor-pointer transition-all"
                        />
                      </div>
                      <label htmlFor="checkbox-ann-active" className="text-gray-300 font-bold text-xs cursor-pointer select-none">
                        Comunicado Ativo
                      </label>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer - Fixed at bottom of modal dialog, ALWAYS visible */}
            <div className="shrink-0 border-t border-gray-800 p-4 sm:p-5 bg-zinc-950/98 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto min-h-[44px] rounded-2xl border border-gray-800 bg-gray-900 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer active:scale-95 transition-all order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-announcement"
                  type="submit"
                  form="announcement-form"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-h-[44px] rounded-2xl bg-white hover:bg-zinc-200 text-black px-8 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer order-1 sm:order-2"
                >
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar Comunicado' : 'Salvar Comunicado'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
