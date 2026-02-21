import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { LiveService } from '../services/live.service';
import { Router, ActivatedRoute } from '@angular/router';
import { TechnicalService } from '../services/technical.service';
import { mergeMap } from 'rxjs/operators';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AppBreadcrumbService } from '../app.breadcrumb.service';
import { CommonUtils } from '../utils/common.utils';
import { RIAConstants } from '../utils/ria.constants';
import { Inplace } from 'primeng/inplace';

/*
 we have filters coming from mongodb .
 we have presets(saved filter) in mongodb.
 ui filters are binded to filters .
 while loading preset(saved filter) we set values from them to filters .
*/
@Component({
  selector: 'app-screen-filter2024',
  templateUrl: './screen-filter2024.component.html',
  styleUrls: ['./screen-filter2024.component.scss'],
})
export class ScreenFilter2024Component implements OnInit, OnChanges {
  scannedSymbols;
  allFilters = [];
  user_selections = [];
  groups;
  DEFAULT_OPTION = { name: RIAConstants.DEFAULT_OPTION_TEXT, id: RIAConstants.DEFAULT_OPTION_ID };
  CUSTOM_OPTION = { name: RIAConstants.CUSTOM_OPTION_TEXT, id: RIAConstants.CUSTOM_OPTION_ID };
  displaySaveDialog = false;
  isFilterExpanded = true;
  CUSTOM_OPTION_ID = RIAConstants.CUSTOM_OPTION_ID;
  DEFAULT_OPTION_ID = RIAConstants.DEFAULT_OPTION_ID;
  symbolCount = '';
  presetName = '';
  presetImage;
  presetDescription;

  allSavedPresets;
  sortColumns;
  sortOrder = [
    { name: RIAConstants.DEFAULT_OPTION_TEXT, id: RIAConstants.DEFAULT_OPTION_ID },
    { id: 'asc', name: 'Ascending' },
    { name: 'Descending', id: 'desc' },
  ];
  limitList = [
    { name: RIAConstants.DEFAULT_OPTION_TEXT, id: RIAConstants.DEFAULT_OPTION_ID },
    { name: 10, id: 10 },
    { name: 20, id: 20 },
    { name: 50, id: 50 },
    { name: 100, id: 100 },
  ];

  selectedSortColumnId;
  selectedSortOrderId;
  @Input() selectedPresetId;
  selectedLimitId;
  isAdminUser = 0;

  watchlists: any;
  displayAddToWatchlistsDialog = false;
  watchlistName = '';
  selectedWatchListId: any;
  isCreateNewWatchlistVisible = false;
  watchlistSymbols = [];
  screenImages;

  // Ui 2024 work
  selectedPresetFiltersAndSymbols;
  selectedFilters = []; // out of allFilters
  remainingFilters = []; // out of allFilters
  msgFilters = ''; // at least one filter and other messages

  temp;

  // to listen to save update btn click on parent
  @Input() saveUpdatedBtnClickObs: Observable<void>;
  saveUpdatedBtnClickSub: Subscription;

  // to listen to save new btn click on parent
  @Input() saveNewBtnClickObs: Observable<string>;
  saveNewBtnClickSub: Subscription;

  // output to the parent about the new present
  @Output() newPresetSaved = new EventEmitter();

  constructor(
    private notificationService: NotificationService,
    private liveService: LiveService,
    private route: ActivatedRoute,
    private technicalService: TechnicalService,
    private breadcrumbService: AppBreadcrumbService,
  ) {
    this.breadcrumbService.setItems([
      { label: 'Ideas', routerLink: ['trading-ideas'] },
      { label: 'Screener', routerLink: ['screen-filter'] },
    ]);
  }

