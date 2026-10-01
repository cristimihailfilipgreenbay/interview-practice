# JobApplication delete cascades to its Interviews

Deleting a `JobApplication` from its sidebar context menu hard-deletes every `Interview`
grouped under it, and everything hanging off each one (`Message`, `Evaluation`,
`InterviewerReview`) — not a soft delete or archive, and not just ungrouping them into
standalone Interviews. A reader might reasonably expect the gentler option (orphan the
Interviews, keep their history), so this is worth recording rather than leaving implicit.
Chosen because a candidate deleting an Application is deliberately discarding that whole
practice run, not just its label; the app should surface a confirmation before this fires,
given the blast radius.
