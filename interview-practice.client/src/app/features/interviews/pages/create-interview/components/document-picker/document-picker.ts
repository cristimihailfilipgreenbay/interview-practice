import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideX } from '@ng-icons/lucide';
import { HlmAttachmentImports } from '@spartan-ng/helm/attachment';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { firstValueFrom, Subscription } from 'rxjs';
import { toApiError } from '@app/core/api/api-error';
import { DocumentType, StoredDocument } from '@app/features/documents/models/document.schema';
import { MAX_UPLOAD_MB } from '@app/features/documents/documents.constants';
import { DocumentsApi } from '@app/features/documents/services/documents-api';
import { FileDropzone } from '@app/shared/components/file-dropzone/file-dropzone';

let nextId = 0;

const SELECT_PLACEHOLDERS: Record<DocumentType, string> = {
  cv: 'Select existing CV...',
  cover_letter: 'Select existing letter...',
  job_description: 'Select existing description...',
};

/**
 * Select a saved Document, or upload a new PDF (click or drop). Once a file is uploadedDocuments here it
 * replaces the select and dropzone with an attachment and a "save for later" checkbox.
 * Binds to a form field as a `FormValueControl`.
 *
 * A freshly uploadedDocuments Document is analysed in the background (saved ones already were, or are
 * analysed by the server when the interview is created); `analyzing` lets the page hold back
 * submission meanwhile. Removing the upload stops the analysis. If the server rejects the
 * Document's content (422), it is discarded as if removed and the candidate is asked for a
 * different file; any other failure is on our side, so the Document stays and a notice says the
 * analysis happens when the interview starts (no retry, Start is not blocked).
 */
@Component({
  selector: 'app-document-picker',
  providers: [provideIcons({ lucideFileText, lucideX })],
  imports: [
    HlmAttachmentImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmSelectImports,
    HlmSpinnerImports,
    FileDropzone,
    NgIcon,
  ],
  templateUrl: './document-picker.html',
})
export class DocumentPicker {
  readonly type = input.required<DocumentType>();
  readonly label = input.required<string>();
  readonly value = model<string | null>(null);
  readonly disabled = input(false);
  readonly extraDocuments = input<{ id: string; name: string }[]>([]);

  protected readonly selectId = `document-picker-${nextId++}`;
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly uploadedDocument = signal<StoredDocument | null>(null);
  private readonly analysisRunning = signal(false);
  readonly analyzing = this.analysisRunning.asReadonly();
  /** The analysis failed for a reason that isn't the Document's; the server redoes it later. */
  protected readonly analysisDeferred = signal(false);
  /** Nothing to choose from (still loading, failed to load, or no saved documents yet). */
  protected readonly selectDisabled = computed(
    () =>
      this.disabled() ||
      this.savedDocuments.isLoading() ||
      !!this.savedDocuments.error() ||
      this.options().length === 0,
  );
  protected readonly placeholder = computed(() => {
    if (this.savedDocuments.isLoading()) {
      return 'Loading…';
    }
    if (this.savedDocuments.error()) {
      return 'Unavailable';
    }
    return this.options().length === 0 ? 'No saved documents' : SELECT_PLACEHOLDERS[this.type()];
  });
  private readonly documentsApi = inject(DocumentsApi);
  private analysisRequest: Subscription | null = null;
  protected readonly savedDocuments = rxResource({
    params: () => this.type(),
    stream: ({ params }) => this.documentsApi.list(params),
  });
  private readonly uploadedDocuments = signal<StoredDocument[]>([]);
  protected readonly options = computed(() => {
    const listed = this.savedDocuments.value() ?? [];
    const listedIds = new Set(listed.map((doc) => doc.id));
    return [
      ...this.extraDocuments().filter((doc) => !listedIds.has(doc.id)),
      ...this.uploadedDocuments().filter((doc) => !listedIds.has(doc.id)),
      ...listed,
    ];
  });

  protected reload(): void {
    this.savedDocuments.reload();
  }

  protected readonly documentName = (id: unknown): string =>
    this.options().find((doc) => doc.id === id)?.name ??
    (id ? 'Document from the application' : '');

  /** Clears the upload from the form and deletes the Document; not awaited, a failure is harmless. */
  protected removeUpload(): void {
    const document = this.uploadedDocument();
    this.value.set(null);
    if (document) {
      this.discardUpload(document);
    }
  }

  private discardUpload(document: StoredDocument): void {
    this.stopAnalysis();
    this.analysisDeferred.set(false);
    this.uploadedDocument.set(null);
    this.uploadError.set(null);
    this.uploadedDocuments.update((list) => list.filter((doc) => doc.id !== document.id));
    this.documentsApi.delete(document.id).subscribe({
      next: () => this.savedDocuments.reload(),
      error: () => undefined,
    });
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => this.analysisRequest?.unsubscribe());

    // Choosing something else clears the "couldn't be analyzed" message of the discarded file.
    effect(() => {
      if (this.value()) {
        untracked(() => this.uploadError.set(null));
      }
    });

    // Something else set a different Document (e.g. an Application's): the upload is replaced.
    effect(() => {
      const document = this.uploadedDocument();
      if (document && this.value() !== document.id) {
        untracked(() => this.discardUpload(document));
      }
    });
  }

  private stopAnalysis(): void {
    this.analysisRequest?.unsubscribe();
    this.analysisRequest = null;
    this.analysisRunning.set(false);
  }

  /** No retry: a rejected Document is discarded like a user remove, anything else is deferred. */
  private analyze(document: StoredDocument): void {
    this.stopAnalysis();
    this.analysisDeferred.set(false);
    this.analysisRunning.set(true);
    this.analysisRequest = this.documentsApi.analyzeDocument(document.id).subscribe({
      next: () => this.stopAnalysis(),
      error: (err: unknown) => {
        const error = toApiError(err);
        if (error.status !== 422 && error.code !== 'INPUT_REJECTED') {
          this.stopAnalysis();
          this.analysisDeferred.set(true);
          return;
        }
        const reason = error.message.replace(/\.$/, '');
        this.value.set(null);
        this.discardUpload(document);
        this.uploadError.set(
          `This document couldn't be analyzed: ${reason}. Please upload a different file.`,
        );
      },
    });
  }

  protected async setSaved(saved: boolean): Promise<void> {
    const document = this.uploadedDocument();
    if (!document) {
      return;
    }
    try {
      const updated = await firstValueFrom(this.documentsApi.update(document.id, { saved }));
      this.uploadedDocument.set(updated);
      this.savedDocuments.reload();
    } catch (err) {
      this.uploadError.set(toApiError(err).message);
    }
  }

  /** The dropzone only hands over PDFs; the size limit is checked here. */
  protected async upload(file: File): Promise<void> {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      this.uploadError.set(`The file is larger than ${MAX_UPLOAD_MB} MB.`);
      return;
    }

    this.uploadError.set(null);
    this.uploading.set(true);
    try {
      // A job description is usually specific to one role, so it isn't kept unless asked.
      const save = this.type() !== 'job_description';
      const document = await firstValueFrom(this.documentsApi.upload(file, this.type(), save));
      this.uploadedDocuments.update((list) => [document, ...list]);
      this.uploadedDocument.set(document);
      this.value.set(document.id);
      this.savedDocuments.reload();
      this.analyze(document);
    } catch (err) {
      this.uploadError.set(toApiError(err).message);
    } finally {
      this.uploading.set(false);
    }
  }
}
