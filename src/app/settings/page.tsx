'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  User,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  Trash2,
  LogOut,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Laptop,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/firebase/authContext';
import { exportAllUserData, deleteAllUserData } from '@/lib/firebase/store';
import { ThemeMode, ChatMode } from '@/types';

export default function SettingsPage() {
  const { user, profile, updateProfileData, signOut, getIdToken } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [theme, setTheme] = useState<ThemeMode>(profile?.theme || 'dark');
  const [defaultChatMode, setDefaultChatMode] = useState<ChatMode>(profile?.defaultChatMode || 'flexible');
  const [soundEffects, setSoundEffects] = useState<boolean>(profile?.soundEffects ?? true);
  const [reducedAnimations, setReducedAnimations] = useState<boolean>(profile?.reducedAnimations ?? false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Connection Test state
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any>(null);

  const handleSaveProfile = async () => {
    await updateProfileData({
      displayName,
      theme,
      defaultChatMode,
      soundEffects,
      reducedAnimations,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch (e: any) {
      alert('Gagal melakukan tes koneksi AI: ' + e.message);
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const data = await exportAllUserData(user.uid);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BelajarQuest_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Gagal mengekspor data: ' + e.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmText = prompt(
      'Ketik "HAPUS" untuk mengonfirmasi penghapusan seluruh data dan akun BelajarQuest Anda:'
    );
    if (confirmText === 'HAPUS') {
      await deleteAllUserData(user.uid);
      await signOut();
      router.push('/login');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--primary)]" /> Pengaturan Sistem
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Konfigurasi preferensi profil, tema antarmuka, mode tutor AI, dan diagnostik koneksi.
          </p>
        </div>

        {/* Profile Card */}
        <div className="quest-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--primary)]" /> Profil Pengguna
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">
                Nama Tampilan
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] font-medium transition"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">
                Email Terdaftar
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--muted)] opacity-70 cursor-not-allowed font-mono"
              />
            </div>
          </div>
        </div>

        {/* Display & Sound Settings */}
        <div className="quest-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-[var(--primary)]" /> Tampilan & Antarmuka
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Theme Mode */}
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1.5">
                Tema Antarmuka
              </label>
              <div className="flex gap-1.5 bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)]">
                {[
                  { mode: 'dark', label: 'Gelap', icon: Moon },
                  { mode: 'light', label: 'Terang', icon: Sun },
                  { mode: 'system', label: 'Sistem', icon: Laptop },
                ].map((item) => {
                  const IconC = item.icon;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setTheme(item.mode as ThemeMode)}
                      className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                        theme === item.mode
                          ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <IconC className="w-3.5 h-3.5" /> {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Chat Mode */}
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1.5">
                Mode Tutor AI Default
              </label>
              <select
                value={defaultChatMode}
                onChange={(e) => setDefaultChatMode(e.target.value as ChatMode)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)] focus:outline-hidden focus:border-[var(--primary)] font-medium"
              >
                <option value="strict">Ketat (Hanya berdasarkan materi catatan)</option>
                <option value="flexible">Fleksibel (Utamakan materi + wawasan luar)</option>
                <option value="free">Bebas (Asisten belajar umum)</option>
              </select>
            </div>
          </div>

          {/* Sound & Animation Toggles */}
          <div className="pt-2 flex flex-col sm:flex-row gap-4 text-xs">
            <label className="flex items-center gap-2 text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)]"
              />
              <span>Efek suara audio synthesize</span>
            </label>

            <label className="flex items-center gap-2 text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                checked={reducedAnimations}
                onChange={(e) => setReducedAnimations(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)]"
              />
              <span>Kurangi animasi dan efek konfeti</span>
            </label>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="btn-primary text-xs py-2 px-5 font-semibold"
            >
              Simpan Pengaturan
            </button>
            {saveSuccess && (
              <span className="text-xs text-[var(--success)] flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pengaturan berhasil disimpan
              </span>
            )}
          </div>
        </div>

        {/* AI Multi-Provider Connection Status & Test */}
        <div className="quest-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--primary)]" /> Multi-Provider AI Fallback
              </h3>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Failover otomatis antara Google Gemini, Groq, Cerebras, dan OpenRouter.
              </p>
            </div>

            <button
              onClick={handleTestAiConnection}
              disabled={isTestingAi}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {isTestingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menguji...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[var(--reward)]" /> Uji Koneksi
                </>
              )}
            </button>
          </div>

          {/* Test Results Output */}
          {aiTestResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {Object.keys(aiTestResult.testResults || {}).map((providerName) => {
                const res = aiTestResult.testResults[providerName];
                const isOk = res.status === 'healthy';
                const isCooldown = res.status === 'cooldown';

                return (
                  <div
                    key={providerName}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      isOk
                        ? 'bg-[var(--surface-2)] border-[var(--success)]/40 text-[var(--text)]'
                        : isCooldown
                        ? 'bg-[var(--surface-2)] border-[var(--reward)]/40 text-[var(--text)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-semibold uppercase tracking-wider block text-[11px]">
                        {providerName}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">{res.message}</span>
                    </div>

                    {isOk && (
                      <span className="font-mono font-bold text-[11px] text-[var(--success)]">
                        {res.latencyMs}ms
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Management & Danger Zone */}
        <div className="quest-card p-5 space-y-4">
          <h3 className="text-xs font-semibold text-[var(--danger)] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" /> Manajemen Data & Akun
          </h3>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportData}
              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Ekspor Data (JSON)
            </button>

            <button
              onClick={() => signOut()}
              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar Sesi
            </button>

            <button
              onClick={handleDeleteAccount}
              className="text-xs py-2 px-3.5 rounded-lg border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition flex items-center gap-1.5 ml-auto font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Akun & Data
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
