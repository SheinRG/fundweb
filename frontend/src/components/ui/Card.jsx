import { motion } from 'framer-motion';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`card-surface ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, eyebrow, icon: Icon, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <Icon size={17} strokeWidth={2} />
          </span>
        )}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, motionProps }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
      {...motionProps}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-[28px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'indigo' }) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    zinc: 'bg-zinc-100 text-zinc-600',
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="card-surface flex items-start gap-4 px-5 py-4"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
      >
        <Icon size={19} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-0.5 font-mono text-2xl font-semibold tracking-tight text-zinc-900">
          {value}
        </p>
        {sub && <p className="mt-0.5 truncate text-xs text-zinc-400">{sub}</p>}
      </div>
    </motion.div>
  );
}