/**
 * JobAnalyzer page
 *
 * Workflow:
 *   1. User pastes a job description into the textarea (or selects a saved job).
 *   2. Click "Analyze with AI" → calls POST /api/ai/analyze-job.
 *   3. AI-extracted data is displayed in editable fields organized by category.
 *   4. User can edit any field before saving.
 *   5. Click "Save" → calls POST /api/jobs/save-analyzed.
 *   6. Saved jobs appear in the sidebar list and can be reused for resume generation.
 *
 * Also shows previously saved job descriptions with delete + view options.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Sparkles, Save, Trash2, ChevronRight, FileSearch,
  Building2, MapPin, Clock, GraduationCap, Wrench, Heart,
  ListChecks, Award, Tag, DollarSign, FileText, ArrowLeft, Edit3,
} from 'lucide-react';
import Button         from '../../components/common/Button.jsx';
import Alert          from '../../components/common/Alert.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import ConfirmDialog  from '../../components/profile/ConfirmDialog.jsx';
import * as jobsService from '../../services/jobs.service.js';

// ─── Default empty extracted data structure ────────────────────────────────────

const EMPTY_EXTRACTED = {
  jobTitle: '',
  company: '',
  location: '',
  employmentType: '',
  remote: null,
  yearsOfExperience: '',
  educationRequirements: [],
  technicalSkills: [],
  softSkills: [],
  responsibilities: [],
  requiredQualifications: [],
  preferredQualifications: [],
  atsKeywords: [],
  salaryRange: '',
  summary: '',
};

// ─── Display helpers ──────────────────────────────────────────────────────────

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

/**
 * Renders an editable list of string items. Each item can be edited inline
 * or removed. New items can be added.
 */
