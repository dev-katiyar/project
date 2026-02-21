import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'classpipe'})


export class ClassPipe implements PipeTransform {
    transform(value: any): any {

       let UpSignals = ["BUY","BULLISH","BUY TO COVER","LONG"];
       let DownSignals = ["SELL","SHORT","SELL SHORT","REDUCE"];
        if (value == null) {
            return "";
        }
        var valStr = value.toString().trim().toUpperCase();
        if(UpSignals.includes(valStr)){

        return "up";
        }
       else if(DownSignals.includes(valStr)){

               return "down";
               }

        else if (valStr == "HOLD") {
            return "";
        }

        else if (value >= 0) {
            return "up";
        }
        else if (value < 0) {
            return "down";
        }
        else {
            return "down";
        }
    }
}
