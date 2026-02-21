import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

/**
 * App config service.
 * Provides information about current application environment configuration.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  /** API base URL. */
  public readonly apiUrl = environment.baseUrl;
  /** Url to wordPress REST Api. */
  public readonly wordPressUrl = environment.wordPressUrl;
  /** Url to google API */
  public readonly gApiUrl = environment.gApiUrl;
  /** Key for google API */
  public readonly gApiKey = environment.gApiKey;
}
