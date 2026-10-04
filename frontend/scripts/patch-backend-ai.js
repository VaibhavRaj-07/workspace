import fs from 'fs';
import path from 'path';

const backendRoot = 'C:\\Users\\HP\\OneDrive\\Desktop\\algo bknd';

// 1. Update ai.merge.service.ts
const mergeServicePath = path.join(backendRoot, 'src/modules/ai/ai.merge.service.ts');
const mergeServiceCode = `import { env } from '../../config/env.js';
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
      summary: \`Generated suggestions for \${Object.keys(suggestions).length} conflicting field(s). Review and apply via resolve-conflict.\`,
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
    const prompt = \`You are a collaborative conflict-resolution assistant for a project workspace.
Two users edited the "\${field}" of a task concurrently.

Original Base Text:
\"\"\"
\${base}
\"\"\"

User A's Version (Mine):
\"\"\"
\${mine}
\"\"\"

User B's Version (Theirs):
\"\"\"
\${theirs}
\"\"\"

Task:
Produce a cleanly merged text that reconciles both users' intents without duplicate information or contradictory statements.
Respond ONLY with a valid JSON object matching this schema:
{
  "mergedValue": "string (the merged text, max 2000 chars)",
  "explanation": "string (one concise sentence explaining how the merge combined both edits)",
  "confidence": number (float between 0.0 and 1.0)
}\`;

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
        throw new Error(\`Claude API returned status \${res.status}\`);
      }

      const json = (await res.json()) as any;
      const content = json.content?.[0]?.text;
      if (!content) throw new Error('Empty response from Claude');

      const cleanJson = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
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
    const cleanMine = mine.replace(/^([A-Za-z]+[\w\s]*):\s*/i, '').trim();
    const cleanTheirs = theirs.replace(/^([A-Za-z]+[\w\s]*):\s*/i, '').trim();

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

      const mergedTitle = cleanTheirs === cleanMine ? cleanTheirs : \`\${cleanTheirs} & \${cleanMine}\`;
      return {
        field,
        mergedValue: mergedTitle,
        explanation: 'Combined distinct title concepts cleanly without data loss',
        confidence: 0.85,
        strategyUsed: 'synthesized_fallback',
      };
    }

    // For descriptions / rich text: de-duplicated paragraph & sentence union
    const pTheirs = cleanTheirs.split(/\\n+/).map((p) => p.trim()).filter(Boolean);
    const pMine = cleanMine.split(/\\n+/).map((p) => p.trim()).filter(Boolean);

    const mergedParagraphs: string[] = [];
    const seen = new Set<string>();

    for (const p of [...pTheirs, ...pMine]) {
      const norm = p.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(norm)) {
        seen.add(norm);
        mergedParagraphs.push(p);
      }
    }

    const mergedValue = mergedParagraphs.join('\\n\\n');

    return {
      field,
      mergedValue: mergedValue || cleanMine || cleanTheirs,
      explanation: 'Merged distinct paragraphs and updates from both collaborators cleanly',
      confidence: 0.88,
      strategyUsed: 'synthesized_fallback',
    };
  }

  private sanitizeText(text: string): string {
    return text.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\uD800-\\uDFFF]/g, '').trim();
  }
}

export const aiMergeService = new AiMergeService();
`;
fs.writeFileSync(mergeServicePath, mergeServiceCode, 'utf8');
console.log('✓ Updated ai.merge.service.ts');

// 2. Update ai.similarity.service.ts
const similarityServicePath = path.join(backendRoot, 'src/modules/ai/ai.similarity.service.ts');
let simCode = fs.readFileSync(similarityServicePath, 'utf8');
if (!simCode.includes('source: embedRes.available')) {
  simCode = simCode.replace(
    'available: embedRes.available,',
    `available: embedRes.available,\n      source: embedRes.available ? 'ml' : 'fallback',`
  );
  simCode = simCode.replace(
    'export interface CheckDuplicatesResponse {',
    `export interface CheckDuplicatesResponse {\n  source?: 'ml' | 'fallback';`
  );
  fs.writeFileSync(similarityServicePath, simCode, 'utf8');
  console.log('✓ Updated ai.similarity.service.ts with source field');
}

