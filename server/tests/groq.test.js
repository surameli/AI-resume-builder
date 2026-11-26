import { afterEach, describe, expect, test } from '@jest/globals';

const originalApiKey = process.env.GROQ_API_KEY;
process.env.GROQ_API_KEY = 'test-api-key';
const { callGroq, callGroqJSON } = await import('../src/utils/groq.js');
const { env } = await import('../src/config/env.js');
if (originalApiKey === undefined) {
  delete process.env.GROQ_API_KEY;
} else {
  process.env.GROQ_API_KEY = originalApiKey;
}

const originalFetch = global.fetch;
const originalConsoleError = console.error;
const originalIsDev = env.isDev;

afterEach(() => {
  global.fetch = originalFetch;
  console.error = originalConsoleError;
  env.isDev = originalIsDev;
});

describe('callGroq request handling', () => {
  test('uses the current max_completion_tokens request field', async () => {
    let requestBody;
    global.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: {},
        }),
      };
    };

    await callGroq({ messages: [], maxTokens: 900 });

    expect(requestBody.max_completion_tokens).toBe(900);
    expect(requestBody.max_tokens).toBeUndefined();
  });

  test('reports context-limit errors as input too long', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'context_length_exceeded',
          message: 'Maximum context length exceeded',
        },
      }),
    });

    await expect(callGroq({ messages: [] })).rejects.toMatchObject({
      statusCode: 422,
      message: 'The input is too long for the AI to process. Please shorten the text and try again.',
    });
  });

  test('does not mislabel other bad requests as input too long', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'unsupported_parameter',
          message: 'Unsupported parameter',
        },
      }),
    });

    await expect(callGroq({ messages: [] })).rejects.toMatchObject({
      statusCode: 502,
      message: 'AI service rejected the request. Check server configuration and try again.',
    });
  });

  test('uses strict JSON schema mode for GPT-OSS models', async () => {
    let requestBody;
    global.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"value":"ok"}' } }],
          usage: {},
        }),
      };
    };
    const jsonSchema = {
      name: 'test_result',
      strict: true,
      schema: {
        type: 'object',
        properties: { value: { type: 'string' } },
        required: ['value'],
        additionalProperties: false,
      },
    };

    await callGroqJSON({
      messages: [],
      model: 'openai/gpt-oss-120b',
      jsonSchema,
    });

    expect(requestBody.response_format).toEqual({
      type: 'json_schema',
      json_schema: jsonSchema,
    });
  });

  test('falls back to JSON object mode for models without strict schema support', async () => {
    let requestBody;
    global.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"value":"ok"}' } }],
          usage: {},
        }),
      };
    };

    await callGroqJSON({
      messages: [],
      model: 'llama-3.3-70b-versatile',
      jsonSchema: {
        name: 'test_result',
        strict: true,
        schema: {
          type: 'object',
          properties: { value: { type: 'string' } },
          required: ['value'],
          additionalProperties: false,
        },
      },
    });

    expect(requestBody.response_format).toEqual({ type: 'json_object' });
  });

  test('retries strict-schema validation failures once without logging failed_generation', async () => {
    let requestCount = 0;
    global.fetch = async (_url, options) => {
      requestCount += 1;
      const requestBody = JSON.parse(options.body);

      if (requestCount === 1) {
        expect(requestBody.response_format.type).toBe('json_schema');
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: 'json_validate_failed',
              type: 'invalid_request_error',
              message: 'Failed to validate JSON. See failed_generation.',
              failed_generation: 'private candidate information',
            },
          }),
        };
      }

      expect(requestBody.response_format).toBeUndefined();
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"value":"recovered"}' } }],
          usage: {},
        }),
      };
    };
    env.isDev = true;
    const loggedErrors = [];
    console.error = (...args) => loggedErrors.push(args);

    const result = await callGroqJSON({
      messages: [],
      model: 'openai/gpt-oss-120b',
      jsonSchema: {
        name: 'test_result',
        strict: true,
        schema: {
          type: 'object',
          properties: { value: { type: 'string' } },
          required: ['value'],
          additionalProperties: false,
        },
      },
    });

    expect(requestCount).toBe(2);
    expect(result.data).toEqual({ value: 'recovered' });
    expect(JSON.stringify(loggedErrors)).toContain('Failed to validate JSON');
    expect(JSON.stringify(loggedErrors)).not.toContain('private candidate information');
    expect(JSON.stringify(loggedErrors)).not.toContain('test-api-key');
  });

  test.each([
    [429, 429, 'AI request limit reached. Please wait a moment and try again.'],
    [401, 503, 'AI service authentication failed. Check the GROQ_API_KEY setting.'],
    [413, 422, 'The input is too long for the AI to process. Please shorten the text and try again.'],
  ])('preserves status handling for upstream HTTP %i', async (upstreamStatus, expectedStatus, expectedMessage) => {
    global.fetch = async () => ({
      ok: false,
      status: upstreamStatus,
      json: async () => ({ error: { message: 'provider error' } }),
    });

    await expect(callGroq({ messages: [] })).rejects.toMatchObject({
      statusCode: expectedStatus,
      message: expectedMessage,
    });
  });
});
