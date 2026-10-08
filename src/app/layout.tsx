import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/authContext';

export const metadata: Metadata = {
  title: 'BelajarQuest - Petualangan Belajar Mandiri AI',
  description: 'Ubah materi belajarmu menjadi bab interaktif, kuis game, kartu geser, flashcard SM-2, dan AI tutor cerdas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#FAF7F2] dark:bg-[#0E111B] text-[#2D3142] dark:text-[#F3F4F6]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
