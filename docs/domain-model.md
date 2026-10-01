# Domain Model

See [`overview.md`](./overview.md) for the product-level flow this data model supports,
[`database-schema.md`](./database-schema.md) for the concrete table definitions, and the
repo-root [`CONTEXT.md`](../CONTEXT.md) for the plain-language definition of each term
used here.

This is a single-implicit-user prototype (see [ADR 0002](./adr/0002-single-user-prototype-no-auth.md))
— no `User` entity exists yet. Every entity below is implicitly scoped to "the" user.

## Document

A reusable piece of candidate-supplied text: a CV, a cover letter, or a job description.

- `type`: `cv` | `cover_letter` | `job_description`
- `name`: display name (e.g. original filename, or a name the user gives it)
- `raw_text`: extracted text content (uploads are PDF only, max `MAX_UPLOAD_MB`, default 10 MB, parsed server-side on ingest) —
  what the LLM phases actually read
- `source_filename`: original uploaded filename, used both for reference and as the
  suggested filename when downloading the file back (see `file_path`)
- `file_path`: reference to the original uploaded file on **local disk** (under the Flask
  app's `instance/` folder — see `architecture.md`), kept alongside `raw_text` rather than
  discarded after parsing — see
  [ADR 0007](./adr/0007-original-uploaded-file-kept-for-download.md). Same storage
  mechanism as `Interview.persona_image_path`.
- `saved`: boolean, default determined by the candidate's "save this for later?" answer at
  upload time. A Document row is *always* created on upload (an Interview's FK needs
  something to point at regardless), but only `saved = true` Documents appear in the
  select-existing list or the Preferences Documents tab — an unsaved one is effectively a
  one-off, used for just that Interview. Because the file is uploaded when it's picked,
  before the Interview is submitted, a candidate who abandons the form leaves an unsaved,
  unreferenced Document behind — accepted for now, see
  [ADR 0011](./adr/0011-documents-are-uploaded-before-the-interview-is-created.md).
- `created_at`

## JobApplication

Groups multiple Interview sessions that represent stages of the same real-world hiring
pipeline (e.g. "Acme Corp — Senior Software Engineer"), so `company_name`/`job_title`/
documents don't need re-entering per stage, and the history sidebar can show pipeline
progress (recruiter ✓, technical screener ✓, hr in progress, hiring manager not started)
instead of a flat, disconnected list of sessions.

Managed directly from its sidebar group header via a context menu — rename and delete,
not a Preferences tab like Document management, since a `JobApplication` is just two text
fields plus optional doc links, nothing uploaded to manage. **Delete cascades**: removing
a `JobApplication` removes all of its `Interview`s with them (and everything hanging off
each — `Message`, `Evaluation`, `InterviewerReview`), not just the grouping — see
[ADR 0008](./adr/0008-jobapplication-delete-cascades-to-interviews.md). The sidebar group
header is also the click target into the `/applications/:id` Application Overview page
(see `architecture.md`).

- `company_name`: free text
- `job_title`: free text
- `job_description_document_id`: optional FK → Document (`type = job_description`)
- `cv_document_id`: optional FK → Document (`type = cv` or `cover_letter`)
- `progress_score`: nullable integer, 1-5 — an aggregate performance-trend rating across
  this Application's completed Interview stages, same scale as
  `InterviewerReview.score_breakdown` for consistency. Generated together with, and always
  regenerated alongside, `progress_summary` below — the two are one feature's output, not
  independently updatable.
- `progress_summary`: nullable text — the narrative accompanying `progress_score` (e.g.
  "you're doing great as usual on X, better now on Y, a bit worse this time on Z").
  Regenerated after each stage's Evaluation completes, once 2+ stages have one — see
  `architecture.md`'s Progress summary section.
- `created_at`

## Interview

One mock interview session, from creation through evaluation.

- `job_application_id`: optional FK → JobApplication. Nullable — a standalone one-off
  practice session doesn't require setting up an Application first. When creating a new
  stage under an existing Application, Create Interview pre-fills `company_name`/
  `job_title`/documents from it as a convenience; Interview keeps its own copies of those
  fields regardless, so it stays self-contained even if the parent Application is later
  edited or removed
- `job_title`: free text, as entered by the candidate
- `company_name`: free text, optional, independent of the job description Document. Real
  interviews near-universally test whether the candidate researched the company ("what do
  you know about us", "why do you want to work here"); without this field there'd be no
  company identity at all when the JD upload is skipped (it's optional). Feeds persona
  generation (phase 2), the live conversation (phase 3), and — directly matching the
  assignment's own "questions to ask the interviewer" starter idea, which explicitly wants
  a company name — the ask-back suggestions (phase 4)
- `domain`: auto-suggested from `job_title` at creation (e.g. "Software Engineer" →
  "Software"), but always user-editable — the suggestion can be a false positive (e.g. "IT
  Technician" isn't obviously "Software")
- `seniority`: e.g. junior / mid / senior
- `difficulty`: easy | medium | hard — a *preset* that seeds `target_question_count`, `tone`,
  and question complexity. Each of those remains independently editable after the preset is
  applied, and `difficulty` itself is still passed to the question-plan prompt as its own
  signal (it isn't just a UI shortcut that gets discarded once other fields are tweaked)
- `tone`: strict | neutral | friendly | ... (extensible) — the interviewer persona's style;
  defaults from `difficulty`, independently overridable
- `interview_type`: `technical` | `behavioral` (initial set, plain text like `tone` for
  future extensibility, e.g. a later "mixed") — skews the question plan and which half of
  `evaluation_criteria` carries more weight at evaluation time
- `interviewer_role`: `recruiter` | `technical_screener` | `hr` | `hiring_manager` (initial set, same
  extensible-text treatment as `tone`) — who the persona *is*, not just their tone:
  - `recruiter` — first-contact screen; shallow technical/company knowledge, broad
    background/motivation questions. Also the natural home for logistics/compensation
    questions (salary expectations, availability, work authorization, remote/hybrid
    preference) — these are near-universal in real recruiter screens and were previously
    missing from the question repertoire entirely
  - `technical_screener` — the first technical interview (a real pipeline often pairs two technical
    interviewers here; modeling only one is out of scope for now); real technical depth,
    and typically the most rigorous/critical stage, since technical screens are prone to
    interviewer bias
  - `hr` — culture/values/soft-skills fit, more procedural in tone
  - `hiring_manager` — real technical depth plus organizational context; framed (as flavor,
    not literal cross-session memory) as the final, more-familiar stage
  Feeds persona generation (phase 2), the live conversation (phase 3), and which ask-back
  questions make sense to suggest (phase 4) — see `architecture.md`. Presented in the UI as
  a radio group ordered `recruiter` → `technical_screener` → `hr` → `hiring_manager` to mirror the real-world
  pipeline order, even though one Interview only ever represents a single stage.

  **Default cascade** — `interviewer_role` seeds `interview_type` and `tone` the same way
  `difficulty` seeds `tone`/question count elsewhere: changing `interviewer_role` re-applies
  its row below to `interview_type` and `tone`, even overwriting a prior manual override on
  those two fields — but both remain independently editable again afterward, same as
  `difficulty`'s cascade behavior:

  | `interviewer_role` | default `interview_type` | default `tone` |
  |---|---|---|
  | `recruiter` | behavioral | friendly |
  | `technical_screener` | technical | strict |
  | `hr` | behavioral | neutral |
  | `hiring_manager` | technical | friendly |
- `target_question_count`: integer, 1–30; a soft cap for the Q&A phase, not a hard requirement,
  since the interviewer can end the phase early. The 30 ceiling is enforced on both client and
  server, so a typo can't produce an hours-long interview
- `status`: `in_progress` | `completed` | `abandoned` — `abandoned` either when the
  candidate explicitly quits mid-session, or when the session goes stale (see
  `last_activity_at` below); evaluation still runs in both cases but is flagged incomplete
- `last_activity_at`: timestamptz, updated on every new `Message`. Staleness timeout: **30
  minutes** — long enough that a candidate thinking mid-answer isn't falsely flagged, short
  enough that history doesn't show obviously-dead "in progress" sessions. The second path
  into `abandoned`, alongside the explicit quit — see
  [ADR 0006](./adr/0006-lazy-staleness-detection-not-a-background-job.md) for why this is
  lazy rather than a background job, and why a graceful client-side signal can't be relied
  on at all.
- `persona_name`: generated interviewer persona's display name
- `persona_title`: generated job title string shown alongside the name (e.g. "Talent
  Acquisition Partner" for a `recruiter`, "Staff Engineer" for a `hiring_manager`) —
  produced by the same phase 2 call as `persona_name`, not a separate generation step
- `persona_image_path`: local-disk path to the generated portrait image, under the Flask
  app's `instance/` folder (see `architecture.md` — generated once at creation, stored, not
  regenerated)
- `job_description_document_id`: optional FK → Document (`type = job_description`)
- `cv_document_id`: optional FK → Document (`type = cv` or `cover_letter`)
- `coaching_helpers_enabled`: boolean, set by the candidate at creation, default `false` — whether
  Q&A-phase questions come with a coaching-hint card (see `architecture.md`)
- `response_style`: `concise` | `detailed`, default `concise` — affects the live
  interviewer's phrasing (phase 3) and the evaluation write-up's length/depth (phase 5)
- `evaluation_criteria`: `{ technical: string[], behavioral: string[] }` — flat arrays of
  criterion bullets (e.g. "correctly reasons about time complexity tradeoffs"), generated
  alongside the question plan (phase 2), used to ground the STAR evaluation (phase 5); not
  shown to the candidate — see `architecture.md`. The behavioral bucket explicitly includes
  a self-awareness/coachability signal — *how* the candidate talks about a past failure or
  weakness (ownership, growth mindset), not just whether their STAR story is complete —
  since real interviewers weigh this as much as the story itself
- `phase_settings_override`: per-phase advanced-settings overrides (model/temperature/max
  tokens/reasoning effort), one optional override object per phase across all 6 phases
  (the 5 candidate-facing ones plus `interviewer_review`); see `architecture.md` for the
  exact shape and default-fallback behavior
- `created_at`, `ended_at`

## Message

One turn in the interview transcript. Ordered, phase-tagged, role-tagged.

- `interview_id`: FK → Interview
- `phase`: `qa` | `ask_back`
- `role`: `interviewer` | `candidate`
- `content`: text
- `helper_text`: nullable text — a coaching-hint card, populated only for `interviewer` /
  `qa`-phase messages when `Interview.coaching_helpers_enabled` is true (see `architecture.md`)
- `sequence`: ordering index within the interview
- `created_at`

## Evaluation

The outcome of an Interview. One-to-one with Interview, created once the session ends
(whether `completed` or `abandoned`).

- `interview_id`: FK → Interview (unique)
- `verdict`: `hire` | `no_hire`
- `reasoning`: explanation for the verdict
- `improvement_suggestions`: what the candidate should work on
- `star_breakdown`: `{ situation, task, action, result: string, completeness: "strong" |
  "partial" | "weak" }` — one short assessment per STAR letter plus an overall completeness
  rating, aggregated across the whole interview (not per-question)
- `incomplete`: boolean — true when the Interview was `abandoned`; the evaluation is still
  produced, but explicitly caveated as based on a partial transcript
- `model_used`: the OpenRouter model id actually used to produce this evaluation —
  currently the same model that runs the rest of the candidate pipeline (`gpt-5-mini`, see
  `architecture.md`), recorded here for reproducibility even though it isn't decoupled from
  the interview model
- `created_at`

## InterviewerReview

A separate, dev-facing assessment of how well the **AI interviewer itself** performed in a
given Interview (question relevance/quality, persona consistency, pacing) — distinct from
the candidate-facing `Evaluation` above. This is what actually satisfies the assignment's
"LLM-as-a-judge to assess the performance of your prompt/model" optional task; `Evaluation`
grades the *candidate*, `InterviewerReview` grades the *interviewer*. Runs automatically at
the same trigger point as `Evaluation` (session end), keeping the two symmetric. See
`architecture.md`.

- `interview_id`: FK → Interview
- `judge_model`: the OpenRouter model id used to run this review, default
  `google/gemini-2.5-flash` (selectable globally in Preferences, or overridable per
  Interview via `phase_settings_override.interviewer_review.model`, restricted there to
  `google/gemini-2.5-flash` / `gpt-5-mini` / `gpt-5-nano` / `typesafe/jev-1.13`) — deliberately independent of
  whichever model produced this Interview's question-plan/persona generation (phase 2) and
  live conversation (phase 3): that model is always excluded from the judge-model choices,
  in both Preferences and advanced settings, so the two can never collide — see
  [ADR 0009](./adr/0009-judge-model-excludes-the-interview-model.md)
- `score_breakdown`: `{ question_relevance, persona_consistency, pacing: 1-5 }` — simple
  numeric scoring, not a full rubric
- `reasoning`: free-text explanation of the scores
- `created_at`

Note: evaluation considers the **entire** transcript, including the `ask_back` phase — what
the candidate chooses to ask (or that they decline to ask anything) is itself a signal, the
same way it would read as one to a real interviewer.

## Relationships

```
Document 1──0..* JobApplication   (as job_description_document_id)
Document 1──0..* JobApplication   (as cv_document_id)
JobApplication 1──0..* Interview
Document 1──0..* Interview   (as job_description_document_id)
Document 1──0..* Interview   (as cv_document_id)
Interview 1──1..* Message
Interview 1──0..1 Evaluation
Interview 1──0..1 InterviewerReview
```
