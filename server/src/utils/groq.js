/**
 * Groq AI Client
 *
 * Wraps the Groq OpenAI-compatible API using native fetch (no extra dep).
 * - The model is configurable via GROQ_MODEL env var.
 * - Supports both regular chat completions and structured JSON output.
 * - Handles rate limits, context limits, and network errors gracefully.
 * - Exposes a single callGroq() function used by all AI services.
 *
 * Groq API docs: https://console.groq.com/docs
 *
 * IMPORTANT: The Groq API key NEVER leaves the backend. The frontend never
 * sees it and never calls Groq directly — all AI requests go through our API.
 */
import { env } from '../config/env.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const STRICT_JSON_SCHEMA_MODELS = new Set([
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
]);

const sanitizeLogValue = (value) =>
  typeof value === 'string'
    ? value.replace(/[^a-zA-Z0-9_./-]/g, '').slice(0, 80)
    : '';

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
 * @param {Object}  [params.jsonSchema]  - Strict JSON schema response format
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
  jsonSchema = null,
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
    max_completion_tokens: maxTokens,
  };

  if (jsonSchema) {
    body.response_format = { type: 'json_schema', json_schema: jsonSchema };
  } else if (jsonMode) {
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
    if (env.isDev) {
      console.error('[Groq API] Network request failed');
    }
    throw new GroqError(
      'Could not reach the AI service. Please check your internet connection and try again.',
      503
    );
  }

  // ─── Handle non-200 responses ──────────────────────────────────────────────

  if (!response.ok) {
    let errBody = null;
    try {
      errBody = await response.json();
    } catch {
      if (env.isDev) {
        console.error('[Groq API] Error response was not valid JSON', {
          status: response.status,
          model: sanitizeLogValue(model),
        });
      }
    }

    const providerError = errBody?.error ?? {};
    const errorCode = sanitizeLogValue(providerError.code);
    const errorType = sanitizeLogValue(providerError.type);
    const errorMessage =
      typeof providerError.message === 'string' ? providerError.message : '';
    const failedGenerationPresent =
      Object.prototype.hasOwnProperty.call(providerError, 'failed_generation');
    const jsonValidationFailed =
      /failed to validate json/i.test(errorMessage) ||
      /json[_ -]?(validation|validate)/i.test(`${errorCode} ${errorType}`);
    const errorText = `${errorCode} ${errorType} ${errorMessage}`.toLowerCase();
    const inputTooLong =
      response.status === 413 ||
      /context[_ ]length|context window|too many tokens|input.{0,30}too long|prompt.{0,30}too long|reduce the length of (the )?messages/.test(errorText);

    const reason = response.status === 429
      ? 'rate_limit'
      : response.status === 401
        ? 'authentication'
        : inputTooLong
          ? 'context_limit'
          : jsonValidationFailed
            ? 'json_validation'
            : 'provider_rejected_request';

    if (env.isDev) {
      console.error('[Groq API] Request failed', {
        status: response.status,
        model: sanitizeLogValue(model),
        code: errorCode,
        type: errorType,
        reason,
        message: jsonValidationFailed ? 'Failed to validate JSON' : undefined,
        failedGenerationPresent,
      });
    }

    const safeError = {
      status: response.status,
      code: errorCode,
      type: errorType,
      jsonValidationFailed,
      failedGenerationPresent,
    };

    if (response.status === 429) {
      throw new GroqError(
        'AI request limit reached. Please wait a moment and try again.',
        429,
        safeError
      );
    }

    if (response.status === 401) {
      throw new GroqError(
        'AI service authentication failed. Check the GROQ_API_KEY setting.',
        503,
        safeError
      );
    }

    if (inputTooLong) {
      throw new GroqError(
        'The input is too long for the AI to process. Please shorten the text and try again.',
        422,
        safeError
      );
    }

    if (jsonValidationFailed) {
      throw new GroqError(
        'AI could not format a complete response. Please try again.',
        502,
        safeError
      );
    }

    if (response.status === 400) {
      throw new GroqError(
        'AI service rejected the request. Check server configuration and try again.',
        502,
        safeError
      );
    }

    throw new GroqError(
      'AI service is temporarily unavailable. Please try again.',
      502,
      safeError
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
export const callGroqJSON = async ({
  messages,
  model,
  maxTokens = 4000,
  temperature = 0.5,
  jsonSchema = null,
}) => {
  const supportsStrictJsonSchema = jsonSchema &&
    STRICT_JSON_SCHEMA_MODELS.has(model ?? env.GROQ_MODEL);

  let response;
  try {
    response = await callGroq({
      messages,
      model,
      temperature,
      maxTokens,
      jsonMode: !supportsStrictJsonSchema,
      jsonSchema: supportsStrictJsonSchema ? jsonSchema : null,
    });
  } catch (error) {
    if (!supportsStrictJsonSchema || !error.groqError?.jsonValidationFailed) {
      throw error;
    }

    response = await callGroq({
      messages,
      model,
      temperature,
      maxTokens,
    });
  }

  const { content, usage } = response;

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
