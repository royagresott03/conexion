import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Conexión — Encuentra tu pareja real',
  description: 'La plataforma de citas con verificación de identidad. Solo personas reales.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen" style={{ background: 'var(--dark-2)' }}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1A2E',
              color: '#F0E6FF',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}
