import { PrismaClient } from '@prisma/client';

export const DatabaseClient = {
  dbClient: new PrismaClient(),
};
