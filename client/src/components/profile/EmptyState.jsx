/**
 * EmptyState — shown inside a SectionCard when the list is empty.
 */
const EmptyState = ({ icon: Icon, message, action }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-3">
    {Icon && (
      <div className="w-12 h-12 bg-brand-bg rounded-xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-brand-border" />
      </div>
    )}
    <p className="text-sm text-brand-muted text-center max-w-xs">{message}</p>
    {action}
  </div>
);

export default EmptyState;
