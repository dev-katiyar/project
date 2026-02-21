import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WpUser } from '../../models/wordpress/wp-user';
import { AppConfigService } from '../app-config.service';
import { WpUserDto } from '../mappers/wordpress/dto/wp-user-dto';
import { WpUserMapper } from '../mappers/wordpress/wp-user.mapper';
import { GtmService } from 'src/app/services/gtm.service';

@Injectable({ providedIn: 'root' })
/** Service for access to users from WordPress */
export class WpUserApiService {
  /** Url to wordpress users Rest API */
  private readonly userUrl = new URL('wp-json/wp/v2/users', this.config.wordPressUrl).toString();

  public constructor(
    private readonly config: AppConfigService,
    private readonly http: HttpClient,
    private readonly userMapper: WpUserMapper,
    private readonly gtmService: GtmService,
  ) {}

  /** Get user info by id */
  public getUserById(id: number): Observable<WpUser> {
    const url = `${this.userUrl}/${id}`;
    this.gtmService.fireGtmEventForApiCalled('getUserById');
    return this.http.get<WpUserDto>(url).pipe(map(user => this.userMapper.fromDto(user)));
  }
}
