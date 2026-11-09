/**
 * ComingSoon — placeholder for pages being built in upcoming phases.
 * Shows the feature name and the phase it's coming in.
 */
import { Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

const ComingSoon = ({ feature = 'This feature', phase = 'an upcoming phase' }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
    <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center">
      <Construction className="w-8 h-8 text-brand-orange" />
    </div>
    <h2 className="text-xl font-semibold text-brand-text">{feature}</h2>
    <p className="text-brand-muted text-sm max-w-xs">
      This section is being built in {phase}. Check back soon!
    </p>
    <Link to="/dashboard" className="btn-secondary btn-sm mt-2">
      ← Back to dashboard
    </Link>
  </div>
);

export default ComingSoon;
