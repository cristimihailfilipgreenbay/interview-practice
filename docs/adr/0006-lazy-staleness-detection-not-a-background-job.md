# Stale sessions are detected lazily, not via a background job

An Interview whose client never gracefully ends it (Alt+F4, crash, power loss) would
otherwise sit at `status = in_progress` forever, since no JS can run to notify the backend
on the way out — neither the in-app leave-confirmation guard nor a `beforeunload` handler
can help here. Rather than standing up a scheduled job/cron to sweep for these, staleness
is detected lazily: any `in_progress` Interview whose `last_activity_at` is older than a
timeout is flipped to `abandoned` the next time it's read (history list, reopening it).
Simpler than a background worker for a prototype at this scale; revisit if the app ever
needs near-real-time abandonment detection.
