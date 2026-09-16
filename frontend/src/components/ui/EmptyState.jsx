import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
        {Icon && <Icon size={22} strokeWidth={1.75} />}
      </span>
      <p className="mt-1 text-sm font-semibold text-zinc-700">{title}</p>
      {message && <p className="max-w-sm text-sm text-zinc-400">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </motion.div>
  );
}