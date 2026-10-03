import { Component, input } from '@angular/core';

/** Placeholder for the live interview (docs/overview.md). `id` comes from the route. */
@Component({
  selector: 'app-interview-session',
  templateUrl: './interview-session.html',
})
export class InterviewSession {
  readonly id = input.required<string>();
}