// 3. Update ai.assignee.service.ts
const assigneeServicePath = path.join(backendRoot, 'src/modules/ai/ai.assignee.service.ts');
let assCode = fs.readFileSync(assigneeServicePath, 'utf8');
if (!assCode.includes('source: embedRes.available')) {
  assCode = assCode.replace(
    `algorithm: embedRes.available ? 'ml_semantic_hybrid' : 'workload_fallback',`,
    `algorithm: embedRes.available ? 'ml_semantic_hybrid' : 'workload_fallback',\n      source: embedRes.available ? 'ml' : 'fallback',`
  );
  assCode = assCode.replace(
    'export interface SuggestAssigneeResponse {',
    `export interface SuggestAssigneeResponse {\n  source?: 'ml' | 'fallback';`
  );
  fs.writeFileSync(assigneeServicePath, assCode, 'utf8');
  console.log('✓ Updated ai.assignee.service.ts with source field');
}

// 4. Update ai.controller.ts to include getAiStatus
const controllerPath = path.join(backendRoot, 'src/modules/ai/ai.controller.ts');
const controllerCode = `import { Request, Response, NextFunction } from 'express';
import { aiMergeService, isAnthropicKeyValid } from './ai.merge.service.js';
import { aiSimilarityService } from './ai.similarity.service.js';
import { aiAssigneeService } from './ai.assignee.service.js';
import { aiRiskService } from './ai.risk.service.js';
import { aiClient } from './ai.client.js';
import { mlCircuitBreaker } from './ai.circuit-breaker.js';
import { ApiResponse } from '../../utils/api-response.js';
import { env } from '../../config/env.js';

export class AiController {
  async getAiStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const mergeProvider = isAnthropicKeyValid(env.ANTHROPIC_API_KEY) && !env.AI_PII_OPTOUT ? 'claude' : 'rule_based';
      const health = await aiClient.checkHealth();
      const rawBreakerState = mlCircuitBreaker.getState().toLowerCase();
      const breaker = (rawBreakerState === 'closed' ? 'closed' : rawBreakerState === 'half_open' ? 'half_open' : 'open') as 'closed' | 'open' | 'half_open';

      return ApiResponse.success(res, {
        mergeProvider,
        mlService: health.available ? 'up' : 'down',
        breaker,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMergeSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const { conflicts, baseVersion } = req.body;
      const result = await aiMergeService.generateMergeSuggestions(
        taskId,
        conflicts,
        baseVersion
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async checkDuplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const { title, description, threshold } = req.body;
      const result = await aiSimilarityService.checkDuplicates(
        projectId,
        title,
        description,
        threshold
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async suggestAssignee(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const { title, description, priority } = req.query as any;
      const result = await aiAssigneeService.suggestAssignees(
        projectId,
        title,
        description,
        priority
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getTaskRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const risk = await aiRiskService.getTaskRisk(taskId);
      return ApiResponse.success(res, risk);
    } catch (error) {
      next(error);
    }
  }

  async getProjectRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const risk = await aiRiskService.getProjectRisk(projectId);
      return ApiResponse.success(res, risk);
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
`;
fs.writeFileSync(controllerPath, controllerCode, 'utf8');
console.log('✓ Updated ai.controller.ts with getAiStatus');

