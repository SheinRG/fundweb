import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const tones = {
  error: {
    wrap: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-500" />,
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />,
  },
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: <Info size={17} className="mt-0.5 shrink-0 text-sky-500" />,
  },
};

export function Alert({ tone = 'info', children, onDismiss }) {
  const t = tones[tone] || tones.info;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${t.wrap}`}
    >
      {t.icon}
      <span className="flex-1 leading-snug">{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-current opacity-50 transition hover:opacity-80"
        >
          <X size={15} />
        </button>
      )}
    </motion.div>
  );
}

export function Field({ label, hint, required, htmlFor, className = '', children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-zinc-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}