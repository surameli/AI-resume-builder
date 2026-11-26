import { describe, expect, test } from '@jest/globals';
import {
  COVER_LETTER_RESPONSE_SCHEMA,
  COVER_LETTER_SYSTEM_PROMPT,
} from '../src/prompts/coverLetterGeneration.js';
import { normalizeCoverLetterResponse } from '../src/utils/coverLetterResponse.js';

describe('cover letter generation prompt', () => {
  test('requires exactly five fields with an integer word count', () => {
    const schema = COVER_LETTER_RESPONSE_SCHEMA.schema;
    expect(schema.required).toEqual([
      'subject',
      'salutation',
      'body',
      'closing',
      'wordCount',
    ]);
    expect(schema.properties.wordCount.type).toBe('integer');
    expect(schema.additionalProperties).toBe(false);
    expect(COVER_LETTER_SYSTEM_PROMPT).toContain('no extra properties');
  });

  test('normalizes valid output and computes the body word count', () => {
    const result = normalizeCoverLetterResponse({
      subject: 'Application for Designer',
      salutation: 'Dear Hiring Manager,',
      body: 'I can help your team.\n\nThank you for your time.',
      closing: 'Sincerely,',
      wordCount: 999,
      unexpected: 'discarded',
    });

    expect(result).toEqual({
      subject: 'Application for Designer',
      salutation: 'Dear Hiring Manager,',
      body: 'I can help your team.\n\nThank you for your time.',
      closing: 'Sincerely,',
      wordCount: 10,
    });
  });

  test('rejects incomplete or empty generated letters', () => {
    expect(() => normalizeCoverLetterResponse({
      subject: 'Application',
      salutation: 'Dear Hiring Manager,',
      body: ' ',
      closing: 'Sincerely,',
    })).toThrow('AI could not generate a complete cover letter.');
  });
});
