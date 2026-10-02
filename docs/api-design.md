# API Design

The REST contract between `interview-practice.client` (Angular) and
`interview-practice.server` (Flask). See [`domain-model.md`](./domain-model.md) for full
field definitions — this document only repeats what's needed to understand each endpoint's
shape, not the entities themselves. See [`architecture.md`](./architecture.md) for the
5+1 LLM phases each endpoint triggers.

## Backend structure

Flask **application factory** (`create_app()`) with one **Blueprint** per domain area:
`interviews`, `documents`, `applications`, `preferences`. Each blueprint owns its own
Pydantic request/response models, colocated with its routes (e.g.
`app/interviews/schemas.py`). No blueprint per Evaluation/InterviewerReview/Message — those
are sub-resources of `interviews`, not independent areas.

All routes are under `/api`. JSON throughout, except file upload (`multipart/form-data`)
and file download (binary response) endpoints, called out explicitly below. No
authentication (see [ADR 0002](./adr/0002-single-user-prototype-no-auth.md)) — every route
is open.

## JSON casing

JSON keys are **camelCase** on the wire; Python code and the database stay snake_case. The
conversion happens once, on the server: every Pydantic request/response schema inherits a
shared `ApiModel` base (`alias_generator=to_camel`), so `source_filename` is sent as
`sourceFilename` and incoming `camelCase` is read back into snake_case fields. Only *keys*
are converted. Enum values (`technical_screener`, `in_progress`, `cover_letter`), error
`code`s (`FILE_TOO_LARGE`) and query-string values stay as they are, and the JSONB columns
(`phase_settings_override`, `evaluation_criteria`) are stored snake_case in the database
and camelCased only when serialized. The Angular client uses the JSON as-is.

## Error contract

Every error response: `{"error": {"code": "<SNAKE_CASE_CODE>", "message": "<human-readable>", "details"?: {...}}}`.

