'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Layers,
  GraduationCap,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Buat Catatan', href: '/notes/new', icon: PlusCircle, isPrimaryAction: true },
    { label: 'Mata Pelajaran', href: '/subjects', icon: BookOpen },
    { label: 'Review Kartu', href: '/review', icon: Layers },
    { label: 'Prediksi Ujian', href: '/exams', icon: GraduationCap },
    { label: 'Progres & Lencana', href: '/progress', icon: Award },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200 relative select-none shrink-0 ${
        collapsed ? 'w-16' : 'w-[240px]'
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-20 w-6 h-6 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--primary)] transition shadow-xs"
        title={collapsed ? 'Perluas Menu' : 'Ciutkan Menu'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className="flex-1 py-4 px-2.5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          if (item.isPrimaryAction && !collapsed) {
            return (
              <div key={item.href} className="pt-1 pb-2">
                <Link
                  href={item.href}
                  className="btn-primary w-full py-2 px-3 text-xs justify-start"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition relative ${
                isActive
                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)] font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-[var(--primary)] before:rounded-r'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
