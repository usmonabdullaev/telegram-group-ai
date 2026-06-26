/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '@/prisma/prisma.service';
import { AiService } from '@/ai/ai.service';
import 'dotenv/config';

const TRIGGER_WORDS = ['Грок', 'Grok', 'грок', 'grok'];
const HISTORY_SIZE = 3;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Telegraf;
  private readonly botUsername: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {
    const token = process.env.BOT_TOKEN as string;
    this.botUsername = process.env.BOT_USERNAME as string;
    this.bot = new Telegraf(token);

    this.bot.on('text', (ctx) => this.handleMessage(ctx));
  }

  async onModuleInit() {
    await this.bot.launch();
    this.logger.log('Telegram bot launched');
  }

  onModuleDestroy() {
    this.bot.stop();
  }

  private async handleMessage(ctx: any) {
    try {
      const msg = ctx.message;
      const chatId = ctx.chat.id;
      const text = msg.text ?? '';

      const chat = await this.upsertChat(chatId, ctx.chat.title);
      const user = await this.upsertUser(ctx.from);

      await this.saveMessage({
        telegramMessageId: msg.message_id,
        text,
        isBot: false,
        userId: user.id,
        chatId: chat.id,
      });

      if (!this.shouldReply(msg, text)) {
        return;
      }

      const cleanedText = this.stripTrigger(text);

      const history = await this.buildHistory(chat.id);
      history.push({
        role: 'user',
        content: `${user.username || 'user'}: ${cleanedText}`,
      });

      const replyText = await this.ai.generateReply(history);

      const sent = await ctx.reply(replyText, {
        reply_parameters: { message_id: msg.message_id },
      });

      await this.saveMessage({
        telegramMessageId: sent.message_id,
        text: replyText,
        isBot: true,
        userId: null,
        chatId: chat.id,
      });
    } catch (error) {
      this.logger.error('Failed to handle message', error as Error);
    }
  }

  private shouldReply(msg, text: string): boolean {
    const containsTrigger = TRIGGER_WORDS.some((word) => text.includes(word));

    const mentionsBot =
      !!this.botUsername && text.includes(`@${this.botUsername}`);

    const isReplyToBot = !!msg.reply_to_message?.from?.is_bot;

    return containsTrigger || mentionsBot || isReplyToBot;
  }

  private stripTrigger(text: string): string {
    let result = text;
    for (const word of TRIGGER_WORDS) {
      result = result.split(word).join('');
    }
    return result.replace(/@\w+/g, '').trim();
  }

  private async buildHistory(chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_SIZE,
      include: { user: true },
    });

    return messages.reverse().map((m) => {
      if (m.isBot) {
        return { role: 'assistant', content: m.text ?? '' };
      }
      const author = m.user?.username ?? m.user?.firstName ?? 'user';
      return { role: 'user', content: `${author}: ${m.text ?? ''}` };
    });
  }

  private async upsertChat(telegramChatId: number, title?: string) {
    return this.prisma.chat.upsert({
      where: { telegramChatId: BigInt(telegramChatId) },
      update: { title },
      create: { telegramChatId: BigInt(telegramChatId), title },
    });
  }

  private async upsertUser(from: any) {
    return this.prisma.user.upsert({
      where: { telegramId: BigInt(from.id) },
      update: {
        username: from.username,
        firstName: from.first_name,
      },
      create: {
        telegramId: BigInt(from.id),
        username: from.username,
        firstName: from.first_name,
      },
    });
  }

  private async saveMessage(data: {
    telegramMessageId: number;
    text: string;
    isBot: boolean;
    userId: string | null;
    chatId: string;
  }) {
    return this.prisma.message.create({
      data: {
        telegramMessageId: BigInt(data.telegramMessageId),
        text: data.text,
        isBot: data.isBot,
        userId: data.userId ?? undefined,
        chatId: data.chatId,
      },
    });
  }
}
