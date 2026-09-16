import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function FullScreen({ children }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50">{children}</div>;
}

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <FullScreen>
        <Loader2 size={26} className="animate-spin text-indigo-500" />
        <p className="text-sm text-zinc-400">Loading workspace...</p>
      </FullScreen>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <FullScreen>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-surface flex flex-col items-center gap-3 px-10 py-8"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldAlert size={22} />
          </span>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900">Access denied</p>
            <p className="mt-1 text-sm text-zinc-500">
              Your role does not include permission for this view.
            </p>
          </div>
        </motion.div>
      </FullScreen>
    );
  }

  return children;
}