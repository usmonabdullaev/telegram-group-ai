import type { PrismaConfig } from 'prisma';
import 'dotenv/config';

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
} satisfies PrismaConfig;
