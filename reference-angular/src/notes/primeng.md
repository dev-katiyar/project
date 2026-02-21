[NG Prime API Reference ](https://www.primefaces.org/primeng/v11/#/)

--- 

# Minimum Setup #

* `npm install primeng --save`  installs latest primeng framework. 
* `npm install primeicons --save` installs icons like filters, up down arrow etc needed to apply basic looks
* Add following to *angular.json*
    * CSS file to manage icons 
    * CSS file with min requirement for *primeng*
```
    "node_modules/primeicons/primeicons.css"
    "node_modules/primeng/resources/primeng.min.css"
```
    * Layout and Color to be decided by the theme and layout CSS files. Which are mostly part of the template 
      that is selected - like Apollo, Serenity etc. There are instructions to get the same done. (later..)  
* Import is done from element specific module now. So, `import {AutoCompleteModule} from 'primeng/autocomplete';`
  is now >>> becomes `import {AutoCompleteModule} from 'primeng/autocomplete';`

# Responsive Grid #

### Set Up ###
* Install: `npm install primeflex --save`
* Add CSS to *angular.json*: `"./node_modules/primeflex/primeflex.css"`


### Use following pattern for Responsive Grid ###

* `p-col-`:    generic - all devices 
* `p-sm-`:     small  (>576px) like phone
* `p-md-`:     medium (>768px) like tablet
* `p-lg-`:     large  (>992px) like laptop
* `p-xl-`:     big    (>1200px) like trading terminal

e.g.
    
```html
<div class="p-grid">
    <div class="p-col-12 p-md-6 p-lg-3">A</div>
    <div class="p-col-12 p-md-6 p-lg-3">B</div>
    <div class="p-col-12 p-md-6 p-lg-3">C</div>
    <div class="p-col-12 p-md-6 p-lg-3">D</div>
</div>
```

e.g. (note use of `p-grid` twice to get a sub-grid)

```html
<div class="p-grid">
    <div class="p-col-8">
        <div class="p-grid">
            <div class="p-col-6">
                6
            </div>
            <div class="p-col-6">
                6
            </div>
            <div class="p-col-12">
                12
            </div>
        </div>
    </div>
    <div class="p-col-4">
        4
    </div>
</div>
```

Imp Notes: 
1. Must use `p-nogutter` class along with `p-grid`. As there are -ve margins are added on both x and y-axis,
   which might show grid off of intended position. `p-nogutter` removes both -ve margins and padding. 
   [Link](https://forum.primefaces.org/viewtopic.php?t=63302)

e.g.

```html
<div class="p-grid p-nogutter">
    <div class="p-col-12 p-md-6 p-lg-3">A</div>
    <div class="p-col-12 p-md-6 p-lg-3">B</div>
    <div class="p-col-12 p-md-6 p-lg-3">C</div>
    <div class="p-col-12 p-md-6 p-lg-3">D</div>
</div>
```

2. Note: There are other class `p-col-nogutter`, which removes only the padding.
3. `p-nogutter` and `p-col-nogutter` can be applied at any level, no necessary at `p-grid` level
4. `p-col`, `p-col-12` etc. can be used at any level get the desired width, kind of replacement of `p-field`, 
   like when we do not like the 1rem bottom margin added by `p-field`.
5. [Link to Prime Flex CSS file](https://github.com/primefaces/primeflex/blob/master/primeflex.css) for further reading.


# Form Layout #

### Basic Pattern for forms ###

*Vertical layout*
* `p-fluid` for the outer div. It makes the default width of input field 100%. 
* `p-field` for div containing form elements like label and input pair. 

```html
<div class="p-fluid">
    <div class="p-field">
        <label for="firstname1">Firstname</label>
        <input id="firstname1" type="text" pInputText> 
    </div>
    <div class="p-field">
        <label for="lastname1">Lastname</label>
        <input id="lastname1" type="text" pInputText> 
    </div>
</div>
```

### Grid and Form Layout Mix ###

Grid and Form layout can be combined to get complex layouts like horizontal, fix width etc.


```html
<div class="p-field p-grid">
    <label for="firstname3" class="p-col-fixed" style="width:100px">Firstname</label>
    <div class="p-col">
        <input id="firstname3" type="text" pInputText> 
    </div>
</div>
<div class="p-field p-grid">
    <label for="lastname3" class="p-col-fixed" style="width:100px">Lastname</label>
    <div class="p-col">
        <input id="lastname3" type="text" pInputText> 
    </div>
</div>

```

*Imp Notes*: 
1. The grid classes `p-grid` and `p-col-` etc. can be applied to any element. Not necessary to have div. 
2. `p-field` add 1rem margin at bottom.
3. `p-formgrid` removes the padding top margin added by the `p-grid`. So, if `p-formgrid` and `p-field` is being used,
    then we do not need to use `p-nogutter` or `p-col-nogutter`
4. One way to get rid off negative margin is to use `style="margin-top:0"` along with `p-grid`. The issue 
   with is that `p-nogutter` removes padding as well. 


### pElements vs Normal Elements ###
* PrimeNG styles are applied to pElements. Two ways to have pElement 
    * Use PrimeNG supplied components/pElements. e.g. `<p-button>`, `<p-checkbox>`
    * Use prime attributes to convert normal elements into pElements. e.g. `pButton`, `pInputText`
    
e.g. 
```html
    <button pButton type="button" icon="pi pi-check" iconPos="left"></button>
```
vs
```html
    <p-button label="Click" icon="pi pi-check" iconPos="left"></p-button>
```


# Other Generic Notes #
1. **CENTERING:** We can use a center justified `p-grid` along with `p-col` to center and get responsive image. 
e.g. *register.component.html*
```html
    <div class="p-grid p-jc-center">
        <img class="p-col-2" src="./assets/images/30-Day-Free-Trial-Seal.png">
    </div>
```

   OR

   We can use following style directly on element (override using `!important` as needed). Use 
   of margins etc can be avoided. e.g.  

```html
    <div style="justify-content: center; display: flex !important"></div>
```


2. **P-DIALOG:** The old themes in new latest ngprime show background as transparent. So,
    * We need to use some latest theme in `angular.json` like `"./node_modules/primeng/resources/themes/saga-blue/theme.css",`. This will
    make the font and size of all UI elements bigger.
    * Quick-fix suggested in the following link does not work. [Transparent Dialog Background](https://github.com/primefaces/primeng/issues/8644)
    Add `.ui-widget-overlay {  background-color: rgb(0,0,0,0.4); }` in `_common.scss`
    * Many properties of p-dialog has chaanged.
      * `width` (and other styles) is now >> `[style]="{width: '50vw'}` related to viewport width. It can be made responsive using
      `[breakpoints]="{'960px': '60vw', '640px': '90vw'}"`
      * `minWidth` does not exist now.

3. **DATAGRID:** `DataGridModule` and `DataListModule` has been deprecated and combined into `DataViewModule` (since v7.0)
   [Link1](https://github.com/primefaces/primeng/issues/5248) & [Link2](https://github.com/primefaces/primeng/issues/8328)

4. **DATASCROLLER:** `DataScrollerModule` has been deprecated and is now `VirtualScrollerModule` [Link](https://github.com/primefaces/primeng/issues/6870)

5. **DATATABLE:**  `TableModule`has been deprecated and is now `DataTableModule` [Link](https://stackoverflow.com/questions/57059259/primeng-upgrading-to-8-0-1-error-loading-datatable)

6. **GROWL:** `GrowlModule` has been deprecated and is now `ToastModule` [Link](https://www.primefaces.org/primeng-6-0-2-released/)

7. **LIGHTBOX:** `LightboxModule` is not listed on online doc, but module present in `primeng` folder. So should work.

8. **SHARED:**  `SharedMoudle` might not be required. It is not there in lib folder. [Link](https://github.com/primefaces/primeng/issues/2508)

9. **SCHEDULE:** `ScheduleModule` has been deprecated and is now `FullCalendarModule` [Link](https://github.com/primefaces/primeng/issues/6758)

10. **SPINNER:** `SpinnerMoudle` is not list in docs but in folder. So should work. But we should not use it. [Link](https://github.com/primefaces/primeng/issues/9096)

### Table ###
1. `<p-dataTable>` has been deprecated. It is now `p-table`. [Link](https://forum.primefaces.org/viewtopic.php?t=55056)

2. `p-column` has been deprecated. Need to use `<tr> <th> <td>` for the layout along with `pTemplates` for header,
   body, footer etc. Refer to official documentation, as the full table need to be created from 
   scratch. [Official Docs p-table](https://www.primefaces.org/primeng/v11/#/table)
   e.g. 
   
```html
    <div class="card">
        <h5>Single Column</h5>
        <p-table [value]="products1">
            <ng-template pTemplate="header">
                <tr>
                    <th pSortableColumn="code">Code <p-sortIcon field="code"></p-sortIcon></th>
                    <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
                    <th pSortableColumn="category">Category <p-sortIcon field="category"></p-sortIcon></th>
                    <th pSortableColumn="quantity">Quantity <p-sortIcon field="quantity"></p-sortIcon></th>
                    <th pSortableColumn="price">Price <p-sortIcon field="price"></p-sortIcon></th>
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-product>
                <tr>
                    <td>{{product.code}}</td>
                    <td>{{product.name}}</td>
                    <td>{{product.category}}</td>
                    <td>{{product.quantity}}</td>
                    <td>{{product.price | currency: 'USD'}}</td>
                </tr>
            </ng-template>
        </p-table>
    </div>
```


### TabView ###
1. Lazy loading can for content in tab panels can be done using prime-ng. Network calls are 
   made as and when tabs are clicked. Once loaded content is cached for future rendering. 
```html
<p-tabView>
    <p-tabPanel header="Header 1">
        Content 1
    </p-tabPanel>
    <p-tabPanel header="Header 2">
        <ng-template pTemplate="content">
            Complex Content to Lazy Load
        </ng-template>
    </p-tabPanel>
    <p-tabPanel header="Header 3">
        <ng-template pTemplate="content">
            Complex Content to Lazy Load
        </ng-template>
    </p-tabPanel>
</p-tabView>
```