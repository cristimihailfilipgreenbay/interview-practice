import { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EffectRef,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { BrnField, BrnFieldA11yService } from '@spartan-ng/brain/field';
import { classes } from '@spartan-ng/helm/utils';

@Component({
  selector: 'hlm-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'alert',
    'data-slot': 'field-error',
    '[attr.id]': 'id()',
    '[hidden]': '!_display()',
  },
  template: `
    @if (_display()) {
      @if (errors(); as list) {
        @for (error of list; track $index) {
          <span class="block">{{ error.message }}</span>
        }
      } @else {
        <ng-content />
      }
    }
  `,
})
export class HlmFieldError implements OnDestroy {
  private static _id = 0;
  /** The unique ID for the field error. If none is supplied, it will be auto-generated. */
  public readonly id = input<string>(`hlm-field-error-${HlmFieldError._id++}`);
  /**
   * The name of the specific validator error key to match (e.g. 'required').
   * When omitted, the error is shown if any validation error is present.
   */
  public readonly validator = input<string>();
  /** Forces the error message to be visible regardless of the control's validation state. */
  public readonly forceShow = input<boolean, BooleanInput>(false, { transform: booleanAttribute });
  /**
   * Signal-forms errors (`field().errors()`), rendered one message per line. When set, the
   * error is shown based on these and `visible`, instead of Spartan's own field state.
   */
  public readonly errors = input<readonly { message?: string }[] | null>(null);
  /** With `errors`: whether to show them yet, typically `field().touched()`. */
  public readonly visible = input(true);
  private readonly _field = inject(BrnField, { optional: true });
  protected readonly _hasError = computed(() => {
    const supplied = this.errors();
    if (supplied !== null) {
      return supplied.length > 0 && this.visible();
    }
    const errors = this._field?.errors();
    if (!errors) return false;

    const validator = this.validator();
    const spartanInvalid = this._field?.controlState()?.spartanInvalid;

    if (!spartanInvalid) return false;

    return validator ? validator in errors : Object.keys(errors).length > 0;
  });
  private readonly _a11y = inject(BrnFieldA11yService, { optional: true, host: true });
  private _registeredId?: string | undefined;
  private readonly _hasParentField = !!this._field;
  protected readonly _display = computed(() =>
    this.errors() !== null
      ? this._hasError()
      : !this._hasParentField || this.forceShow() || this._hasError(),
  );
  private readonly _cleanup: EffectRef | null = this._a11y
    ? effect(() => {
        const a11y = this._a11y;
        if (!a11y) return;

        const id = this.id();
        const hasError = this._hasError();

        if (this._registeredId && (this._registeredId !== id || !hasError)) {
          a11y.unregisterError(this._registeredId);
          this._registeredId = undefined;
        }

        if (hasError && this._registeredId !== id) {
          a11y.registerError(id);
          this._registeredId = id;
        }
      })
    : null;

  constructor() {
    classes(() => 'text-destructive text-sm font-normal');
  }

  ngOnDestroy() {
    this._cleanup?.destroy();

    if (this._registeredId) {
      this._a11y?.unregisterError(this._registeredId);
    }
  }
}
