/**
 * ResumeCreate page
 *
 * Step-by-step flow:
 *   1. Select a job description (optional — skip to generate a general resume)
 *   2. Choose a template
 *   3. Set preferences (tone, length, language, sections to include)
 *   4. Review profile completeness — warn if too empty
 *   5. Click "Generate Resume" → calls POST /api/ai/generate-resume
 *   6. AI-generated content is displayed in an editable preview
 *   7. User can edit any field before saving
 *   8. Click "Save Resume" → calls POST /api/resumes
 *
 * The generated content uses the user's REAL profile data only —
 * the AI never invents experience, education, or skills.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, FileText, Briefcase, Layout, Settings2,
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Save,
  Edit3, Plus, Trash2, AlertCircle, Wand2,
} from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Alert  from '../../components/common/Alert.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import * as resumeService from '../../services/resumes.service.js';
import * as jobsService   from '../../services/jobs.service.js';
import { DEFAULT_TEMPLATES } from '../../services/templates.service.js';

// ─── Step config ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: 'Job Target',    icon: Briefcase },
  { id: 1, label: 'Template',       icon: Layout },
  { id: 2, label: 'Preferences',   icon: Settings2 },
  { id: 3, label: 'Generate',      icon: Sparkles },
];

// ─── Tone options ──────────────────────────────────────────────────────────────

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Standard business tone' },
  { value: 'confident',    label: 'Confident',    desc: 'Assertive and direct' },
  { value: 'friendly',     label: 'Friendly',     desc: 'Warm and approachable' },
  { value: 'concise',      label: 'Concise',      desc: 'Short, punchy sentences' },
];

const LENGTHS = [
  { value: 'short',  label: '1 page',   desc: 'Most relevant info only' },
  { value: 'medium', label: '1-2 pages', desc: 'Balanced detail' },
  { value: 'full',   label: '2+ pages', desc: 'Comprehensive' },
];

const SECTIONS = ['summary', 'skills', 'experiences', 'education', 'projects', 'certifications'];

// ─── Main component ────────────────────────────────────────────────────────────

const ResumeCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const initialTemplate = DEFAULT_TEMPLATES.some(({ slug }) => slug === requestedTemplate)
    ? requestedTemplate
    : 'professional';

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [savedJobs,     setSavedJobs]     = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [template,      setTemplate]      = useState(initialTemplate);
  const [tone,          setTone]          = useState('professional');
  const [length,        setLength]        = useState('medium');
  const [language,      setLanguage]      = useState('en');
  const [includeSections, setIncludeSections] = useState([...SECTIONS]);

  // ── Generation state ──────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(null); // The AI-generated content
  const [saveTitle,  setSaveTitle]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  // ── Fetch saved jobs on mount ────────────────────────────────────────────────
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const { data } = await jobsService.getJobs();
        setSavedJobs(data.data.jobs);
      } catch {
        // Non-critical — user can generate without a job description
      }
    };
    loadJobs();
  }, []);

  // ── Toggle a section in includeSections ───────────────────────────────────────
  const toggleSection = (section) => {
    setIncludeSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // ── Generate the resume ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setGenerated(null);

    try {
      const { data } = await resumeService.generateResume({
        jobDescriptionId: selectedJobId,
        templateId: null, // Template selection happens in Phase 5 editor
        preferences: {
          tone,
          language,
          length,
          includeSections,
        },
      });

      const content = data.data.content;
      setGenerated(content);

      // Auto-fill a title suggestion
      const job = savedJobs.find(j => j.id === selectedJobId);
      const suggestedTitle = job
        ? `${job.title}${job.company ? ` @ ${job.company}` : ''}`
        : 'My Resume';
      setSaveTitle(suggestedTitle);
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Generation failed. Please try again.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Save the generated resume ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!generated || !saveTitle.trim()) {
      setError('Please provide a title for your resume.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data } = await resumeService.createResume({
        title: saveTitle.trim(),
        jobDescriptionId: selectedJobId,
        content: generated,
        settings: { templateSlug: template },
        language,
        tone,
      });

      navigate('/resumes', { state: { successMessage: 'Resume created successfully!' } });
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to save resume. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Update a field in the generated content ─────────────────────────────────────
  const updateContent = (field, value) => {
    setGenerated(prev => ({ ...prev, [field]: value }));
  };

  // ── Update a bullet point within an experience item ────────────────────────────
  const updateBullet = (expIdx, bulletIdx, value) => {
    setGenerated(prev => {
      const next = { ...prev };
      next.experiences = [...prev.experiences];
      next.experiences[expIdx] = { ...next.experiences[expIdx] };
      next.experiences[expIdx].bulletPoints = [...next.experiences[expIdx].bulletPoints];
      next.experiences[expIdx].bulletPoints[bulletIdx] = value;
      return next;
    });
  };

  const addBullet = (expIdx) => {
    setGenerated(prev => {
      const next = { ...prev };
      next.experiences = [...prev.experiences];
      next.experiences[expIdx] = { ...next.experiences[expIdx] };
      next.experiences[expIdx].bulletPoints = [...next.experiences[expIdx].bulletPoints, 'New bullet point'];
      return next;
    });
  };

  const removeBullet = (expIdx, bulletIdx) => {
    setGenerated(prev => {
      const next = { ...prev };
      next.experiences = [...prev.experiences];
      next.experiences[expIdx] = { ...next.experiences[expIdx] };
      next.experiences[expIdx].bulletPoints = next.experiences[expIdx].bulletPoints.filter((_, i) => i !== bulletIdx);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Create Resume</h1>
        <p className="text-brand-muted text-sm mt-1">
          AI will generate a tailored resume using your real profile data — nothing is invented.
        </p>
      </div>

      {error && <Alert type="error" message={error} dismissible className="mb-4" />}

      {/* ── Step indicator ────────────────────────────────────────────────────────── */}
      {!generated && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === idx;
            const isDone = step > idx;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${isActive ? 'text-brand-orange' : isDone ? 'text-green-600' : 'text-brand-border'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${isActive ? 'bg-brand-orange text-white' : isDone ? 'bg-green-100 text-green-600' : 'bg-brand-bg text-brand-border'}`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full transition-colors ${step > idx ? 'bg-green-400' : 'bg-brand-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Step content ──────────────────────────────────────────────────────────── */}
      {!generated && !generating && (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Step 0: Job Target ────────────────────────────────────────────────── */}
            {step === 0 && (
              <div className="card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text mb-1">Select a job description</h2>
                  <p className="text-sm text-brand-muted">Tailor your resume for a specific role, or skip to generate a general resume.</p>
                </div>

                {savedJobs.length === 0 ? (
                  <div className="p-6 bg-brand-bg rounded-xl text-center">
                    <Briefcase className="w-8 h-8 text-brand-border mx-auto mb-2" />
                    <p className="text-sm text-brand-muted">No saved job descriptions yet.</p>
                    <p className="text-xs text-brand-muted mt-1">
                      You can still generate a resume — it will use your profile data without a specific target.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => setSelectedJobId(null)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
                        ${!selectedJobId ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/30'}`}
                    >
                      <Circle className={`w-4 h-4 ${!selectedJobId ? 'text-brand-orange' : 'text-brand-border'}`} />
                      <div>
                        <p className="text-sm font-medium text-brand-text">No specific job (general resume)</p>
                        <p className="text-xs text-brand-muted">Generate a resume based on your profile alone</p>
                      </div>
                    </button>

                    {savedJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
                          ${selectedJobId === job.id ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/30'}`}
                      >
                        {selectedJobId === job.id
                          ? <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" />
                          : <Circle className="w-4 h-4 text-brand-border shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">{job.title}</p>
                          <p className="text-xs text-brand-muted truncate">{job.company ?? 'No company'}</p>
                        </div>
                        {job.isAnalyzed && <Sparkles className="w-3.5 h-3.5 text-brand-orange shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(1)} variant="primary" className="flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 1: Template ──────────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text mb-1">Choose a template</h2>
                  <p className="text-sm text-brand-muted">Select the visual layout for your resume. You can change this later in the editor.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DEFAULT_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.slug)}
                      className={`p-4 rounded-xl border transition-all text-left
                        ${template === t.slug ? 'border-brand-orange bg-brand-orange/5 shadow-soft' : 'border-brand-border hover:border-brand-orange/30'}`}
                    >
                      <div className={`w-full h-24 rounded-lg mb-3 flex items-center justify-center
                        ${template === t.slug ? 'bg-brand-orange/10' : 'bg-brand-bg'}`}>
                        <Layout className={`w-6 h-6 ${template === t.slug ? 'text-brand-orange' : 'text-brand-border'}`} />
                      </div>
                      <p className="text-sm font-medium text-brand-text">{t.name}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button onClick={() => setStep(0)} variant="secondary" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(2)} variant="primary" className="flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Preferences ──────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="card p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text mb-1">Generation preferences</h2>
                  <p className="text-sm text-brand-muted">Customize how the AI writes your resume.</p>
                </div>

                {/* Tone */}
                <div>
                  <label className="form-label">Tone</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`p-3 rounded-xl border text-left transition-colors
                          ${tone === t.value ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/30'}`}
                      >
                        <p className="text-sm font-medium text-brand-text">{t.label}</p>
                        <p className="text-xs text-brand-muted">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div>
                  <label className="form-label">Resume length</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LENGTHS.map(l => (
                      <button
                        key={l.value}
                        onClick={() => setLength(l.value)}
                        className={`p-3 rounded-xl border text-left transition-colors
                          ${length === l.value ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/30'}`}
                      >
                        <p className="text-sm font-medium text-brand-text">{l.label}</p>
                        <p className="text-xs text-brand-muted">{l.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sections to include */}
                <div>
                  <label className="form-label">Sections to include</label>
                  <div className="flex flex-wrap gap-2">
                    {SECTIONS.map(section => (
                      <button
                        key={section}
                        onClick={() => toggleSection(section)}
                        className={`badge px-3 py-1.5 text-sm capitalize transition-colors
                          ${includeSections.includes(section) ? 'badge-orange' : 'badge-gray opacity-50'}`}
                      >
                        {section}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button onClick={() => setStep(1)} variant="secondary" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} variant="primary" className="flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Generate ──────────────────────────────────────────────────── */}
            {step === 3 && (
              <div className="card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text mb-1">Ready to generate</h2>
                  <p className="text-sm text-brand-muted">Review your selections and click Generate. The AI will use your real profile data.</p>
                </div>

                {/* Summary of selections */}
                <div className="bg-brand-bg rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Job target</span>
                    <span className="font-medium text-brand-text">
                      {selectedJobId
                        ? savedJobs.find(j => j.id === selectedJobId)?.title ?? 'Selected job'
                        : 'General (no specific job)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Template</span>
                    <span className="font-medium text-brand-text capitalize">{DEFAULT_TEMPLATES.find(t => t.slug === template)?.name ?? template}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Tone</span>
                    <span className="font-medium text-brand-text capitalize">{tone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Length</span>
                    <span className="font-medium text-brand-text">{LENGTHS.find(l => l.value === length)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Sections</span>
                    <span className="font-medium text-brand-text">{includeSections.length} selected</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    The AI will <strong>only</strong> use information from your profile. It will never invent
                    experience, education, or achievements. Make sure your profile is up to date.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button onClick={() => setStep(2)} variant="secondary" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={handleGenerate} variant="primary" loading={generating} className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {generating ? 'Generating…' : 'Generate Resume'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Loading state ──────────────────────────────────────────────────────────── */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <LoadingSpinner size="xl" />
          <div className="text-center">
            <p className="text-brand-text font-medium">AI is writing your resume…</p>
            <p className="text-brand-muted text-sm mt-1">This uses your real profile data. It won't invent anything.</p>
          </div>
        </div>
      )}

      {/* ── Generated resume preview ──────────────────────────────────────────────────── */}
      {generated && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Success banner + save bar */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-brand-text">Resume generated!</h2>
                <p className="text-sm text-brand-muted">Review and edit below, then save when you're happy with it.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1">
                <label className="form-label">Resume title</label>
                <input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g. Senior Engineer @ Google"
                  className="form-input"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setGenerated(null); setStep(0); }} variant="secondary">
                  Start over
                </Button>
                <Button onClick={handleSave} variant="primary" loading={saving} className="flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Resume
                </Button>
              </div>
            </div>
          </div>

          {/* ── Resume preview ─────────────────────────────────────────────────────────── */}
          <div className="card p-8 bg-white space-y-6">

            {/* Summary */}
            {generated.summary && includeSections.includes('summary') && (
              <div>
                <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-2">Professional Summary</h3>
                <textarea
                  value={generated.summary}
                  onChange={(e) => updateContent('summary', e.target.value)}
                  rows={4}
                  className="form-input resize-none text-sm leading-relaxed"
                />
              </div>
            )}

            {/* Skills */}
            {generated.skills?.length > 0 && includeSections.includes('skills') && (
              <div>
                <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {generated.skills.map((skill, idx) => (
                    <span key={idx} className="badge badge-blue flex items-center gap-1.5 pr-1">
                      <input
                        value={skill}
                        onChange={(e) => {
                          const next = [...generated.skills];
                          next[idx] = e.target.value;
                          updateContent('skills', next);
                        }}
                        className="bg-transparent border-none outline-none text-xs w-24"
                      />
                      <button onClick={() => updateContent('skills', generated.skills.filter((_, i) => i !== idx))} className="hover:opacity-70">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    placeholder="+ Add skill"
                    className="border border-dashed border-brand-border rounded-full px-3 py-0.5 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        updateContent('skills', [...generated.skills, e.target.value.trim()]);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Experience */}
            {generated.experiences?.length > 0 && includeSections.includes('experiences') && (
              <div>
                <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-3">Work Experience</h3>
                <div className="space-y-4">
                  {generated.experiences.map((exp, expIdx) => (
                    <div key={expIdx} className="border-l-2 border-brand-orange pl-4 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <input
                          value={exp.jobTitle ?? ''}
                          onChange={(e) => {
                            const next = [...generated.experiences];
                            next[expIdx] = { ...exp, jobTitle: e.target.value };
                            updateContent('experiences', next);
                          }}
                          className="font-semibold text-sm text-brand-text bg-transparent border-none outline-none flex-1"
                        />
                        <span className="text-xs text-brand-muted shrink-0">{exp.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-muted">
                        <input
                          value={exp.company ?? ''}
                          onChange={(e) => {
                            const next = [...generated.experiences];
                            next[expIdx] = { ...exp, company: e.target.value };
                            updateContent('experiences', next);
                          }}
                          className="bg-transparent border-none outline-none"
                        />
                        <span>·</span>
                        <span>{exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} — {exp.isCurrent ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '')}</span>
                      </div>

                      {/* Bullet points */}
                      <div className="space-y-1.5 mt-2">
                        {exp.bulletPoints?.map((bullet, bulletIdx) => (
                          <div key={bulletIdx} className="flex items-start gap-2 group">
                            <span className="text-brand-orange mt-1.5 text-xs">●</span>
                            <textarea
                              value={bullet}
                              onChange={(e) => updateBullet(expIdx, bulletIdx, e.target.value)}
                              rows={1}
                              className="form-input text-sm py-1.5 flex-1 resize-none"
                            />
                            <button
                              onClick={() => removeBullet(expIdx, bulletIdx)}
                              className="p-1 rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addBullet(expIdx)}
                          className="text-xs text-brand-orange hover:underline flex items-center gap-1 ml-4"
                        >
                          <Plus className="w-3 h-3" /> Add bullet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {generated.education?.length > 0 && includeSections.includes('education') && (
              <div>
                <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-3">Education</h3>
                <div className="space-y-2">
                  {generated.education.map((ed, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-brand-text">{ed.degree}{ed.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ''}</p>
                      <p className="text-brand-muted">{ed.institution}</p>
                      <p className="text-xs text-brand-muted">
                        {ed.startDate ? new Date(ed.startDate).getFullYear() : ''} — {ed.graduationDate ? new Date(ed.graduationDate).getFullYear() : 'Present'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {generated.projects?.length > 0 && includeSections.includes('projects') && (
              <div>
                <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-3">Projects</h3>
                <div className="space-y-3">
                  {generated.projects.map((proj, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-brand-text">{proj.name}</p>
                      <textarea
                        value={proj.description ?? ''}
                        onChange={(e) => {
                          const next = [...generated.projects];
                          next[idx] = { ...proj, description: e.target.value };
                          updateContent('projects', next);
                        }}
                        rows={2}
                        className="form-input text-sm py-1.5 mt-1 resize-none"
                      />
                      {proj.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {proj.technologies.map((t, ti) => (
                            <span key={ti} className="badge badge-blue text-[10px]">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {generated.certifications?.length > 0 && includeSections.includes('certifications') && (
              <div>
                <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-3">Certifications</h3>
                <div className="space-y-2">
                  {generated.certifications.map((cert, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-brand-text">{cert.name}</p>
                      <p className="text-brand-muted">{cert.issuingOrg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom save bar */}
          <div className="flex justify-end gap-3">
            <Button onClick={() => { setGenerated(null); setStep(0); }} variant="secondary">
              Start over
            </Button>
            <Button onClick={handleSave} variant="primary" loading={saving} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Resume
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ResumeCreate;
