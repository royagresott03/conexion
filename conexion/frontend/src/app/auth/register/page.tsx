'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    email: '',
    password: '',
    password2: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsLoading(true);
    try {
      await register(form);
      toast.success('¡Cuenta creada! Ahora verifica tu identidad');
      router.push('/auth/verify');
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      const data = error.response?.data;
      if (data) {
        const msg = Object.values(data).flat().join(' ');
        toast.error(msg || 'Error al crear la cuenta');
      } else {
        toast.error('Error al crear la cuenta');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💫</div>
          <h1 className="font-display text-3xl font-bold gradient-text-rose">Crear cuenta</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Únete a Conexión y encuentra personas increíbles
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
                className="input-dark rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                className="input-dark rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                required
                className="input-dark rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmar contraseña</label>
              <input
                type="password"
                name="password2"
                value={form.password2}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                required
                className="input-dark rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div className="p-3 rounded-xl text-xs"
              style={{ background: 'rgba(199,125,255,0.08)', border: '1px solid rgba(199,125,255,0.2)', color: 'var(--text-muted)' }}>
              🛡️ Después de registrarte deberás verificar tu identidad con tu cédula. Es obligatorio.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50">
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="font-semibold" style={{ color: 'var(--rose)' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}