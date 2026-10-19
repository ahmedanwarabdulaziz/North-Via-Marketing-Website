import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { groqFetch, trackGemini, type AiFeature } from './ai-usage';

// Asks the AI for a JSON object: Groq first (fast, its own daily quota), then Gemini models in
// turn. Images go straight to Gemini (Groq has no vision model on this account). A model that
// fails rests for a while so the next request doesn't wait on it again.

const restUntil = new Map<string, number>();
const resting = (model: string) => Date.now() < (restUntil.get(model) || 0);
const rest = (model: string, ms: number) => restUntil.set(model, Date.now() + ms);

function restFor(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  if (/\b429\b/.test(detail)) return /per day|daily|\b(RPD|TPD)\b/i.test(detail) ? 60 * 60_000 : 2 * 60_000;
  return 10 * 60_000;
}

const GEMINI_CHAIN = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];

export interface AiImage {
  data: string; // base64
  mimeType: string;
}

export async function aiJson(opts: {
  system: string;
  user: string;
  feature: AiFeature;
  image?: AiImage;
  timeBudgetMs?: number;
}): Promise<Record<string, unknown>> {
  const deadline = Date.now() + (opts.timeBudgetMs ?? 45_000);
  let lastError: unknown = new Error('No AI model is available right now.');

  const groqModel = process.env.GROQ_TASK_MODEL || 'openai/gpt-oss-120b';
  if (!opts.image && process.env.GROQ_API_KEY && !resting('groq')) {
    try {
      const data = await groqFetch<{ choices?: Array<{ message?: { content?: string } }> }>(
        'chat/completions',
        {
          model: groqModel,
          temperature: 0.2,
          max_tokens: 4096, // includes the model's reasoning
          reasoning_effort: 'low',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
        },
        { model: groqModel, feature: opts.feature }
      );
      return JSON.parse(data.choices?.[0]?.message?.content || '') as Record<string, unknown>;
    } catch (error) {
      lastError = error;
      console.error(`AI (${opts.feature}): Groq failed:`, error instanceof Error ? error.message.slice(0, 200) : error);
      if (!(error instanceof SyntaxError)) rest('groq', restFor(error));
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw lastError;
  const genAI = new GoogleGenerativeAI(apiKey);
  const healthy = GEMINI_CHAIN.filter((m) => !resting(m));
  const parts = opts.image ? [{ text: opts.user }, { inlineData: { mimeType: opts.image.mimeType, data: opts.image.data } }] : opts.user;
  for (const modelName of healthy.length ? healthy : GEMINI_CHAIN) {
    const timeLeft = deadline - Date.now();
    if (timeLeft < 5_000) break;
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          systemInstruction: opts.system,
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: 'application/json' },
        },
        { timeout: Math.min(opts.image ? 30_000 : 15_000, timeLeft) }
      );
      const result = await trackGemini(modelName, opts.feature, () => model.generateContent(parts));
      return JSON.parse(result.response.text()) as Record<string, unknown>;
    } catch (error) {
      lastError = error;
      console.error(`AI (${opts.feature}): ${modelName} failed:`, error instanceof Error ? error.message.slice(0, 200) : error);
      if (!(error instanceof SyntaxError)) rest(modelName, restFor(error));
    }
  }
  throw lastError;
}

const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMS = 768;

/** A 768-number meaning vector for search, or null when the embedding model is unavailable. */
export async function embedText(text: string, kind: 'document' | 'query'): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text.trim() || resting(EMBEDDING_MODEL)) return null;
  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: EMBEDDING_MODEL }, { timeout: 10_000 });
    const result = await trackGemini(EMBEDDING_MODEL, 'knowledge', () =>
      model.embedContent({
        content: { role: 'user', parts: [{ text: text.slice(0, 8000) }] },
        taskType: kind === 'query' ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: EMBEDDING_DIMS,
      } as Parameters<typeof model.embedContent>[0])
    );
    const values = result.embedding.values;
    return values.length === EMBEDDING_DIMS ? values : null;
  } catch (error) {
    console.error('Embedding failed:', error instanceof Error ? error.message.slice(0, 200) : error);
    rest(EMBEDDING_MODEL, restFor(error));
    return null;
  }
}
