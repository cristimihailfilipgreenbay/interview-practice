# Database Schema

Concrete Postgres schema for the entities described in [`domain-model.md`](./domain-model.md).
Not yet implemented — `interview-practice.server/config.py` currently reads
`SQLALCHEMY_DATABASE_URI` from a single pre-built `DATABASE_URL`, but that's planned to
change to assembling the URI from discrete `POSTGRES_USER`/`POSTGRES_PASSWORD`/
`POSTGRES_DB`/`POSTGRES_HOST`/`POSTGRES_PORT` variables instead — see `deployment.md` for
why. `flask-sqlalchemy`/`sqlalchemy` still need to be added to `pyproject.toml`
(`uv add flask-sqlalchemy sqlalchemy flask-migrate`) and models wired up under `app/`.
**Flask-Migrate** (wrapping Alembic) handles schema migrations — `mypy`'s config already
excludes a `migrations` directory in anticipation, though the dependency itself was never
added. See `api-design.md` for the Flask app factory + Blueprints structure this schema is
wired into.

This is a single-implicit-user prototype (see [ADR 0002](./adr/0002-single-user-prototype-no-auth.md))
— no `users` table exists yet; adding one later would mean adding an `owner_id` FK to
`documents` and `interviews`.

## `documents`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` / `serial` PK | |
| `type` | `enum(cv, cover_letter, job_description)` | |
| `name` | `text` | display name |
| `raw_text` | `text` | extracted content, what the LLM phases read |
| `source_filename` | `text` | original uploaded filename; always present, uploads are the only ingestion path |
| `file_path` | `text` | local-disk path (under the Flask app's `instance/` folder) to the original uploaded file, so it can be downloaded back exactly as uploaded — same mechanism as `interviews.persona_image_path` |
| `saved` | `boolean` | default from the candidate's "save this for later?" choice; a row always exists regardless (an Interview's FK needs something to point at), only `saved = true` rows are offered in the select-existing list |
| `created_at` | `timestamptz` | default now() |

## `job_applications`

Groups multiple `interviews` rows as stages of the same real-world hiring pipeline. See
`domain-model.md`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` / `serial` PK | |
| `company_name` | `text` | |
| `job_title` | `text` | |
| `job_description_document_id` | `uuid` / `int`, nullable, FK → `documents.id` | |
| `cv_document_id` | `uuid` / `int`, nullable, FK → `documents.id` | |
| `progress_score` | `integer`, nullable | 1-5 aggregate performance-trend rating; same scale as `interviewer_reviews.score_breakdown` |
| `progress_summary` | `text`, nullable | narrative accompanying `progress_score`; both regenerated together once 2+ stages have an Evaluation — see domain-model.md |
| `created_at` | `timestamptz` | default now() |

Deleting a row here cascades (`ON DELETE CASCADE`) to every `interviews` row with this
`job_application_id`, and transitively to their `messages`/`evaluations`/
`interviewer_reviews` — see [ADR 0008](./adr/0008-jobapplication-delete-cascades-to-interviews.md).

## `interviews`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` / `serial` PK | |
| `job_application_id` | `uuid` / `int`, nullable, FK → `job_applications.id` | nullable — a standalone Interview needs no Application |
| `job_title` | `text` | |
| `company_name` | `text`, nullable | optional, independent of the job description Document; lets persona/conversation/ask-back suggestions reference a real company even when no JD is uploaded |
| `domain` | `text` | auto-suggested, user-editable |
| `seniority` | `text` | |
| `difficulty` | `enum(easy, medium, hard)` | |
| `tone` | `text` | e.g. strict/neutral/friendly; extensible, so plain text rather than a fixed enum |
| `interview_type` | `text` | e.g. technical/behavioral; plain text for future extensibility (e.g. "mixed") |
| `interviewer_role` | `text` | e.g. recruiter/hr/hiring_manager; plain text, same extensibility reasoning as `tone` |
| `target_question_count` | `integer` | soft cap, seeded by difficulty |
| `status` | `enum(in_progress, completed, abandoned)` | |
| `last_activity_at` | `timestamptz` | updated on every new message; staleness timeout 30 minutes — lazily detects a stale/ungracefully-closed session and marks it `abandoned` — see domain-model.md |
| `persona_name` | `text` | |
| `persona_title` | `text` | job title shown alongside `persona_name`; generated in the same phase 2 call |
| `persona_image_path` | `text` | local-disk path, under the Flask app's `instance/` folder |
| `job_description_document_id` | `uuid` / `int`, nullable, FK → `documents.id` | |
| `cv_document_id` | `uuid` / `int`, nullable, FK → `documents.id` | |
| `coaching_helpers_enabled` | `boolean` | set by candidate at creation; default `false` |
| `response_style` | `enum(concise, detailed)` | default `concise`; affects phase 3 phrasing and phase 5 write-up length |
| `evaluation_criteria` | `jsonb` | `{technical: string[], behavioral: string[]}` — see domain-model.md |
| `phase_settings_override` | `jsonb` | keyed by phase (`jd_analysis`, `question_plan`, `live_conversation`, `ask_back`, `evaluation`, `interviewer_review`); each value optionally `{model, temperature, max_tokens, reasoning_effort}`; any omitted key/field falls back to the global Preferences default. `interviewer_review`'s model choice is a narrower set (`google/gemini-2.5-flash`/`gpt-5-mini`/`gpt-5-nano`) than the other 5 phases' — see architecture.md |
| `created_at` | `timestamptz` | default now() |
| `ended_at` | `timestamptz`, nullable | |

