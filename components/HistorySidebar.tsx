'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Trash2, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  Layers, 
  X,
  MessageSquare
} from 'lucide-react';
import { UserInteraction } from '@/lib/firestore-utils';

interface HistorySidebarProps {
  interactions: UserInteraction[];
  activeId: string | null;
  onSelect: (interaction: UserInteraction) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = interactions.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this reflection? This cannot be undone.')) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'summary':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'brainstorm':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'journal':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        id="history-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-stone-200 bg-stone-50 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header & New Entry Button */}
        <div className="flex flex-col gap-3 p-4 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <BookOpen className="h-4 w-4 text-stone-700" />
              <span>Past Entries</span>
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                {interactions.length}
              </span>
            </div>
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            id="new-reflection-btn"
            onClick={() => {
              onNew();
              onCloseMobile();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 focus:ring-2 focus:ring-stone-400 focus:outline-hidden"
          >
            <Plus className="h-4 w-4" />
            <span>New Reflection</span>
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              id="search-history-input"
              type="text"
              placeholder="Search past reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-8 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-hidden"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {['all', 'reflection', 'summary', 'brainstorm'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg px-2.5 py-1 capitalize transition ${
                  filterCategory === cat
                    ? 'bg-stone-900 font-medium text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div
          id="history-entries-list"
          className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-stone-100"
        >
          {filtered.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-stone-500">
                <Layers className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-medium text-stone-700">No reflections found</p>
              <p className="mt-1 text-xs text-stone-500">
                {searchQuery ? 'Try adjusting your search terms' : 'Start your first journal entry!'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isActive = item.id === activeId;
              const dateFormatted = new Date(item.updatedAt || item.createdAt).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
              );

              return (
                <div
                  key={item.id}
                  id={`history-item-${item.id}`}
                  onClick={() => {
                    onSelect(item);
                    onCloseMobile();
                  }}
                  className={`group relative cursor-pointer rounded-xl p-3 transition border ${
                    isActive
                      ? 'border-stone-900 bg-white shadow-xs'
                      : 'border-transparent bg-transparent hover:border-stone-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-stone-900 line-clamp-1">
                      {item.title || 'Untitled Entry'}
                    </h3>
                    <span
                      className={`inline-block shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getCategoryBadge(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                  </div>

                  {/* Summary / Snippet */}
                  <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {item.summary ||
                      item.messages[0]?.content ||
                      'No content written yet...'}
                  </p>

                  {/* Meta Bar */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>{dateFormatted}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-stone-500">
                        <MessageSquare className="h-3 w-3" />
                        {item.messages.length}
                      </span>
                      <button
                        onClick={(e) => handleDeleteClick(e, item.id)}
                        disabled={deletingId === item.id}
                        className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-stone-200 p-3 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Encrypted in transit</span>
          <span className="font-mono text-[10px] text-stone-400">v2.0-secure</span>
        </div>
      </aside>
    </>
  );
};
