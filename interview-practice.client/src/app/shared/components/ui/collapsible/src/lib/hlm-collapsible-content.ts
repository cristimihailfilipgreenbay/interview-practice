import { Directive } from '@angular/core';
import { BrnCollapsibleContent } from '@spartan-ng/brain/collapsible';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCollapsibleContent],hlm-collapsible-content',
  hostDirectives: [{ directive: BrnCollapsibleContent, inputs: ['id'] }],
  host: { 'data-slot': 'collapsible-content' },
})
export class HlmCollapsibleContent {
  constructor() {
    // The brain content exposes its measured height as --brn-collapsible-content-height.
    classes(
      () =>
        'overflow-hidden transition-[height,opacity] duration-300 ease-in-out data-[state=closed]:h-0 data-[state=closed]:opacity-0 data-[state=open]:h-(--brn-collapsible-content-height) data-[state=open]:opacity-100 motion-reduce:transition-none',
    );
  }
}
