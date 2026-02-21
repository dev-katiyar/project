import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';

@Pipe({ name: 'zeroNumber' })

export class ZeroNumberPipe implements PipeTransform {

  constructor() {
    }

   transform(value: any):any {
       if(value){
               if (value ==0){
                   return "N/A";
               }
               else
               {
                return value;
               }
           }
           else{
            return "N/A";
           }
       }
}
