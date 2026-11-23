/**
 * AI Prompts for Job Description Analysis
 *
 * These prompts instruct the Groq model to extract structured information
 * from a raw job vacancy text. The model returns a JSON object that we
 * validate on the backend before saving to the database.
 *
 * Design principles:
 * - Extract only what's actually in the text — never invent information.
 * - If a field is not mentioned, return null or an empty array.
 * - ATS keywords are the most important extraction for later resume matching.
 */

// ─── System prompt for job analysis ──────────────────────────────────────────

export const JOB_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst and recruitment specialist.

Your task is to analyze a job description and extract structured information from it.

RULES:
1. Extract ONLY information that is explicitly stated in the job description.
2. Never invent or assume information that is not present.
3. If a field is not mentioned in the job description, return null for strings or an empty array for lists.
4. Identify ATS keywords — these are the specific terms an ATS would scan for (technologies, methodologies, certifications, tools, and industry terms).
5. Separate technical skills (hard skills, tools, technologies) from soft skills (communication, leadership, teamwork).
6. For responsibilities, extract the actual duties described, not the requirements.
7. Be concise — each list item should be a short phrase, not a full sentence.

You must respond with a valid JSON object matching this exact structure:
{
  "jobTitle": "string or null — the exact job title from the posting",
  "company": "string or null — the company name if mentioned",
  "location": "string or null — job location if mentioned",
  "employmentType": "string or null — full-time, part-time, contract, etc.",
  "remote": "boolean — true if remote/hybrid work is offered",
  "yearsOfExperience": "string or null — e.g. '3-5 years' as stated",
  "educationRequirements": ["array of strings — e.g. 'Bachelor's degree in Computer Science'"],
  "technicalSkills": ["array of strings — e.g. 'JavaScript', 'React', 'PostgreSQL'"],
  "softSkills": ["array of strings — e.g. 'Communication', 'Leadership'"],
  "responsibilities": ["array of strings — key duties and responsibilities"],
  "requiredQualifications": ["array of strings — must-have requirements"],
  "preferredQualifications": ["array of strings — nice-to-have requirements"],
  "atsKeywords": ["array of strings — all keywords an ATS would scan for, including technologies, tools, methodologies, and certifications"],
  "salaryRange": "string or null — salary info if mentioned",
  "summary": "string or null — a 1-2 sentence summary of the role"
}`;

// ─── Build the user message with the job text ─────────────────────────────────

/**
 * Creates the user message for the job analysis request.
 * @param {string} rawText - The full job description text
 * @returns {string} The formatted user prompt
 */
export const buildJobAnalysisUserPrompt = (rawText) => {
  return `Analyze the following job description and extract all structured information according to the specified JSON format.

JOB DESCRIPTION:
"""
${rawText}
"""

Extract all available information. Return ONLY the JSON object — no explanations, no markdown, no additional text.`;
};
