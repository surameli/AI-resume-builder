/**
 * ResumePreview — renders a visual preview of a resume.
 *
 * The content is completely independent of the template. Switching templates
 * changes only the visual layout, not the data.
 *
 * Templates supported:
 *   professional — single column, classic, ATS-friendly
 *   modern      — accent bar header, section dividers
 *   minimalist  — maximum whitespace, no decoration
 *   technical   — two-column skills layout, emphasis on tech
 *   creative    — colorful header, rounded sections
 *   executive   — centered header, serif feel
 *   graduate    — education-first layout for students
 *   academic    — CV-style, publications-focused
 *
 * Settings: font, fontSize, accentColor, margins, sectionsOrder
 */

// ─── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return ''; }
};

const dateRange = (start, end, isCurrent) => {
  const s = fmtDate(start);
  const e = isCurrent ? 'Present' : fmtDate(end);
  return `${s}${s && e ? ' — ' : ''}${e}`;
};

// ─── Section Components ─────────────────────────────────────────────────────────

const SectionTitle = ({ children, template, accentColor }) => {
  const styles = {
    professional: 'text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-3',
    modern:       'text-sm font-semibold uppercase tracking-wide pb-1 mb-3 border-b-2',
    minimalist:   'text-sm font-semibold uppercase tracking-widest border-b border-gray-200 pb-1 mb-4',
    technical:    'text-xs font-bold uppercase tracking-wider border-b pb-1 mb-2',
    creative:     'text-sm font-bold uppercase tracking-wide mb-2',
    executive:    'text-xs font-bold uppercase tracking-widest text-center border-b border-gray-300 pb-1 mb-3',
    graduate:     'text-xs font-bold uppercase tracking-widest border-b border-gray-300 pb-1 mb-3',
    academic:     'text-sm font-bold uppercase tracking-wide border-b border-gray-400 pb-0.5 mb-2',
  };

  const style = styles[template] || styles.professional;

  if (template === 'modern' || template === 'creative' || template === 'technical') {
    return <h3 className={style} style={{ borderColor: accentColor, color: accentColor }}>{children}</h3>;
  }
  return <h3 className={style}>{children}</h3>;
};

// ─── Experience section ─────────────────────────────────────────────────────────

