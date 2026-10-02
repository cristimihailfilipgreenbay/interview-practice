import { Component, computed, DestroyRef, inject, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import {
  DEFAULT_INTERVIEW_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  INTERVIEW_MODELS,
  JUDGE_MODELS,
  Phase,
  PHASE_LABELS,
  PHASES,
  PhaseSettings,
  PhaseSettingsOverride,
  REASONING_EFFORTS,
} from '@app/features/interviews/pages/create-interview/models/phase-settings.schema';
import { CreateInterviewModel } from '@app/features/interviews/pages/create-interview/models/create-interview.schema';
import {
  HlmCard,
  HlmCardContent,
  HlmCardHeader,
  HlmCardImports,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import { HlmFieldGroup, HlmFieldImports } from '@spartan-ng/helm/field';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideWrench } from '@ng-icons/lucide';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSlider } from '@spartan-ng/helm/slider';

@Component({
  selector: 'app-phase-settings',
  providers: [provideIcons({ lucideChevronDown, lucideWrench })],
  imports: [
    HlmLabelImports,
    HlmSelectImports,
    HlmCard,
    HlmCardContent,
    HlmCardHeader,
    HlmCardTitle,
    HlmFieldGroup,
    NgIcon,
    HlmBadgeImports,
    HlmCardImports,
    HlmFieldImports,
    HlmSlider,
    HlmCollapsibleImports,
  ],
  templateUrl: './phase-settings.html',
})
export class PhaseSettingsOverrides {
  readonly interviewForm = input.required<FieldTree<CreateInterviewModel>>();
  /** Stand-in for the Preferences model until Preferences exists. */
  readonly defaultInterviewModel = input(DEFAULT_INTERVIEW_MODEL);
  protected readonly phases = PHASES;
  protected readonly phaseLabels = PHASE_LABELS;
  protected readonly reasoningEfforts = REASONING_EFFORTS;
  protected readonly defaultTemperature = DEFAULT_TEMPERATURE;
  protected readonly defaultMaxTokens = DEFAULT_MAX_TOKENS;
  private scrollTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly field = computed(() => this.interviewForm().phaseSettings());
  private readonly value = computed(() => this.field().value());
  private readonly judgeModels = computed(() => {
    const taken = this.interviewerModels(this.value());
    return JUDGE_MODELS.filter((model) => !taken.has(model));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.scrollTimer));
  }

  /** Opening the section grows the page; scroll to the bottom once the 300ms transition is done. */
  protected onExpandedChange(expanded: boolean): void {
    clearTimeout(this.scrollTimer);
    if (!expanded) {
      return;
    }
    this.scrollTimer = setTimeout(
      () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }),
      320,
    );
  }

  protected modelsFor(phase: Phase): readonly string[] {
    return phase === 'interviewerReview' ? this.judgeModels() : INTERVIEW_MODELS;
  }

  protected current(phase: Phase): PhaseSettings {
    return this.value()[phase] ?? {};
  }

  protected setModel(phase: Phase, raw: unknown): void {
    this.set(phase, { model: this.textOrUndefined(raw) });
  }

  protected setEffort(phase: Phase, raw: unknown): void {
    this.set(phase, { reasoningEffort: this.textOrUndefined(raw) });
  }

  protected setTemperature(phase: Phase, values: number[]): void {
    this.set(phase, { temperature: this.sliderNumber(values) });
  }

  protected setMaxTokens(phase: Phase, values: number[]): void {
    this.set(phase, { maxTokens: this.sliderNumber(values) });
  }

  /** The select emits '' or null for "Default"; we store "not set". */
  private textOrUndefined(raw: unknown): string | undefined {
    return typeof raw === 'string' && raw !== '' ? raw : undefined;
  }

  /** The slider emits `number[]` (it supports ranges); we only ever have one thumb. */
  private sliderNumber([value]: number[]): number | undefined {
    return value === undefined ? undefined : Number(value.toFixed(2));
  }

  private set(phase: Phase, change: Partial<Record<keyof PhaseSettings, unknown>>): void {
    const field = this.field();
    field.value.update((current) => this.applyChange(current, phase, change));
    field.markAsDirty();
  }

  /**
   * Applies one edit to a phase and returns the next overrides: unset (`undefined`) values are
   * removed, a phase left with nothing set is removed entirely, and a judge that now collides
   * with the interview model is cleared.
   */
  private applyChange(
    settings: PhaseSettingsOverride,
    phase: Phase,
    change: Partial<Record<keyof PhaseSettings, unknown>>,
  ): PhaseSettingsOverride {
    const merged = Object.entries({ ...settings[phase], ...change }).filter(
      ([, value]) => value !== undefined,
    );
    const next: PhaseSettingsOverride = { ...settings };
    if (merged.length > 0) {
      next[phase] = Object.fromEntries(merged) as PhaseSettings;
    } else {
      delete next[phase];
    }
    return this.dropCollidingJudge(next);
  }

  /**
   * The judge must never be the model that ran the interview (ADR 0009). The "interview" is the
   * question plan and the live conversation; a phase without an override uses the default model.
   * The server enforces the same rule (`app/interviews/model_rules.py`) as a safety net.
   */
  private interviewerModels(settings: PhaseSettingsOverride): Set<string> {
    return new Set([
      settings.questionPlan?.model ?? this.defaultInterviewModel(),
      settings.liveConversation?.model ?? this.defaultInterviewModel(),
    ]);
  }

  /** Clears the judge's model (and the judge entry, if nothing else is set) when it now collides. */
  private dropCollidingJudge(settings: PhaseSettingsOverride): PhaseSettingsOverride {
    const judge = settings.interviewerReview;
    if (!judge?.model || !this.interviewerModels(settings).has(judge.model)) {
      return settings;
    }
    const rest = Object.fromEntries(Object.entries(judge).filter(([key]) => key !== 'model'));
    const next = { ...settings };
    if (Object.keys(rest).length > 0) {
      next.interviewerReview = rest;
    } else {
      delete next.interviewerReview;
    }
    return next;
  }
}
