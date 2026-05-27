'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface FormData { email: string; password: string; }

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success('¡Bienvenido/a de vuelta! 👋');
      router.push('/discover');
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { error?: string } } })?.response?.data;
      toast.error(errorData?.error || 'Credenciales incorrectas.');
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold gradient-text-rose">Conexión</Link>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Inicia sesión en tu cuenta</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-display text-2xl font-bold mb-6">Bienvenido/a</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                {...register('email', { required: 'El email es requerido' })}
                type="email"
                placeholder="tu@email.com"
                className="input-dark rounded-xl px-4 py-3 text-sm"
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--rose)' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Contraseña</label>
              <input
                {...register('password', { required: 'La contraseña es requerida' })}
                type="password"
                placeholder="Tu contraseña"
                className="input-dark rounded-xl px-4 py-3 text-sm"
              />
              {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--rose)' }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 rounded-xl mt-2 text-sm">
              {isLoading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" className="font-semibold" style={{ color: 'var(--rose-light)' }}>
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
