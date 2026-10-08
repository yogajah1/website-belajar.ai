'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Plus,
  ChevronRight,
  Shield,
  Compass,
  Smile,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ChatMode, ChatSession, ChatMessage } from '@/types';
import { useAuth } from '@/lib/firebase/authContext';
import {
  getChatSessions,
  saveChatSession,
  getChatMessages,
  saveChatMessage,
} from '@/lib/firebase/store';

interface ChatPanelProps {
  noteId: string;
  chapterId?: string;
  currentChapterContent?: string;
  allChaptersContent?: string;
  onClose?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  noteId,
  chapterId,
  currentChapterContent = '',
  allChaptersContent = '',
  onClose,
}) => {
  const { user, profile, getIdToken } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [scope, setScope] = useState<'chapter' | 'note'>('chapter');
  const [chatMode, setChatMode] = useState<ChatMode>(profile?.defaultChatMode || 'flexible');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat sessions
  useEffect(() => {
    if (!user || !noteId) return;
    const loadSessions = async () => {
      const list = await getChatSessions(user.uid, noteId);
      setSessions(list);
      if (list.length > 0) {
        setActiveSession(list[0]);
      } else {
        createNewSession();
      }
    };
    loadSessions();
  }, [user, noteId]);

  // Load messages when active session changes
  useEffect(() => {
    if (!user || !activeSession) return;
    const loadMessages = async () => {
      const msgs = await getChatMessages(user.uid, activeSession.id);
      setMessages(msgs);
    };
    loadMessages();
  }, [user, activeSession]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const createNewSession = async () => {
    if (!user) return;
    const newSession: ChatSession = {
      id: 'chat_' + Date.now(),
      noteId,
      scope,
      chapterId: chapterId || null,
      title: `Diskusi ${sessions.length + 1}`,
      mode: chatMode,
      updatedAt: Date.now(),
    };
    await saveChatSession(user.uid, newSession);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    setMessages([]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isStreaming || !user || !activeSession) return;

    setInputMessage('');
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveChatMessage(user.uid, activeSession.id, userMsg);

    setIsStreaming(true);
    setStreamingContent('');

    try {
      const token = await getIdToken();
      const contextMaterial = scope === 'chapter' ? currentChapterContent : allChaptersContent;

      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: historyPayload,
          contextMaterial,
          mode: chatMode,
          scope,
        }),
      });

      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            const jsonStr = line.replace('data: ', '').trim();
            if (jsonStr) {
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setStreamingContent(accumulated);
                }
              } catch (e) {}
            }
          }
        }
      }

      const botMsg: ChatMessage = {
        id: 'msg_bot_' + Date.now(),
        role: 'assistant',
        content: accumulated || 'Maaf, saya tidak dapat merespons saat ini.',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
      await saveChatMessage(user.uid, activeSession.id, botMsg);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: 'Terjadi kendala saat menghubungi asisten AI. Silakan coba sesaat lagi.',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  // Speech to Text Dictation
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung input suara.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = profile?.sttLanguage || 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)] w-full max-w-md">
      {/* Top Header */}
      <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs text-[var(--text)] tracking-tight">
              AI Tutor
            </h3>
            <p className="text-[11px] text-[var(--muted)]">
              Diskusi materi terpadu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={createNewSession}
            className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition border border-transparent hover:border-[var(--border)]"
            title="Sesi Baru"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition md:hidden"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode & Scope Controls */}
      <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex flex-col gap-2.5">
        {/* 3 AI Modes Toggle */}
        <div className="flex items-center bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setChatMode('strict')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
              chatMode === 'strict'
                ? 'bg-[var(--surface)] text-[var(--danger)] shadow-xs font-semibold'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Ketat: Hanya menjawab dari isi materi"
          >
            <Shield className="w-3 h-3" /> Ketat
          </button>
          <button
            onClick={() => setChatMode('flexible')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
              chatMode === 'flexible'
                ? 'bg-[var(--primary)] text-slate-900 font-semibold shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Fleksibel: Utamakan materi + tandai luar materi"
          >
            <Compass className="w-3 h-3" /> Fleksibel
          </button>
          <button
            onClick={() => setChatMode('free')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
              chatMode === 'free'
                ? 'bg-[var(--surface)] text-[var(--success)] shadow-xs font-semibold'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Bebas: Seperti chatbot umum"
          >
            <Smile className="w-3 h-3" /> Bebas
          </button>
        </div>

        {/* Scope Toggle */}
        <div className="flex items-center justify-between text-xs px-0.5">
          <span className="text-[11px] text-[var(--muted)]">Cakupan:</span>
          <div className="flex gap-1 bg-[var(--surface-2)] p-0.5 rounded-md border border-[var(--border)]">
            <button
              onClick={() => setScope('chapter')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                scope === 'chapter'
                  ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Bab ini
            </button>
            <button
              onClick={() => setScope('note')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                scope === 'note'
                  ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Semua bab
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 && !streamingContent && (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3 text-[var(--muted)]">
              <Bot className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[var(--text)]">
              Konsultasi Materi
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-1 max-w-[220px] mx-auto leading-relaxed">
              Ketik pertanyaan atau gunakan mikrofon untuk bertanya seputar materi bab ini.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--primary)] text-slate-900 font-medium'
                  : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Live Streaming Chunk */}
        {isStreaming && streamingContent && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-md bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block w-1.5 h-3 bg-[var(--primary)] animate-pulse ml-0.5" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Speech to Text */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
        <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--primary)] rounded-xl px-2.5 py-1.5 transition">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isListening ? 'Mendengarkan suara...' : 'Tanyakan sesuatu...'}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-hidden"
          />

          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-1.5 rounded-lg transition ${
              isListening
                ? 'bg-[var(--danger)] text-white animate-pulse'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Input Suara (Speech to Text)"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isStreaming}
            className="p-1.5 rounded-lg bg-[var(--primary)] text-slate-900 hover:opacity-90 disabled:opacity-30 transition font-bold"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-center text-[var(--muted)] mt-2 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" /> Tanggapan AI perlu diverifikasi dengan materi referensi.
        </p>
      </div>
    </div>
  );
};
