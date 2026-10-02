import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { mapApiError } from '@app/core/api/api-error';
import { Application } from '../models/application';

@Service()
export class ApplicationsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/applications`;

  list(): Observable<Application[]> {
    return this.http.get<Application[]>(this.url).pipe(mapApiError());
  }
}
