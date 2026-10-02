import { z } from 'zod';

const documentTypeSchema = z.enum(['cv', 'cover_letter', 'job_description']);
export type DocumentType = z.infer<typeof documentTypeSchema>;

/** A stored Document as returned by the list and upload endpoints (no `raw_text`/`file_path`). */
export const storedDocumentSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  name: z.string(),
  sourceFilename: z.string(),
  saved: z.boolean(),
  createdAt: z.coerce.date(),
});
export type StoredDocument = z.infer<typeof storedDocumentSchema>;

export const storedDocumentListSchema = z.array(storedDocumentSchema);
