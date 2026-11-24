/**
 * Templates browse page — shows all available resume templates with
 * live preview cards, category filter, and a "Use template" button.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout, Sparkles, ChevronRight, Lock } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.jsx';
import Alert from '../../components/common/Alert.jsx';
import ResumePreview from '../../components/resume/ResumePreview.jsx';
import { DEFAULT_TEMPLATES, getTemplates } from '../../services/templates.service.js';
import { useAuth } from '../../context/AuthContext.jsx';

// ─── Sample resume content for previewing templates ────────────────────────────

const SAMPLE_CONTENT = {
  summary: 'Experienced software engineer with 5+ years building scalable web applications. Passionate about clean architecture, developer experience, and delivering impactful products.',
  skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST APIs', 'Git'],
  experiences: [
    {
      company: 'Acme Technologies',
      jobTitle: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2021-03-01',
      endDate: null,
      isCurrent: true,
      bulletPoints: [
        'Led development of a customer-facing React dashboard serving 50,000+ users',
        'Reduced API response time by 60% through query optimization and caching',
        'Mentored 3 junior engineers and established code review standards',
      ],
    },
    {
      company: 'StartupCo',
      jobTitle: 'Software Engineer',
      location: 'Remote',
      startDate: '2019-06-01',
      endDate: '2021-02-28',
      isCurrent: false,
      bulletPoints: [
        'Built and maintained RESTful APIs serving mobile and web clients',
        'Collaborated with product and design teams in an agile environment',
      ],
    },
  ],
  education: [
    {
      institution: 'State University',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2015-09-01',
      graduationDate: '2019-05-01',
    },
  ],
  projects: [
    {
      name: 'CareerCraft AI',
      description: 'AI-powered resume builder using React, Node.js, and Groq API.',
      technologies: ['React', 'Node.js', 'PostgreSQL'],
    },
  ],
  certifications: [
    { name: 'AWS Solutions Architect', issuingOrg: 'Amazon Web Services', issueDate: '2023-01-15' },
  ],
  customSections: [],
};

const SAMPLE_PROFILE = {
  firstName: 'Jane',
  lastName: 'Doe',
  professionalTitle: 'Senior Software Engineer',
  email: 'jane.doe@example.com',
  phone: '+1 (555) 000-0000',
  location: 'San Francisco, CA',
  linkedinUrl: 'https://linkedin.com/in/janedoe',
  githubUrl: 'https://github.com/janedoe',
};

const CATEGORIES = ['all', 'professional', 'modern', 'minimalist', 'technical', 'creative', 'executive', 'graduate', 'academic'];

// ─── Template card ──────────────────────────────────────────────────────────────

const TemplateCard = ({ template, isSelected, onSelect, isAuthenticated }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group rounded-2xl border overflow-hidden transition-all cursor-pointer
        ${isSelected ? 'border-brand-orange shadow-card' : 'border-brand-border hover:border-brand-orange/40 hover:shadow-soft'}`}
      onClick={() => onSelect(template)}
    >
      {/* Preview area */}
      <div className="bg-gray-50 h-56 overflow-hidden relative p-3">
        <div className="scale-[0.45] origin-top-left w-[222%]">
          <ResumePreview
            content={SAMPLE_CONTENT}
            profile={SAMPLE_PROFILE}
            settings={{ accentColor: '#E58A45', fontSize: 12, font: 'Inter' }}
            template={template.slug}
          />
        </div>

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-brand-dark/60 flex flex-col items-center justify-center gap-2 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          {template.isPremium && !isAuthenticated ? (
            <div className="flex flex-col items-center gap-1">
              <Lock className="w-5 h-5 text-white" />
              <p className="text-white text-xs">Premium template</p>
            </div>
          ) : (
            <Link
              to={`/resume/create?template=${template.slug}`}
              className="btn-primary btn-sm flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Sparkles className="w-3.5 h-3.5" /> Use template
            </Link>
          )}
        </div>

        {/* Premium badge */}
        {template.isPremium && (
          <div className="absolute top-2 right-2 badge badge-orange flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Pro
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center">
            <ChevronRight className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-text">{template.name}</p>
            <p className="text-xs text-brand-muted capitalize mt-0.5">{template.category}</p>
          </div>
          <span className="text-xs text-brand-muted">{template.isPremium ? 'Pro' : 'Free'}</span>
        </div>
        {template.description && (
          <p className="text-xs text-brand-muted mt-2 leading-relaxed">{template.description}</p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────────

const Templates = () => {
  const { isAuthenticated } = useAuth();
  const [templates,     setTemplates]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [selectedCat,   setSelectedCat]   = useState('all');
  const [selectedSlug,  setSelectedSlug]  = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getTemplates();
        const availableTemplates = data?.data?.templates;
        setTemplates(
          Array.isArray(availableTemplates) && availableTemplates.length > 0
            ? availableTemplates
            : DEFAULT_TEMPLATES
        );
      } catch {
        setTemplates(DEFAULT_TEMPLATES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = selectedCat === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCat);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Resume Templates</h1>
        <p className="text-brand-muted text-sm mt-1">
          Professionally designed templates — hover to preview, then use with the AI generator.
        </p>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap capitalize transition-colors
              ${selectedCat === cat
                ? 'bg-brand-orange text-white'
                : 'bg-white text-brand-muted border border-brand-border hover:border-brand-orange/40'}`}
          >
            {cat === 'all' ? 'All templates' : cat}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <p className="text-sm text-brand-muted mb-4">{filtered.length} templates</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                isSelected={selectedSlug === t.slug}
                onSelect={(tmpl) => setSelectedSlug(tmpl.slug)}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>

          {/* CTA */}
          {selectedSlug && (
            <div className="mt-8 flex justify-center">
              <Link to={`/resume/create?template=${selectedSlug}`} className="btn-primary btn-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Use {templates.find(t => t.slug === selectedSlug)?.name} template
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Templates;
