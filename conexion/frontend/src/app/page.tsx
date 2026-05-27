'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push('/discover');
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen hero-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(13,13,13,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}>
        <span className="font-display text-2xl font-bold gradient-text-rose">Conexión</span>
        <div className="flex gap-3">
          <Link href="/auth/login"
            className="btn-ghost px-5 py-2 rounded-full text-sm font-medium">
            Iniciar sesión
          </Link>
          <Link href="/auth/register"
            className="btn-primary px-5 py-2 rounded-full text-sm">
            Crear cuenta
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--rose-light)' }}>
          ✦ 100% verificado · Solo personas reales
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-bold mb-5 leading-tight max-w-3xl gradient-text">
          Encuentra tu<br />Conexión Real
        </h1>

        <p className="text-lg max-w-lg mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          La única plataforma de citas con verificación de identidad obligatoria.
          Conecta sin miedo, conoce personas auténticas.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-12">
          <Link href="/auth/register"
            className="btn-primary px-8 py-3.5 rounded-full text-base shadow-lg"
            style={{ boxShadow: '0 8px 30px rgba(255,77,109,0.35)' }}>
            Comenzar gratis
          </Link>
          <Link href="/auth/login"
            className="btn-ghost px-8 py-3.5 rounded-full text-base">
            Ya tengo cuenta
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-8 justify-center p-6 rounded-2xl"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          {[
            { n: '180K+', l: 'Usuarios verificados' },
            { n: '94%', l: 'Tasa de seguridad' },
            { n: '47K', l: 'Matches este mes' },
            { n: '4.9★', l: 'Calificación' },
          ].map(({ n, l }) => (
            <div key={l} className="text-center">
              <div className="font-display text-3xl font-bold" style={{ color: 'var(--rose-light)' }}>{n}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="font-display text-3xl font-bold text-center mb-2">Por qué elegir Conexión</h2>
        <p className="text-center mb-8" style={{ color: 'var(--text-muted)' }}>La plataforma más segura del mercado hispano</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '🛡️', title: 'Verificación de identidad', desc: 'OCR + reconocimiento facial con tu cédula. Solo personas reales verificadas.' },
            { icon: '⚡', title: 'Match inteligente', desc: 'Algoritmo que analiza intereses, ubicación y afinidad para las mejores conexiones.' },
            { icon: '💬', title: 'Chat en tiempo real', desc: 'WebSockets para mensajería instantánea con indicadores de escritura.' },
            { icon: '🔥', title: 'Sistema de rachas', desc: 'Mantén la conexión con rachas diarias y alertas antes de que expiren.' },
            { icon: '🔒', title: 'Seguridad avanzada', desc: 'JWT, 2FA, encriptación y moderación automática 24/7.' },
            { icon: '🌙', title: 'Diseño premium', desc: 'Interfaz elegante adaptada a cualquier dispositivo con animaciones suaves.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass-card p-6 hover:scale-[1.02] transition-transform cursor-default"
              style={{ borderColor: 'var(--glass-border)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: 'linear-gradient(135deg, var(--rose), var(--plum))' }}>
                {icon}
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
