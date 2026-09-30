# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two-part project at an early stage:

- `interview-practice.client/`: Angular 22 single-page app. Its commands and conventions are in `interview-practice.client/CLAUDE.md`, and client commands must be run from that directory.
- `interview-practice.server/`: Flask backend managed with `uv`, early-stage scaffold. Its commands and conventions are in `interview-practice.server/CLAUDE.md`, and server commands must be run from that directory.

## Git operations policy

Claude must not perform git operations that change repository or branch state — no commits, pushes, branch creation/deletion/switching, merges, rebases, resets, stashes, or tag operations. Only the developer performs those.

Read-only git commands are allowed and encouraged, e.g. `git status`, `git diff`, `git log`, `git show`, `git blame` — useful for understanding context before implementing a feature or asking for help.
