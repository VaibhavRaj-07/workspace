import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { aiCache } from './ai.cache.js';

export interface ConflictingFieldInput {
  field: string;
  baseValue: string | null;
  myValue: string | null;
  theirValue: string | null;
}

export interface FieldMergeSuggestion {
  field: string;
  mergedValue: string;
  explanation: string;
  confidence: number; // 0.0 - 1.0
  strategyUsed: 'theirs' | 'mine' | 'synthesized_fallback' | 'llm_claude_sonnet';
}

export interface AiMergeSuggestionResponse {
  taskId: string;
  available: boolean;
  source: 'ml' | 'fallback';
  suggestions: Record<string, FieldMergeSuggestion>;
  summary: string;
}

export function isAnthropicKeyValid(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed.startsWith('sk-ant')) return false;
  const lower = trimmed.toLowerCase();
  if (['your-', 'placeholder', 'xxx', 'sample', 'test', 'demo'].some((p) => lower.includes(p))) {
    return false;
  }
  return trimmed.length > 20;
}

// Log once on startup
const isClaudeConfigured = isAnthropicKeyValid(env.ANTHROPIC_API_KEY) && !env.AI_PII_OPTOUT;
if (isClaudeConfigured) {
  logger.info('AI merge provider: Claude (claude-sonnet-4-6)');
} else {
  logger.info('AI merge provider: rule-based (no Anthropic key)');
}

export class AiMergeService {
  async generateMergeSuggestions(
    taskId: string,
    conflicts: Record<string, ConflictingFieldInput>,
    taskVersion: number = 1
  ): Promise<AiMergeSuggestionResponse> {
    if (!env.AI_FEATURES_ENABLED) {
      return {
        taskId,
        available: false,
        source: 'fallback',
        suggestions: {},
        summary: 'AI features are disabled by configuration',
      };
    }

    const cacheKey = aiCache.generateKey(taskId, taskVersion, 'ai_merge_' + Object.keys(conflicts).sort().join('_'));
    const cached = aiCache.get<AiMergeSuggestionResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions: Record<string, FieldMergeSuggestion> = {};
    let usedClaude = false;

    for (const [field, data] of Object.entries(conflicts)) {
      try {
        const suggestion = await this.mergeField(field, data);
        suggestions[field] = suggestion;
        if (suggestion.strategyUsed === 'llm_claude_sonnet') {
          usedClaude = true;
        }
      } catch (err: any) {
        logger.warn({ err: err.message, field }, 'Failed to generate AI merge for field');
        suggestions[field] = this.heuristicMerge(field, data);
      }
    }

    const response: AiMergeSuggestionResponse = {
      taskId,
      available: true,
      source: usedClaude ? 'ml' : 'fallback',
      suggestions,
      summary: `Generated suggestions for ${Object.keys(suggestions).length} conflicting field(s). Review and apply via resolve-conflict.`,
    };

    aiCache.set(cacheKey, response, 300);
    return response;
  }

  private async mergeField(field: string, data: ConflictingFieldInput): Promise<FieldMergeSuggestion> {
    const base = this.sanitizeText(data.baseValue || '');
    const mine = this.sanitizeText(data.myValue || '');
    const theirs = this.sanitizeText(data.theirValue || '');

    if (mine === theirs) {
      return {
        field,
        mergedValue: mine,
        explanation: 'Both users made identical changes',
        confidence: 1.0,
        strategyUsed: 'theirs',
      };
    }

    if (!mine) {
      return {
        field,
        mergedValue: theirs,
        explanation: 'Retained remote update as local update was empty',
        confidence: 0.95,
        strategyUsed: 'theirs',
      };
    }

    if (!theirs) {
      return {
        field,
        mergedValue: mine,
        explanation: 'Retained local update as remote update was empty',
        confidence: 0.95,
        strategyUsed: 'mine',
      };
    }

    // Call Anthropic Claude ONLY if a genuine valid key is configured
    if (isAnthropicKeyValid(env.ANTHROPIC_API_KEY) && !env.AI_PII_OPTOUT) {
      try {
        return await this.callClaudeMerge(field, base, mine, theirs);
      } catch (error: any) {
        logger.warn({ error: error.message }, 'Claude API merge failed within timeout, falling back to clean rule-based merge');
      }
    }

    return this.heuristicMerge(field, data);
  }

