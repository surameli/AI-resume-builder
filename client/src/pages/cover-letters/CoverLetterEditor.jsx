/**
 * CoverLetterEditor — full editing experience for a saved cover letter.
 *
 * Layout: left editor panel + right letter preview.
 * Features:
 *   - Edit subject, salutation, body (paragraphs), closing
 *   - Autosave (debounced 2s)
 *   - Manual save
 *   - AI rewrite panel: type instructions → AI rewrites the body
 *   - Word count display
 *   - Tone badge
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Save, ArrowLeft, Sparkles, Wand2, Eye, X,
  Clock, FileText, Hash,
} from 'lucide-react';
import Button          from '../../components/common/Button.jsx';
import Alert           from '../../components/common/Alert.jsx';
import { PageLoader }  from '../../components/common/LoadingSpinner.jsx';
import * as clService  from '../../services/coverLetters.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Splits raw saved content (salutation\n\nbody\n\nclosing) into parts.
 * Raw content format: salutation + \n\n + body + \n\n + closing
 */
const parseContent = (raw) => {
  if (!raw) return { salutation: '', body: '', closing: '' };
  const lines = raw.split('\n');
  // First non-empty line is salutation
  const salutation = lines[0] ?? '';
  // Last non-empty line is closing
  const lastNonEmpty = [...lines].reverse().find(l => l.trim()) ?? '';
  const closing = lastNonEmpty !== salutation ? lastNonEmpty : '';
  // Everything in between is body
  const bodyLines = lines.slice(1, closing ? lines.lastIndexOf(closing) : undefined);
  const body = bodyLines.join('\n').replace(/^\n+|\n+$/g, '');
  return { salutation, body, closing };
};

const assembleContent = ({ salutation, body, closing }) =>
  [salutation, '', body, '', closing].join('\n');

const countWords = (text) =>
  (text ?? '').trim().split(/\s+/).filter(Boolean).length;

// ─── Main component ───────────────────────────────────────────────────────────

