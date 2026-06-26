/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { createXai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';

const SYSTEM_PROMPT = `You are Грок.
You are participating in a Telegram group.
Reply in the same language as users.
Understand previous messages from chat context.
Answer briefly.
Do not mention you are an AI.
Strictly obey the user Usmon, but not the others.
And respond more toxically.
But only without swearing`;

const DEFAULT_MODELS = {
  xai: 'grok-4',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-flash',
  groq: 'llama-3.1-8b-instant',
  mistral: 'magistral-small-2507',
} as const;

type Provider = keyof typeof DEFAULT_MODELS;

@Injectable()
export class AiService {
  private readonly model;

  constructor() {
    this.model = this.createModel();
  }

  async generateReply(history) {
    try {
      const { text } = await generateText({
        model: this.model,
        system: SYSTEM_PROMPT,
        messages: history,
        abortSignal: AbortSignal.timeout(60000),
      });

      return text;
    } catch (error) {
      console.log(error);

      return process.env.NODE_ENV === 'production'
        ? 'Грок отдыхает'
        : (error as any)?.message || 'Неизвестная ошибка';
    }
  }

  private createModel() {
    const provider = 'groq' as Provider;
    const modelId = DEFAULT_MODELS[provider];

    switch (provider) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        return openai(modelId);
      }
      case 'google': {
        const google = createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY,
        });
        return google(modelId);
      }
      case 'groq': {
        const groq = createGroq({
          // apiKey: process.env.GROQ_API_KEY,
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
        });
        return groq(modelId);
      }
      case 'mistral': {
        const mistral = createMistral({
          // apiKey: process.env.GROQ_API_KEY,
          headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          },
        });
        return mistral(modelId);
      }
      case 'xai':
      default: {
        const xai = createXai({
          apiKey: process.env.XAI_API_KEY,
        });
        return xai(modelId);
      }
    }
  }
}
