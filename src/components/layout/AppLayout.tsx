'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { FocusTimer } from '../timer/FocusTimer';
import { LevelUpModal } from '../gamification/LevelUpModal';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] transition-colors">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-20 md:pb-8 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      <BottomNav />
      <FocusTimer />
      <LevelUpModal />
    </div>
  );
};
