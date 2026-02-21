import {Pipe} from "@angular/core";

@Pipe({
	name : "percentPipe"
})

export class PercentPipe{
	transform(value){
		return value + ("%");
	}
}
