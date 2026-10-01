# Single-user prototype, no authentication

The app has no login, no per-user isolation, and no access control — every Document,
Interview, and JobApplication is visible to anyone who can reach it. This is a deliberate
scope call for this prototype, not an oversight: building real auth would add meaningfully
more backend work without serving the assignment's core requirements. Not a security gap in
the required security-guard work either — that guard addresses prompt/content safety, a
different concern from access control. The data model already carries an implicit
single-user scope, so auth can be layered in later (an `owner_id` FK on `documents` and
`interviews`) without reshaping existing tables.
