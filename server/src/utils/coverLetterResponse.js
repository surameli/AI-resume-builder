import { GroqError } from './groq.js';

export const normalizeCoverLetterResponse = (data) => {
  const requiredTextFields = ['subject', 'salutation', 'body', 'closing'];
  const normalized = {};

  for (const field of requiredTextFields) {
    if (typeof data?.[field] !== 'string' || !data[field].trim()) {
      throw new GroqError(
        'AI could not generate a complete cover letter. Please try again.',
        502
      );
    }

    normalized[field] = data[field].trim();
  }

  const wordCount = normalized.body.match(/\S+/g)?.length ?? 0;
  if (wordCount === 0) {
    throw new GroqError(
      'AI could not generate a complete cover letter. Please try again.',
      502
    );
  }

  return { ...normalized, wordCount };
};
