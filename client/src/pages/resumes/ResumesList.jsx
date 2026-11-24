/**
 * ResumesList page — displays all saved resumes with actions.
 * Users can: view, duplicate, delete resumes. Click a resume to edit it
 * (editor comes in Phase 5).
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Copy, Trash2, ChevronRight, Sparkles, Clock,
  FileEdit, AlertCircle,
} from 'lucide-react';
import Button         from '../../components/common/Button.jsx';
import Alert          from '../../components/common/Alert.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import ConfirmDialog  from '../../components/profile/ConfirmDialog.jsx';
import * as resumeService from '../../services/resumes.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

// ─── Main component ─────────────────────────────────────────────────────────────

const ResumesList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [resumes,       setResumes]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [successMsg,    setSuccessMsg]    = useState(location.state?.successMessage || '');
  const [deleting,      setDeleting]      = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [duplicating,   setDuplicating]   = useState(null);

  // ── Fetch resumes on mount ──────────────────────────────────────────────────
  const loadResumes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await resumeService.getResumes();
      setResumes(data.data.resumes);
    } catch {
      setError('Failed to load resumes. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
    // Clear success message after 3 seconds
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [loadResumes, successMsg]);

  // ── Duplicate a resume ──────────────────────────────────────────────────────
  const handleDuplicate = async (id) => {
    setDuplicating(id);
    try {
      await resumeService.duplicateResume(id);
      await loadResumes();
      setSuccessMsg('Resume duplicated successfully!');
    } catch {
      setError('Failed to duplicate resume.');
    } finally {
      setDuplicating(null);
    }
  };

  // ── Delete a resume ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await resumeService.deleteResume(deleting.id);
      setResumes(prev => prev.filter(r => r.id !== deleting.id));
      setSuccessMsg('Resume deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to delete resume.');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">My Resumes</h1>
          <p className="text-brand-muted text-sm mt-1">
            {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'} saved
          </p>
        </div>
        <Link to="/resume/create">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Resume
          </Button>
        </Link>
      </div>

      {error      && <Alert type="error"   message={error}      dismissible className="mb-4" />}
      {successMsg && <Alert type="success" message={successMsg} dismissible className="mb-4" />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && resumes.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-brand-orange" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-brand-text">No resumes yet</h2>
            <p className="text-sm text-brand-muted mt-1 max-w-xs">
              Create your first AI-generated resume. It only takes a few minutes.
            </p>
          </div>
          <Link to="/resume/create">
            <Button variant="primary" className="flex items-center gap-2 mt-2">
              <Sparkles className="w-4 h-4" /> Create your first resume
            </Button>
          </Link>
        </div>
      )}

      {/* Resume cards */}
      {!loading && resumes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume, idx) => (
            <motion.div
              key={resume.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <div className="card-hover group h-full flex flex-col">
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 bg-brand-orange/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-brand-orange" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-brand-text truncate">{resume.title}</h3>
                      <p className="text-xs text-brand-muted truncate">
                        {resume.template?.name ?? 'Default template'}
                      </p>
                    </div>
                  </div>
                  {resume.jobDescription && (
                    <span className="badge badge-orange text-[10px] shrink-0 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Tailored
                    </span>
                  )}
                </div>

                {/* Meta info */}
                <div className="space-y-1 text-xs text-brand-muted mb-4 flex-1">
                  {resume.jobDescription && (
                    <p className="flex items-center gap-1.5">
                      <FileEdit className="w-3 h-3" />
                      <span className="truncate">For: {resume.jobDescription.title}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Updated {formatDate(resume.updatedAt)}
                  </p>
                  {resume._count?.versions > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {resume._count.versions} versions saved
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-brand-border">
                  <button
                    onClick={() => navigate(`/resume/${resume.id}/edit`)}
                    className="btn-ghost btn-sm flex-1"
                    title="Edit resume"
                  >
                    <FileEdit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(resume.id)}
                    disabled={duplicating === resume.id}
                    className="btn-ghost btn-sm"
                    title="Duplicate"
                  >
                    {duplicating === resume.id
                      ? <LoadingSpinner size="sm" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button
                    onClick={() => setDeleting(resume)}
                    className="btn-ghost btn-sm hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete resume?"
        message={deleting ? `Permanently delete "${deleting.title}"? This will also remove all saved versions. This cannot be undone.` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
};

export default ResumesList;
