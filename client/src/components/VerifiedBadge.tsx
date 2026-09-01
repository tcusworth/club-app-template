import { CheckCircle, Clock } from 'lucide-react';

interface VerifiedBadgeProps {
  status?: string | null;
  size?: 'sm' | 'md';
  showPending?: boolean;
}

export function VerifiedBadge({ status, size = 'sm', showPending = false }: VerifiedBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-0.5 gap-1';
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  if (status === 'verified') {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-medium ${sizeClasses}`}>
        <CheckCircle className={iconSize} />
        Verified
      </span>
    );
  }

  if (status === 'pending' && showPending) {
    return (
      <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 font-medium ${sizeClasses}`}>
        <Clock className={iconSize} />
        Pending
      </span>
    );
  }

  return null;
}
