import type { StreamStatus } from '../api/streamsApi';

interface StatusBadgeProps {
  status: StreamStatus | string;
  size?: 'sm' | 'md';
}

const STATUS_LABELS: Record<string, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  RECONNECTING: 'Reconnecting',
  ERROR: 'Error',
};

const STATUS_CSS: Record<string, string> = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();
  const cssClass = STATUS_CSS[normalized] ?? 'unknown';
  const label = STATUS_LABELS[normalized] ?? status;

  return (
    <span className={`badge ${cssClass} badge-${size}`}>
      <span className={`dot ${cssClass}`} />
      {label}
    </span>
  );
}