const EditableList = ({ items, onChange, placeholder = 'Add item…', color = 'badge-blue' }) => {
  const [newItem, setNewItem] = useState('');

  const add = (e) => {
    if (e.key === 'Enter' && newItem.trim()) {
      e.preventDefault();
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const remove = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const edit = (idx, value) => {
    const next = [...items];
    next[idx] = value;
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 group">
          <input
            value={item}
            onChange={(e) => edit(idx, e.target.value)}
            className="form-input text-sm py-1.5 flex-1"
          />
          <button
            onClick={() => remove(idx)}
            className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <input
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        onKeyDown={add}
        placeholder={placeholder}
        className="form-input text-sm py-1.5"
      />
      <p className="form-hint">Press Enter to add</p>
    </div>
  );
};

/**
 * A labeled section within the analysis display.
 */
const AnalysisSection = ({ icon: Icon, title, children, color = 'text-brand-orange' }) => (
  <div className="border border-brand-border rounded-xl p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-text mb-3">
      <Icon className={`w-4 h-4 ${color}`} />
      {title}
    </h3>
    {children}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const JobAnalyzer = () => {
  const [rawText,       setRawText]       = useState('');
  const [analyzing,     setAnalyzing]     = useState(false);
  const [analysis,      setAnalysis]      = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [savedJobs,     setSavedJobs]     = useState([]);
  const [loadingJobs,   setLoadingJobs]   = useState(true);
  const [deleting,      setDeleting]      = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingTitle,  setEditingTitle]  = useState('');

  // ── Fetch saved jobs on mount ─────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data } = await jobsService.getJobs();
      setSavedJobs(data.data.jobs);
    } catch {
      setError('Failed to load saved jobs.');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Analyze ──────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (rawText.trim().length < 50) {
      setError('Please paste a longer job description (at least 50 characters).');
      return;
    }

    setError('');
    setAnalyzing(true);
    setAnalysis(null);
    setSuccessMsg('');

    try {
      const { data } = await jobsService.analyzeJob(rawText.trim());
      const extracted = { ...EMPTY_EXTRACTED, ...data.data.extractedData };
      setAnalysis(extracted);
      // Auto-fill the title from the job title if available
      if (extracted.jobTitle && !editingTitle) {
        setEditingTitle(extracted.jobTitle);
      }
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Save analyzed job ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!analysis || !editingTitle.trim()) {
      setError('Please provide a title before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await jobsService.saveAnalyzedJob({
        title: editingTitle.trim(),
        company: analysis.company || null,
        rawText: rawText.trim(),
        extractedData: analysis,
      });
      setSuccessMsg('Job description saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadJobs();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Load a saved job for viewing ────────────────────────────────────────────
  const handleViewJob = async (jobId) => {
    setError('');
    try {
      const { data } = await jobsService.getJob(jobId);
      const job = data.data.job;
      setRawText(job.rawText);
      setAnalysis({ ...EMPTY_EXTRACTED, ...(job.extractedData ?? {}) });
      setEditingTitle(job.title);
    } catch (err) {
      setError('Failed to load this job description.');
    }
  };

  // ── Delete a saved job ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await jobsService.deleteJob(deleting.id);
      setSavedJobs(prev => prev.filter(j => j.id !== deleting.id));
    } catch {
      setError('Failed to delete job description.');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  };

  // ── Update a field in the analysis state ────────────────────────────────────
  const updateField = (field, value) => {
    setAnalysis(prev => ({ ...prev, [field]: value }));
  };

  // ── Start over ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setRawText('');
    setAnalysis(null);
    setEditingTitle('');
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Job Description Analyzer</h1>
        <p className="text-brand-muted text-sm mt-1">
          Paste a job vacancy and let AI extract the key requirements, skills, and ATS keywords.
        </p>
      </div>

      {error      && <Alert type="error"   message={error}      dismissible className="mb-4" />}
      {successMsg && <Alert type="success" message={successMsg} dismissible className="mb-4" />}

      <div className="flex gap-6 items-start">
        {/* ── Left: Saved jobs sidebar ── */}
        <aside className="w-64 shrink-0 hidden lg:block sticky top-6">
          <div className="card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-text mb-3">
              <FileSearch className="w-4 h-4 text-brand-orange" />
              Saved Jobs ({savedJobs.length})
            </h2>

            {loadingJobs ? (
              <div className="py-4 flex justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : savedJobs.length === 0 ? (
              <p className="text-xs text-brand-muted text-center py-4">
                No saved jobs yet. Analyze and save a job description to see it here.
              </p>
            ) : (
              <ul className="space-y-1 max-h-[500px] overflow-y-auto">
                {savedJobs.map((job) => (
                  <li key={job.id}>
                    <div className="group flex items-center gap-1">
                      <button
                        onClick={() => handleViewJob(job.id)}
                        className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-brand-bg transition-colors text-left min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-text truncate">{job.title}</p>
                          <p className="text-xs text-brand-muted truncate">
                            {job.company ?? 'No company'} · {formatDate(job.updatedAt)}
                          </p>
                        </div>
                        {job.isAnalyzed && (
                          <Sparkles className="w-3 h-3 text-brand-orange shrink-0" title="AI analyzed" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleting(job)}
                        className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Right: Main content ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Step 1: Paste textarea */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-brand-text">
                <span className="w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs font-bold">1</span>
                Paste Job Description
              </h2>
              {analysis && (
                <button onClick={handleReset} className="btn-ghost btn-sm flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Start over
                </button>
              )}
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              placeholder="Paste the full job description here — including the job title, company name, responsibilities, requirements, and qualifications. The more complete the text, the better the AI analysis."
              className="form-input resize-y text-sm leading-relaxed"
              disabled={analyzing}
            />
            <p className="form-hint mt-2">
              {rawText.length} characters {rawText.length > 0 && rawText.length < 50 && (
                <span className="text-red-500">· Need at least 50 characters</span>
              )}
            </p>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleAnalyze}
                variant="primary"
                loading={analyzing}
                disabled={rawText.trim().length < 50}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {analyzing ? 'Analyzing…' : 'Analyze with AI'}
              </Button>
            </div>
          </div>

          {/* Step 2: Analysis results (animated slide-in) */}
          <AnimatePresence>
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Title bar */}
                <div className="card p-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</span>
                  <h2 className="flex-1 text-base font-semibold text-brand-text">Review & Edit Extracted Data</h2>
                  <Sparkles className="w-4 h-4 text-brand-orange" />
                </div>

                {/* Save bar — title input + save button */}
                <div className="card p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <label className="form-label">Job title (for your reference)</label>
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        placeholder="e.g. Senior Frontend Engineer at Google"
                        className="form-input"
                      />
                    </div>
                    <Button onClick={handleSave} variant="primary" loading={saving} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save Job'}
                    </Button>
                  </div>
                </div>

                {/* ── Core fields row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="card p-4 space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-text">
                      <Briefcase className="w-4 h-4 text-brand-orange" /> Job Details
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="form-label">Job Title</label>
                        <input value={analysis.jobTitle ?? ''} onChange={(e) => updateField('jobTitle', e.target.value)} className="form-input text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="form-label">Company</label>
                        <input value={analysis.company ?? ''} onChange={(e) => updateField('company', e.target.value)} className="form-input text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="form-label flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</label>
                          <input value={analysis.location ?? ''} onChange={(e) => updateField('location', e.target.value)} className="form-input text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="form-label flex items-center gap-1"><Clock className="w-3 h-3" /> Type</label>
                          <input value={analysis.employmentType ?? ''} onChange={(e) => updateField('employmentType', e.target.value)} className="form-input text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="form-label flex items-center gap-1"><Clock className="w-3 h-3" /> Experience</label>
                          <input value={analysis.yearsOfExperience ?? ''} onChange={(e) => updateField('yearsOfExperience', e.target.value)} className="form-input text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="form-label flex items-center gap-1"><DollarSign className="w-3 h-3" /> Salary</label>
                          <input value={analysis.salaryRange ?? ''} onChange={(e) => updateField('salaryRange', e.target.value)} className="form-input text-sm" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={analysis.remote ?? false} onChange={(e) => updateField('remote', e.target.checked)} className="w-4 h-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange" />
                        <span className="text-sm text-brand-text">Remote / Hybrid available</span>
                      </label>
                    </div>
                  </div>

                  <div className="card p-4 space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-text">
                      <FileText className="w-4 h-4 text-brand-orange" /> Summary
                    </h3>
                    <textarea
                      value={analysis.summary ?? ''}
                      onChange={(e) => updateField('summary', e.target.value)}
                      rows={8}
                      placeholder="AI summary of the role…"
                      className="form-input text-sm resize-none"
                    />
                  </div>
                </div>

                {/* ── Skills row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnalysisSection icon={Wrench} title="Technical Skills" color="text-blue-600">
                    <EditableList items={analysis.technicalSkills ?? []} onChange={(v) => updateField('technicalSkills', v)} placeholder="Add technical skill…" />
                  </AnalysisSection>

                  <AnalysisSection icon={Heart} title="Soft Skills" color="text-purple-600">
                    <EditableList items={analysis.softSkills ?? []} onChange={(v) => updateField('softSkills', v)} placeholder="Add soft skill…" />
                  </AnalysisSection>
                </div>

                {/* ── Requirements row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnalysisSection icon={GraduationCap} title="Education Requirements" color="text-green-600">
                    <EditableList items={analysis.educationRequirements ?? []} onChange={(v) => updateField('educationRequirements', v)} placeholder="Add education requirement…" />
                  </AnalysisSection>

                  <AnalysisSection icon={ListChecks} title="Responsibilities" color="text-brand-orange">
                    <EditableList items={analysis.responsibilities ?? []} onChange={(v) => updateField('responsibilities', v)} placeholder="Add responsibility…" />
                  </AnalysisSection>
                </div>

                {/* ── Qualifications row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnalysisSection icon={Award} title="Required Qualifications" color="text-red-500">
                    <EditableList items={analysis.requiredQualifications ?? []} onChange={(v) => updateField('requiredQualifications', v)} placeholder="Add required qualification…" />
                  </AnalysisSection>

                  <AnalysisSection icon={Award} title="Preferred Qualifications" color="text-yellow-600">
                    <EditableList items={analysis.preferredQualifications ?? []} onChange={(v) => updateField('preferredQualifications', v)} placeholder="Add preferred qualification…" />
                  </AnalysisSection>
                </div>

                {/* ── ATS Keywords (most important for resume matching) ── */}
                <AnalysisSection icon={Tag} title="ATS Keywords" color="text-brand-orange">
                  <div className="flex flex-wrap gap-2">
                    {(analysis.atsKeywords ?? []).map((keyword, idx) => (
                      <span key={idx} className="badge badge-orange flex items-center gap-1.5 pr-1">
                        {keyword}
                        <button onClick={() => updateField('atsKeywords', analysis.atsKeywords.filter((_, i) => i !== idx))} className="hover:opacity-70" aria-label={`Remove ${keyword}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      placeholder="Add keyword + Enter"
                      className="border border-brand-border rounded-full px-3 py-0.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          e.preventDefault();
                          updateField('atsKeywords', [...(analysis.atsKeywords ?? []), e.target.value.trim()]);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <p className="form-hint mt-2">These keywords will be matched against your resume in the ATS checker.</p>
                </AnalysisSection>

                {/* Save button at bottom too */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} variant="primary" loading={saving} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save Job Description'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete job description?"
        message={deleting ? `Remove "${deleting.title}"? This cannot be undone.` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
};

export default JobAnalyzer;