const ExperienceSection = ({ experiences, template, accentColor }) => {
  if (!experiences?.length) return null;
  return (
    <div>
      <SectionTitle template={template} accentColor={accentColor}>Experience</SectionTitle>
      <div className="space-y-3">
        {experiences.map((exp, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-sm">{exp.jobTitle || ''}</p>
              <p className="text-xs text-gray-500 shrink-0">{dateRange(exp.startDate, exp.endDate, exp.isCurrent)}</p>
            </div>
            <p className="text-xs text-gray-600 mb-1">
              {exp.company}{exp.location ? ` · ${exp.location}` : ''}
            </p>
            {exp.bulletPoints?.length > 0 && (
              <ul className="list-disc list-outside ml-4 text-xs space-y-0.5 mt-1">
                {exp.bulletPoints.map((bp, j) => (
                  <li key={j} className="leading-relaxed">{bp}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Education section ──────────────────────────────────────────────────────────

const EducationSection = ({ education, template, accentColor }) => {
  if (!education?.length) return null;
  return (
    <div>
      <SectionTitle template={template} accentColor={accentColor}>Education</SectionTitle>
      <div className="space-y-2">
        {education.map((ed, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-sm">{ed.degree}{ed.fieldOfStudy ? `, ${ed.fieldOfStudy}` : ''}</p>
              <p className="text-xs text-gray-500 shrink-0">
                {dateRange(ed.startDate, ed.graduationDate, !ed.graduationDate)}
              </p>
            </div>
            <p className="text-xs text-gray-600">{ed.institution}</p>
            {ed.gpa && <p className="text-xs text-gray-500">GPA: {ed.gpa}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Skills section ──────────────────────────────────────────────────────────────

const SkillsSection = ({ skills, template, accentColor }) => {
  if (!skills?.length) return null;
  return (
    <div>
      <SectionTitle template={template} accentColor={accentColor}>Skills</SectionTitle>
      {template === 'technical' ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {skills.map((s, i) => (
            <p key={i} className="text-xs flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: accentColor }} />
              {s}
            </p>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full"
              style={template === 'creative' || template === 'modern'
                ? { background: `${accentColor}15`, color: accentColor }
                : { background: '#f3f4f6' }
              }
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Projects section ────────────────────────────────────────────────────────────

const ProjectsSection = ({ projects, template, accentColor }) => {
  if (!projects?.length) return null;
  return (
    <div>
      <SectionTitle template={template} accentColor={accentColor}>Projects</SectionTitle>
      <div className="space-y-2">
        {projects.map((p, i) => (
          <div key={i}>
            <p className="font-semibold text-sm">{p.name}</p>
            {p.description && <p className="text-xs text-gray-600 mt-0.5">{p.description}</p>}
            {p.technologies?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {p.technologies.map((t, j) => (
                  <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Certifications section ──────────────────────────────────────────────────────

const CertificationsSection = ({ certifications, template, accentColor }) => {
  if (!certifications?.length) return null;
  return (
    <div>
      <SectionTitle template={template} accentColor={accentColor}>Certifications</SectionTitle>
      <div className="space-y-1">
        {certifications.map((c, i) => (
          <div key={i} className="text-xs">
            <span className="font-medium">{c.name}</span>
            <span className="text-gray-500"> — {c.issuingOrg}</span>
            {c.issueDate && <span className="text-gray-400"> · {fmtDate(c.issueDate)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Custom Sections ─────────────────────────────────────────────────────────────

const CustomSections = ({ customSections, template, accentColor }) => {
  if (!customSections?.length) return null;
  return (
    <>
      {customSections.map((section, i) => (
        <div key={i}>
          <SectionTitle template={template} accentColor={accentColor}>{section.title}</SectionTitle>
          <ul className="list-disc list-outside ml-4 text-xs space-y-0.5">
            {section.content?.map((item, j) => (
              <li key={j} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────────

const ResumeHeader = ({ profile, content, template, accentColor }) => {
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Your Name';
  const title = profile?.professionalTitle || content?.title || '';

  if (template === 'executive') {
    return (
      <div className="text-center mb-7 pb-4 border-b-2 border-gray-800">
        <h1 className="text-3xl font-normal tracking-wide font-serif">{fullName}</h1>
        {title && <p className="text-sm text-gray-600 mt-1 uppercase tracking-widest">{title}</p>}
        <ContactInfo profile={profile} centered />
      </div>
    );
  }

  if (template === 'creative') {
    return (
      <div className="rounded-xl p-5 mb-6" style={{ background: `${accentColor}10`, borderLeft: `6px solid ${accentColor}` }}>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: accentColor }}>{fullName}</h1>
        {title && <p className="text-sm text-gray-600 mt-0.5">{title}</p>}
        <ContactInfo profile={profile} />
      </div>
    );
  }

  if (template === 'academic') {
    return (
      <div className="text-center mb-6 pb-3 border-b border-gray-400">
        <h1 className="text-2xl font-bold font-serif tracking-tight">{fullName}</h1>
        {title && <p className="text-sm text-gray-700 mt-1 italic">{title}</p>}
        <ContactInfo profile={profile} centered />
      </div>
    );
  }

  if (template === 'modern') {
    return (
      <div className="mb-6 border-t-4 pt-4" style={{ borderColor: accentColor }}>
        <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
        {title && <p className="text-sm mt-0.5" style={{ color: accentColor }}>{title}</p>}
        <ContactInfo profile={profile} />
      </div>
    );
  }

  if (template === 'graduate') {
    return (
      <div className="mb-6 pb-3 border-b-2 border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
        {title && <p className="text-sm text-gray-600 mt-0.5">{title}</p>}
        <ContactInfo profile={profile} />
      </div>
    );
  }

  return (
    <div className={`mb-6 ${template === 'technical' ? 'border-b-2 pb-3' : ''}`}
      style={template === 'technical' ? { borderColor: accentColor } : {}}>
      <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
      {title && <p className="text-sm text-gray-600 mt-0.5">{title}</p>}
      <ContactInfo profile={profile} />
    </div>
  );
};

// ─── Contact Info ────────────────────────────────────────────────────────────────

const ContactInfo = ({ profile, centered }) => (
  <div className={`text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-0.5 ${centered ? 'justify-center' : ''}`}>
    {profile?.email && <span>{profile.email}</span>}
    {profile?.phone && <span>{profile.phone}</span>}
    {profile?.location && <span>{profile.location}</span>}
    {profile?.linkedinUrl && <span>LinkedIn</span>}
    {profile?.githubUrl && <span>GitHub</span>}
    {profile?.portfolioUrl && <span>Portfolio</span>}
  </div>
);

// ─── Main ResumePreview component ─────────────────────────────────────────────────

const ResumePreview = ({ content, profile, settings, template = 'professional' }) => {
  // Merge settings with defaults
  const accentColor = settings?.accentColor || '#E58A45';
  const fontSize     = settings?.fontSize || 12;
  const font         = settings?.font || 'Inter';
  const margins      = {
    top: 40,
    bottom: 40,
    left: 48,
    right: 48,
    ...settings?.margins,
  };

  // Section order: use settings.sectionsOrder or default order
  const defaultOrder = template === 'graduate'
    ? ['education', 'experiences', 'summary', 'skills', 'projects', 'certifications', 'customSections']
    : ['summary', 'skills', 'experiences', 'education', 'projects', 'certifications', 'customSections'];
  const sectionOrder = settings?.sectionsOrder?.length ? settings.sectionsOrder : defaultOrder;

  // Build a map of section renderers
  const sectionRenderers = {
    summary:        () => content?.summary ? (
      <div>
        <SectionTitle template={template} accentColor={accentColor}>Summary</SectionTitle>
        <p className="text-xs leading-relaxed text-gray-700">{content.summary}</p>
      </div>
    ) : null,
    skills:         () => <SkillsSection skills={content?.skills} template={template} accentColor={accentColor} />,
    experiences:    () => <ExperienceSection experiences={content?.experiences} template={template} accentColor={accentColor} />,
    education:      () => <EducationSection education={content?.education} template={template} accentColor={accentColor} />,
    projects:       () => <ProjectsSection projects={content?.projects} template={template} accentColor={accentColor} />,
    certifications: () => <CertificationsSection certifications={content?.certifications} template={template} accentColor={accentColor} />,
    customSections: () => <CustomSections customSections={content?.customSections} template={template} accentColor={accentColor} />,
  };

  const renderSections = (sections) => sections.map((sectionKey) => {
    const renderer = sectionRenderers[sectionKey];
    return renderer ? <div key={sectionKey}>{renderer()}</div> : null;
  });

  const pageStyle = {
    fontFamily: `'${font}', system-ui, sans-serif`,
    fontSize: `${fontSize}px`,
    padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
    maxWidth: '100%',
    minHeight: '400px',
    color: '#1f2937',
  };

  return (
    <div
      className={`bg-white mx-auto ${template === 'minimalist' ? '' : 'shadow-soft rounded-lg'}`}
      style={pageStyle}
    >
      {/* Header */}
      <ResumeHeader profile={profile} content={content} template={template} accentColor={accentColor} />

      {template === 'technical' ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)] gap-6">
          <div className="space-y-5">
            {renderSections(sectionOrder.filter((key) => key !== 'skills' && key !== 'certifications'))}
          </div>
          <aside className="space-y-5 border-l border-gray-200 pl-4">
            {renderSections(sectionOrder.filter((key) => key === 'skills' || key === 'certifications'))}
          </aside>
        </div>
      ) : (
        <div className="space-y-5">{renderSections(sectionOrder)}</div>
      )}
    </div>
  );
};

export default ResumePreview;
