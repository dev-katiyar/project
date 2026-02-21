import { Input,Component,TemplateRef,ViewChild, OnInit,QueryList,ViewChildren ,ContentChildren} from '@angular/core';
import { LiveService } from '../services/live.service';
import { TechnicalService } from '../services/technical.service';

@Component({
  selector: 'app-dynamic-table',
  templateUrl: './dynamic-table.component.html',
  styleUrls: ['./dynamic-table.component.scss']
})
export class DynamicTableComponent implements OnInit {

   @ViewChild('defaultTemplate') defaultTemplate:TemplateRef<any>;
   @ViewChild('ratingTemplate') ratingTemplate:TemplateRef<any>;
   @ViewChild('priceTemplate') priceTemplate:TemplateRef<any>;
   @ViewChild('week52Template') week52Template:TemplateRef<any>;
   @ViewChild('marketCapTemplate') marketCapTemplate:TemplateRef<any>;
   @ViewChild('defaultHeaderTemplate') defaultHeaderTemplate:TemplateRef<any>;
   @ViewChild('headerFilterTemplate') headerFilterTemplate:TemplateRef<any>;
   @ViewChild('toolTipTemplate') toolTipTemplate:TemplateRef<any>;


   @Input() tableCols;
   @Input() tableData;
//    @ViewChildren('customTemplates',TemplateRef) templates:QueryList<TemplateRef<any>>;

   templateRefs= {};

  getPipe(pipeName){
      return pipeName;
  }

  constructor(private liveService: LiveService, private technicalService: TechnicalService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(){
       this.templateRefs['defaultTemplate'] = this.defaultTemplate;
       this.templateRefs['ratingTemplate'] = this.ratingTemplate;
       this.templateRefs['priceTemplate'] = this.priceTemplate;
       this.templateRefs['week52Template'] = this.week52Template;
       this.templateRefs['marketCapTemplate'] = this.marketCapTemplate;
       this.templateRefs['defaultHeaderTemplate'] = this.defaultHeaderTemplate;
       this.templateRefs['headerFilterTemplate'] = this.headerFilterTemplate;
       this.templateRefs['toolTipTemplate'] = this.toolTipTemplate;
  }
}