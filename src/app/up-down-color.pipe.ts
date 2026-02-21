import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'upDownColor'
})
export class UpDownColorPipe implements PipeTransform {

  transform(value: any): any {
        if(value != null && value > 0){
            return 'up';
        }
        else if(value != null && value < 0){
            return 'down';
        }
        else if(value != null && value == 0){
            return 'neutralColor'
        }
        else return "";
  }

}
