import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { User } from '../_models/index';
import { GtmService } from '../services/gtm.service';

@Injectable()
export class UserService {
    constructor(private http: HttpClient, private readonly gtmService: GtmService,) { }

    getAll() {
        this.gtmService.fireGtmEventForApiCalled('UserService ' + 'getAll');
        return this.http.get<User[]>('/api/users');
    }

    getById(id: number) {
        this.gtmService.fireGtmEventForApiCalled('UserService ' + 'getById');
        return this.http.get('/api/users/' + id);
    }

    create(user: User) {
        this.gtmService.fireGtmEventForApiCalled('UserService ' + 'create');
        return this.http.post('/api/users', user);
    }

    update(user: User) {
        this.gtmService.fireGtmEventForApiCalled('UserService ' + 'update');
        return this.http.put('/api/users/' + user.id, user);
    }

    delete(id: number) {
        this.gtmService.fireGtmEventForApiCalled('UserService ' + 'delete');
        return this.http.delete('/api/users/' + id);
    }
}