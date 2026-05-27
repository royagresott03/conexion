'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  { href: '/discover', icon: '🔥', label: 'Descubrir' },
  { href: '/matches', icon: '💖', label: 'Matches' },
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/profile', icon: '👤', label: 'Perfil' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--dark-3)' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <Link href="/discover" className="font-display text-xl font-bold gradient-text-rose">Conexión</Link>
        <Link href="/profile" className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          👤
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)' }}>
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 flex-1 py-3 text-xs font-medium transition-colors"
              style={{ color: active ? 'var(--rose)' : 'var(--text-muted)' }}>
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg,var(--rose),var(--plum))' }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
