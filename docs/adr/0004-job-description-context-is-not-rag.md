# Job description / CV context is plain-text injection, not RAG

The job description, CV, and cover letter text are read directly as prompt context in the
JD/CV analysis phase — there is no vector database or embeddings step anywhere in the app.
The assignment's brief describes this kind of field with "(RAG)", but real
retrieval-augmented generation was judged unnecessary complexity for a single, short
document that fits directly in context. Worth keeping in mind if claiming that optional
task for bonus points, since this is not literally RAG.
