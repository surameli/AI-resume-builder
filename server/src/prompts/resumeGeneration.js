/**
 * AI Prompts for Resume Generation
 *
 * The resume generation prompt is the most critical AI prompt in the app.
 * It takes the user's REAL profile data (from the database) and a job
 * description, and produces a tailored resume that:
 *   - Uses ONLY the user's actual experience, education, skills, etc.
 *   - NEVER invents companies, dates, degrees, certifications, or achievements.
 *   - Incorporates job description keywords naturally.
 *   - Prioritizes information most relevant to the target role.
 *   - Improves writing quality without changing factual meaning.
 *
 * The AI returns a JSON object matching the resume content structure
 * stored in the Resume.content field in the database.
 */

// ─── System prompt ────────────────────────────────────────────────────────────

export const RESUME_GENERATION_SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist.

Your task is to generate a tailored, professional resume based on a user's REAL profile data and a target job description.

ABSOLUTE RULES — VIOLATING THESE IS UNACCEPTABLE:
1. NEVER invent or fabricate any information. If the user doesn't have a particular skill, experience, or qualification, don't include it.
2. NEVER invent company names, job titles, employment dates, education institutions, degrees, certifications, or achievements.
3. NEVER create fake numerical results or metrics (e.g., "increased revenue by 40%") unless the user explicitly stated them.
4. NEVER claim skills the user does not have. Only use skills listed in their profile.
5. IMPROVE the writing of existing content — don't change the facts. Rephrase for impact, clarity, and professionalism.
6. PRIORITIZE information most relevant to the target job. If the user has 5 past jobs and only 2 are relevant, focus on those 2 with more detail.
7. INCORPORATE keywords from the job description naturally — don't just stuff them in. Use them where they genuinely apply.
8. Keep bullet points concise (1-2 lines each) and start with strong action verbs.
9. Support both entry-level (less experience, focus on education/projects) and experienced (more work history detail) candidates.

You must respond with a valid JSON object matching this structure:
{
  "summary": "string — 2-4 sentence professional summary tailored to the target role. Uses the user's real title and experience. Does not claim skills they don't have.",
  "skills": ["array of strings — skills from the user's profile that are relevant to the job, ordered by relevance"],
  "experiences": [
    {
      "company": "string — from user profile, NEVER invented",
      "jobTitle": "string — from user profile, NEVER invented",
      "location": "string or null — from user profile",
      "startDate": "string — ISO format from user profile",
      "endDate": "string or null — from user profile",
      "isCurrent": "boolean — from user profile",
      "bulletPoints": ["array of strings — 3-5 achievement-focused bullet points derived from the user's actual responsibilities and achievements. Start with action verbs. Never invent metrics that aren't in the source data."]
    }
  ],
  "education": [
    {
      "institution": "string — from user profile, NEVER invented",
      "degree": "string — from user profile",
      "fieldOfStudy": "string or null — from user profile",
      "startDate": "string — ISO format from user profile",
      "graduationDate": "string or null — from user profile",
      "description": "string or null — optional, only if user provided one"
    }
  ],
  "projects": [
    {
      "name": "string — from user profile",
      "description": "string — rewritten to be more impactful, but factually accurate",
      "technologies": ["array of strings — from user profile"],
      "projectUrl": "string or null — from user profile"
    }
  ],
  "certifications": [
    {
      "name": "string — from user profile",
      "issuingOrg": "string — from user profile",
      "issueDate": "string or null — ISO format from user profile",
      "credentialUrl": "string or null — from user profile"
    }
  ],
  "customSections": []
}

