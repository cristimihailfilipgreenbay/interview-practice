import { computed, Directive, ElementRef, inject, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: 'button[hlmAttachmentTrigger],a[hlmAttachmentTrigger]',
  host: {
    'data-slot': 'attachment-trigger',
    '[attr.type]': '_hostType()',
  },
})
export class HlmAttachmentTrigger {
  public readonly type = input<'button' | 'submit' | 'reset' | null>('button');
  private readonly _elementRef = inject(ElementRef<HTMLElement>);
  protected readonly _hostType = computed(() =>
    this._elementRef.nativeElement.localName === 'button' ? this.type() : null,
  );

  constructor() {
    classes(() => 'absolute inset-0 z-10 outline-none');
  }
}
