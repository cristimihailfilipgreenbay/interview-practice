import { Component, computed, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '@app/core/api/api-error';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes-guard';
import { PhaseSettingsOverrides } from './components/phase-settings/phase-settings';
import { InterviewsApi } from '@app/features/interviews/services/interviews-api';
import { ApplicationSummary } from '@app/features/applications/models/application-summary';
import { toCreateInterviewRequest } from './models/create-interview.request';
import {
  createInterviewValidation,
  initialCreateInterviewModel,
} from './models/create-interview.schema';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { InterviewJobContext } from '@app/features/interviews/pages/create-interview/components/interview-job-context/interview-job-context';
import { InterviewStructure } from '@app/features/interviews/pages/create-interview/components/interview-structure/interview-structure';
import { InterviewPersona } from '@app/features/interviews/pages/create-interview/components/interview-persona/interview-persona';
import { InterviewApplication } from '@app/features/interviews/pages/create-interview/components/interview-application/interview-application';
import { InterviewDocuments } from '@app/features/interviews/pages/create-interview/components/interview-documents/interview-documents';

@Component({
  selector: 'app-create-interview',
  imports: [
    RouterLink,
    PhaseSettingsOverrides,
    HlmBreadcrumbImports,
    HlmButtonImports,
    HlmTooltipImports,
    InterviewApplication,
    InterviewJobContext,
    InterviewStructure,
    InterviewPersona,
    InterviewDocuments,
  ],
  templateUrl: './create-interview.html',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class CreateInterview implements HasUnsavedChanges {
  protected readonly model = signal(initialCreateInterviewModel());
  protected readonly selectedApplication = signal<ApplicationSummary | null>(null);
  protected readonly interviewForm = form(this.model, createInterviewValidation);
  protected readonly validationSummary = computed(() => {
    const messages = new Set(
      this.interviewForm()
        .errorSummary()
        .map((error) => error.message)
        .filter((message): message is string => !!message),
    );
    return messages.size > 0 ? [...messages].join(' · ') : 'Some fields need attention.';
  });
  protected readonly submitError = signal<string | null>(null);
  private readonly interviewsApi = inject(InterviewsApi);
  private readonly router = inject(Router);
  private readonly submitted = signal(false);

  hasUnsavedChanges(): boolean {
    return !this.submitted() && this.interviewForm().dirty();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitError.set(null);
    void submit(this.interviewForm, async () => {
      const request = toCreateInterviewRequest(this.model());
      if (!request) {
        this.submitError.set('Some fields are invalid. Check the form and try again.');
        return;
      }
      try {
        const interview = await firstValueFrom(this.interviewsApi.create(request));
        this.submitted.set(true);
        await this.router.navigate(['/interviews', interview.id]);
      } catch (err) {
        this.submitError.set(toApiError(err).message);
      }
    });
  }
}
