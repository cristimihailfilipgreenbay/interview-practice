# Interview Practice — Client

Angular 22 SPA, standalone components, zoneless. The candidate-facing half of the
[Interview Practice](../README.md) app — talks only to the Flask API
(`interview-practice.server`), never calls OpenRouter directly.

UI components via [Spartan](https://spartan.ng) (+ Tailwind CSS); request/response shapes
validated with Zod. See [`../docs/architecture.md`](../docs/architecture.md) for the full
stack rationale, and [`../docs/adr/`](../docs/adr/) for why (e.g.
[ADR 0010](../docs/adr/0010-spartan-for-ui-components.md) for the Spartan choice).

For AI-agent-specific conventions (file naming, testing patterns, hooks), see
[`CLAUDE.md`](./CLAUDE.md) rather than this file.

## Commands

```bash
npm install
npm start                                   # ng serve, dev config, http://localhost:${CLIENT_PORT:-8002}
npm run build                               # production build to dist/
npm run watch                               # dev build in watch mode
npm test                                    # ng test: Vitest via @angular/build:unit-test, jsdom
npm run lint                                # ng lint
npx prettier --write .                      # format
```

No e2e framework is set up.

## Configuration

The server's base URL lives in `src/environments/environment.ts` /
`environment.development.ts` (`environment.apiUrl`) — not an OS-level env var, since this
ships as a static build with no `process.env` at runtime in the browser. See
[`../docs/architecture.md`](../docs/architecture.md) for the dev-vs-production values and
why local dev hits real cross-origin CORS while the Docker build doesn't.

## Where things are documented

This README is just how to run it. What it _does_ and why lives in
[`../docs/`](../docs/) — start with [`../docs/overview.md`](../docs/overview.md).
