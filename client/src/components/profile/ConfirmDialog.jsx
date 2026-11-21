/**
 * ConfirmDialog — small modal used before destructive actions (delete).
 * Keeps deletion confirmation co-located with the components that need it.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ open, title = 'Are you sure?', message, onConfirm, onCancel, loading }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50"
          onClick={onCancel}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{   opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                     w-full max-w-sm bg-white rounded-2xl shadow-modal p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 id="confirm-title" className="font-semibold text-brand-text">{title}</h3>
              {message && <p className="text-sm text-brand-muted mt-1">{message}</p>}
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <button onClick={onCancel} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button onClick={onConfirm} className="btn-danger" disabled={loading}>
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default ConfirmDialog;
