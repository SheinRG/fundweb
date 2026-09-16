import { motion } from 'framer-motion';

export default function Badge({ tone, children, className = '' }) {
  const wrap =
    typeof tone === 'string'
      ? tone
      : tone?.wrap || 'bg-zinc-100 text-zinc-600 ring-zinc-500/20';
  const dotColor = (typeof tone === 'object' && tone?.dot) || 'bg-zinc-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${wrap} ${className}`}
    >
      {typeof tone === 'object' && (
        <motion.span layout className={`size-1.5 rounded-full ${dotColor}`} />
      )}
      {children}
    </span>
  );
}