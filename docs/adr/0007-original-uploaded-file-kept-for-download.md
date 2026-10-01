# Original uploaded file is kept, not just its extracted text

`Document` stores both `raw_text` (parsed for the LLM phases) and `file_path` (the
original uploaded PDF/DOCX, unmodified), rather than discarding the binary after parsing.
Added after realizing a candidate would otherwise have no way to download their own
uploaded CV/cover letter/job description back — a reconstruction from `raw_text` alone
would lose all original formatting. Reuses the same file storage mechanism as the persona
portrait image, so it added no new infrastructure.
