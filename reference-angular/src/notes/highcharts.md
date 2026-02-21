# Angular HighCharts #

## Demo Reference ## 
* [Demo for All kinds of Charts](https://www.highcharts.com/demo)

## Creation ## 
* `<chart>` tag does not work now in Angular HighChart anymore. Not its an object. 
  
* Steps to get chart working 
  * Import `import { Chart } from 'angular-highcharts';`
  * Declare a private variable `myChart: Chart`;
  * Create chart object with `this.myChart = new Chart(this.options)`. 
  * Bind that `myChart` object reference in template  `<div [chart]=”chart”>` 
  * Modify `this.options` as needed to get the desired chart.  
    
* It is mandatory to include `type` in series data object now, else there will be `XRange Error`. 
  [Link](https://api.highcharts.com/highcharts/chart.type)
  e.g. 
  ```Series = {type: ‘line’, data: [1, 2, 4]}```

* To let Pie Chart render default colors, we have to ensure that point added to the series 
  data array have default value for color `undefined` not `''` (empty string). e.g. `line 150` of 
  common.services changed `let temp1 ={color:'',y:itemVal,name: item[categoryColumn]};` changed 
  to `let temp1 ={color:undefined,y:itemVal,name: item[categoryColumn]};`
  
* Ensure that `options` are getting the right type of value from template and component class. e.g. `min` and `max` 