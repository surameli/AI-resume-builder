/**
 * Profile page — the main container for all profile sections.
 *
 * Layout:
 *   - Left sidebar: completion card + tab navigation
 *   - Right content: active section component
 *
 * State management:
 *   - Fetches the full profile once on mount.
 *   - Passes section-specific data down to each child.
 *   - Each child calls onSaved / onListChange to bubble updates back up,
 *     keeping the completion bar and profile state in sync without
 *     needing a full page refetch.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User, Briefcase, GraduationCap, Zap,
  FolderOpen, Award, CheckCircle2, Circle,
} from 'lucide-react';
import { PageLoader } from '../../components/common/LoadingSpinner.jsx';
import Alert from '../../components/common/Alert.jsx';
import PersonalInfoSection   from './PersonalInfoSection.jsx';
import ExperienceSection     from './ExperienceSection.jsx';
import EducationSection      from './EducationSection.jsx';
import SkillsSection         from './SkillsSection.jsx';
import ProjectsSection       from './ProjectsSection.jsx';
import CertificationsSection from './CertificationsSection.jsx';
import * as profileService   from '../../services/profile.service.js';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'personal',       label: 'Personal Info',   icon: User,          key: null },
  { id: 'experience',     label: 'Experience',       icon: Briefcase,     key: 'experiences' },
  { id: 'education',      label: 'Education',        icon: GraduationCap, key: 'education' },
  { id: 'skills',         label: 'Skills',           icon: Zap,           key: 'skills' },
  { id: 'projects',       label: 'Projects',         icon: FolderOpen,    key: 'projects' },
  { id: 'certifications', label: 'Certifications',   icon: Award,         key: 'certifications' },
];

// ─── Completion bar ───────────────────────────────────────────────────────────

const CompletionCard = ({ percent }) => {
  const color = percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-brand-orange' : 'bg-red-400';
  const label = percent >= 80 ? 'Looking great!' : percent >= 50 ? 'Almost there' : 'Keep going';

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-brand-text">Profile strength</p>
        <span className={`text-sm font-bold ${percent >= 80 ? 'text-green-600' : percent >= 50 ? 'text-brand-orange' : 'text-red-500'}`}>
          {percent}%
        </span>
      </div>
      <div className="w-full bg-brand-border rounded-full h-2 mb-2">
        <motion.div
          className={`h-2 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-brand-muted">{label} — a complete profile helps the AI generate better resumes.</p>
    </div>
  );
};

// ─── Checklist card ───────────────────────────────────────────────────────────

const ChecklistCard = ({ profile }) => {
  const checks = [
    { label: 'Basic info & title',   done: !!(profile?.firstName && profile?.professionalTitle) },
    { label: 'Professional summary', done: !!profile?.summary },
    { label: 'Work experience',      done: (profile?.experiences?.length ?? 0) > 0 },
    { label: 'Education',            done: (profile?.education?.length    ?? 0) > 0 },
    { label: 'Skills (at least 3)',  done: (profile?.skills?.length       ?? 0) >= 3 },
    { label: 'Projects',             done: (profile?.projects?.length     ?? 0) > 0 },
  ];

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-brand-text mb-3">Checklist</p>
      <ul className="space-y-2">
        {checks.map(({ label, done }) => (
          <li key={label} className="flex items-center gap-2 text-xs">
            {done
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              : <Circle       className="w-4 h-4 text-brand-border shrink-0" />
            }
            <span className={done ? 'text-brand-text line-through opacity-60' : 'text-brand-muted'}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const Profile = () => {
  const [profile,    setProfile]    = useState(null);
  const [completion, setCompletion] = useState(0);
  const [activeTab,  setActiveTab]  = useState('personal');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // ── Fetch profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await profileService.getProfile();
        setProfile(data.data.profile);
        setCompletion(data.data.completion);
      } catch {
        setError('Failed to load profile. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Callback: personal info saved ─────────────────────────────────────────
  const handlePersonalSaved = useCallback((updatedProfile, newCompletion) => {
    setProfile(prev => ({ ...prev, ...updatedProfile }));
    if (newCompletion !== undefined) setCompletion(newCompletion);
  }, []);

  // ── Callback: sub-list changed (experience, education, etc.) ──────────────
  // Recalculates completion client-side to avoid a round-trip.
  const handleListChange = useCallback((section, newList) => {
    setProfile(prev => {
      const updated = { ...prev, [section]: newList };
      // Recalculate completion locally (mirrors backend logic)
      const c = calcCompletion(updated);
      setCompletion(c);
      return updated;
    });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">My Profile</h1>
        <p className="text-brand-muted text-sm mt-1">
          Keep your profile up to date. The AI uses this information to build tailored resumes.
        </p>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      <div className="flex gap-6 items-start">
        {/* ── Left sidebar ── */}
        <aside className="w-56 shrink-0 hidden lg:block sticky top-6">
          <CompletionCard percent={completion} />

          {/* Tab nav */}
          <nav className="card p-2 space-y-0.5">
            {TABS.map(({ id, label, icon: Icon, key }) => {
              const count = key && profile?.[key]?.length;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === id ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="text-[11px] bg-brand-orange/10 text-brand-orange rounded-full px-1.5 py-0.5 font-semibold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-4">
            <ChecklistCard profile={profile} />
          </div>
        </aside>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden w-full mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2 min-w-max">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === id ? 'bg-brand-orange text-white' : 'bg-white text-brand-muted border border-brand-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'personal' && (
            <PersonalInfoSection
              profile={profile}
              onSaved={handlePersonalSaved}
            />
          )}

          {activeTab === 'experience' && (
            <ExperienceSection
              experiences={profile?.experiences ?? []}
              onListChange={(list) => handleListChange('experiences', list)}
            />
          )}

          {activeTab === 'education' && (
            <EducationSection
              education={profile?.education ?? []}
              onListChange={(list) => handleListChange('education', list)}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsSection
              skills={profile?.skills ?? []}
              onListChange={(list) => handleListChange('skills', list)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsSection
              projects={profile?.projects ?? []}
              onListChange={(list) => handleListChange('projects', list)}
            />
          )}

          {activeTab === 'certifications' && (
            <CertificationsSection
              certifications={profile?.certifications ?? []}
              onListChange={(list) => handleListChange('certifications', list)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Client-side completion calculation (mirrors backend) ────────────────────

function calcCompletion(profile) {
  if (!profile) return 0;
  const checks = [
    !!(profile.firstName && profile.lastName),
    !!profile.professionalTitle,
    !!profile.summary,
    !!profile.photoUrl,
    (profile.experiences?.length    ?? 0) > 0,
    (profile.education?.length      ?? 0) > 0,
    (profile.skills?.length         ?? 0) >= 3,
    (profile.projects?.length       ?? 0) > 0,
    (profile.certifications?.length ?? 0) > 0,
  ];
  const weights = [10, 10, 15, 5, 20, 15, 15, 5, 5];
  return checks.reduce((t, p, i) => t + (p ? weights[i] : 0), 0);
}

export default Profile;
