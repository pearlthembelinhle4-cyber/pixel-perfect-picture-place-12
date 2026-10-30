import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError, APICallError } from "ai";
import type { z } from "zod";

const RUN_ID = "X-Lovable-AIG-Run-ID";
const MODEL = "openai/gpt-6-astra";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function structuredCall<T>(
  schema: z.ZodType<T>,
  instructions: string,
  prompt: string,
): Promise<AiResult<T>> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "AI service is not configured (missing LOVABLE_API_KEY)." };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions,
      messages: [{ role: "user", content: prompt }],
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const data = (await result.output) as T;
    return { ok: true, data };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return { ok: false, error: "The AI returned an unexpected response. Please try again." };
    }
    if (APICallError.isInstance(e)) {
      const s = e.statusCode;
      if (s === 429) return { ok: false, error: "Too many requests right now. Please wait a moment and try again." };
      if (s === 402) return { ok: false, error: "AI credits are used up for this workspace. Add credits to continue." };
      if (s === 403) return { ok: false, error: "AI access is blocked for this workspace. An admin needs to check AI settings." };
      if (s === 401) return { ok: false, error: "AI service key is invalid." };
      if (s && s >= 500) return { ok: false, error: "The AI service is temporarily unavailable. Please try again shortly." };
    }
    console.error("AI call failed", e);
    return { ok: false, error: "Could not reach the AI service. Check your connection and try again." };
  }
}
