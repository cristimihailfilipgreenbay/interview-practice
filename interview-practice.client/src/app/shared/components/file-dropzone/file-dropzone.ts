import { Component, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCloudUpload } from '@ng-icons/lucide';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

/**
 * A click-or-drop file target. Only files matching `accept` (same syntax as the native
 * attribute: extensions like `.pdf` and MIME types like `application/pdf`) are emitted; anything
 * else is ignored without an error. While a file is dragged over it turns green if it looks
 * acceptable and red if not. The projected content is the idle label.
 */
@Component({
  selector: 'app-file-dropzone',
  providers: [provideIcons({ lucideCloudUpload })],
  imports: [HlmSpinnerImports, NgIcon],
  templateUrl: './file-dropzone.html',
})
export class FileDropzone {
  readonly accept = input.required<string>();
  /** Shows a spinner and `busyLabel`, and blocks new files, e.g. while uploading. */
  readonly busy = input(false);
  readonly busyLabel = input('Uploading…');
  readonly fileSelected = output<File>();

  /** While a file is dragged over: does it look acceptable (`accept`) or not (`reject`)? */
  protected readonly dragState = signal<'idle' | 'accept' | 'reject'>('idle');

  protected onChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.emitIfAccepted(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    // File names aren't readable during a drag, but the MIME type usually is ('' when unknown).
    const item = event.dataTransfer?.items[0];
    this.dragState.set(!item || this.mimeAccepted(item.type) ? 'accept' : 'reject');
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragState.set('idle');
    this.emitIfAccepted(event.dataTransfer?.files[0]);
  }

  protected onDragLeave(): void {
    this.dragState.set('idle');
  }

  private emitIfAccepted(file: File | undefined): void {
    if (file && !this.busy() && this.fileAccepted(file)) {
      this.fileSelected.emit(file);
    }
  }

  private tokens(): string[] {
    return this.accept()
      .split(',')
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Unknown (`''`) types pass; the filename check on drop decides. */
  private mimeAccepted(type: string): boolean {
    const mimeTokens = this.tokens().filter((token) => !token.startsWith('.'));
    return (
      type === '' ||
      mimeTokens.length === 0 ||
      mimeTokens.some((token) =>
        token.endsWith('/*') ? type.startsWith(token.slice(0, -1)) : type === token,
      )
    );
  }

  private fileAccepted(file: File): boolean {
    const name = file.name.toLowerCase();
    return (
      this.tokens().some((token) => token.startsWith('.') && name.endsWith(token)) ||
      (file.type !== '' &&
        this.mimeAccepted(file.type) &&
        this.tokens().some((t) => !t.startsWith('.')))
    );
  }
}
