/**
 * Alert component for error, success, warning, and info messages.
 */
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const icons = {
  error:   AlertCircle,
  success: CheckCircle2,
  info:    Info,
  warning: AlertTriangle,
};

export const Alert = ({ type = 'info', message, dismissible = false, className = '' }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !message) return null;

  const Icon = icons[type];

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span className="flex-1 text-sm">{message}</span>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
