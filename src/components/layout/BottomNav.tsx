'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Layers,
  Award,
  Settings,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mapel', href: '/subjects', icon: BookOpen },
    { label: 'Buat', href: '/notes/new', icon: PlusCircle, isMainAction: true },
    { label: 'Review', href: '/review', icon: Layers },
    { label: 'Progres', href: '/progress', icon: Award },
    { label: 'Setelan', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] px-1 py-1 flex items-center justify-around select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        if (item.isMainAction) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 text-center"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)] text-[#0B0F14] flex items-center justify-center font-bold shadow-xs">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--primary)] mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-1 px-2 transition ${
              isActive
                ? 'text-[var(--primary)] font-semibold'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
