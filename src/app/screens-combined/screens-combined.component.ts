import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LiveService } from '../services/live.service';
import { ConfirmationService } from 'primeng/api';
import { NotificationService } from '../services/notification.service';
import { UserTypeService } from '../services/user-type.service';
import { Subject } from 'rxjs';
import { CommonUtils } from '../utils/common.utils';

@Component({
  selector: 'app-screens-combined',
  templateUrl: './screens-combined.component.html',
  styleUrls: ['./screens-combined.component.scss'],
})
export class ScreensCombinedComponent implements OnInit {
  // summary data from server
  svScreensSumm: any;
  userScreensSumm: any;

  // show and hide selected screen details
  showMinimalView = false;
  selectedPreset;
  selectedPresetSymbolsData;

  // new screen
  showNewScreenView = false;

  // show hide manage screen controls
  userViewType = '';
  screenType = '';

  // to update an existing saved screen 
  updateScreenSubject: Subject<void> = new Subject<void>();

  // to save a new screen
  displaySaveDialog = false;
  newPresetName = '';
  saveNewScreenSubject: Subject<string> = new Subject<string>();
  isThereANewScreen = false;


  constructor(
    private liveService: LiveService,
    private confirmationService: ConfirmationService,
    private notificationService: NotificationService,
    private userTypeService: UserTypeService,
  ) {}

  ngOnInit(): void {
    this.userViewType = this.userTypeService.getUserType();

    this.liveService
      .getUrlData('/screen/model/preset/data/10/5')
      .subscribe(svData => (this.svScreensSumm = svData));

    this.liveService
      .getUrlData('/screen/user/preset/data/10/5')
      .subscribe(usrData => (this.userScreensSumm = usrData));
  }

  // show latest and full output of the screen
  onUserRunScreenClick(preset) {
    this.screenType ='user';
    this.selectedPreset = preset;
    this.showMinimalView = true; // changes the view
    this.showNewScreenView = false;
  }

  onSVRunScreenClick(preset) {
    this.screenType = 'sv';
    this.selectedPreset = preset;
    this.showMinimalView = true; // changes the view
    this.showNewScreenView = false;  
  }

  // hides portfolio details pane on the right
  onCloseScreensDetailsClick() {
    this.screenType= '';
    this.showMinimalView = false;
    // this.showEditPortfolio = false;
    this.selectedPreset = null;
    this.selectedPresetSymbolsData = null;
    this.userScreensSumm.preset_data = this.userScreensSumm.preset_data.filter(item => item.preset_id.includes('new_'));
    this.isThereANewScreen = false;
  }

  onCreateNewScreenClick() {
    this.isThereANewScreen = true;
    const newPresetTemplate = {
      preset_id: 'new_' + Date.now().toString() + Math.random().toString().substring(2,4),
      preset_name: '<unsaved>',
      values: [],
      preset_symbols: []
    }
    this.userScreensSumm.preset_data.push(newPresetTemplate);
    this.onUserRunScreenClick(newPresetTemplate);
  }

  // asks for cofirmation
  onDeleteScreenClick(event) {
    this.confirmationService.confirm({
      target: event.target,
      message: 'Are you sure that you want to delete this saved screen?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        //confirm action - call backend to delete
        this.deleteSelectedScreen();
      },
      reject: () => {
        //reject action - none
      },
    });
  }

  deleteSelectedScreen() {
    let url = `/screen/preset?id=${this.selectedPreset.preset_id}`;
    this.liveService.deleteReq(url).subscribe(data => {
      if (data['status'] == 'ok') {
        this.notificationService.showStatus({ status: 'success', message: data['reason'] });
        this.svScreensSumm.preset_data = this.svScreensSumm.preset_data.filter(item => item.preset_id != this.selectedPreset.preset_id);
        this.userScreensSumm.preset_data = this.userScreensSumm.preset_data.filter(item => item.preset_id != this.selectedPreset.preset_id);
        this.onCloseScreensDetailsClick();
      } else {
        this.notificationService.showError('Something went wrong! Please try again.');
      }
    });
  }

  isSVAdmin() {
    return this.userViewType === 'sv_admin';
  }

  isSVScreen() {
    return this.screenType == 'sv';
  }

  hideManageScreen() {
    return this.isSVScreen() && !this.isSVAdmin();
  }

  onSaveUpdatedPresetClick() {
    this.updateScreenSubject.next();
  }

  onSaveNewPresetClick() {
    this.displaySaveDialog = true;
  }

  // child component to save to db
  saveNewPreset() {
    this.saveNewScreenSubject.next(this.newPresetName); 
  }

  // response from child after new preset is saved
  onNewPresetSaved(newPreset) {
    // remove temp preest
    this.isThereANewScreen = false;
    this.userScreensSumm.preset_data = this.userScreensSumm.preset_data.filter(item => item.preset_id !== this.selectedPreset.preset_id);
    // add new preset
    this.userScreensSumm.preset_data.push(newPreset);
    this.userScreensSumm = CommonUtils.deepClone(this.userScreensSumm);
    this.selectedPreset = this.userScreensSumm.preset_data.find(item => item.preset_id == newPreset.preset_id);
    this.displaySaveDialog = false;
    this.newPresetName = '';
  }

  isNewScreen() {
    return this.selectedPreset.preset_id.includes('new_');
  }
}
