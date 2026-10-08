'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Sparkles,
  Undo,
  Redo,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';

interface TipTapEditorProps {
  content: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  chapterTitle?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  chapterTitle = '',
}) => {
  const { getIdToken } = useAuth();
  const [selectedText, setSelectedText] = useState('');
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Tuliskan materi pembelajaran di sini...',
      }),
    ],
    content: content || '<p></p>',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');
      setSelectedText(text.trim());
    },
  });

  const handleExplainSimpler = async () => {
    if (!selectedText) return;
    setShowExplainModal(true);
    setLoadingExplain(true);
    setExplanation('');

    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          selectedText,
          chapterContext: chapterTitle,
        }),
      });

      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
      } else {
        setExplanation('Tidak dapat memuat penjelasan sederhana.');
      }
    } catch (e: any) {
      setExplanation('Terjadi gangguan saat memanggil AI.');
    } finally {
      setLoadingExplain(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="relative">
      {/* Clean Toolbar */}
      {!readOnly && (
        <div className="no-print flex flex-wrap items-center gap-1 p-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg mb-4 sticky top-16 z-20">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('bold')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('italic')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('underline')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Garis Bawah"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('strike')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Coret"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Judul Bab (H2)"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Subjudul (H3)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('bulletList')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Daftar Poin"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('orderedList')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Daftar Nomor"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('taskList')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Checklist"
          >
            <ListTodo className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('blockquote')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Kutipan"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition ${
              editor.isActive('codeBlock')
                ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Blok Kode"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] transition"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] transition"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Jelaskan Lebih Mudah Action Bar when text is selected */}
      {selectedText && (
        <div className="no-print fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] text-[var(--text)] rounded-lg shadow-xl border border-[var(--border)] animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-xs font-medium max-w-[150px] truncate text-[var(--muted)]">
            &ldquo;{selectedText}&rdquo;
          </span>
          <button
            onClick={handleExplainSimpler}
            className="btn-primary py-1 px-2.5 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" /> Jelaskan Lebih Mudah
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="prose-belajar min-h-[350px] focus:outline-hidden">
        <EditorContent editor={editor} />
      </div>

      {/* Jelaskan Lebih Mudah Modal */}
      {showExplainModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowExplainModal(false)}
              className="absolute top-4 right-4 p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-md"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[var(--primary)]">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-bold text-[var(--text)]">Penjelasan Lebih Mudah</h3>
            </div>

            <div className="p-2.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] text-xs text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">Konteks: </span>
              &ldquo;{selectedText}&rdquo;
            </div>

            {loadingExplain ? (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                <p className="text-xs text-[var(--muted)] font-medium">
                  AI sedang menyusun analogi sederhana...
                </p>
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-[var(--text)] space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {explanation.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setShowExplainModal(false)}
                className="btn-secondary py-1.5 px-4 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
