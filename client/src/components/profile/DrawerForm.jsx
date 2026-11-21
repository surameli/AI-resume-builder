/**
 * DrawerForm — slide-in panel from the right used for Add/Edit forms.
 * Keeps the main profile view visible while editing.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const DrawerForm = ({ open, title, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />

        {/* Drawer panel */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-modal z-50
                     flex flex-col overflow-hidden"
          aria-label={title}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
            <h2 className="font-semibold text-brand-text text-base">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>
);

export default DrawerForm;
