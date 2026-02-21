import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';

@Pipe({ name: 'safeNumber' })

export class SafeNumberPipe implements PipeTransform {

  constructor() {
    }

   transform(value: string):any {
           let retNumber = Number(value);
           return isNaN(retNumber) ? 0 : retNumber;
       }
}
