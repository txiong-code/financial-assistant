import OpenAI from "openai";

// This module is server-only. Never import from client components.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL = "gpt-4o";
