import { Injectable, Pipe } from '@angular/core';
@Pipe({
   name: 'keyObject'
})
@Injectable()
export class KeyObjectPipe {

transform(value: any, args?: any): any {
    return Object.keys(value);
  }
}