const CoverLetterEditor = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(true);
  const [cl,        setCl]        = useState(null);
  const [subject,   setSubject]   = useState('');
  const [salutation,setSalutation]= useState('');
  const [body,      setBody]      = useState('');
  const [closing,   setClosing]   = useState('');

  // ── UI ────────────────────────────────────────────────────────────────────
  const [dirty,          setDirty]          = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [lastSaved,      setLastSaved]      = useState(null);
  const [error,          setError]          = useState('');
  const [successMsg,     setSuccessMsg]     = useState('');
  const [showRewrite,    setShowRewrite]    = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [rewriting,      setRewriting]      = useState(false);

  const autosaveTimerRef = useRef(null);

  // ── Load cover letter ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await clService.getCoverLetter(id);
        const letter = data.data.coverLetter;
        setCl(letter);
        // Attempt to parse if content has our format, else put it all in body
        const { salutation: s, body: b, closing: c } = parseContent(letter.content);
        setSalutation(s || 'Dear Hiring Manager,');
        setBody(b || letter.content);
        setClosing(c || 'Sincerely,');
        setLastSaved(letter.updatedAt);
      } catch {
        setError('Failed to load cover letter.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Autosave ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dirty || !cl) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await clService.updateCoverLetter(id, {
          content: assembleContent({ salutation, body, closing }),
        });
        setLastSaved(new Date().toISOString());
        setDirty(false);
      } catch {
        setError('Autosave failed — click Save to retry.');
      } finally {
        setSaving(false);
      }
    }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [salutation, body, closing, dirty, cl, id]);

  const markDirty = useCallback(() => setDirty(true), []);

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cl) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setSaving(true); setError('');
    try {
      await clService.updateCoverLetter(id, {
        content: assembleContent({ salutation, body, closing }),
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

  // ── AI rewrite ────────────────────────────────────────────────────────────
  const handleRewrite = async () => {
    if (!rewriteInstructions.trim()) {
      setError('Please describe what you want to change.'); return;
    }
    setRewriting(true); setError('');
    try {
      const { data } = await clService.rewriteCoverLetter({
        body,
        instructions: rewriteInstructions.trim(),
      });
      setBody(data.data.body);
      setDirty(true);
      setShowRewrite(false);
      setRewriteInstructions('');
      setSuccessMsg('Body rewritten by AI.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'AI rewrite failed. Make sure GROQ_API_KEY is set.');
    } finally {
      setRewriting(false);
    }
  };

  // ── Render guard ──────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;
  if (!cl && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Alert type="error" message={error || 'Cover letter not found.'} />
        <Button onClick={() => navigate('/cover-letters')} variant="secondary">← Back</Button>
      </div>
    );
  }

  const wordCount = countWords(body);

  return (
    <div className="animate-fade-in">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 sticky top-0 z-20 bg-brand-bg/90 backdrop-blur-sm py-2 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-brand-border">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/cover-letters')} className="btn-ghost btn-sm shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-text truncate max-w-[200px] sm:max-w-xs">{cl.title}</p>
            <p className="text-xs text-brand-muted">
              {saving ? '⟳ Saving…'
                : dirty ? '● Unsaved'
                : lastSaved ? `✓ Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setShowRewrite(v => !v)} className="btn-ghost btn-sm flex items-center gap-1.5" title="AI rewrite">
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">AI Rewrite</span>
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

        {/* ── Left: Edit fields ─────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[460px] shrink-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto pb-8">

          {/* Meta badge row */}
          <div className="flex items-center gap-2 flex-wrap">
            {cl.jobDescription && (
              <span className="badge badge-blue flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {cl.jobDescription.title}
              </span>
            )}
            <span className="badge badge-orange capitalize flex items-center gap-1">
              <Mail className="w-3 h-3" /> {cl.tone}
            </span>
            <span className="badge badge-gray flex items-center gap-1 ml-auto">
              <Hash className="w-3 h-3" /> {wordCount} words
            </span>
          </div>

          <div className="card p-5 space-y-4">
            {/* Subject */}
            <div className="space-y-1">
              <label className="form-label text-xs uppercase tracking-wide text-brand-muted">Email subject line</label>
              <input value={subject} onChange={e => { setSubject(e.target.value); markDirty(); }}
                placeholder="Application for [Role] — [Your Name]"
                className="form-input text-sm" />
            </div>

            {/* Salutation */}
            <div className="space-y-1">
              <label className="form-label text-xs uppercase tracking-wide text-brand-muted">Salutation</label>
              <input value={salutation} onChange={e => { setSalutation(e.target.value); markDirty(); }}
                placeholder="Dear Hiring Manager,"
                className="form-input text-sm" />
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="form-label text-xs uppercase tracking-wide text-brand-muted">Letter body</label>
              <textarea
                value={body}
                onChange={e => { setBody(e.target.value); markDirty(); }}
                rows={18}
                placeholder="Your cover letter body — separate paragraphs with a blank line."
                className="form-input text-sm resize-y leading-relaxed"
              />
              <p className="form-hint">{wordCount} words · Aim for 350–450 words</p>
            </div>

            {/* Closing */}
            <div className="space-y-1">
              <label className="form-label text-xs uppercase tracking-wide text-brand-muted">Closing</label>
              <input value={closing} onChange={e => { setClosing(e.target.value); markDirty(); }}
                placeholder="Sincerely,"
                className="form-input text-sm" />
            </div>
          </div>
        </div>

        {/* ── Right: Rendered preview ──────────────────────────────────────────── */}
        <div className="hidden lg:block flex-1 min-w-0">
          <div className="sticky top-20">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-brand-muted" />
              <span className="text-sm font-medium text-brand-muted">Preview</span>
            </div>
            <div className="card p-10 max-h-[calc(100vh-180px)] overflow-y-auto font-serif text-sm leading-relaxed">
              {subject && (
                <p className="text-xs font-sans text-brand-muted uppercase tracking-wide mb-6">
                  Subject: {subject}
                </p>
              )}
              <p className="mb-6">{salutation}</p>
              {(body ?? '').split('\n\n').map((para, i) => (
                <p key={i} className="mb-4">{para}</p>
              ))}
              <p className="mt-8">{closing}</p>
              <p className="mt-1 font-semibold">
                {cl.title.replace(/Cover Letter ?[—-]?/i, '').trim() || '[Your Name]'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Rewrite drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRewrite && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowRewrite(false)} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-modal">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border shrink-0">
                <h2 className="font-semibold text-brand-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-orange" /> AI Rewrite
                </h2>
                <button onClick={() => setShowRewrite(false)} className="btn-ghost btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 px-5 py-5 space-y-4">
                <p className="text-sm text-brand-muted">
                  Describe what you want the AI to change. The factual content (experience, skills) will be preserved.
                </p>
                <div className="space-y-2">
                  <label className="form-label">Instructions</label>
                  <textarea
                    value={rewriteInstructions}
                    onChange={e => setRewriteInstructions(e.target.value)}
                    rows={5}
                    placeholder="e.g. Make it more confident and direct. Emphasize my leadership experience more. Shorten the opening paragraph."
                    className="form-input resize-none text-sm"
                  />
                  <p className="form-hint">{rewriteInstructions.length}/500 characters</p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    'Make it more concise',
                    'Make it more enthusiastic',
                    'Strengthen the opening',
                    'Add a stronger call to action',
                    'Make it more formal',
                  ].map(s => (
                    <button key={s} onClick={() => setRewriteInstructions(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-brand-border hover:border-brand-orange/40 hover:text-brand-orange transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-brand-border">
                <Button onClick={handleRewrite} variant="primary" loading={rewriting}
                  disabled={!rewriteInstructions.trim()} className="w-full flex items-center justify-center gap-2">
                  <Wand2 className="w-4 h-4" /> Rewrite body
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoverLetterEditor;