  private async callClaudeMerge(
    field: string,
    base: string,
    mine: string,
    theirs: string
  ): Promise<FieldMergeSuggestion> {
    const prompt = `You are a collaborative conflict-resolution assistant for a project workspace.
Two users edited the "${field}" of a task concurrently.

Original Base Text:
"""
${base}
"""

User A's Version (Mine):
"""
${mine}
"""

User B's Version (Theirs):
"""
${theirs}
"""

Task:
Produce a cleanly merged text that reconciles both users' intents without duplicate information or contradictory statements.
Respond ONLY with a valid JSON object matching this schema:
{
  "mergedValue": "string (the merged text, max 2000 chars)",
  "explanation": "string (one concise sentence explaining how the merge combined both edits)",
  "confidence": number (float between 0.0 and 1.0)
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // Strict 2s budget

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Claude API returned status ${res.status}`);
      }

      const json = (await res.json()) as any;
      const content = json.content?.[0]?.text;
      if (!content) throw new Error('Empty response from Claude');

      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        field,
        mergedValue: String(parsed.mergedValue || mine).slice(0, 2000),
        explanation: String(parsed.explanation || 'Combined changes from both collaborators'),
        confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.85)),
        strategyUsed: 'llm_claude_sonnet',
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * High-quality deterministic 3-way text synthesis fallback when LLM is unavailable
   */
  private heuristicMerge(field: string, data: ConflictingFieldInput): FieldMergeSuggestion {
    const base = (data.baseValue || '').trim();
    const mine = (data.myValue || '').trim();
    const theirs = (data.theirValue || '').trim();

    // Clean any name prefix artifacts (e.g. "Sarah: ..." or "Alex: ...")
    const cleanMine = mine.replace(/^([A-Za-z]+[ws]*):s*/i, '').trim();
    const cleanTheirs = theirs.replace(/^([A-Za-z]+[ws]*):s*/i, '').trim();

    if (field === 'title') {
      if (cleanMine.toLowerCase().includes(cleanTheirs.toLowerCase())) {
        return {
          field,
          mergedValue: cleanMine,
          explanation: 'Retained more comprehensive title containing peer additions',
          confidence: 0.9,
          strategyUsed: 'synthesized_fallback',
        };
      }
      if (cleanTheirs.toLowerCase().includes(cleanMine.toLowerCase())) {
        return {
          field,
          mergedValue: cleanTheirs,
          explanation: 'Retained more comprehensive title containing peer additions',
          confidence: 0.9,
          strategyUsed: 'synthesized_fallback',
        };
      }

      const mergedTitle = cleanTheirs === cleanMine ? cleanTheirs : `${cleanTheirs} & ${cleanMine}`;
      return {
        field,
        mergedValue: mergedTitle,
        explanation: 'Combined distinct title concepts cleanly without data loss',
        confidence: 0.85,
        strategyUsed: 'synthesized_fallback',
      };
    }

    // For descriptions / rich text: de-duplicated paragraph & sentence union
    const pTheirs = cleanTheirs.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    const pMine = cleanMine.split(/\n+/).map((p) => p.trim()).filter(Boolean);

    const mergedParagraphs: string[] = [];
    const seen = new Set<string>();

    for (const p of [...pTheirs, ...pMine]) {
      const norm = p.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(norm)) {
        seen.add(norm);
        mergedParagraphs.push(p);
      }
    }

    const mergedValue = mergedParagraphs.join('\n\n');

    return {
      field,
      mergedValue: mergedValue || cleanMine || cleanTheirs,
      explanation: 'Merged distinct paragraphs and updates from both collaborators cleanly',
      confidence: 0.88,
      strategyUsed: 'synthesized_fallback',
    };
  }

  private sanitizeText(text: string): string {
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF]/g, '').trim();
  }
}

export const aiMergeService = new AiMergeService();
