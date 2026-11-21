/**
 * SectionCard — consistent wrapper for every profile section.
 * Shows a header with title, icon, item count, and an "Add" button.
 * Content is rendered as children.
 */
import { Plus } from 'lucide-react';

const SectionCard = ({
  title,
  icon: Icon,
  count,
  onAdd,
  addLabel = 'Add',
  children,
  isEmpty,
  emptyState,
}) => {
  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 bg-brand-orange/10 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-brand-orange" />
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-brand-text">{title}</h2>
            {count !== undefined && (
              <p className="text-xs text-brand-muted">{count} {count === 1 ? 'item' : 'items'}</p>
            )}
          </div>
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {addLabel}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {isEmpty && emptyState ? emptyState : children}
    </div>
  );
};

export default SectionCard;
