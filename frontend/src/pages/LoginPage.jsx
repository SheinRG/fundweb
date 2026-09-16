import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Boxes, Eye, EyeOff, ArrowRight, ShieldCheck, Workflow, PackageCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Field } from '../components/ui/Field';

const demoAccounts = [
  { role: 'Administrator', email: 'admin@fundsweb.com', password: 'admin123', accent: 'from-indigo-500 to-violet-600' },
  { role: 'Sales', email: 'sales@fundsweb.com', password: 'sales123', accent: 'from-sky-500 to-cyan-500' },
];

const features = [
  { icon: Workflow, title: 'End-to-end workflow', text: 'From customer enquiry to dispatch, managed in one place.' },
  { icon: PackageCheck, title: 'Live inventory', text: 'Concurrency-safe reservations with real stock visibility.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Granular permissions for admin and sales teams.' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/enquiries');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <div className="relative hidden w-[46%] overflow-hidden border-r border-white/5 lg:block">
        <div className="absolute -left-32 -top-40 size-[28rem] rounded-full bg-indigo-600/25 blur-[110px]" />
        <div className="absolute -bottom-40 left-1/3 size-[26rem] rounded-full bg-violet-600/20 blur-[110px]" />
        <div className="absolute right-0 top-1/3 size-[20rem] rounded-full bg-sky-500/10 blur-[100px]" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/50">
              <Boxes size={20} strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-white">FundsWeb</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Supply Chain ERP
              </p>
            </div>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-md text-4xl font-bold leading-[1.1] tracking-tight text-zinc-50"
            >
              Manufacture with clarity. Supply with confidence.
            </motion.h1>

            <div className="mt-10 space-y-5">
              {features.map(({ icon: Icon, title, text }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                  className="flex items-start gap-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-indigo-300 ring-1 ring-white/10">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{title}</p>
                    <p className="mt-0.5 max-w-sm text-sm leading-relaxed text-zinc-400">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-white/5 pt-6">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10">
              16
            </span>
            <p className="text-xs text-zinc-500">
              PostgreSQL 16 <span className="mx-1 text-zinc-700">/</span> React 19{' '}
              <span className="mx-1 text-zinc-700">/</span> Express 5
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          <div className="absolute right-0 top-0 size-80 translate-x-1/3 -translate-y-1/3 rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/40">
              <Boxes size={20} strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-white">FundsWeb</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Supply Chain ERP
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl shadow-zinc-950/40 sm:p-9">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">Welcome back</h2>
              <p className="mt-1 text-sm text-zinc-500">Sign in to your workspace to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700"
                >
                  {error}
                </motion.p>
              )}

              <Field label="Email address" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="field pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                loadingText="Signing in..."
                className="w-full"
                icon={loading ? undefined : ArrowRight}
              >
                Sign in
              </Button>
            </form>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
            className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Demo credentials
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => (
                <motion.button
                  key={acc.email}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                    setError('');
                  }}
                  className="group flex flex-col rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-left transition-colors hover:border-white/20"
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
                    <span
                      className={`size-2 rounded-full bg-gradient-to-br ${acc.accent}`}
                    />
                    {acc.role}
                  </span>
                  <span className="mt-1 truncate font-mono text-[10px] text-zinc-400 group-hover:text-zinc-300">
                    {acc.email}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}