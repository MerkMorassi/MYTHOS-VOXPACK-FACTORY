import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Search, FileText, Sparkles, Upload } from 'lucide-react';
import { LoreDocument, getStoredLore, saveLoreDocument, deleteLoreDocument, searchLore } from '../services/ragStore';

export const LoreManager: React.FC = () => {
  const [loreList, setLoreList] = useState<LoreDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setLoreList(getStoredLore());
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setLoreList(searchLore(q, 20));
  };

  const handleAddLore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    saveLoreDocument({
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    setTitle('');
    setContent('');
    setTags('');
    setIsAdding(false);
    setLoreList(getStoredLore());
  };

  const handleDelete = (id: string) => {
    deleteLoreDocument(id);
    setLoreList(getStoredLore());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const docTitle = file.name.replace(/\.[^/.]+$/, '');
    saveLoreDocument({
      title: docTitle,
      content: text,
      tags: ['document', 'upload'],
    });
    setLoreList(getStoredLore());
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-violet-400" /> Lila LORE & RAG Store
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage background stories, context documents, and memories retrieved during conversations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" /> Ingest Text File
            <input type="file" accept=".txt,.md,.json" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-colors flex items-center gap-2 shadow-lg shadow-violet-600/30"
          >
            <Plus className="w-4 h-4" /> {isAdding ? 'Cancel' : 'Add Lore Entry'}
          </button>
        </div>
      </div>

      {/* Add Lore Form */}
      {isAdding && (
        <form onSubmit={handleAddLore} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-slate-200">New Knowledge / Lore Entry</h2>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lila's Childhood Memory in Berlin"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Content / Context</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Detailed lore or memory snippet..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="memory, personal, dramatic"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-colors shadow-md shadow-violet-600/20"
            >
              Save to RAG Store
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search LORE by keyword..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500 backdrop-blur-md"
        />
      </div>

      {/* Lore List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" /> Indexed Knowledge Base ({loreList.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loreList.map((doc, idx) => (
            <div
              key={`${doc.id}_${idx}`}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-200 text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-400" /> {doc.title}
                  </h3>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {doc.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
