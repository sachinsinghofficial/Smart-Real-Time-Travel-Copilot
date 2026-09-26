import { GoogleGenAI } from "@google/genai";

export type GeminiTransientStatus = 408 | 429 | 500 | 502 | 503 | 504;

export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
    for (const value of [candidate.status, candidate.statusCode, candidate.code]) {
      const numberValue = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(numberValue) && numberValue >= 400 && numberValue < 600) return numberValue;
    }
  }
  return undefined;
}

export function isTransientGeminiError(error: unknown) {
  const status = getErrorStatus(error);
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(baseMs: number) {
  return Math.round(baseMs + Math.random() * 350);
}

export function getGeminiModels() {
  const configured = process.env.GEMINI_MODEL?.trim();
  const candidates = [
    configured,
    "gemini-3.6-flash",
    "gemini-2.5-flash",
  ].filter(Boolean) as string[];

  return [...new Set(candidates)];
}

export function friendlyGeminiFallbackMessage() {
  return "AI is temporarily busy. We switched to TravelSetu's backup planner so you can continue your trip without interruption.";
}

export async function generateStructuredContent(args: {
  contents: string;
  responseSchema: object;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is missing");

  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45000 } });
  const models = getGeminiModels();
  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];
    for (let attempt = 0; attempt < 1; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: args.contents,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 24000,
            temperature: 0.35,
            responseSchema: args.responseSchema,
          },
        });
        return { response, model, attempts: attempt + 1 };
      } catch (error) {
        lastError = error;
        if (!isTransientGeminiError(error) && getErrorStatus(error) !== 404) throw error;
        if (attempt === 0) await sleep(withJitter(900));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini is temporarily unavailable");
}
