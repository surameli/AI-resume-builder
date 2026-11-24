/**
 * ResumeEditor page
 *
 * Two-panel layout:
 *   Left  — editing forms with section tabs (summary, skills, experience, etc.)
 *   Right — live preview that updates in real-time
 *
 * Features:
 *   - Edit all resume sections inline
 *   - Template switching (changes preview layout, not content)
 *   - Settings: font, font size, accent color, margins, section order
 *   - Autosave (debounced PUT after content changes, 2-second delay)
 *   - Manual save button
 *   - Undo / redo (local history stack, 30 states)
 *   - Version history sidebar with restore
 *   - Duplicate resume
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Save, Undo2, Redo2, History, Copy, Eye,
  Briefcase, GraduationCap, Zap, FolderOpen, Award, Layout,
  ChevronUp, ChevronDown, Plus, Trash2, X, Sparkles,
  ArrowLeft, Palette,
} from 'lucide-react';
import Button          from '../../components/common/Button.jsx';
import Alert           from '../../components/common/Alert.jsx';
import { LoadingSpinner, PageLoader } from '../../components/common/LoadingSpinner.jsx';
import ResumePreview   from '../../components/resume/ResumePreview.jsx';
import * as resumeService from '../../services/resumes.service.js';
import { useAuth }     from '../../context/AuthContext.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_TABS = [
  { id: 'summary',        label: 'Summary',    icon: FileText },
  { id: 'skills',         label: 'Skills',      icon: Zap },
  { id: 'experiences',    label: 'Experience',  icon: Briefcase },
  { id: 'education',      label: 'Education',   icon: GraduationCap },
  { id: 'projects',       label: 'Projects',    icon: FolderOpen },
  { id: 'certifications', label: 'Certs',       icon: Award },
];

const FONT_OPTIONS    = ['Inter', 'Georgia', 'Times New Roman', 'Helvetica', 'Arial', 'Merriweather'];
const FONT_SIZES      = [10, 11, 12, 13, 14];
const ACCENT_COLORS   = ['#E58A45', '#2563eb', '#059669', '#7c3aed', '#dc2626', '#475569', '#111827'];
const TEMPLATES       = ['professional', 'modern', 'minimalist', 'technical', 'creative', 'executive', 'graduate', 'academic'];

const DEFAULT_SECTION_ORDER = ['summary', 'skills', 'experiences', 'education', 'projects', 'certifications', 'customSections'];

// ─── Helper ───────────────────────────────────────────────────────────────────

const isoDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
};

// ─── Main component ───────────────────────────────────────────────────────────

const ResumeEditor = () => {
  const { id: resumeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Loading / data ─────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true);
  const [resume,           setResume]           = useState(null);
  const [content,          setContent]          = useState({});
  const [settings,         setSettings]         = useState({});
  const [template,         setTemplate]         = useState('professional');
  const [activeTab,        setActiveTab]        = useState('summary');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showSettings,     setShowSettings]     = useState(false);
  const [showHistory,      setShowHistory]      = useState(false);
  const [versions,         setVersions]         = useState([]);
  const [saving,           setSaving]           = useState(false);
  const [lastSaved,        setLastSaved]        = useState(null);
  const [dirty,            setDirty]            = useState(false);
  const [error,            setError]            = useState('');
  const [successMsg,       setSuccessMsg]       = useState('');
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [restoreLoading,   setRestoreLoading]   = useState(false);
  const [improvingSection, setImprovingSection] = useState(null);

  // ── Undo/redo ──────────────────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const skipUndoRef = useRef(false);

  // ── Autosave timer ─────────────────────────────────────────────────────────
  const autosaveTimerRef = useRef(null);

  // ── Fetch resume ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await resumeService.getResume(resumeId);
        const r = data.data.resume;
        setResume(r);
        setContent(r.content ?? {});
        setSettings(r.settings ?? {});
        setTemplate(r.settings?.templateSlug ?? 'professional');
        setLastSaved(r.updatedAt);
      } catch {
        setError('Failed to load resume. It may not exist or you do not have access.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resumeId]);

  // ── Content update with undo tracking ─────────────────────────────────────
  const updateContent = useCallback((updater) => {
    setContent(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipUndoRef.current) {
        setUndoStack(s => [...s.slice(-29), prev]);
        setRedoStack([]);
      } else {
        skipUndoRef.current = false;
      }
      return next;
    });
    setDirty(true);
  }, []);

  // ── Undo ──────────────────────────────────────────��───────────────────────
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setRedoStack(r => [content, ...r]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    skipUndoRef.current = true;
    setContent(prev);
    setDirty(true);
  };

  // ── Redo ──────────────────────────────────────────────────────────────────
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setUndoStack(s => [...s, content]);
    const next = redoStack[0];
    setRedoStack(r => r.slice(1));
    skipUndoRef.current = true;
    setContent(next);
    setDirty(true);
  };

  // ── Autosave (debounced) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!dirty || !resume) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await resumeService.updateResume(resumeId, {
          content,
          settings: { ...settings, templateSlug: template },
        });
        setLastSaved(new Date().toISOString());
        setDirty(false);
      } catch {
        setError('Autosave failed — your changes are not saved. Click Save to retry.');
      } finally {
        setSaving(false);
      }
    }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [content, settings, template, dirty, resumeId, resume]);

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!resume) return;
    if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); }
    setSaving(true);
    setError('');
    try {
      await resumeService.updateResume(resumeId, {
        content,
        settings: { ...settings, templateSlug: template },
      });
      setLastSaved(new Date().toISOString());
      setDirty(false);
      setSuccessMsg('Saved!');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Settings update ────────────────────────────────────────────────────────
  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // ── Section ordering ───────────────────────────────────────────────────────
  const getOrder = () => settings?.sectionsOrder?.length ? settings.sectionsOrder : DEFAULT_SECTION_ORDER;

  const moveSection = (sectionKey, dir) => {
    const order = [...getOrder()];
    const idx = order.indexOf(sectionKey);
    if (idx < 0) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    updateSettings('sectionsOrder', order);
  };

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = async () => {
    setDuplicateLoading(true);
    try {
      await resumeService.duplicateResume(resumeId);
      navigate('/resumes', { state: { successMessage: 'Resume duplicated!' } });
    } catch {
      setError('Failed to duplicate resume.');
    } finally {
      setDuplicateLoading(false);
    }
  };

  // ── Version history ────────────────────────────────────────────────────────
  const handleShowHistory = async () => {
    setShowHistory(true);
    try {
      const { data } = await resumeService.getVersions(resumeId);
      setVersions(data.data.versions);
    } catch {
      setError('Failed to load version history.');
    }
  };

  const handleRestore = async (versionId) => {
    setRestoreLoading(true);
    try {
      const { data } = await resumeService.restoreVersion(resumeId, versionId);
      const restored = data.data.resume;
      setContent(restored.content ?? {});
      setSettings(restored.settings ?? {});
      setTemplate(restored.settings?.templateSlug ?? 'professional');
      setDirty(false);
      setLastSaved(new Date().toISOString());
      setSuccessMsg('Version restored.');
      setTimeout(() => setSuccessMsg(''), 3000);
      const { data: vd } = await resumeService.getVersions(resumeId);
      setVersions(vd.data.versions);
    } catch {
      setError('Failed to restore version.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── AI improve summary ────────────────────────────────────────────────────
  const handleImproveSummary = async () => {
    if (!content?.summary) return;
    setImprovingSection('summary');
    setError('');
    try {
      const { data } = await resumeService.improveContent({ content: content.summary, instructions: '' });
      updateContent(prev => ({ ...prev, summary: data.data.improvedContent }));
      setSuccessMsg('Summary improved!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'AI improvement failed. Make sure GROQ_API_KEY is set in .env.');
    } finally {
      setImprovingSection(null);
    }
  };

  // ── Render guard ─────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;

  if (!resume && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Alert type="error" message={error || 'Resume not found.'} />
        <Button onClick={() => navigate('/resumes')} variant="secondary">← Back to Resumes</Button>
      </div>
    );
  }

  const profile = user?.profile ?? {};

  return (
    <div className="animate-fade-in">
      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 sticky top-0 z-20 bg-brand-bg/90 backdrop-blur-sm py-2 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-brand-border">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/resumes')} className="btn-ghost btn-sm shrink-0" title="Back to resumes">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-text truncate max-w-[180px] sm:max-w-xs">{resume?.title}</p>
            <p className="text-xs text-brand-muted">
              {saving ? '⟳ Saving…'
                : dirty ? '● Unsaved'
                : lastSaved ? `✓ Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Undo / Redo */}
          <button onClick={handleUndo} disabled={undoStack.length === 0}
            className="btn-ghost btn-sm disabled:opacity-30" title="Undo (last 30 changes)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={redoStack.length === 0}
            className="btn-ghost btn-sm disabled:opacity-30" title="Redo">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-brand-border mx-1" />
          {/* Settings / History / Duplicate */}
          <button onClick={() => setShowSettings(v => !v)} className="btn-ghost btn-sm" title="Design settings">
            <Palette className="w-4 h-4" />
          </button>
          <button onClick={handleShowHistory} className="btn-ghost btn-sm" title="Version history">
            <History className="w-4 h-4" />
          </button>
          <button onClick={handleDuplicate} disabled={duplicateLoading} className="btn-ghost btn-sm" title="Duplicate">
            {duplicateLoading ? <LoadingSpinner size="sm" /> : <Copy className="w-4 h-4" />}
          </button>
          <div className="w-px h-5 bg-brand-border mx-1" />
          <Button onClick={handleSave} variant="primary" size="sm" loading={saving} className="flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        </div>
      </div>

      {error      && <Alert type="error"   message={error}      dismissible className="mb-4" />}
      {successMsg && <Alert type="success" message={successMsg} dismissible className="mb-4" />}

      {/* ── Two-panel layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: Editor ─────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[460px] shrink-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto pb-8">

          {/* Section tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {SECTION_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors
                  ${activeTab === id
                    ? 'bg-brand-orange text-white shadow-soft'
                    : 'bg-white text-brand-muted hover:text-brand-text border border-brand-border'}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Summary ─────────────────────────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Professional Summary</h3>
                <div className="flex gap-1">
                  <button onClick={() => moveSection('summary', 'up')} className="btn-ghost btn-sm" title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSection('summary', 'down')} className="btn-ghost btn-sm" title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <textarea
                value={content?.summary ?? ''}
                onChange={(e) => updateContent(prev => ({ ...prev, summary: e.target.value }))}
                rows={6}
                placeholder="Your professional summary — 2 to 4 impactful sentences about your background and goals."
                className="form-input resize-none text-sm"
              />
              <div className="flex justify-end">
                <Button onClick={handleImproveSummary} variant="secondary" size="sm"
                  loading={improvingSection === 'summary'} disabled={!content?.summary}
                  className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Improve with AI
                </Button>
              </div>
            </div>
          )}

          {/* ── Skills ──────────────────────────────────────────────────────────── */}
          {activeTab === 'skills' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Skills</h3>
                <div className="flex gap-1">
                  <button onClick={() => moveSection('skills', 'up')} className="btn-ghost btn-sm"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSection('skills', 'down')} className="btn-ghost btn-sm"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(content?.skills ?? []).map((skill, idx) => (
                  <span key={idx} className="badge badge-blue flex items-center gap-1.5 pr-1">
                    <input
                      value={skill}
                      onChange={(e) => {
                        const next = [...(content?.skills ?? [])];
                        next[idx] = e.target.value;
                        updateContent(prev => ({ ...prev, skills: next }));
                      }}
                      className="bg-transparent border-none outline-none text-xs w-20"
                    />
                    <button onClick={() => updateContent(prev => ({ ...prev, skills: (prev.skills ?? []).filter((_, i) => i !== idx) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  placeholder="+ Add skill"
                  className="border border-dashed border-brand-border rounded-full px-3 py-0.5 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      updateContent(prev => ({ ...prev, skills: [...(prev.skills ?? []), e.target.value.trim()] }));
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <p className="form-hint">Press Enter to add a skill. Click the × to remove one.</p>
            </div>
          )}

          {/* ── Experience ──────────────────────────────────────────────────────── */}
          {activeTab === 'experiences' && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Work Experience</h3>
                <div className="flex gap-1">
                  <button onClick={() => moveSection('experiences', 'up')} className="btn-ghost btn-sm"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSection('experiences', 'down')} className="btn-ghost btn-sm"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {(content?.experiences ?? []).map((exp, expIdx) => (
                <div key={expIdx} className="border border-brand-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={exp.jobTitle ?? ''}
                      onChange={(e) => updateContent(prev => {
                        const n = [...(prev.experiences ?? [])];
                        n[expIdx] = { ...n[expIdx], jobTitle: e.target.value };
                        return { ...prev, experiences: n };
                      })}
                      className="form-input text-sm py-1.5 font-medium flex-1" placeholder="Job title" />
                    <button onClick={() => updateContent(prev => ({ ...prev, experiences: (prev.experiences ?? []).filter((_, i) => i !== expIdx) }))}
                      className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input value={exp.company ?? ''}
                    onChange={(e) => updateContent(prev => {
                      const n = [...(prev.experiences ?? [])];
                      n[expIdx] = { ...n[expIdx], company: e.target.value };
                      return { ...prev, experiences: n };
                    })}
                    className="form-input text-sm py-1.5" placeholder="Company name" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-xs text-brand-muted">Start date</label>
                      <input type="date" value={isoDate(exp.startDate)}
                        onChange={(e) => updateContent(prev => {
                          const n = [...(prev.experiences ?? [])];
                          n[expIdx] = { ...n[expIdx], startDate: e.target.value };
                          return { ...prev, experiences: n };
                        })}
                        className="form-input text-xs py-1.5" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-brand-muted">End date</label>
                      <input type="date" value={isoDate(exp.endDate)}
                        disabled={exp.isCurrent}
                        onChange={(e) => updateContent(prev => {
                          const n = [...(prev.experiences ?? [])];
                          n[expIdx] = { ...n[expIdx], endDate: e.target.value };
                          return { ...prev, experiences: n };
                        })}
                        className="form-input text-xs py-1.5 disabled:bg-brand-bg" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={exp.isCurrent ?? false}
                      onChange={(e) => updateContent(prev => {
                        const n = [...(prev.experiences ?? [])];
                        n[expIdx] = { ...n[expIdx], isCurrent: e.target.checked };
                        return { ...prev, experiences: n };
                      })}
                      className="w-3.5 h-3.5 rounded border-brand-border text-brand-orange focus:ring-brand-orange" />
                    <span className="text-xs text-brand-muted">Currently working here</span>
                  </label>

                  {/* Bullet points */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs text-brand-muted font-medium">Bullet points</p>
                    {(exp.bulletPoints ?? []).map((bp, bpIdx) => (
                      <div key={bpIdx} className="flex items-start gap-2 group">
                        <span className="text-brand-orange mt-2 text-xs shrink-0">●</span>
                        <textarea
                          value={bp} rows={1}
                          onChange={(e) => updateContent(prev => {
                            const n = [...(prev.experiences ?? [])];
                            const pts = [...(n[expIdx].bulletPoints ?? [])];
                            pts[bpIdx] = e.target.value;
                            n[expIdx] = { ...n[expIdx], bulletPoints: pts };
                            return { ...prev, experiences: n };
                          })}
                          className="form-input text-xs py-1 flex-1 resize-none"
                        />
                        <button onClick={() => updateContent(prev => {
                          const n = [...(prev.experiences ?? [])];
                          n[expIdx] = { ...n[expIdx], bulletPoints: (n[expIdx].bulletPoints ?? []).filter((_, i) => i !== bpIdx) };
                          return { ...prev, experiences: n };
                        })}
                          className="p-1 rounded text-brand-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => updateContent(prev => {
                      const n = [...(prev.experiences ?? [])];
                      n[expIdx] = { ...n[expIdx], bulletPoints: [...(n[expIdx].bulletPoints ?? []), ''] };
                      return { ...prev, experiences: n };
                    })}
                      className="text-xs text-brand-orange hover:underline flex items-center gap-1 ml-5">
                      <Plus className="w-3 h-3" /> Add bullet
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => updateContent(prev => ({
                ...prev,
                experiences: [...(prev?.experiences ?? []), { jobTitle: '', company: '', isCurrent: false, bulletPoints: [''] }],
              }))}
                className="btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add experience
              </button>
            </div>
          )}

          {/* ── Education ───────────────────────────────────────────────────────── */}
          {activeTab === 'education' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Education</h3>
                <div className="flex gap-1">
                  <button onClick={() => moveSection('education', 'up')} className="btn-ghost btn-sm"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSection('education', 'down')} className="btn-ghost btn-sm"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {(content?.education ?? []).map((ed, idx) => (
                <div key={idx} className="border border-brand-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={ed.degree ?? ''} placeholder="Degree"
                      onChange={(e) => updateContent(prev => { const n = [...(prev.education ?? [])]; n[idx] = { ...n[idx], degree: e.target.value }; return { ...prev, education: n }; })}
                      className="form-input text-sm py-1.5 font-medium flex-1" />
                    <button onClick={() => updateContent(prev => ({ ...prev, education: (prev.education ?? []).filter((_, i) => i !== idx) }))}
                      className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input value={ed.institution ?? ''} placeholder="Institution"
                    onChange={(e) => updateContent(prev => { const n = [...(prev.education ?? [])]; n[idx] = { ...n[idx], institution: e.target.value }; return { ...prev, education: n }; })}
                    className="form-input text-sm py-1.5" />
                  <input value={ed.fieldOfStudy ?? ''} placeholder="Field of study (optional)"
                    onChange={(e) => updateContent(prev => { const n = [...(prev.education ?? [])]; n[idx] = { ...n[idx], fieldOfStudy: e.target.value }; return { ...prev, education: n }; })}
                    className="form-input text-sm py-1.5" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-xs text-brand-muted">Start date</label>
                      <input type="date" value={isoDate(ed.startDate)}
                        onChange={(e) => updateContent(prev => { const n = [...(prev.education ?? [])]; n[idx] = { ...n[idx], startDate: e.target.value }; return { ...prev, education: n }; })}
                        className="form-input text-xs py-1.5" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-brand-muted">Graduation date</label>
                      <input type="date" value={isoDate(ed.graduationDate)}
                        onChange={(e) => updateContent(prev => { const n = [...(prev.education ?? [])]; n[idx] = { ...n[idx], graduationDate: e.target.value }; return { ...prev, education: n }; })}
                        className="form-input text-xs py-1.5" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => updateContent(prev => ({ ...prev, education: [...(prev?.education ?? []), { degree: '', institution: '' }] }))}
                className="btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add education
              </button>
            </div>
          )}

          {/* ── Projects ────────────────────────────────────────────────────────── */}
          {activeTab === 'projects' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Projects</h3>
                <div className="flex gap-1">
                  <button onClick={() => moveSection('projects', 'up')} className="btn-ghost btn-sm"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSection('projects', 'down')} className="btn-ghost btn-sm"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {(content?.projects ?? []).map((p, idx) => (
                <div key={idx} className="border border-brand-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={p.name ?? ''} placeholder="Project name"
                      onChange={(e) => updateContent(prev => { const n = [...(prev.projects ?? [])]; n[idx] = { ...n[idx], name: e.target.value }; return { ...prev, projects: n }; })}
                      className="form-input text-sm py-1.5 font-medium flex-1" />
                    <button onClick={() => updateContent(prev => ({ ...prev, projects: (prev.projects ?? []).filter((_, i) => i !== idx) }))}
                      className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea value={p.description ?? ''} rows={2} placeholder="Description"
                    onChange={(e) => updateContent(prev => { const n = [...(prev.projects ?? [])]; n[idx] = { ...n[idx], description: e.target.value }; return { ...prev, projects: n }; })}
                    className="form-input text-sm py-1.5 resize-none" />
                </div>
              ))}
              <button onClick={() => updateContent(prev => ({ ...prev, projects: [...(prev?.projects ?? []), { name: '', description: '' }] }))}
                className="btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add project
              </button>
            </div>
          )}

          {/* ── Certifications ──────────────────────────────────────────────────── */}
          {activeTab === 'certifications' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text">Certifications</h3>
                <div className="flex gap-1">
                  <button onClick={() => moveSection('certifications', 'up')} className="btn-ghost btn-sm"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveSection('certifications', 'down')} className="btn-ghost btn-sm"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {(content?.certifications ?? []).map((c, idx) => (
                <div key={idx} className="border border-brand-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={c.name ?? ''} placeholder="Certification name"
                      onChange={(e) => updateContent(prev => { const n = [...(prev.certifications ?? [])]; n[idx] = { ...n[idx], name: e.target.value }; return { ...prev, certifications: n }; })}
                      className="form-input text-sm py-1.5 font-medium flex-1" />
                    <button onClick={() => updateContent(prev => ({ ...prev, certifications: (prev.certifications ?? []).filter((_, i) => i !== idx) }))}
                      className="p-1.5 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input value={c.issuingOrg ?? ''} placeholder="Issuing organization"
                    onChange={(e) => updateContent(prev => { const n = [...(prev.certifications ?? [])]; n[idx] = { ...n[idx], issuingOrg: e.target.value }; return { ...prev, certifications: n }; })}
                    className="form-input text-sm py-1.5" />
                </div>
              ))}
              <button onClick={() => updateContent(prev => ({ ...prev, certifications: [...(prev?.certifications ?? []), { name: '', issuingOrg: '' }] }))}
                className="btn-secondary btn-sm w-full flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add certification
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Live preview ──────────────────────────────────────────────── */}
        <div className="hidden lg:block flex-1 min-w-0">
          <div className="sticky top-20">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-brand-muted" />
              <span className="text-sm font-medium text-brand-muted">Live Preview</span>
              <span className="text-xs text-brand-muted ml-1 capitalize">· {template}</span>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-180px)] rounded-xl border border-brand-border bg-gray-50 p-4">
              <ResumePreview
                content={content}
                profile={profile}
                settings={settings}
                template={template}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Design settings drawer ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowSettings(false)} />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-modal">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
                <h2 className="font-semibold text-brand-text flex items-center gap-2">
                  <Palette className="w-4 h-4 text-brand-orange" /> Design Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                {/* Template */}
                <div className="space-y-2">
                  <label className="form-label">Template</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map(t => (
                      <button key={t} onClick={() => { setTemplate(t); updateSettings('templateSlug', t); }}
                        className={`p-3 rounded-xl border capitalize text-left text-xs font-medium transition-colors
                          ${template === t ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-brand-border text-brand-muted hover:border-brand-orange/40'}`}>
                        <div className={`h-10 rounded-lg mb-2 flex items-center justify-center ${template === t ? 'bg-brand-orange/10' : 'bg-brand-bg'}`}>
                          <Layout className={`w-4 h-4 ${template === t ? 'text-brand-orange' : 'text-brand-border'}`} />
                        </div>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div className="space-y-1">
                  <label className="form-label">Font family</label>
                  <select value={settings.font ?? 'Inter'} onChange={(e) => updateSettings('font', e.target.value)} className="form-input">
                    {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Font size */}
                <div className="space-y-2">
                  <label className="form-label">Font size: {settings.fontSize ?? 12}px</label>
                  <div className="flex gap-2">
                    {FONT_SIZES.map(s => (
                      <button key={s} onClick={() => updateSettings('fontSize', s)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors flex-1
                          ${(settings.fontSize ?? 12) === s ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-brand-border text-brand-muted'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div className="space-y-2">
                  <label className="form-label">Accent color</label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map(c => (
                      <button key={c} onClick={() => updateSettings('accentColor', c)}
                        style={{ background: c }}
                        className={`w-8 h-8 rounded-full transition-all shrink-0 ${(settings.accentColor ?? '#E58A45') === c ? 'ring-2 ring-offset-2 ring-brand-orange scale-110' : ''}`}
                      />
                    ))}
                    <input type="color" value={settings.accentColor ?? '#E58A45'}
                      onChange={(e) => updateSettings('accentColor', e.target.value)}
                      className="w-8 h-8 rounded-full cursor-pointer border border-brand-border" title="Custom color" />
                  </div>
                </div>

                {/* Margins */}
                <div className="space-y-2">
                  <label className="form-label">Margins</label>
                  {[['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left (gutter)'], ['right', 'Right (gutter)']].map(([k, lbl]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-xs text-brand-muted w-24">{lbl}</span>
                      <input type="range" min="16" max="80" value={settings.margins?.[k] ?? 48}
                        onChange={(e) => updateSettings('margins', { ...(settings.margins ?? {}), [k]: parseInt(e.target.value) })}
                        className="flex-1" />
                      <span className="text-xs text-brand-muted w-10">{settings.margins?.[k] ?? 48}px</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-brand-border">
                <Button onClick={() => { handleSave(); setShowSettings(false); }} variant="primary" className="w-full">
                  <Save className="w-4 h-4" /> Save changes
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Version history drawer ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowHistory(false)} />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-modal">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
                <h2 className="font-semibold text-brand-text flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-orange" /> Version History
                </h2>
                <button onClick={() => setShowHistory(false)} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {versions.length === 0 ? (
                  <div className="py-10 text-center">
                    <History className="w-10 h-10 text-brand-border mx-auto mb-3" />
                    <p className="text-sm text-brand-muted">No versions yet.</p>
                    <p className="text-xs text-brand-muted mt-1">Versions save automatically when you save changes.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {versions.map((v, idx) => (
                      <li key={v.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors
                          ${idx === 0 ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-brand-border'}`}>
                        <div>
                          <p className="text-sm font-medium text-brand-text">
                            Version {v.versionNum}
                            {idx === 0 && <span className="ml-2 text-xs text-brand-orange font-normal">current</span>}
                          </p>
                          <p className="text-xs text-brand-muted">{new Date(v.createdAt).toLocaleString()}</p>
                        </div>
                        {idx > 0 && (
                          <Button onClick={() => handleRestore(v.id)} variant="secondary" size="sm"
                            loading={restoreLoading} className="flex items-center gap-1">
                            <Undo2 className="w-3 h-3" /> Restore
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeEditor;
