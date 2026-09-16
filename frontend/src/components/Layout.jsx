import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Inbox, FileText, Package, LogOut, Boxes } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/status';

const navItems = [
  { to: '/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/sales-orders', label: 'Sales Orders', icon: Package },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-20 flex-col border-r border-white/5 bg-zinc-950 md:w-64">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgb(99_102_241/0.22),transparent_60%)]" />

        <div className="relative flex items-center gap-3 px-4 py-6 md:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/40">
            <Boxes size={18} strokeWidth={2.25} />
          </span>
          <div className="hidden md:block">
            <p className="text-[15px] font-bold tracking-tight text-white">FundsWeb</p>
            <p className="eyebrow text-zinc-500">Supply ERP</p>
          </div>
        </div>

        <nav className="relative mt-2 flex-1 space-y-1 px-2.5 md:px-3">
          <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600 md:block">
            Workspace
          </p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={false}>
              {({ isActive }) => (
                <span
                  className={`group relative flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 md:justify-start ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  <span className="hidden md:inline">{label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative border-t border-white/5 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 text-xs font-semibold text-zinc-100 ring-1 ring-white/10">
              {initials(user?.name)}
            </span>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-[13px] font-medium text-zinc-100">{user?.name}</p>
              <p className="truncate text-xs text-zinc-500">{user?.role}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleLogout}
              title="Logout"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <LogOut size={17} />
            </motion.button>
          </div>
        </div>
      </aside>

      <main className="ml-20 p-5 sm:p-6 md:ml-64 lg:p-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}