NOTES:
- Only include experiences, education, projects, and certifications that exist in the user's profile.
- Omit sections entirely if the user has no data for them (use empty arrays).
- The "summary" should position the candidate for THIS specific job without lying.
- "bulletPoints" should be derived from the user's "responsibilities" and "achievements" fields, rewritten for impact but factually accurate.
- If the job description asks for skills the user doesn't have, simply omit those skills. Don't mention the gap.`;

// ─── Build user message with profile + job data ────────────────────────────────

/**
 * Builds the user message containing the candidate's profile data
 * and the target job description.
 *
 * @param {Object} profile - The user's full profile from the database
 * @param {Object|null} jobDescription - The target job description (with extractedData)
 * @param {Object} preferences - Generation preferences
 * @param {string} preferences.tone - 'professional' | 'confident' | 'friendly' | 'concise'
 * @param {string} preferences.language - 'en' | 'es' | 'fr' etc.
 * @param {string} preferences.length - 'short' (1 page) | 'medium' (1-2 pages) | 'full' (2+ pages)
 * @param {string[]} preferences.includeSections - Which sections to include
 * @returns {string} The formatted user prompt
 */
export const buildResumeGenerationUserPrompt = (profile, jobDescription, preferences) => {
  const { tone = 'professional', language = 'en', length = 'medium', includeSections } = preferences;

  // ── Format the user's profile data ──────────────────────────────────────────

  const profileData = {
    personalInfo: {
      firstName:         profile.firstName,
      lastName:          profile.lastName,
      professionalTitle: profile.professionalTitle,
      summary:           profile.summary,
    },
    experience: (profile.experiences ?? []).map(e => ({
      company:          e.company,
      jobTitle:         e.jobTitle,
      employmentType:   e.employmentType,
      location:         e.location,
      startDate:        e.startDate,
      endDate:          e.endDate,
      isCurrent:        e.isCurrent,
      responsibilities: e.responsibilities,
      achievements:     e.achievements,
    })),
    education: (profile.education ?? []).map(ed => ({
      institution:    ed.institution,
      degree:         ed.degree,
      fieldOfStudy:   ed.fieldOfStudy,
      startDate:      ed.startDate,
      graduationDate: ed.graduationDate,
      gpa:            ed.gpa,
      description:    ed.description,
    })),
    skills: (profile.skills ?? []).map(s => ({
      name:             s.name,
      category:         s.category,
      proficiencyLevel: s.proficiencyLevel,
    })),
    projects: (profile.projects ?? []).map(p => ({
      name:         p.name,
      description:  p.description,
      technologies: p.technologies,
      projectUrl:   p.projectUrl,
      startDate:    p.startDate,
      endDate:      p.endDate,
    })),
    certifications: (profile.certifications ?? []).map(c => ({
      name:           c.name,
      issuingOrg:     c.issuingOrg,
      issueDate:      c.issueDate,
      expirationDate: c.expirationDate,
      credentialUrl:  c.credentialUrl,
    })),
  };

  // ── Format the job description (if provided) ────────────────────────────────

  const jobData = jobDescription
    ? {
        title:          jobDescription.title,
        company:        jobDescription.company,
        rawText:        jobDescription.rawText?.substring(0, 3000),
        extractedData:  jobDescription.extractedData,
      }
    : null;

  // ── Build the prompt ──────────────────────────────────────────────────────────

  let prompt = `Generate a tailored resume based on the following candidate profile data.

CANDIDATE PROFILE (this is REAL data from the candidate's account — use ONLY this information):
${JSON.stringify(profileData, null, 2)}

`;

  if (jobData) {
    prompt += `TARGET JOB DESCRIPTION (tailor the resume for this role):
${JSON.stringify(jobData, null, 2)}

Use the job description's required skills and keywords to prioritize and tailor the candidate's experience. Only include skills the candidate actually has. Incorporate relevant keywords naturally into bullet points and the summary.
`;
  } else {
    prompt += `No specific job description provided. Generate a general professional resume that highlights the candidate's strongest qualifications.
`;
  }

  prompt += `
GENERATION PREFERENCES:
- Tone: ${tone}
- Language: ${language}
- Length: ${length === 'short' ? '1 page (concise, most relevant info only)' : length === 'medium' ? '1-2 pages (balanced detail)' : '2+ pages (comprehensive)'}
${includeSections ? `- Sections to include: ${includeSections.join(', ')}` : ''}

Generate the resume now. Return ONLY the JSON object — no explanations, no markdown, no additional text.`;

  return prompt;
};

// ─── Content improvement prompt ──────────────────────────────────────────────

export const IMPROVE_CONTENT_SYSTEM_PROMPT = `You are a professional resume writer and editor.

Your task is to improve a piece of resume content — making it more impactful, concise, and professional — WITHOUT changing the factual meaning or inventing any information.

RULES:
1. Never invent metrics, numbers, or achievements that aren't in the original text.
2. Preserve all factual information (company names, dates, technologies, responsibilities).
3. Improve clarity, conciseness, and impact. Use strong action verbs.
4. If the original text is already good, make minor refinements only.
5. If the user provides specific instructions (e.g. "make it shorter", "add more detail"), follow them.

Respond with a JSON object:
{
  "improvedContent": "string — the improved version of the content"
}`;

export const buildImproveContentUserPrompt = (content, instructions = '') => {
  let prompt = `Improve the following resume content.\n\nCONTENT TO IMPROVE:\n${content}`;
  if (instructions.trim()) {
    prompt += `\n\nSPECIFIC INSTRUCTIONS:\n${instructions.trim()}`;
  }
  prompt += `\n\nReturn the improved content as a JSON object with an "improvedContent" field. Return ONLY JSON — no explanations.`;
  return prompt;
};
