import type { ReactNode } from 'react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
}

export function LoadingState({
  message = 'Initializing telemetry feed...',
  submessage,
}: LoadingStateProps) {
  return (
    <div className="state-box loading-state">
      <div className="radar-spinner">
        <div className="radar-sweep" />
      </div>
      <div className="state-title">{message}</div>
      {submessage && <div className="state-desc">{submessage}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  actionText?: string;
}

export function ErrorState({
  title = 'System Warning / Offline',
  message,
  onRetry,
  actionText = 'Retry Connection',
}: ErrorStateProps) {
  return (
    <div className="state-box error-state">
      <div className="state-icon alert-icon">⚠</div>
      <div className="state-title">{title}</div>
      <div className="state-desc">{message}</div>
      {onRetry && (
        <button className="btn btn-primary btn-sm" onClick={onRetry} type="button">
          ↻ {actionText}
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message: string;
  detail?: string;
  action?: ReactNode;
  icon?: string;
}

export function EmptyState({
  title = 'No Data Available',
  message,
  detail,
  action,
  icon = '◈',
}: EmptyStateProps) {
  return (
    <div className="state-box empty-state">
      <div className="state-icon">{icon}</div>
      <div className="state-title">{title}</div>
      <div className="state-desc-primary">{message}</div>
      {detail && <div className="state-desc">{detail}</div>}
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}