// 5. Update ai.routes.ts to mount GET /status on general AI router
const routesPath = path.join(backendRoot, 'src/modules/ai/ai.routes.ts');
const routesCode = `import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  aiMergeSuggestionSchema,
  checkDuplicatesSchema,
  suggestAssigneeSchema,
  taskRiskSchema,
  projectRiskSchema,
} from './ai.schema.js';
import { ProjectRole } from '@prisma/client';

// Global AI status router (/ai/...)
export const globalAiRouter = Router();
globalAiRouter.get('/status', (req, res, next) => aiController.getAiStatus(req, res, next));

// Router for task-scoped AI operations (/tasks/:id/...)
export const taskAiRouter = Router({ mergeParams: true });
taskAiRouter.use(authenticateJWT);

taskAiRouter.post(
  '/:id/ai-merge-suggestion',
  validate(aiMergeSuggestionSchema),
  (req, res, next) => aiController.getMergeSuggestion(req, res, next)
);

taskAiRouter.get(
  '/:id/risk',
  validate(taskRiskSchema),
  (req, res, next) => aiController.getTaskRisk(req, res, next)
);

// Router for project-scoped AI operations (/projects/:id/...)
export const projectAiRouter = Router({ mergeParams: true });
projectAiRouter.use(authenticateJWT);

projectAiRouter.post(
  '/tasks/check-duplicates',
  requireProjectRole(ProjectRole.viewer),
  validate(checkDuplicatesSchema),
  (req, res, next) => aiController.checkDuplicates(req, res, next)
);

projectAiRouter.get(
  '/tasks/suggest-assignee',
  requireProjectRole(ProjectRole.viewer),
  validate(suggestAssigneeSchema),
  (req, res, next) => aiController.suggestAssignee(req, res, next)
);

projectAiRouter.get(
  '/risk',
  requireProjectRole(ProjectRole.viewer),
  validate(projectRiskSchema),
  (req, res, next) => aiController.getProjectRisk(req, res, next)
);
`;
fs.writeFileSync(routesPath, routesCode, 'utf8');
console.log('✓ Updated ai.routes.ts');

// 6. Update app.ts to mount /ai router
const appPath = path.join(backendRoot, 'src/app.ts');
let appCode = fs.readFileSync(appPath, 'utf8');
if (!appCode.includes("import { taskAiRouter, projectAiRouter, globalAiRouter }")) {
  appCode = appCode.replace(
    "import { taskAiRouter, projectAiRouter } from './modules/ai/ai.routes.js';",
    "import { taskAiRouter, projectAiRouter, globalAiRouter } from './modules/ai/ai.routes.js';"
  );
  appCode = appCode.replace(
    "apiV1.use('/auth', authRoutes);",
    "apiV1.use('/ai', globalAiRouter);\napiV1.use('/auth', authRoutes);"
  );
  fs.writeFileSync(appPath, appCode, 'utf8');
  console.log('✓ Mounted /api/v1/ai/status in app.ts');
}

// 7. Add backend .env.example
const envExamplePath = path.join(backendRoot, '.env.example');
const envExampleContent = `# Environment Configuration
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/algo_workspace?schema=public

# JWT Secrets
JWT_SECRET=super-secret-jwt-access-token-key-32chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super-secret-jwt-refresh-token-key-32chars
JWT_REFRESH_EXPIRES_IN=7d

# CORS & Rate Limiting
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=2000

# File Storage
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_BYTES=10485760

# Real-time / Socket.IO
SOCKET_EVENT_BUFFER_SIZE=500
REDIS_URL=

# Cron Scheduler
DEADLINE_CHECK_CRON= */5 * * * *

# ML / AI Service Configuration
ML_SERVICE_URL=http://localhost:8000
AI_FEATURES_ENABLED=true

# ANTHROPIC API KEY: Optional.
# Leave empty to use built-in intelligent rule-based 3-way conflict synthesis without external AI calls.
# Set your "sk-ant-..." key here to enable Claude 3.5 / Sonnet LLM merge synthesis.
ANTHROPIC_API_KEY=
AI_PII_OPTOUT=false
SIMILARITY_THRESHOLD=0.80
`;
fs.writeFileSync(envExamplePath, envExampleContent, 'utf8');
console.log('✓ Created backend .env.example');

// 8. Add backend .gitignore
const backendGitignorePath = path.join(backendRoot, '.gitignore');
const backendGitignoreContent = `node_modules/
dist/
build/
coverage/
.env
.env.local
.env.*.local
uploads/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
`;
fs.writeFileSync(backendGitignorePath, backendGitignoreContent, 'utf8');
console.log('✓ Created backend .gitignore');

console.log('\n🎉 ALL BACKEND AI & STATUS PATCHES APPLIED SUCCESSFULLY');