  ngOnInit(): void {
    this.saveUpdatedBtnClickSub = this.saveUpdatedBtnClickObs.subscribe(() =>
      this.onSaveUpdatedScreenClick(),
    );

    this.saveNewBtnClickSub = this.saveNewBtnClickObs.subscribe(newName =>
      this.onSaveNewScreenClick(newName),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('selectedPresetId' in changes) {
      this.msgFilters = '';
      if (changes?.selectedPresetId.firstChange && this.selectedPresetId) {
        // need to load all possible filters, to be used for editing later
        this.getAllFiltersAndPresetData();
      } else {
        this.getPresetValuesAndDataForSelectedPreset();
      }
    }
  }

  // load data for the preset with saved filter
  getPresetValuesAndDataForSelectedPreset() {
    if (this.isNewScreen()) {
      // dont ask for symbols if new screen
      this.msgFilters =
        'At least one filter is needed. Please select more filters from the dropdown above.';
      this.selectedFilters = [];
      this.remainingFilters = this.getRemaingFilters();
      this.selectedPresetFiltersAndSymbols = {
        preset_data: {
          preset_id: this.selectedPresetId,
          preset_name: '<unsaved>',
          values: [],
          preset_symbols: [],
        },
      };
    } else {
      this.liveService
        .getUrlData('/screen/preset/data/' + this.selectedPresetId)
        .subscribe(data => {
          this.selectedPresetFiltersAndSymbols = data;
          this.setScanResultForUI(null);
        });
    }
  }

  setScanResultForUI(sFilters) {
    this.scannedSymbols = this.selectedPresetFiltersAndSymbols.preset_data.preset_symbols;
    if (this.scannedSymbols) {
      this.symbolCount = `Scan Result: ${this.scannedSymbols.length} ticker(s) found`;
      this.preapreUserSelectedFilters(sFilters);
    }
  }

  // load data for the preset as in the UI
  updatePresetValuesAndDataForSelectedPreset() {
    this.updatePresetData();
  }

  // get selected from Saved State of Preset
  updatePresetValues() {
    this.selectedPresetFiltersAndSymbols.preset_data.values = CommonUtils.deepClone(
      this.selectedFilters,
    );
  }

  updatePresetData() {
    this.clearDataView();
    let changedFilters = this.selectedFilters.filter(filterItem =>
      this.findChangesInFilters(filterItem),
    );
    if (changedFilters.length > 0) {
      const scanRequest = { values: changedFilters };
      this.liveService.postRequest('/screen/filter', scanRequest).subscribe(d => {
        if (d && (d as any[]).length > 0) {
          this.symbolCount = `Scan Result: ${(d as any[]).length} item(s) found`;
        }
        this.selectedPresetFiltersAndSymbols.preset_data.preset_symbols = d;
        this.setScanResultForUI(changedFilters);
      });
    } else {
      this.notificationService.showError(
        'Please select a Screen or at least one Filter with Non-Default Value!',
      );
    }
  }

  onRemoveSelectedFilter(sFilter) {
    if (this.selectedFilters.length == 1) {
      this.msgFilters =
        'At least one filter is needed. Please select more filters from the dropdown above.';
    } else {
      this.msgFilters = '';
    }
    this.selectedFilters = this.selectedFilters.filter(filter => filter.name !== sFilter.name);
    this.remainingFilters.push(sFilter);
  }

  preapreUserSelectedFilters(sFilters) {
    this.msgFilters = '';
    this.user_selections = [];
    // separate selected and remaining filters
    this.selectedFilters = sFilters ? sFilters : this.getSelectedFilters(); // use the edited filters, if passed. Else get from Savged State of Preset
    this.remainingFilters = this.getRemaingFilters();

    // set text for selected filters for chip display
    for (let filter of this.selectedFilters) {
      this.setTextForSelectedFilter(filter);
    }
  }

  getSelectedFilters() {
    return CommonUtils.deepClone(this.selectedPresetFiltersAndSymbols.preset_data.values);
  }

  getRemaingFilters() {
    const remFilters = this.allFilters.filter(
      aFilter => !this.selectedFilters.some(sFilter => sFilter.name === aFilter.name),
    );
    return CommonUtils.deepClone(remFilters);
  }

  setTextForSelectedFilter(filter) {
    if (filter.type == RIAConstants.TYPE_SLIDER) {
      this.setSliderText(filter);
      return;
    }

    if (filter.multiple && filter.type == RIAConstants.TYPE_DROPDOWN) {
      this.setMultiDropdownText(filter);
      return;
    }

    if (filter.type == RIAConstants.TYPE_DROPDOWN) {
      this.setDropdownText(filter);
      return;
    }
  }

  setSliderText(filter) {
    const name = filter.name;
    const selectedValueText = this.getSliderText(filter);
    filter.text = `${name}: ${selectedValueText}`;
  }

  setMultiDropdownText(filter) {
    const name = filter.name;
    const selectedValues = filter.display_values.filter(item =>
      filter.selected_value.includes(item.id),
    );
    const selectedValuesText = selectedValues.map(i => i.name).join(' & ');
    filter.text = `${name}: ${selectedValuesText}`;
  }

  setDropdownText(filter) {
    const name = filter.name;
    let selectedValueText = '';
    if (filter.selected_value == RIAConstants.CUSTOM_OPTION_ID) {
      selectedValueText = this.getCustomText(filter);
    } else {
      selectedValueText = filter.display_values.find(item => item.id == filter.selected_value).name;
    }
    filter.text = `${name}: ${selectedValueText}`;
  }

  setDropdownCustomText(filter) {
    const name = filter.name;
    const selectedValueText = this.getCustomText(filter);
    filter.text = `${name}: ${selectedValueText}`;
  }

  onAddMoreFilterValueChange(event) {
    const addedFilter = event.value;
    // this.fillDefaultValueForFilter(addedFilter);
    this.selectedFilters.push(addedFilter);
    this.remainingFilters = this.remainingFilters.filter(f => f.name != addedFilter.name);
    this.setTextForSelectedFilter(addedFilter);
    this.msgFilters = '';
  }

  getAllFiltersAndPresetData() {
    let filtersObs = this.liveService.getUrlData('/screen/filter');
    let sortObs = this.liveService.getUrlData('/screen/sort_columns');
    forkJoin([filtersObs, sortObs]).subscribe(result => {
      this.setScreenFilterData(result[0]);
      this.setSortColumns(result[1]);
      this.getPresetValuesAndDataForSelectedPreset();
    });
  }

  setSortColumns(d) {
    this.sortColumns = d;
    this.sortColumns.unshift(this.DEFAULT_OPTION);
    this.selectedSortColumnId = this.DEFAULT_OPTION.id;
  }

  fillMissingDisplayOrder(data) {
    data.forEach(row => {
      if ('display_order' in row) {
        row['display_order'] = parseInt(row['display_order']);
      } else {
        row['display_order'] = 10000;
      }
    });
  }

  fillDefaultValuesInFilters() {
    for (let item of this.allFilters) {
      if (item.type == RIAConstants.TYPE_SLIDER) {
        item.selected_slider_values = [];
        item.selected_slider_values[0] = item.slider_values[0];
        item.selected_slider_values[1] = item.slider_values[1];
        item.text = this.getSliderText(item);
      }
      if (item.type == RIAConstants.TYPE_DROPDOWN) {
        if (item.multiple) {
          item.selected_value = [];
        } else {
          item.display_values.unshift(this.DEFAULT_OPTION);
          item.selected_value = this.DEFAULT_OPTION.id;
        }
      }
      if (item.allow_custom) {
        item.display_values.push(this.CUSTOM_OPTION);
        let range = item.range.split('to');
        item.minValue = range[0];
        item.maxValue = range[1];
      }
    }
  }

  fillDefaultValueForFilter(filter) {
    if (filter.type == RIAConstants.TYPE_SLIDER) {
      filter.selected_slider_values = [];
      filter.selected_slider_values[0] = filter.slider_values[0];
      filter.selected_slider_values[1] = filter.slider_values[1];
      filter.text = this.getSliderText(filter);
    }
    if (filter.type == RIAConstants.TYPE_DROPDOWN) {
      if (filter.multiple) {
        filter.selected_value = [];
      } else {
        filter.display_values.unshift(this.DEFAULT_OPTION);
        filter.selected_value = this.DEFAULT_OPTION.id;
      }
    }
    if (filter.allow_custom) {
      filter.display_values.push(this.CUSTOM_OPTION);
      let range = filter.range.split('to');
      filter.minValue = range[0];
      filter.maxValue = range[1];
    }
  }

  // sets filters values
  setScreenFilterData(data) {
    this.fillMissingDisplayOrder(data);
    let sortedData = data.sort((a, b) => (a['display_order'] > b['display_order'] ? 1 : -1));
    this.allFilters = sortedData;
    // **** find unique groups for Tabs
    this.groups = this.allFilters
      .map(item => item.group)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    // **** set selected default values for slider / dropdown
    this.fillDefaultValuesInFilters();
  }

  saveDialogBox() {
    this.displaySaveDialog = true;
  }

  saveFilter() {
    let saveReq = this.getScanRequest();
    this.liveService
      .postRequest('/screen/preset', saveReq)
      .subscribe(data => this.setSaveFilterData(data, saveReq));
    this.displaySaveDialog = false;
    this.presetName = '';
  }

  deletePreset() {
    let url = `/screen/preset?id=${this.selectedPresetId}`;
    this.liveService.deleteReq(url).subscribe(data => {
      let newFilters = this.allSavedPresets.filter(item => item.id != this.selectedPresetId);
      this.allSavedPresets = newFilters;
      if (data['status'] == 'ok') {
        this.notificationService.showStatus({ status: 'success', message: data['reason'] });
      } else {
        this.notificationService.showError('Something went wrong! Please try again.');
      }
      this.resetFilters();
    });
  }

  setSaveFilterData(data, saveReq) {
    if (data.status == 'ok') {
      if (this.selectedPresetId != data.id) {
        saveReq.id = data.id;
        this.allSavedPresets.splice(1, 0, saveReq);
        this.selectedPresetId = data.id;
        this.notificationService.showStatus({ status: 'success', message: data['reason'] });
      } else {
        this.notificationService.showStatus({ status: 'success', message: 'Preset Updated!' });
      }
    } else {
      this.notificationService.showError('Something went wrong! Please try again.');
    }
  }

  getScanRequest() {
    let changedFilters = this.allFilters.filter(filterItem =>
      this.findChangesInFilters(filterItem),
    );
    if (changedFilters) {
      changedFilters = CommonUtils.deepClone(changedFilters);
    }

    if (changedFilters.length > 0) {
      let scanReq = {
        values: changedFilters,
        name: this.presetName,
        image: this.presetImage,
        description: this.presetDescription,
      };
      if (
        this.checkSelected(this.selectedSortColumnId) &&
        this.checkSelected(this.selectedSortOrderId)
      ) {
        let selectedSort = this.sortColumns.find(item => item.id == this.selectedSortColumnId);
        let selectedSortOrder = this.sortOrder.find(item => item.id == this.selectedSortOrderId);
        let sortCondition = `${selectedSort.id} ${selectedSortOrder.id}`;
        scanReq['sortBy'] = sortCondition;
        scanReq['limit'] = this.selectedLimitId;
      }
      return scanReq;
    }
  }

  checkSelected(selectedId) {
    return selectedId || selectedId == -1;
  }

  scanFilter() {
    this.isFilterExpanded = false;
    let scanReq = this.getScanRequest();
    if (scanReq) {
      this.clearDataView();
      this.liveService.postRequest('/screen/filter', scanReq).subscribe(d => {
        this.scannedSymbols = d;
        if (this.scannedSymbols) {
          this.symbolCount = `Scan Result: ${this.scannedSymbols.length} item(s) found`;
        }
      });
    } else {
      this.notificationService.showError('Please select a Screen or at least one Filter!');
      this.isFilterExpanded = true;
    }
  }

  // getAllPresets() {
  //   this.liveService.getUrlData('/screen/preset').subscribe(d => this.setPresetValues(d));
  // }

  setPresetValues(data) {
    this.allSavedPresets = data;
    this.allSavedPresets.unshift(this.DEFAULT_OPTION);
  }

  changeToNameID(x) {
    return { name: x.name, id: x.id };
  }
  // find changes in filters for saving preset
  findChangesInFilters(filterItem) {
    if (filterItem.type == RIAConstants.TYPE_DROPDOWN) {
      if (filterItem.multiple && filterItem.selected_value.length > 0) {
        return true;
      } else if (
        !filterItem.multiple &&
        filterItem.selected_value !== RIAConstants.DEFAULT_OPTION_ID
      ) {
        return true;
      } else {
        return false;
      }
    } else if (filterItem.type == RIAConstants.TYPE_SLIDER) {
      if (
        filterItem.selected_slider_values[0] != filterItem.slider_values[0] ||
        filterItem.selected_slider_values[1] != filterItem.slider_values[1]
      ) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  handleSortColumnChange() {
    if (this.selectedSortColumnId != -1) {
      this.selectedSortOrderId = 'desc';
      this.selectedLimitId = 20;
    }
  }

  handlePresetDropdownChange(id) {
    this.resetFilters();
    this.clearDataView();
    if (this.selectedPresetId != '-1') {
      let presetSelected = this.allSavedPresets.find(item => item.id == this.selectedPresetId);
      if (presetSelected) {
        this.loadPresetValues(presetSelected);
      }
    } else if (this.selectedPresetId == RIAConstants.DEFAULT_OPTION_ID) {
      this.selectedSortColumnId = RIAConstants.DEFAULT_OPTION_ID;
      this.selectedSortOrderId = RIAConstants.DEFAULT_OPTION_ID;
      this.selectedLimitId = RIAConstants.DEFAULT_OPTION_ID;
      this.presetName = '';
    }
  }

  loadPresetValues(presetSelected) {
    // setting preset text on top
    presetSelected.values.forEach(filter => {
      if (filter.type == RIAConstants.TYPE_DROPDOWN) {
        if (filter.multiple) {
          this.handleMultipleDropdownChange(filter);
        } else {
          this.handleDropdownChange(filter);
        }
      } else if (filter.type == RIAConstants.TYPE_SLIDER) {
        this.handleOnSlideEnd(filter);
      }
    });
    let selectedFilters = presetSelected.values;
    this.presetName = presetSelected.name;
    if (presetSelected.sortBy) {
      let sortOrderSeperated = presetSelected.sortBy.split(' ');
      let selectedSort = this.sortColumns.find(item => item.id == sortOrderSeperated[0]);
      let selectedOrder = this.sortOrder.find(
        item => item.id == sortOrderSeperated[1].toLowerCase(),
      );
      this.selectedSortColumnId = selectedSort.id;
      this.selectedSortOrderId = selectedOrder.id;
      this.selectedLimitId = presetSelected.limit;
    }

    // from saved filter set value in filters UI
    // we set values from saved(filter) to UI filter(template)
    this.allFilters.forEach(function (filterItem) {
      let selectedFilter = selectedFilters.find(sf => sf.name == filterItem.name);
      if (selectedFilter) {
        if (selectedFilter.type == RIAConstants.TYPE_DROPDOWN) {
          filterItem.selected_value = selectedFilter.selected_value;
          // if it is custom them set min/MaxValues
          if (selectedFilter.selected_value == RIAConstants.CUSTOM_OPTION_ID) {
            filterItem.minValue = selectedFilter.minValue;
            filterItem.maxValue = selectedFilter.maxValue;
          }
          if (filterItem.multiple) {
            if (filterItem.selected_value instanceof Array) {
              // check if single value(old saved) or list(for multiple)
              filterItem.selected_value = selectedFilter.selected_value;
            } else {
              filterItem.selected_value = [];
              filterItem.selected_value.push(selectedFilter.selected_value);
            }
          }
        } else if (selectedFilter.type == RIAConstants.TYPE_SLIDER) {
          filterItem.selected_slider_values = selectedFilter.selected_slider_values;
        }
      }
    });
  }

  resetFilters() {
    this.user_selections = [];
    this.selectedSortColumnId = RIAConstants.DEFAULT_OPTION_ID;
    this.selectedSortOrderId = RIAConstants.DEFAULT_OPTION_ID;
    this.selectedLimitId = RIAConstants.DEFAULT_OPTION_ID;
    //this.selectedPresetId = RIAConstants.DEFAULT_OPTION_ID;
    this.presetName = '';

    this.allFilters.forEach(function (filterItem) {
      if (filterItem.type == 'dropdown') {
        filterItem.selected_value = '-1';
      } else if (filterItem.type == 'slider') {
        filterItem.selected_slider_values = filterItem.slider_values;
      }
    });
  }

  handleOnSlideEnd(sliderFilter) {
    let prefix = sliderFilter.name;
    let defaultValue = this.getSliderDefaultText(sliderFilter);
    let selectedValue = this.getSliderText(sliderFilter);
    sliderFilter.text = selectedValue;
    this.handleUserSelection(prefix, selectedValue, defaultValue);
  }

  handleTextClicked(item) {
    this.user_selections = this.user_selections.filter(row => row != item);
    let filterToDeleted = this.allFilters.find(row => row.name == item.split(':')[0]);
    if (filterToDeleted.type == RIAConstants.TYPE_SLIDER) {
      filterToDeleted.selected_slider_values = filterToDeleted.slider_values;
    }
    if (filterToDeleted.type == RIAConstants.TYPE_DROPDOWN) {
      filterToDeleted.selected_value = this.DEFAULT_OPTION.id;
    }
  }

  getSliderDefaultText(sliderFilter) {
    return `${sliderFilter.slider_values[0]}    to    ${sliderFilter.slider_values[1]}`;
  }

  getSliderText(sliderFilter) {
    let minSelected = sliderFilter.selected_slider_values[0];
    let maxSelected = sliderFilter.selected_slider_values[1];
    let min = sliderFilter.slider_values[0];
    let max = sliderFilter.slider_values[1];
    let sliderText = '';
    if (minSelected == min && maxSelected == max) {
      sliderText = this.getSliderDefaultText(sliderFilter);
    } else if (minSelected != min && maxSelected == max) {
      sliderText = `At least ${minSelected}`;
    } else if (maxSelected != max && minSelected == min) {
      sliderText = `At most ${maxSelected}`;
    } else {
      sliderText = `between  ${minSelected} and  ${maxSelected}`;
    }
    return sliderText;
  }

  handleMultipleDropdownChange(filter) {
    let selectedNames = filter.display_values.filter(item =>
      filter.selected_value.includes(item.id),
    );
    selectedNames = selectedNames.map(i => i.name).join(' & ');
    this.handleUserSelection(filter.name, selectedNames, RIAConstants.DEFAULT_OPTION_TEXT);
  }

  handleDropdownChange(filter) {
    let selectedName = '';
    if (filter.selected_value == RIAConstants.CUSTOM_OPTION_ID) {
      selectedName = this.getCustomText(filter);
      this.handleUserSelection(filter.name, selectedName, RIAConstants.CUSTOM_OPTION_TEXT);
    } else {
      // finding name from selectedId
      if (filter.multiple) {
        selectedName = filter.display_values.find(item => item.id == filter.selected_value).name;
        this.handleUserSelection(filter.name, selectedName, RIAConstants.DEFAULT_OPTION_TEXT);
      } else {
        selectedName = filter.display_values.find(item => item.id == filter.selected_value).name;
        this.handleUserSelection(filter.name, selectedName, RIAConstants.DEFAULT_OPTION_TEXT);
      }
    }
  }

  getCustomText(filter) {
    return `Between ${filter.minValue} ${filter.range_text} - ${filter.maxValue} ${filter.range_text}`;
  }

  onCustomMinChange(event, filter) {
    let selectedName = this.getCustomText(filter);
    this.handleUserSelection(filter.name, selectedName, RIAConstants.CUSTOM_OPTION_TEXT);
  }

  onCustomMaxChange(event, filter) {
    let selectedName = this.getCustomText(filter);
    this.handleUserSelection(filter.name, selectedName, RIAConstants.CUSTOM_OPTION_TEXT);
  }

  removeCustomInput(item) {
    item.selected_value = RIAConstants.DEFAULT_OPTION_ID;
    let customSelectedFilter = this.user_selections.find(
      row => row.split(':')[0].trim() == item.name,
    );
    let index = this.user_selections.indexOf(customSelectedFilter);
    this.user_selections.splice(index, 1);
  }

  handleUserSelection(prefix, selectedValue, defaultValue) {
    let fullName = `${prefix}: ${selectedValue}`;
    let existingItem = this.user_selections.find(
      item => item.split(':')[0].trim() == prefix.trim(),
    );
    if (existingItem) {
      // if item with same name exist
      let index = this.user_selections.indexOf(existingItem);
      this.user_selections[index] = fullName;
      if (selectedValue == defaultValue) {
        this.user_selections.splice(index, 1);
      }
    } else {
      this.user_selections.push(fullName);
    }
  }

  clearDataView() {
    this.scannedSymbols = [];
    this.symbolCount = '';
    this.selectedPresetFiltersAndSymbols.preset_data.preset_symbols = [];
  }

  addToWatchlist() {
    if (this.scannedSymbols.length > 400) {
      this.notificationService.showError(
        "Please filter more ! Watchlist can't have more than 400 Tickers",
      );
    } else {
      this.displayAddToWatchlistsDialog = true;
      this.loadAllWatchList();
    }
  }

  loadAllWatchList() {
    this.watchlists = [];
    this.liveService.getUrlData('/userwatchlist').subscribe(d => this.setWatchList(d));
  }

  setWatchList(data) {
    if (data && data.length > 0) {
      this.watchlists = data;
      this.selectedWatchListId = this.watchlists[0].id;
    }
  }

  onAddToWatchlistCancelClick() {
    this.displayAddToWatchlistsDialog = false;
  }

  onAddToWatchlistSaveClick() {
    if (this.scannedSymbols && this.scannedSymbols.length > 0 && this.selectedWatchListId) {
      this.watchlistSymbols = [];
      this.liveService
        .getUrlData('/userwatchlist/' + this.selectedWatchListId)
        .subscribe(d => this.setWatchListSymbols(d));
    }
  }

  setWatchListSymbols(symbols) {
    this.watchlistSymbols = symbols;
    this.saveWatchListSymbols();
  }

  saveWatchListSymbols() {
    let newSymbols = this.scannedSymbols.map(s => s.trim().toUpperCase());
    newSymbols = newSymbols.filter(s => !this.watchlistSymbols.includes(s));

    if (newSymbols.length > 500) {
      this.notificationService.showError(
        "Please create a new watchlist ! You can't have more than 500 tickers in a watchlist .",
      );
    } else if (newSymbols.length > 0) {
      let joinedSymbols = newSymbols.join(',');
      this.liveService
        .postRequest('/userwatchlist/' + this.selectedWatchListId, {
          action: 'add',
          symbol: joinedSymbols,
        })
        .subscribe(response => {
          this.handleResponse(response, joinedSymbols);
        });
    }
    this.displayAddToWatchlistsDialog = false;
  }

  handleResponse(res, symbols) {
    if (res.status == 'success') {
      this.notificationService.showInfo('Valid Symbols has been added sucessfully');
    }
  }

  onCreateNewWatchlistClick() {
    this.isCreateNewWatchlistVisible = true;
  }

  onCreateNewWatchlistCancelClick() {
    this.isCreateNewWatchlistVisible = false;
  }

  onCreateNewWatchlistSaveClick() {
    if (!this.watchlistName) {
      this.notificationService.showError('Please enter a valid name !');
    } else if (
      this.watchlists.length > 0 &&
      this.watchlists.find(w => w.name === this.watchlistName)
    ) {
      this.notificationService.showError('This watchlist name already exist !');
    } else {
      this.liveService
        .postRequest('/userwatchlist', { action: 'add', name: this.watchlistName })
        .subscribe(d => this.handleWatchListCrud(d));
    }
  }

  handleWatchListCrud(d) {
    if (d.success == '1') {
      this.notificationService.showInfo(d.reason);
      this.watchlists.push({ name: this.watchlistName, id: d.watchlist_id });
      this.selectedWatchListId = d.watchlist_id;
      this.onAddToWatchlistSaveClick();
    } else {
      this.notificationService.showInfo(d.reason);
    }
  }

  resetPresetFilters() {
    this.preapreUserSelectedFilters(null);
  }

  onInplaceActivate(event) {}

  onInplaceDeactivate(event) {}

  onSaveUpdatedScreenClick() {
    this.liveService
      .postRequest(
        '/screen/preset/update/' + this.selectedPresetFiltersAndSymbols.preset_data.preset_id,
        this.selectedFilters,
      )
      .subscribe(data => {
        this.temp = data;
      });
  }

  onSaveNewScreenClick(name) {
    let saveScreenObj = this.prepareNewScreenObj(name);
    if (saveScreenObj) {
      this.liveService
        .postRequest('/screen/preset', saveScreenObj)
        .subscribe(data => this.setDataForNewSavedPreset(data, saveScreenObj));
    } else {
      this.notificationService.showStatus({
        status: 'error',
        message: 'Please select at least one filter with non defualt value!',
      });
    }
  }

  setDataForNewSavedPreset(saveRes, saveReqObj) {
    if (saveRes.status == 'ok') {
      saveReqObj['preset_id'] = saveRes['id'];
      saveReqObj['preset_name'] = saveReqObj['name'];
      this.notificationService.showStatus({ status: 'success', message: 'Preset Updated!' });
      this.newPresetSaved.emit(saveReqObj);
    } else {
      this.notificationService.showError('Something went wrong! Please try again.');
    }
  }

  prepareNewScreenObj(presetName) {
    let changedFilters = this.selectedFilters.filter(filterItem =>
      this.findChangesInFilters(filterItem),
    );

    if (changedFilters) {
      changedFilters = CommonUtils.deepClone(changedFilters);
    }

    if (changedFilters.length > 0) {
      let screenObj = {
        values: changedFilters,
        name: presetName,
      };
      return screenObj;
    } else {
      return false;
    }
  }

  isNewScreen() {
    return this.selectedPresetId.includes('new_');
  }
}
