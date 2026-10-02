import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { classes } from '@spartan-ng/helm/utils';

/**
 * The spinner of a loading button: slides up from below as the label slides out, and slides up
 * and out again when loading ends. `HlmButton` creates one itself the first time it loads, so
 * it only needs to be written by hand for a custom spinner.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'span[hlmBtnSpinner]',
  imports: [HlmSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-slot': 'button-spinner' },
  template: `<hlm-spinner aria-label="Loading" />`,
})
export class HlmButtonSpinner {
  constructor() {
    classes(
      () =>
        'pointer-events-none invisible absolute inset-0 flex items-center justify-center motion-reduce:animate-none in-data-[loading-phase=loading]:visible in-data-[loading-phase=loading]:animate-in in-data-[loading-phase=loading]:fade-in in-data-[loading-phase=loading]:slide-in-from-bottom-full in-data-[loading-phase=leaving]:visible in-data-[loading-phase=leaving]:animate-out in-data-[loading-phase=leaving]:fade-out in-data-[loading-phase=leaving]:slide-out-to-top-full in-data-[loading-phase=leaving]:fill-mode-forwards duration-300',
    );
  }
}
