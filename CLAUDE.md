# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two-part project at an early stage:

- `interview-practice.client/`: Angular 22 single-page app. Its commands and conventions are in `interview-practice.client/CLAUDE.md`, and client commands must be run from that directory.
- `interview-practice.server/`: Flask backend managed with `uv`, early-stage scaffold. Its commands and conventions are in `interview-practice.server/CLAUDE.md`, and server commands must be run from that directory.

## Documentation

This is a documentation-first project: the full product and technical design exists in
`docs/` before any implementation. Before answering a question about the product, the
data model, the API, or the architecture, or before writing code that touches any of
these, read the relevant file — don't rely on memory or guess:

- Product, pages, end-to-end flow: `docs/overview.md`, `docs/workflow.md`
- Data model / entities / fields: `docs/domain-model.md`
- Concrete database schema: `docs/database-schema.md`
- Technical design, LLM phases, stack choices: `docs/architecture.md`
- REST contract (endpoints, request/response shapes): `docs/api-design.md`
- Docker / env vars / how it runs: `docs/deployment.md`
- Canonical project vocabulary: `CONTEXT.md` (repo root)
- Why a hard-to-reverse or non-obvious decision was made: `docs/adr/`
- The whole design as user stories, source for issues/tickets: `docs/spec.md`

If a doc and the actual code disagree, say so rather than silently trusting either one —
the docs describe intent, the code is what's real.

## Git operations policy

Claude must not perform git operations that change repository or branch state — no commits, pushes, branch creation/deletion/switching, merges, rebases, resets, stashes, or tag operations. Only the developer performs those.

Read-only git commands are allowed and encouraged, e.g. `git status`, `git diff`, `git log`, `git show`, `git blame` — useful for understanding context before implementing a feature or asking for help.

## Agent skills

### Issue tracker

Issues live as GitHub issues (`cristimihailfilipgreenbay/interview-practice`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
