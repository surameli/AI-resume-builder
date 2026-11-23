/**
 * Groq AI Client
 *
 * Wraps the Groq OpenAI-compatible API using native fetch (no extra dep).
 * - The model is configurable via GROQ_MODEL env var.
 * - Supports both regular chat completions and structured JSON output.
 * - Handles rate limits (429), token limits (400/413), and network errors gracefully.
 * - Exposes a single callGroq() function used by all AI services.
 *
 * Groq API docs: https://console.groq.com/docs
 *
 * IMPORTANT: The Groq API key NEVER leaves the backend. The frontend never
 * sees it and never calls Groq directly — all AI requests go through our API.
 */
import { env } from '../config/env.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Custom error class for Groq API failures.
 * Carries a statusCode so the error handler can send the right HTTP status.
 */
export class GroqError extends Error {
  constructor(message, statusCode = 500, groqError = null) {
    super(message);
    this.name = 'GroqError';
    this.statusCode = statusCode;
    this.groqError = groqError;
  }
}

/**
 * Calls the Groq chat completions endpoint.
 *
 * @param {Object} params
 * @param {Array}  params.messages      - Chat messages [{role, content}, ...]
 * @param {string} [params.model]       - Override the default model for this call
 * @param {number} [params.temperature]  - 0–2, lower = more deterministic
 * @param {number} [params.maxTokens]    - Max output tokens
 * @param {boolean} [params.jsonMode]    - If true, sets response_format to json_object
 * @returns {Promise<string>} The assistant's reply content (plain text or JSON string)
 *
 * @throws {GroqError} On any API failure (auth, rate limit, network, bad response)
 */
export const callGroq = async ({
  messages,
  model = env.GROQ_MODEL,
  temperature = 0.7,
  maxTokens = 4000,
  jsonMode = false,
}) => {
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new GroqError(
      'AI service is not configured. Set GROQ_API_KEY in the server .env file.',
      503
    );
  }

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Request structured JSON output — Groq will return valid JSON
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new GroqError(
      'Could not reach the AI service. Please check your internet connection and try again.',
      503
    );
  }

  // ─── Handle non-200 responses ──────────────────────────────────────────────

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errBody = await response.json();
      errorDetail = errBody?.error?.message || JSON.stringify(errBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    // Rate limited (429) — Groq returns retry info
    if (response.status === 429) {
      throw new GroqError(
        'AI request limit reached. Please wait a moment and try again.',
        429
      );
    }

    // Invalid API key or quota exhausted
    if (response.status === 401) {
      throw new GroqError(
        'AI service authentication failed. Check the GROQ_API_KEY setting.',
        503
      );
    }

    // Token limit exceeded
    if (response.status === 400 || response.status === 413) {
      throw new GroqError(
        'The input is too long for the AI to process. Please shorten the text and try again.',
        422
      );
    }

    // Generic server error from Groq
    throw new GroqError(
      `AI service returned an error (${response.status}). ${errorDetail}`,
      502
    );
  }

  // ─── Parse successful response ─────────────────────────────────────────────

  let data;
  try {
    data = await response.json();
  } catch {
    throw new GroqError('AI service returned an invalid response.', 502);
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new GroqError('AI service returned an empty response.', 502);
  }

  // Return usage info alongside content so callers can record AI usage
  return {
    content,
    usage: {
      promptTokens:     data?.usage?.prompt_tokens     ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens:      data?.usage?.total_tokens      ?? 0,
    },
  };
};

/**
 * Helper: calls Groq in JSON mode and parses the response as a JSON object.
 * If parsing fails, throws a GroqError with a clear message.
 *
 * @param {Array}  messages    - Chat messages
 * @param {string} [model]     - Model override
 * @param {number} [maxTokens] - Max output tokens
 * @returns {Promise<{ data: Object, usage: Object }>}
 */
export const callGroqJSON = async ({ messages, model, maxTokens = 4000, temperature = 0.5 }) => {
  const { content, usage } = await callGroq({
    messages,
    model,
    temperature,
    maxTokens,
    jsonMode: true,
  });

  // The content should be a valid JSON string when jsonMode is true.
  // Groq sometimes wraps it in markdown code fences — strip those if present.
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new GroqError(
      'AI returned an invalid response format. Please try again.',
      502
    );
  }

  return { data: parsed, usage };
};
