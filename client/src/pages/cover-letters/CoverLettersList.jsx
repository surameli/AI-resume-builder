/**
 * CoverLettersList — grid of all saved cover letters with actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Plus, Trash2, Pencil, Sparkles, Clock, Briefcase } from 'lucide-react';
import Button          from '../../components/common/Button.jsx';
import Alert           from '../../components/common/Alert.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import ConfirmDialog   from '../../components/profile/ConfirmDialog.jsx';
import * as clService  from '../../services/coverLetters.service.js';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const TONE_COLORS = {
  professional: 'badge-blue',
  confident:    'badge-orange',
  enthusiastic: 'badge-green',
  concise:      'badge-gray',
};

const CoverLettersList = () => {
  const location = useLocation();
  const [coverLetters,  setCoverLetters]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [successMsg,    setSuccessMsg]    = useState(location.state?.successMessage || '');
  const [deleting,      setDeleting]      = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clService.getCoverLetters();
      setCoverLetters(data.data.coverLetters);
    } catch {
      setError('Failed to load cover letters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 3000); return () => clearTimeout(t); }
  }, [load]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await clService.deleteCoverLetter(deleting.id);
      setCoverLetters(p => p.filter(cl => cl.id !== deleting.id));
      setSuccessMsg('Cover letter deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { setError('Failed to delete.'); }
    finally { setDeleteLoading(false); setDeleting(null); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Cover Letters</h1>
          <p className="text-brand-muted text-sm mt-1">{coverLetters.length} saved</p>
        </div>
        <Link to="/cover-letters/create">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Cover Letter
          </Button>
        </Link>
      </div>

      {error      && <Alert type="error"   message={error}      dismissible className="mb-4" />}
      {successMsg && <Alert type="success" message={successMsg} dismissible className="mb-4" />}

      {loading && (
        <div className="flex justify-center min-h-[300px] items-center">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && coverLetters.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center">
            <Mail className="w-8 h-8 text-brand-orange" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-brand-text">No cover letters yet</h2>
            <p className="text-sm text-brand-muted mt-1 max-w-xs">
              Create an AI-powered cover letter tailored to a specific job in minutes.
            </p>
          </div>
          <Link to="/cover-letters/create">
            <Button variant="primary" className="flex items-center gap-2 mt-2">
              <Sparkles className="w-4 h-4" /> Create your first cover letter
            </Button>
          </Link>
        </div>
      )}

      {!loading && coverLetters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coverLetters.map((cl, idx) => (
            <motion.div
              key={cl.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
            >
              <div className="card-hover group flex flex-col h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-brand-orange/10 rounded-lg flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-brand-orange" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-brand-text truncate">{cl.title}</h3>
                    <span className={`badge ${TONE_COLORS[cl.tone] ?? 'badge-gray'} capitalize text-[10px] mt-0.5`}>
                      {cl.tone}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-brand-muted mb-4 flex-1">
                  {cl.jobDescription && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      {cl.jobDescription.title}{cl.jobDescription.company ? ` @ ${cl.jobDescription.company}` : ''}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {fmt(cl.updatedAt)}
                  </p>
                </div>

                <div className="flex gap-1 pt-3 border-t border-brand-border">
                  <Link to={`/cover-letters/${cl.id}/edit`} className="btn-ghost btn-sm flex-1 flex items-center justify-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Link>
                  <button onClick={() => setDeleting(cl)} className="btn-ghost btn-sm hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete cover letter?"
        message={deleting ? `Permanently delete "${deleting.title}"?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
};

export default CoverLettersList;
