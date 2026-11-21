/**
 * ItemCard — renders one record (experience, education, etc.) in a list.
 * Provides Edit and Delete action buttons.
 * The drag handle is rendered when draggable=true (used for reorder).
 */
import { Pencil, Trash2, GripVertical } from 'lucide-react';

const ItemCard = ({
  children,
  onEdit,
  onDelete,
  draggable = false,
  dragHandleProps = {},
  deleting = false,
}) => {
  return (
    <div className="group flex items-start gap-3 p-4 rounded-xl border border-brand-border bg-white hover:border-brand-orange/30 hover:shadow-soft transition-all">
      {/* Drag handle */}
      {draggable && (
        <div
          {...dragHandleProps}
          className="mt-1 cursor-grab active:cursor-grabbing text-brand-border hover:text-brand-muted transition-colors shrink-0"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-orange hover:bg-brand-orange/10 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
