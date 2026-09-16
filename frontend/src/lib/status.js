const tones = {
  sky: {
    wrap: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-500',
  },
  amber: {
    wrap: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  emerald: {
    wrap: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  rose: {
    wrap: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
  },
  indigo: {
    wrap: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    dot: 'bg-indigo-500',
  },
  violet: {
    wrap: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    dot: 'bg-violet-500',
  },
  zinc: {
    wrap: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
    dot: 'bg-zinc-400',
  },
};

const enquiryStatus = {
  NEW: tones.sky,
  QUOTED: tones.amber,
  WON: tones.emerald,
  LOST: tones.rose,
};

const quotationStatus = {
  DRAFT: tones.zinc,
  SENT: tones.amber,
  ACCEPTED: tones.emerald,
  REJECTED: tones.rose,
};

const orderStatus = {
  PENDING: tones.sky,
  CONFIRMED: tones.emerald,
  DISPATCHED: tones.violet,
  CANCELLED: tones.rose,
};

export const statusTone = {
  enquiry: (status) => enquiryStatus[status] || tones.zinc,
  quotation: (status) => quotationStatus[status] || tones.zinc,
  order: (status) => orderStatus[status] || tones.zinc,
};

export const availableTone = {
  low: tones.rose,
  medium: tones.amber,
  high: tones.emerald,
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();