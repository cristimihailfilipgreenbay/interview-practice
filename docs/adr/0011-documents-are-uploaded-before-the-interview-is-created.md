# Documents are uploaded before the Interview is created

In Create Interview, a CV / cover letter / job description is uploaded to
`POST /api/documents` as soon as the candidate picks the file, and the form then carries
only the returned `Document` id; `POST /api/interviews` stays plain JSON and references
documents by id. The alternative — keeping the `File` in the browser and sending it inline
in a multipart `POST /api/interviews` — would have meant a second upload code path inside
the interviews Blueprint and a multipart variant of the app's heaviest request (the one
that runs the LLM phases and image generation), and an unreadable PDF (scanned, encrypted,
over the size limit) would only be reported at submit, after the candidate filled in the whole form.
Uploading first also explains the `saved` flag: a `Document` row always exists before the
Interview that points at it.

Removing the uploaded file in the form deletes the `Document` straight away
(`DELETE /api/documents/:id`, fire-and-forget). The cost, accepted for the prototype, is the
other case: a candidate who uploads a file and then abandons the form (closes the tab,
navigates away) leaves behind an unreferenced `Document` (row, `raw_text`, and file on disk)
that nothing deletes, and the client can't be relied on to clean up on page exit (same
reasoning as [ADR 0006](./0006-lazy-staleness-detection-not-a-background-job.md)). Whether it
is `saved` depends on the "save for later" checkbox. If it
starts to matter, the fix is a lazy cleanup that removes `saved = false` Documents older
than a grace period (e.g. 24 hours) and not referenced by any `Interview` or
`JobApplication` — an unsaved Document that an Interview references is the normal one-off
case and must never be deleted.

For a real production deployment this stops being optional and becomes a scheduled job: a
single-purpose command (e.g. a Flask CLI command) run daily by cron, a systemd timer or a
Kubernetes `CronJob`, idempotent, deleting the row before the file and sweeping for files
with no row, with a grace period and logged counts. If uploads moved to object storage, an
S3-style **lifecycle rule** on a temporary prefix (files promoted out of it once the
Document is committed) would handle the file side, leaving only the row cleanup to the job.
Uploaded CVs are personal data, so a retention policy may also be a compliance requirement,
not just housekeeping. None of this is built or designed in detail yet.
