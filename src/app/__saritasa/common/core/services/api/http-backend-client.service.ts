import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
/** Backend client to avoid interceptors */
export class HttpBackendClient extends HttpClient {
  constructor(handler: HttpBackend) {
    super(handler);
  }
}
