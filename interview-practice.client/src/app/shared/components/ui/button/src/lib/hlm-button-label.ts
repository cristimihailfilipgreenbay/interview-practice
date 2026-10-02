import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

export const BUTTON_LABEL_CLASSES =
  'inline-flex items-center gap-[inherit] motion-reduce:animate-none in-data-[loading-phase=loading]:animate-out in-data-[loading-phase=loading]:fade-out in-data-[loading-phase=loading]:slide-out-to-top-full in-data-[loading-phase=loading]:fill-mode-forwards in-data-[loading-phase=leaving]:animate-in in-data-[loading-phase=leaving]:fade-in in-data-[loading-phase=leaving]:slide-in-from-bottom-full duration-300';

/**
 * The resting content of a button that has a `loading` state. While the button loads it slides
 * up and out, and when loading ends it slides back up from below. A button whose content is
 * plain text gets this wrapper automatically on first load; write it by hand when the content
 * has `@if`/`@for` blocks.
 */
@Directive({
  selector: '[hlmBtnLabel]',
  host: { 'data-slot': 'button-label' },
})
export class HlmButtonLabel {
  constructor() {
    classes(() => BUTTON_LABEL_CLASSES);
  }
}
