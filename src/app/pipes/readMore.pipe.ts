import { PipeTransform, Pipe } from "@angular/core";

@Pipe({
    name: 'readMore'
})
export class ReadMorePipe implements PipeTransform{

    transform(value:string,maximized:boolean): string {
        if(value.length > 1000 && !maximized){
            return value.substring(0, 1000) + '...';
        }
        else{
            return value;
        }
    }
}