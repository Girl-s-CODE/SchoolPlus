import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { prisma } from './utils/prisma';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_request, response) => response.json({ status: 'ok' }));

const port = Number(process.env.PORT ?? 5000);

async function start() {
  try {
    await prisma.$connect();
    console.log('📦 Successfully connected to PostgreSQL via Prisma.');
    app.listen(port, () => console.log(`School Plus API listening on port ${port}.`));
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error);
    process.exit(1);
  }
}

void start();

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