## `messages`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` / `serial` PK | |
| `interview_id` | FK → `interviews.id`, not null | |
| `phase` | `enum(qa, ask_back)` | |
| `role` | `enum(interviewer, candidate)` | |
| `content` | `text` | |
| `helper_text` | `text`, nullable | populated only for `interviewer`/`qa` rows when `interviews.coaching_helpers_enabled` is true |
| `sequence` | `integer` | ordering within the interview |
| `created_at` | `timestamptz` | default now() |

Index: `(interview_id, sequence)` for ordered transcript retrieval.

## `evaluations`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` / `serial` PK | |
| `interview_id` | FK → `interviews.id`, unique, not null | one-to-one |
| `verdict` | `enum(hire, no_hire)` | |
| `reasoning` | `text` | |
| `improvement_suggestions` | `text` | |
| `star_breakdown` | `jsonb` | `{situation, task, action, result: string, completeness: "strong"\|"partial"\|"weak"}` — see domain-model.md |
| `incomplete` | `boolean` | default false; true when interview was abandoned |
| `model_used` | `text` | OpenRouter model id used for this evaluation; currently always `gpt-5-mini`, same as the rest of the candidate pipeline (see architecture.md) |
| `created_at` | `timestamptz` | default now() |

## `interviewer_reviews`

Dev-facing "LLM-as-judge" assessment of the AI interviewer's own conduct, distinct from
`evaluations` (which grades the candidate). See `architecture.md`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` / `serial` PK | |
| `interview_id` | FK → `interviews.id`, unique, not null | one-to-one |
| `judge_model` | `text` | OpenRouter model id used; default `google/gemini-2.5-flash` |
| `score_breakdown` | `jsonb` | `{question_relevance, persona_consistency, pacing: 1-5}` — see domain-model.md |
| `reasoning` | `text` | |
| `created_at` | `timestamptz` | default now() |

## Relationships

- `documents.id` ← `job_applications.job_description_document_id` (nullable)
- `documents.id` ← `job_applications.cv_document_id` (nullable)
- `job_applications.id` ← `interviews.job_application_id` (nullable — one application, many
  stage interviews)
- `documents.id` ← `interviews.job_description_document_id` (nullable, many interviews can
  reference the same saved job description)
- `documents.id` ← `interviews.cv_document_id` (nullable, same pattern)
- `interviews.id` ← `messages.interview_id` (one interview, many messages)
- `interviews.id` ← `evaluations.interview_id` (one interview, at most one evaluation)
- `interviews.id` ← `interviewer_reviews.interview_id` (one interview, at most one
  interviewer review)
