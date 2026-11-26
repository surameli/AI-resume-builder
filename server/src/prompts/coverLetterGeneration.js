/**
 * AI Prompts for Cover Letter Generation
 *
 * Like the resume prompt, the cover letter prompt uses ONLY the user's
 * real profile data. It never invents employment history, skills, or
 * qualifications. It personalizes the letter for the specific job and company.
 */

// ─── System prompt ─────────────────────────────────────────────────────────────

export const COVER_LETTER_SYSTEM_PROMPT = `You write natural, professional cover letters tailored to the candidate and role.

Use only facts present in the supplied candidate profile, resume summary, and job description. Never invent or embellish employment, skills, achievements, education, or qualifications. If a detail is missing, omit it.

Personalize the opening to the role and company when known. Highlight the 2–3 most relevant genuine experiences or skills, avoid resume repetition and clichés, and close with a clear call to action. Follow the requested tone, recipient, and length: 250–300 words for short or 350–450 words for standard.

Return exactly one JSON object with the properties subject, salutation, body, closing, and wordCount. The first four values must be strings and wordCount an integer. Include no extra properties, markdown fences, or text outside the JSON object.`;

export const COVER_LETTER_RESPONSE_SCHEMA = {
  name: 'cover_letter',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      salutation: { type: 'string' },
      body: { type: 'string' },
      closing: { type: 'string' },
      wordCount: { type: 'integer' },
    },
    required: ['subject', 'salutation', 'body', 'closing', 'wordCount'],
    additionalProperties: false,
  },
};

// ─── Build user message ─────────────────────────────────────────────────────────

/**
 * @param {Object} profile      - User's full profile from the database
 * @param {Object|null} job     - Target job description (optional)
 * @param {Object|null} resume  - Selected resume to draw from (optional)
 * @param {Object} preferences  - { tone, length, recipientName, recipientTitle }
 */
// export const buildCoverLetterUserPrompt = (profile, job, resume, preferences) => {
//   const {
//     tone            = 'professional',
//     length          = 'standard',
//     recipientName   = null,
//     recipientTitle  = null,
//   } = preferences;

//   const profileData = {
//     name:             `${profile.firstName} ${profile.lastName}`,
//     professionalTitle: profile.professionalTitle,
//     summary:          profile.summary,
//     experience: (profile.experiences ?? []).map(e => ({
//       company:         e.company,
//       jobTitle:        e.jobTitle,
//       isCurrent:       e.isCurrent,
//       responsibilities: e.responsibilities,
//       achievements:    e.achievements,
//     })),
//     skills:   (profile.skills ?? []).map(s => s.name),
//     projects: (profile.projects ?? []).map(p => ({ name: p.name, description: p.description })),
//     education: (profile.education ?? []).map(e => ({
//       institution: e.institution,
//       degree:      e.degree,
//       fieldOfStudy: e.fieldOfStudy,
//     })),
//     certifications: (profile.certifications ?? []).map(c => c.name),
//   };

//   const jobData = job ? {
//     title:        job.title,
//     company:      job.company,
//     rawText:      job.rawText?.substring(0, 2000),
//     extractedData: job.extractedData,
//   } : null;

//   const resumeSummary = resume?.content?.summary ?? null;

//   let prompt = `Write a cover letter based on the following candidate profile.

// CANDIDATE PROFILE (use ONLY this real data):
// ${JSON.stringify(profileData, null, 2)}
// `;

//   if (resumeSummary) {
//     prompt += `\nRESUME SUMMARY (use this for context):
// "${resumeSummary}"
// `;
//   }

//   if (jobData) {
//     prompt += `\nTARGET JOB (personalize the letter for this role and company):
// ${JSON.stringify(jobData, null, 2)}
// `;
//   } else {
//     prompt += `\nNo specific job provided. Write a general cover letter that positions the candidate strongly.
// `;
//   }

//   const recipient = recipientName
//     ? `${recipientName}${recipientTitle ? `, ${recipientTitle}` : ''}`
//     : jobData?.company
//       ? `Hiring Manager at ${jobData.company}`
//       : 'Hiring Manager';

