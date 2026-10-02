import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrnSlider, BrnSliderImports, injectBrnSlider } from '@spartan-ng/brain/slider';
import { classes } from '@spartan-ng/helm/utils';

@Component({
  selector: 'hlm-slider, brn-slider [hlm]',
  imports: [BrnSliderImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: BrnSlider,
      inputs: [
        'id',
        'value',
        'disabled',
        'min',
        'max',
        'step',
        'minStepsBetweenThumbs',
        'maxStepsBetweenThumbs',
        'preventStepOverThumb',
        'inverted',
        'orientation',
        'showTicks',
        'maxTicks',
        'tickLabelInterval',
        'formatTick',
        'draggableRange',
        'draggableRangeOnly',
        'aria-label',
        'aria-labelledby',
      ],
      outputs: ['valueChange'],
    },
  ],
  template: `
    <div
      class="relative flex w-full items-center group-data-vertical:w-auto group-data-vertical:flex-col"
    >
      <div
        brnSliderTrack
        class="bg-muted rounded-full data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5 relative grow overflow-hidden"
      >
        <div
          class="bg-primary/40 absolute select-none data-draggable-range:cursor-move data-horizontal:h-full data-vertical:w-full"
          brnSliderRange
        ></div>
      </div>

      @for (i of _slider.thumbIndexes(); track i) {
        <span
          class="group/thumb cursor-pointer border-primary ring-ring/50 w-5.5 h-3.5 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden absolute block shrink-0 select-none after:absolute after:-inset-2"
          brnSliderThumb
        >
          @if (valueTooltip()) {
            <span
              class="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity group-hover/thumb:opacity-100 group-focus/thumb:opacity-100 group-active/thumb:opacity-100"
              aria-hidden="true"
            >
              {{ _slider.normalizedValue()[i] }}
              <span
                class="bg-foreground absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
              ></span>
            </span>
          }
        </span>
      }
    </div>

    @if (_slider.showTicks()) {
      <div
        class="px-2 group-data-vertical:px-0 group-data-vertical:py-2 text-muted-foreground mt-3 flex w-full items-start justify-between gap-1 text-xs font-medium group-data-horizontal:group-data-inverted:flex-row-reverse group-data-vertical:ms-3 group-data-vertical:mt-0 group-data-vertical:w-auto group-data-vertical:flex-col-reverse group-data-vertical:group-data-inverted:flex-col"
      >
        <div
          *brnSliderTick="let tick; let formattedTick = formattedTick"
          class="group flex w-0 flex-col items-center justify-center gap-2 group-data-vertical:h-0 group-data-vertical:w-auto group-data-vertical:flex-row"
        >
          <div
            class="bg-muted-foreground/70 h-1 w-px group-data-vertical:h-px group-data-vertical:w-1 group-data-horizontal:group-data-[skip]:h-0.5 group-data-vertical:group-data-[skip]:w-0.5"
          ></div>
          <div class="text-center group-data-[skip]:opacity-0">{{ formattedTick }}</div>
        </div>
      </div>
    }
  `,
})
export class HlmSlider {
  /** Show the thumb's current value in a label above it on hover, focus and while dragging. */
  public readonly valueTooltip = input(false, { transform: booleanAttribute });

  protected readonly _slider = injectBrnSlider();

  constructor() {
    classes(() => [
      'group flex w-full touch-none flex-col select-none data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-row data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    ]);
  }
}
