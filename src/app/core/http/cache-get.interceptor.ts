import { HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

const responses = new Map<string, HttpResponse<unknown>>();

export const cacheGetInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'GET') {
    return next(request);
  }

  const cached = responses.get(request.urlWithParams);
  if (cached) {
    return of(cached.clone());
  }

  return next(request).pipe(tap((event) => storeResponse(request, event)));
};

export function clearGetCache(url?: string): void {
  if (!url) {
    responses.clear();
    return;
  }

  responses.delete(url);
}

function storeResponse(request: HttpRequest<unknown>, event: HttpEvent<unknown>): void {
  if (event instanceof HttpResponse) {
    responses.set(request.urlWithParams, event.clone());
  }
}
