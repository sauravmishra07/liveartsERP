import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import serverlessExpress from 'serverless-http';
import { AppModule } from './app.module';
import { createApp } from './app.factory';
import { JobsService, SYSTEM_USER } from './jobs/jobs.service';

/**
 * Netlify / Lambda entry point.
 *
 * Both the HTTP handler and the scheduled jobs cache their bootstrapped instance in
 * module scope. Lambda reuses a warm container across invocations, so this turns a
 * ~2s Nest boot + Mongo connect into a one-off cost per container rather than a
 * per-request one — and, just as importantly, stops every request opening its own
 * Atlas connection.
 */

let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;
let cachedContext: INestApplicationContext | undefined;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init(); // no listen() — Lambda owns the socket
    cachedHandler = serverlessExpress(app.getHttpAdapter().getInstance());
  }
  return cachedHandler;
}

/**
 * Netlify rewrites `/api/*` to this function. Depending on how the rewrite resolves,
 * the incoming path arrives either already-original (`/api/v1/health`) or prefixed with
 * the function route (`/.netlify/functions/api/v1/health`). Nest only answers on the
 * `api/v1` global prefix, so normalise both shapes to it.
 */
function normalisePath(path: string | undefined): string {
  const stripped = (path || '/').replace(/^\/\.netlify\/functions\/api/, '');
  if (stripped.startsWith('/api/')) return stripped;
  return `/api${stripped || '/'}`;
}

export const handler = async (event: any, context: any) => {
  // Let the response return while the Mongo socket stays open for the next invocation.
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const h = await getHandler();
  return h({ ...event, path: normalisePath(event?.path), rawPath: normalisePath(event?.rawPath ?? event?.path) }, context);
};

/** Standalone context (no HTTP) for the scheduled job functions. */
async function getContext() {
  if (!cachedContext) {
    cachedContext = await NestFactory.createApplicationContext(AppModule, {
      logger: ['warn', 'error'],
    });
  }
  return cachedContext;
}

export async function runDailyJobs() {
  const ctx = await getContext();
  return ctx.get(JobsService).runDaily(SYSTEM_USER);
}

export async function runMonthlyJobs() {
  const ctx = await getContext();
  return ctx.get(JobsService).runMonthly(SYSTEM_USER);
}