//   prompt += `
// PREFERENCES:
// - Tone: ${tone} (professional = formal business; confident = assertive; enthusiastic = energetic; concise = direct and brief)
// - Length: ${length === 'short' ? '250–300 words' : '350–450 words'}
// - Address the letter to: ${recipient}

// Write the cover letter now. Return ONLY the JSON object — no markdown, no additional text.`;

//   return prompt;
// };

// ─── Rewrite prompt ─────────────────────────────────────────────────────────────


/**
 * Build a compact cover letter prompt.
 * Limits profile and job data to prevent oversized AI requests.
 */
export const buildCoverLetterUserPrompt = (profile, job, resume, preferences) => {
  const {
    tone = 'professional',
    length = 'standard',
    recipientName = null,
    recipientTitle = null,
  } = preferences ?? {};

  // Safely shorten text
  const limitText = (value, maxLength = 1000) => {
    if (!value) return '';

    const text =
      typeof value === 'string'
        ? value
        : Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  };

  // Keep only relevant profile information
  const profileData = {
    name: limitText(`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(), 100),

    professionalTitle: limitText(profile.professionalTitle, 120),

    summary: limitText(profile.summary, 500),

    experience: (profile.experiences ?? [])
      .slice(0, 3)
      .map(e => ({
        company: limitText(e.company, 100),
        jobTitle: limitText(e.jobTitle, 100),
        isCurrent: e.isCurrent,
        responsibilities: limitText(e.responsibilities, 300),
        achievements: limitText(e.achievements, 300),
      })),

    skills: (profile.skills ?? [])
      .slice(0, 15)
      .map(s => limitText(s.name, 60)),

    projects: (profile.projects ?? [])
      .slice(0, 2)
      .map(p => ({
        name: limitText(p.name, 100),
        description: limitText(p.description, 250),
      })),

    education: (profile.education ?? [])
      .slice(0, 2)
      .map(e => ({
        institution: limitText(e.institution, 100),
        degree: limitText(e.degree, 100),
        fieldOfStudy: limitText(e.fieldOfStudy, 100),
      })),

    certifications: (profile.certifications ?? [])
      .slice(0, 5)
      .map(c => limitText(c.name, 80)),
  };

  // Compact job information — don't send unlimited extractedData
  const jobData = job
    ? {
        title: limitText(job.title, 150),
        company: limitText(job.company, 150),
        rawText: limitText(job.rawText, 1500),
      }
    : null;

  // Limit resume summary
  const resumeSummary = limitText(
    resume?.content?.summary,
    500
  );

  let prompt = `Write a personalized cover letter based on the candidate's real information.

CANDIDATE PROFILE:
${JSON.stringify(profileData)}
`;

  if (resumeSummary) {
    prompt += `
RESUME SUMMARY:
${resumeSummary}
`;
  }

  if (jobData) {
    prompt += `
TARGET JOB:
${JSON.stringify(jobData)}
`;
  } else {
    prompt += `
Write a general cover letter suitable for job applications.
`;
  }

  const recipient = recipientName
    ? `${recipientName}${recipientTitle ? `, ${recipientTitle}` : ''}`
    : jobData?.company
      ? `Hiring Manager at ${jobData.company}`
      : 'Hiring Manager';

  prompt += `
PREFERENCES:
- Tone: ${tone}
- Length: ${length === 'short' ? '250–300 words' : '350–450 words'}
- Address the letter to: ${recipient}

RULES:
- Use ONLY the candidate's real information.
- Never invent skills, experience, achievements, or qualifications.
- Focus on the 2–3 most relevant experiences or skills.
- Avoid repeating the resume unnecessarily.
- Write a professional, natural, personalized letter.
- Return ONLY valid JSON.
`;

  return prompt;
};



export const REWRITE_COVER_LETTER_SYSTEM_PROMPT = `You are a professional cover letter editor.
Rewrite the provided cover letter according to the instructions. 
Preserve all factual information — never invent experience or skills.
Return JSON: { "body": "string — the rewritten cover letter body" }`;

export const buildRewritePrompt = (body, instructions) =>
  `Rewrite this cover letter:\n\n${body}\n\nInstructions: ${instructions}\n\nReturn ONLY JSON.`;
