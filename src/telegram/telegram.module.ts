import { Module } from '@nestjs/common';
import { TelegramService } from '@/telegram/telegram.service';
import { AiModule } from '@/ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [TelegramService],
})
export class TelegramModule {}
