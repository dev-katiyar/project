import {LiveService} from '../services/live.service';
import { Chart } from 'angular-highcharts';
import { Component, OnInit,Input, SimpleChanges, SimpleChange } from '@angular/core';
import {CommonUtils} from '../utils/common.utils';

@Component({
  selector: 'app-test-priyanka',
  templateUrl: './test-priyanka.component.html',
  styleUrls: ['./test-priyanka.component.css']
})
export class TestPriyankaComponent implements OnInit {

  symbols=["AAPL","MSFT","IBM","NFLX"];
  tableData;
  views;
  selectedView;
  displayColumnsDialog = false;
  groupedColumns;
  selectedViewColumns;
  viewName;

  constructor(private liveService: LiveService) { };

  ngOnInit(): void {
     this.liveService.getTechnicals(this.symbols).subscribe(d => this.tableData = d);
     this.liveService.getUserViews().subscribe(data => this.setViews(data));
     this.liveService.getColumnUniverse().subscribe(res => this.setColumnUniverse(res));
  }

  test(){
       let list1 =[1,2,3,4,5];
       let result=list1
           .filter(i=>i>=2)
           .map(i=>i*2)
           .reduce((a,c)=>a+c,0);

       const cars = [
           { brand: 'Audi', color: 'black' },
           { brand: 'Audi', color: 'white' },
           { brand: 'Ferarri', color: 'red' },
           { brand: 'Ford', color: 'white' },
           { brand: 'Peugot', color: 'white' }
         ];

         let groupByBrand = CommonUtils.groupBy('brand',cars);

         let x1 =[1,2,3,4];
         x1.map(p=>p*3);
         let x2 =[5,6,7,8];
         let y =x1.map(i=>[i*3]);
         let z =y.map(i=>[i]);
         //let a=[[1,2,3],[4,5,6],[]];
  }

  setViews(data){
         // get unique view names
         this.views = CommonUtils.groupBy('view_name',data);
  }

  setColumnUniverse(res){
    let data=res.map(i=> {i['selected']=false; return i});
    this.groupedColumns = CommonUtils.groupBy('groupName',res);
  }


  viewChanged(event){
      this.selectedViewColumns= this.views.filter(item => item.group == event.value)[0].value;
  }

  createView(){
    this.displayColumnsDialog = true;
  }

  saveView(){
//   select user selected fields
       let selectedFields = this.groupedColumns
                            .flatMap(x => x.value
                                         .filter(c => c.selected)
                                         .map(i=>i.field));

       if(this.viewName != '' || selectedFields.length() != 0){
              let postData = {"name":this.viewName,"fields":selectedFields};
              this.liveService.postRequest("/views",postData).subscribe(d=> this.setStatus(d));
       }
       this.resetDialogBox();
  }

  setStatus(d){

  }

  resetDialogBox(){
        this.groupedColumns.map(x => x.value.map(i => i.selected == false));
        this.viewName ='';
        this.displayColumnsDialog = false;
  }
}