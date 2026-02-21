import { Component, OnInit,Output,EventEmitter } from '@angular/core';
import { Tab } from '../models/tab.interface';
import { TabComponent } from '../tab/tab.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.css']
})
export class TabsComponent{

    tabs:Tab[] = [];
    counter = 1;

    @Output() selected = new EventEmitter();

    addTab(tab:TabComponent) {
       if (!this.tabs.length) {
                tab.selected = true;
              }
      tab.tabIndex = this.counter;
      this.counter = this.counter+1;
      this.tabs.push(tab);

    }

    setTabCls(tab) {
        let classes = {
          'tab1': tab.tabIndex == 1,
          'tab2': tab.tabIndex == 2,
          'tab3': tab.tabIndex == 3,
          'tab4': tab.tabIndex == 4,
          'tab5': tab.tabIndex == 5,
          'tab6': tab.tabIndex == 6,
          'tab7': tab.tabIndex == 7,
          'active': tab.selected
        };
        return classes;
      }

    selectTab(tab:Tab) {
      this.tabs.map((tab) => {
        tab.selected = false;
      })
      tab.selected = true;
      this.selected.emit({selectedTab: tab});
    }
}
