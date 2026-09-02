// Inventra AI — server-side AI client. Calls DeepSeek (OpenAI-compatible API).
// All AI calls happen on the server (never client-side).

import OpenAI from "openai";

const DEEPSEEK_MODEL = "deepseek-chat";
export const AI_MODEL = DEEPSEEK_MODEL;

let client: OpenAI | null = null;
function getAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");
    client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  }
  return client;
}

/** True when an AI provider key is configured. */
export function isAIConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/** Shared client accessor for the snapshot / brief / copilot / procurement modules. */
export function getAIClient(): OpenAI {
  return getAI();
}
