import type { Env } from '../../config/env.js';

export interface ExtractionResult {
  summary: string;
  documentType: 'CONTRACT' | 'INVOICE' | 'PROPOSAL' | 'REPORT' | 'OTHER';
  entities: Record<string, unknown>;
  metadata: Record<string, unknown>;
  confidence: number;
  tokensUsed: number;
  modelUsed: string;
}

const EXTRACTION_PROMPT = `Analyze this business document and extract structured information.

Return a JSON object with these fields:
- summary: A concise 2-3 sentence summary of the document
- documentType: One of CONTRACT, INVOICE, PROPOSAL, REPORT, or OTHER
- entities: Key entities found (parties, amounts, dates, terms, etc.)
- metadata: Additional metadata (language, page count estimate, etc.)
- confidence: Your confidence score from 0.0 to 1.0

Document content:
`;

export class ClaudeService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly timeout: number;

  constructor(env: Pick<Env, 'ANTHROPIC_API_KEY' | 'ANTHROPIC_MODEL' | 'ANTHROPIC_MAX_RETRIES' | 'ANTHROPIC_TIMEOUT_MS'>) {
    this.apiKey = env.ANTHROPIC_API_KEY;
    this.model = env.ANTHROPIC_MODEL;
    this.maxRetries = env.ANTHROPIC_MAX_RETRIES;
    this.timeout = env.ANTHROPIC_TIMEOUT_MS;
  }

  async extractDocumentData(content: string): Promise<ExtractionResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: `${EXTRACTION_PROMPT}${content.slice(0, 100_000)}`,
              },
            ],
          }),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`Claude API ${response.status}: ${errorBody}`);
            continue;
          }
          throw new Error(`Claude API ${response.status}: ${errorBody}`);
        }

        const result = await response.json() as {
          content: Array<{ type: string; text: string }>;
          usage: { input_tokens: number; output_tokens: number };
        };

        const textBlock = result.content.find((b) => b.type === 'text');
        if (!textBlock) throw new Error('No text content in Claude response');

        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in Claude response');

        const parsed = JSON.parse(jsonMatch[0]) as {
          summary: string;
          documentType: string;
          entities: Record<string, unknown>;
          metadata: Record<string, unknown>;
          confidence: number;
        };

        return {
          summary: parsed.summary,
          documentType: this.normalizeDocType(parsed.documentType),
          entities: parsed.entities,
          metadata: parsed.metadata,
          confidence: Math.max(0, Math.min(1, parsed.confidence)),
          tokensUsed: result.usage.input_tokens + result.usage.output_tokens,
          modelUsed: this.model,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === this.maxRetries) break;
      }
    }

    throw lastError ?? new Error('Claude API extraction failed');
  }

  private normalizeDocType(type: string): ExtractionResult['documentType'] {
    const upper = type.toUpperCase();
    const valid = ['CONTRACT', 'INVOICE', 'PROPOSAL', 'REPORT', 'OTHER'] as const;
    return valid.includes(upper as typeof valid[number])
      ? (upper as ExtractionResult['documentType'])
      : 'OTHER';
  }
}
