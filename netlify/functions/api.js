/**
 * Live Arts ERP API — every `/api/*` request lands here.
 *
 * This file stays plain JS on purpose: it requires the output of `nest build` (tsc),
 * which has already emitted the `__decorate`/`__metadata` calls Nest's DI depends on.
 * Letting Netlify's esbuild compile the TypeScript directly would silently drop that
 * metadata (esbuild does not implement `emitDecoratorMetadata`) and every injected
 * provider would fail to resolve at runtime.
 */
const { handler } = require('../../backend/dist/serverless');

exports.handler = handler;
