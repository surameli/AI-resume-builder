/**
 * LoadingSpinner — used for full-page loading states and button spinners.
 */
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-[3px]',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full border-brand-border border-t-brand-orange animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

/** Full-page centered loading screen */
export const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg gap-4">
    <LoadingSpinner size="xl" />
    <p className="text-brand-muted text-sm animate-pulse">Loading…</p>
  </div>
);
