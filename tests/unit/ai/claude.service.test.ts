import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeService } from '../../../src/infrastructure/ai/claude.service.js';

const mockEnv = {
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
  ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
  ANTHROPIC_MAX_RETRIES: 2,
  ANTHROPIC_TIMEOUT_MS: 5000,
};

function mockFetchResponse(body: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('ClaudeService', () => {
  let service: ClaudeService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    service = new ClaudeService(mockEnv);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('extracts document data from Claude response', async () => {
    globalThis.fetch = mockFetchResponse({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'This is a rental agreement between Company A and Company B.',
            documentType: 'CONTRACT',
            entities: { parties: ['Company A', 'Company B'], amount: '$5000/month' },
            metadata: { language: 'en', pages: 3 },
            confidence: 0.92,
          }),
        },
      ],
      usage: { input_tokens: 1500, output_tokens: 300 },
    });

    const result = await service.extractDocumentData('Sample contract text...');

    expect(result.summary).toContain('rental agreement');
    expect(result.documentType).toBe('CONTRACT');
    expect(result.entities).toHaveProperty('parties');
    expect(result.confidence).toBe(0.92);
    expect(result.tokensUsed).toBe(1800);
    expect(result.modelUsed).toBe('claude-sonnet-4-20250514');

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('sk-ant-test-key');
  });

  it('normalizes unknown document type to OTHER', async () => {
    globalThis.fetch = mockFetchResponse({
      content: [
        {
          type: 'text',
          text: '{"summary":"x","documentType":"MEMO","entities":{},"metadata":{},"confidence":0.5}',
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await service.extractDocumentData('Some memo');
    expect(result.documentType).toBe('OTHER');
  });

  it('clamps confidence to [0, 1]', async () => {
    globalThis.fetch = mockFetchResponse({
      content: [
        {
          type: 'text',
          text: '{"summary":"x","documentType":"INVOICE","entities":{},"metadata":{},"confidence":1.5}',
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await service.extractDocumentData('Invoice text');
    expect(result.confidence).toBe(1.0);
  });

  it('retries on 429 rate limit', async () => {
    const rateLimitedFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('rate limited'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: [
              {
                type: 'text',
                text: '{"summary":"ok","documentType":"REPORT","entities":{},"metadata":{},"confidence":0.8}',
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
      });
    globalThis.fetch = rateLimitedFetch;

    const result = await service.extractDocumentData('Report text');
    expect(result.summary).toBe('ok');
    expect(rateLimitedFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 server error', async () => {
    const serverErrorFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('server error'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: [
              {
                type: 'text',
                text: '{"summary":"ok","documentType":"INVOICE","entities":{},"metadata":{},"confidence":0.9}',
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
      });
    globalThis.fetch = serverErrorFetch;

    const result = await service.extractDocumentData('Invoice');
    expect(result.summary).toBe('ok');
    expect(serverErrorFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on non-retryable 400 error', async () => {
    globalThis.fetch = mockFetchResponse({ error: 'bad request' }, 400);

    await expect(service.extractDocumentData('bad input')).rejects.toThrow('Claude API 400');
  });

  it('throws after exhausting retries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('server down'),
    });

    await expect(service.extractDocumentData('text')).rejects.toThrow();
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws when response has no JSON', async () => {
    globalThis.fetch = mockFetchResponse({
      content: [{ type: 'text', text: 'No JSON here, just plain text' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    await expect(service.extractDocumentData('text')).rejects.toThrow('No JSON found');
  });

  it('truncates input to 100k characters', async () => {
    globalThis.fetch = mockFetchResponse({
      content: [
        {
          type: 'text',
          text: '{"summary":"ok","documentType":"OTHER","entities":{},"metadata":{},"confidence":0.5}',
        },
      ],
      usage: { input_tokens: 50000, output_tokens: 100 },
    });

    const longContent = 'x'.repeat(200_000);
    await service.extractDocumentData(longContent);

    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    const messageContent = body.messages[0].content as string;
    expect(messageContent.length).toBeLessThan(101_000);
  });
});
