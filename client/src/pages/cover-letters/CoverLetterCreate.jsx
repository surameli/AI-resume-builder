/**
 * CoverLetterCreate — step-by-step AI cover letter generation.
 *
 * Steps:
 *   0 → Select job description (optional)
 *   1 → Select resume to draw from (optional)
 *   2 → Preferences: tone, length, recipient details
 *   3 → Review AI-generated letter, edit, then save
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Sparkles, ArrowRight, ArrowLeft, Save, CheckCircle2,
  Circle, Briefcase, FileText, AlertCircle, User,
} from 'lucide-react';
import Button          from '../../components/common/Button.jsx';
import Alert           from '../../components/common/Alert.jsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import * as clService  from '../../services/coverLetters.service.js';
import * as jobsService from '../../services/jobs.service.js';
import * as resumeService from '../../services/resumes.service.js';

const STEPS = [
  { id: 0, label: 'Job Target', icon: Briefcase },
  { id: 1, label: 'Resume',     icon: FileText },
  { id: 2, label: 'Style',      icon: User },
  { id: 3, label: 'Generate',   icon: Sparkles },
];

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Formal, polished, business-appropriate' },
  { value: 'confident',    label: 'Confident',    desc: 'Assertive and self-assured' },
  { value: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic and genuinely excited' },
  { value: 'concise',      label: 'Concise',      desc: 'Short and to the point' },
];

const CoverLetterCreate = () => {
  const navigate = useNavigate();
  const [step,          setStep]          = useState(0);
  const [savedJobs,     setSavedJobs]     = useState([]);
  const [savedResumes,  setSavedResumes]  = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [tone,          setTone]          = useState('professional');
  const [length,        setLength]        = useState('standard');
  const [recipientName, setRecipientName] = useState('');
  const [recipientTitle,setRecipientTitle]= useState('');
  const [generating,    setGenerating]    = useState(false);
  const [generated,     setGenerated]     = useState(null);
  const [saveTitle,     setSaveTitle]     = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobsRes, resumesRes] = await Promise.all([
          jobsService.getJobs(),
          resumeService.getResumes(),
        ]);
        setSavedJobs(jobsRes.data.data.jobs);
        setSavedResumes(resumesRes.data.data.resumes);
      } catch { /* non-critical */ }
    };
    loadData();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setGenerated(null);
    try {
      const { data } = await clService.generateCoverLetter({
        jobDescriptionId: selectedJobId,
        resumeId:         selectedResumeId,
        preferences: {
          tone,
          length,
          recipientName:  recipientName.trim() || null,
          recipientTitle: recipientTitle.trim() || null,
        },
      });
      setGenerated(data.data);
      // Suggest a title
      const job = savedJobs.find(j => j.id === selectedJobId);
      setSaveTitle(
        job
          ? `Cover Letter — ${job.title}${job.company ? ` @ ${job.company}` : ''}`
          : `Cover Letter — ${new Date().toLocaleDateString()}`
      );
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generated || !saveTitle.trim()) {
      setError('Please provide a title.'); return;
    }
    setSaving(true);
    setError('');
    try {
      const fullContent = [
        generated.salutation,
        '',
        generated.body,
        '',
        generated.closing,
      ].join('\n');

      await clService.createCoverLetter({
        title:            saveTitle.trim(),
        content:          fullContent,
        tone,
        jobDescriptionId: selectedJobId,
        resumeId:         selectedResumeId,
      });
      navigate('/cover-letters', { state: { successMessage: 'Cover letter saved!' } });
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const updateGenerated = (field, value) =>
    setGenerated(prev => ({ ...prev, [field]: value }));

  // ── Selection button helper ───────────────────────────────────────────────
  const SelectBtn = ({ selected, onSelect, children }) => (
    <button onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors
        ${selected
          ? 'border-brand-orange bg-brand-orange/5'
          : 'border-brand-border hover:border-brand-orange/30'}`}>
      {selected
        ? <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0" />
        : <Circle className="w-4 h-4 text-brand-border shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </button>
  );

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Create Cover Letter</h1>
        <p className="text-brand-muted text-sm mt-1">
          AI writes a personalized letter using only your real profile data.
        </p>
      </div>

      {error && <Alert type="error" message={error} dismissible className="mb-4" />}

      {/* Step indicator */}
      {!generated && (
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done   = step > idx;
            const active = step === idx;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 transition-colors
                  ${active ? 'text-brand-orange' : done ? 'text-green-600' : 'text-brand-border'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${active ? 'bg-brand-orange text-white' : done ? 'bg-green-100 text-green-600' : 'bg-brand-bg text-brand-border'}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
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

      {/* Loading */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <LoadingSpinner size="xl" />
          <div className="text-center">
            <p className="font-medium text-brand-text">Writing your cover letter…</p>
            <p className="text-brand-muted text-sm mt-1">Using only your real profile data.</p>
          </div>
        </div>
      )}

      {/* Steps */}
      {!generated && !generating && (
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>

            {/* ── Step 0: Job target ─────────────────────────────────────────── */}
            {step === 0 && (
              <div className="card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">Select a job description</h2>
                  <p className="text-sm text-brand-muted mt-1">
                    Tailor the letter for a specific role, or skip to write a general letter.
                  </p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <SelectBtn selected={!selectedJobId} onSelect={() => setSelectedJobId(null)}>
                    <p className="text-sm font-medium text-brand-text">No specific job (general letter)</p>
                    <p className="text-xs text-brand-muted">Based on your profile alone</p>
                  </SelectBtn>
                  {savedJobs.map(j => (
                    <SelectBtn key={j.id} selected={selectedJobId === j.id} onSelect={() => setSelectedJobId(j.id)}>
                      <p className="text-sm font-medium text-brand-text truncate">{j.title}</p>
                      <p className="text-xs text-brand-muted">{j.company ?? 'No company'}</p>
                    </SelectBtn>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(1)} variant="primary" className="flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 1: Resume ─────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="card p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">Select a resume (optional)</h2>
                  <p className="text-sm text-brand-muted mt-1">
                    If you have an existing resume, the AI can use its summary for consistency.
                  </p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <SelectBtn selected={!selectedResumeId} onSelect={() => setSelectedResumeId(null)}>
                    <p className="text-sm font-medium text-brand-text">No specific resume</p>
                    <p className="text-xs text-brand-muted">Use profile data only</p>
                  </SelectBtn>
                  {savedResumes.map(r => (
                    <SelectBtn key={r.id} selected={selectedResumeId === r.id} onSelect={() => setSelectedResumeId(r.id)}>
                      <p className="text-sm font-medium text-brand-text truncate">{r.title}</p>
                    </SelectBtn>
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

            {/* ── Step 2: Preferences ────────────────────────────────────────── */}
            {step === 2 && (
              <div className="card p-6 space-y-6">
                <h2 className="text-lg font-semibold text-brand-text">Style preferences</h2>

                {/* Tone */}
                <div className="space-y-2">
                  <label className="form-label">Tone</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map(t => (
                      <button key={t.value} onClick={() => setTone(t.value)}
                        className={`p-3 rounded-xl border text-left transition-colors
                          ${tone === t.value ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/30'}`}>
                        <p className="text-sm font-medium text-brand-text">{t.label}</p>
                        <p className="text-xs text-brand-muted">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div className="space-y-2">
                  <label className="form-label">Length</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'standard', label: 'Standard', desc: '350–450 words' },
                      { value: 'short',    label: 'Brief',    desc: '250–300 words' },
                    ].map(l => (
                      <button key={l.value} onClick={() => setLength(l.value)}
                        className={`p-3 rounded-xl border text-left transition-colors
                          ${length === l.value ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-border hover:border-brand-orange/30'}`}>
                        <p className="text-sm font-medium text-brand-text">{l.label}</p>
                        <p className="text-xs text-brand-muted">{l.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient details */}
                <div className="space-y-3">
                  <label className="form-label">Recipient details (optional)</label>
                  <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="Hiring manager name e.g. Sarah Chen"
                    className="form-input text-sm" />
                  <input value={recipientTitle} onChange={e => setRecipientTitle(e.target.value)}
                    placeholder="Their title e.g. Engineering Lead"
                    className="form-input text-sm" />
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

            {/* ── Step 3: Review & Generate ──────────────────────────────────── */}
            {step === 3 && (
              <div className="card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-brand-text">Ready to generate</h2>

                <div className="bg-brand-bg rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Job target</span>
                    <span className="font-medium text-brand-text truncate max-w-[200px]">
                      {selectedJobId ? (savedJobs.find(j => j.id === selectedJobId)?.title ?? 'Selected job') : 'General'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Resume</span>
                    <span className="font-medium text-brand-text">
                      {selectedResumeId ? (savedResumes.find(r => r.id === selectedResumeId)?.title ?? 'Selected resume') : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Tone</span>
                    <span className="font-medium text-brand-text capitalize">{tone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Length</span>
                    <span className="font-medium text-brand-text capitalize">{length}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    The AI will <strong>only</strong> use your real profile data. It will never invent
                    experience or achievements.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button onClick={() => setStep(2)} variant="secondary" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={handleGenerate} variant="primary" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Generate Cover Letter
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Generated result ─────────────────────────────────────────────────── */}
      {generated && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="space-y-5">

          {/* Save bar */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-brand-text">Cover letter generated!</p>
                <p className="text-sm text-brand-muted">Review and edit, then save when ready.</p>
              </div>
              {generated.wordCount > 0 && (
                <span className="ml-auto badge badge-gray">{generated.wordCount} words</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1">
                <label className="form-label">Title</label>
                <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)}
                  placeholder="e.g. Cover Letter — Google SWE" className="form-input" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setGenerated(null); setStep(0); }} variant="secondary">
                  Start over
                </Button>
                <Button onClick={handleSave} variant="primary" loading={saving} className="flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>
            </div>
          </div>

          {/* Letter preview + edit */}
          <div className="card p-8 bg-white space-y-5 font-serif">
            {/* Subject */}
            <div className="space-y-1">
              <label className="form-label font-sans text-xs uppercase tracking-wide text-brand-muted">Subject</label>
              <input value={generated.subject ?? ''}
                onChange={e => updateGenerated('subject', e.target.value)}
                className="form-input text-sm font-sans" />
            </div>

            {/* Salutation */}
            <input value={generated.salutation ?? ''}
              onChange={e => updateGenerated('salutation', e.target.value)}
              className="form-input text-sm font-sans" />

            {/* Body — paragraph-aware textarea */}
            <div className="space-y-1">
              <label className="form-label font-sans text-xs uppercase tracking-wide text-brand-muted">Body</label>
              <textarea
                value={generated.body ?? ''}
                onChange={e => updateGenerated('body', e.target.value)}
                rows={16}
                className="form-input text-sm font-sans resize-y leading-relaxed"
              />
            </div>

            {/* Closing */}
            <input value={generated.closing ?? ''}
              onChange={e => updateGenerated('closing', e.target.value)}
              className="form-input text-sm font-sans" />
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={() => { setGenerated(null); setStep(0); }} variant="secondary">Start over</Button>
            <Button onClick={handleSave} variant="primary" loading={saving} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Cover Letter
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CoverLetterCreate;
