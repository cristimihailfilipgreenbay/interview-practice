import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { mapApiError } from '@app/core/api/api-error';
import { CreateInterviewRequest } from '@app/features/interviews/pages/create-interview/models/create-interview.request';
import { CreateInterviewResponse } from '@app/features/interviews/pages/create-interview/models/create-interview.response';

@Service()
export class InterviewsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/interviews`;

  create(request: CreateInterviewRequest): Observable<CreateInterviewResponse> {
    return this.http.post<CreateInterviewResponse>(this.url, request).pipe(mapApiError());
  }
}
