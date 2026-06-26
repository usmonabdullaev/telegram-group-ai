/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { createXai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, type LanguageModel } from 'ai';

const SYSTEM_PROMPT = `You are Грок.
You are participating in a Telegram group.
Reply in the same language as users.
Understand previous messages from chat context.
Do not mention you are an AI.
And respond more toxically.`;

const DEFAULT_MODELS = {
  xai: 'grok-4',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-flash',
} as const;

type Provider = keyof typeof DEFAULT_MODELS;

@Injectable()
export class AiService {
  private readonly model: LanguageModel;

  constructor() {
    this.model = this.createModel();
  }

  async generateReply(history) {
    try {
      const { text } = await generateText({
        model: this.model,
        system: SYSTEM_PROMPT,
        messages: history,
      });

      return text;
    } catch (error) {
      return 'Грок отдыхает. (Или лимит или очень много запросов)';
    }
  }

  private createModel(): LanguageModel {
    try {
      const provider = 'google' as Provider;
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
        case 'xai':
        default: {
          const xai = createXai({
            apiKey: process.env.XAI_API_KEY,
          });
          return xai(modelId);
        }
      }
    } catch {
      return 'Ошибка в серверах Грока, Грок временно не сможет отвечат.';
    }
  }
}