| Status | When | Example `code` |
|---|---|---|
| 400 | Pydantic validation failure (malformed/missing fields) | `VALIDATION_ERROR` (`details` = Pydantic's per-field errors) |
| 404 | Resource doesn't exist | `NOT_FOUND` |
| 413 | Upload exceeds the size limit (`MAX_UPLOAD_MB`, default 10) | `FILE_TOO_LARGE` |
| 422 | Well-formed request, but the uploaded file can't be used (not a readable PDF, encrypted, or no extractable text) | `UNPROCESSABLE_FILE` |
| 409 | Request is well-formed but violates a business rule/current state | `JUDGE_MODEL_COLLISION`, `INTERVIEW_ALREADY_ENDED` |
| 500 | Unexpected server error | `INTERNAL_ERROR` (no internals leaked in `message`) |

## `interviews` blueprint — `/api/interviews`

### `POST /api/interviews`

Create Interview submission. Request:

```jsonc
{
  "jobTitle": "string",
  "companyName": "string?",
  "domain": "string",
  "seniority": "string",
  "difficulty": "easy" | "medium" | "hard",
  "targetQuestionCount": "integer?",  // 1–30; overrides difficulty's cascaded default
  "tone": "string?",                  // overrides difficulty's cascaded default
  "interviewType": "string?",         // overrides interviewerRole's cascaded default
  "interviewerRole": "recruiter" | "technical_screener" | "hr" | "hiring_manager",
  "responseStyle": "concise" | "detailed",  // default "concise"
  "coachingHelpersEnabled": false,
  "jobDescriptionId": "uuid" | null,
  "cvId": "uuid" | null,
  "coverLetterId": "uuid" | null,
  "jobApplication": { "id": "uuid" } | { "createNew": true } | null,  // null = standalone
  "phaseSettingsOverride": { /* see database-schema.md, camelCased — optional, includes interviewerReview */ }
}
```

- `jobDescriptionId`/`cvId`/`coverLetterId` — always the id of an existing `Document`, never an inline
  file: this request is plain JSON. A new file is uploaded earlier, the moment the
  candidate picks it, via `POST /api/documents` below, and the returned `id` goes here —
  see [ADR 0011](./adr/0011-documents-are-uploaded-before-the-interview-is-created.md).
  The server reads `Document.raw_text` from the database for the JD/CV analysis phase;
  the client never re-sends the file.
- `jobApplication` — `null` for a fully standalone Interview (no `JobApplication` at
  all); `{id}` to add this Interview as the next stage of an existing one (pre-fills
  `companyName`/`jobTitle`/documents from it, per `workflow.md`); `{createNew: true}`
  creates a fresh `JobApplication` from this request's `companyName`/`jobTitle` and
  attaches this Interview as its first stage.

Response `201`: the created `Interview` (id, `status: "in_progress"`, `personaName`,
`personaTitle`, `personaImagePath` as a servable URL, `targetQuestionCount`, etc.) —
**not** `evaluationCriteria`, which stays hidden from the candidate.

**Open concern, not yet resolved**: this call runs phases 1 (JD/CV analysis), 2
(question-plan/persona generation), and persona image generation sequentially before
responding — a multi-second synchronous request. Acceptable for a prototype behind a
loading state, but worth revisiting (e.g. a `202 Accepted` + polling pattern) if it proves
too slow in practice.

### `GET /api/interviews/:id`

Fetch an Interview plus its `Message`s (ordered by `sequence`), for rendering the session
or resuming one already in progress.

### `POST /api/interviews/:id/messages`

Candidate submits a reply during the Q&A or ask-back phase. Request: `{"content": "string"}`.

Response: the stored candidate `Message`, plus the next interviewer `Message` (with
`helperText` when coaching helpers are on) generated in the same call, the current
`phase` (`"qa"` | `"ask_back"`), and `status`. Triggers `Evaluation` +
`InterviewerReview` server-side the moment `status` transitions to `"completed"`.

### `GET /api/interviews/:id/ask-back-suggestions`

Phase 4 call. Ephemeral — returns candidate-question suggestions the client can offer, but
nothing is persisted until the candidate actually sends one via `POST .../messages`.

### `POST /api/interviews/:id/abandon`

No body. The Interviewer-sidebar "Abandon interview" action. Marks `status: "abandoned"`,
`endedAt`, and triggers `Evaluation` (`incomplete: true`) + `InterviewerReview`, same as
the natural-completion path.

### `GET /api/interviews/:id/evaluation`

The `Evaluation` (Results page data): `verdict`, `reasoning`, `improvementSuggestions`,
`starBreakdown`, `incomplete`. `404` until the Interview has ended.

### `GET /api/interviews/:id/interviewer-review`

The `InterviewerReview` — dev-facing, not called by the candidate-facing Results page, but
available for the reflection/debugging use case. `404` until the Interview has ended.

## `documents` blueprint — `/api/documents`

### `GET /api/documents?type=cv|cover_letter|job_description`

List saved Documents (`saved = true` only), newest first — backs both the Create Interview
select-existing control and the Preferences Documents tab. Response `200`: an array of
`{id, type, name, sourceFilename, saved, createdAt}`. `raw_text` and `file_path` (database columns) are
deliberately not returned (the first is large and only the LLM phases need it; the second
is a server filesystem path). An unknown `type` value is a `400`.

### `POST /api/documents`

`multipart/form-data`: `file`, `type`, `name?`, `save: boolean`. A row is always created
regardless of `save` (see `domain-model.md`'s `saved` field) — parses the upload
server-side into `raw_text`, stores the original on local disk (`file_path`, relative to
the Flask `instance/` folder). `name` defaults to the uploaded filename. Called as soon as
the candidate picks a file in Create Interview (or uploads from the Preferences Documents
tab), with `save` set from the "save this for later?" answer.

**PDF only, max `MAX_UPLOAD_MB` (default 10 MB).** `400` for a missing file, a non-`.pdf` filename, or invalid
fields; `413 FILE_TOO_LARGE` over the limit; `422 UNPROCESSABLE_FILE` if the file isn't a
readable PDF, is encrypted, or has no text layer (scanned PDFs — there is no OCR).
Response `201`: the created Document, same shape as the list items.

### `GET /api/documents/:id/download`

Binary response (the original uploaded file), `Content-Disposition` filename from
`source_filename` (the stored column).

### `PATCH /api/documents/:id`

`{"name": "string"}` (1–200 characters after trimming) — rename, from the Preferences
Documents tab. Response `200`: the updated Document.

### `DELETE /api/documents/:id`

Hard delete: removes the row and the stored file from disk. Interviews and Job Applications
that referenced the Document are kept and just lose the link (`ON DELETE SET NULL`, see
`database-schema.md`). Response `204`.

## `applications` blueprint — `/api/applications`

### `GET /api/applications`

List (id, `companyName`, `jobTitle`, and each stage's `interviewerRole`/`status`) — backs
the sidebar's grouped history.

### `GET /api/applications/:id`

Application Overview page data: `companyName`, `jobTitle`, every stage (id,
`interviewerRole`, `status`, link to its Results), plus `progressScore`/
`progressSummary` once 2+ stages have an `Evaluation`.

### `PATCH /api/applications/:id`

`{"companyName": "string", "jobTitle": "string"}` — sidebar context-menu rename.

### `DELETE /api/applications/:id`

Cascades to every Interview under it and everything hanging off each (see
[ADR 0008](./adr/0008-jobapplication-delete-cascades-to-interviews.md)) — the client must
confirm before calling this; the API itself performs no confirmation step.

## `preferences` blueprint — `/api/preferences`

Singleton resource, no `:id`.

### `GET /api/preferences`

Current `interviewModel`, `judgeModel`, `temperature`, and per-phase system prompts.

### `PATCH /api/preferences`

Partial update of the same. Pydantic's `model_validator` enforces
[ADR 0009](./adr/0009-judge-model-excludes-the-interview-model.md) here — setting
`judgeModel` equal to `interviewModel` fails with `409 JUDGE_MODEL_COLLISION` before
anything is saved.

## Dashboard data

`GET /api/dashboard` — aggregate counts for the Home page (total interviews practiced,
hire/no-hire trend) rather than making the client crunch a full Interview list itself. Not
owned by any single blueprint above; exact placement (its own tiny blueprint vs. a loose
route) is an implementation detail, not a design decision.
