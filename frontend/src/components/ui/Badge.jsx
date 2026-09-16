import { motion } from 'framer-motion';

export default function Badge({ tone, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${className} ${
        tone?.wrap || 'bg-zinc-100 text-zinc-600 ring-zinc-500/20'
      }`}
    >
      <motion.span
        layout
        className={`size-1.5 rounded-full ${tone?.dot || 'bg-zinc-400'}`}
      />
      {children}
    </span>
  );
}