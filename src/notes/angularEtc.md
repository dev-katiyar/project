# Angular #

* Duplicate Modules names like ChartModule from highcharts and primeng. 
  Then alias them [Link](https://stackoverflow.com/questions/41393856/ng2-duplicate-module-name)
  e.g.
  `import { CalendarModule as c }  from "primeng/components/calendar/calendar";`
  

* When Angular Error says: "'app-news-table' is not a known element", this means that we need to tell 
  application it exists by adding it to `app.module` file. If `app.module` knows 
  * a component directly `declarations` array
  * a component indirectly `imports` array
  * a service `providers` array
    
  then it is available throughout the application :)


* Data Binding in `model.html` file
  * When bind a variable, then use `[property]="variable"` square brackets
  * When bind a literal value, then use `property="value"` direct assignment
   

* Online Text Compare 
  [Text Compare Online](https://text-compare.com/) 
  
* Take Breaks and Exercise - specially `hang from a bar for few minutes each day` (does wonder in case of back pain).

* Use `ng serve --port 4100` to run parallel servers serving the site 
  locally. Port can be changed to anything. 

# TypeScript Tricks #
* Use unary operator `+` in place of `parseInt` and `parseFloat`. e.g. 
```
  var x = "32";
  var y: number = +x;
```


* Use `//TODO: ` tag inside the code for the items parked for later. 