import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import {
    widget,
    IChartingLibraryWidget,
    ChartingLibraryWidgetOptions,
    LanguageCode,
    ResolutionString,
    TimeFrameItem,
} from '../../assets/charting_library';

@Component({
    selector: 'app-tv-chart-container',
    templateUrl: './tv-chart-container.component.html',
    styleUrls: ['./tv-chart-container.component.css']
})
export class TvChartContainerComponent implements OnDestroy, OnChanges {
    private _symbol: ChartingLibraryWidgetOptions['symbol'] = 'AAPL';
    private _interval: ChartingLibraryWidgetOptions['interval'] = 'D' as ResolutionString;
    // BEWARE: no trailing slash is expected in feed URL
    private _datafeedUrl = 'https://demo_feed.tradingview.com/';
    private _libraryPath: ChartingLibraryWidgetOptions['library_path'] = '/assets/charting_library/';
    private _chartsStorageUrl: ChartingLibraryWidgetOptions['charts_storage_url'] = 'https://saveload.tradingview.com';
    private _chartsStorageApiVersion: ChartingLibraryWidgetOptions['charts_storage_api_version'] = '1.1';
    private _clientId: ChartingLibraryWidgetOptions['client_id'] = 'tradingview.com';
    private _userId: ChartingLibraryWidgetOptions['user_id'] = 'public_user_id';
    private _fullscreen: ChartingLibraryWidgetOptions['fullscreen'] = false;
    private _autosize: ChartingLibraryWidgetOptions['autosize'] = true;
    private _containerId: ChartingLibraryWidgetOptions['container'] = 'tv_chart_container';
    private _tvWidget: IChartingLibraryWidget | null = null;
    private _timeFrames: TimeFrameItem[] = [ 
        { text: "1M", resolution: "1D" as ResolutionString, description: "1 Month", title: "1M" },
        { text: "3M", resolution: "1D" as ResolutionString, description: "3 Months", title: "3M" },
        { text: "6M", resolution: "1D" as ResolutionString, description: "6 Months", title: "6M" },
        { text: "1Y", resolution: "1D" as ResolutionString, description: "1 Year", title: "1Y" },
        { text: "5Y", resolution: "1W" as ResolutionString, description: "5 Years", title: "5Y" },
        // { text: "10y", resolution: "1W" as ResolutionString, description: "10 Years", title: "10Y" },
        { text: "50Y", resolution: "3M" as ResolutionString, description: "50 Years", title: "All" },
    ]

    @Input() chartHeightClass = 'app-tv-chart-container-tall';

    @Input()
    set symbol(symbol: ChartingLibraryWidgetOptions['symbol']) {
        this._symbol = symbol || this._symbol;
    }

    @Input()
    set interval(interval: ChartingLibraryWidgetOptions['interval']) {
        this._interval = interval || this._interval;
    }

    @Input()
    set datafeedUrl(datafeedUrl: string) {
        this._datafeedUrl = datafeedUrl || this._datafeedUrl;
    }

    @Input()
    set libraryPath(libraryPath: ChartingLibraryWidgetOptions['library_path']) {
        this._libraryPath = libraryPath || this._libraryPath;
    }

    @Input()
    set chartsStorageUrl(chartsStorageUrl: ChartingLibraryWidgetOptions['charts_storage_url']) {
        this._chartsStorageUrl = chartsStorageUrl || this._chartsStorageUrl;
    }

    @Input()
    set chartsStorageApiVersion(chartsStorageApiVersion: ChartingLibraryWidgetOptions['charts_storage_api_version']) {
        this._chartsStorageApiVersion = chartsStorageApiVersion || this._chartsStorageApiVersion;
    }

    @Input()
    set clientId(clientId: ChartingLibraryWidgetOptions['client_id']) {
        this._clientId = clientId || this._clientId;
    }

    @Input()
    set userId(userId: ChartingLibraryWidgetOptions['user_id']) {
        this._userId = userId || this._userId;
    }

    @Input()
    set fullscreen(fullscreen: ChartingLibraryWidgetOptions['fullscreen']) {
        this._fullscreen = fullscreen || this._fullscreen;
    }

    @Input()
    set autosize(autosize: ChartingLibraryWidgetOptions['autosize']) {
        this._autosize = autosize || this._autosize;
    }

    @Input()
    set containerId(containerId: ChartingLibraryWidgetOptions['container_id']) {
        this._containerId = containerId || this._containerId;
    }

    @Output() public tvSymbolChanged = new EventEmitter();

    @ViewChild('myElement') myElement: ElementRef;

    ngOnChanges(changes: SimpleChanges): void {
        if('symbol' in changes && !changes.symbol.firstChange && changes.symbol.currentValue !== changes.symbol.previousValue) {
            this._tvWidget.activeChart().setSymbol(changes.symbol.currentValue, () => this._tvWidget.activeChart().resetData());
        }
    }

    ngAfterViewInit() {
        // Accessing the element with nativeElement property, pass it to the chart options to attached the chart to this div
        if (!this.myElement) {
            return;
        }
        const chartTargetEl = this.myElement.nativeElement;

        function getLanguageFromURL(): LanguageCode | null {
            const regex = new RegExp('[\\?&]lang=([^&#]*)');
            const results = regex.exec(location.search);

            return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' ')) as LanguageCode;
        }

        const widgetOptions = {
          symbol: this._symbol,
          datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(
            this._datafeedUrl,
            10000 * 1000,
          ),
          interval: this._interval,
          container: chartTargetEl,
          library_path: this._libraryPath,
          locale: getLanguageFromURL() || 'en',
          disabled_features: ['use_localstorage_for_settings'],
          enabled_features: ['study_templates'],
          charts_storage_url: this._chartsStorageUrl,
          charts_storage_api_version: this._chartsStorageApiVersion,
          load_last_chart: true,
          client_id: this._clientId,
          user_id: this._userId,
          fullscreen: this._fullscreen,
          autosize: this._autosize,
          time_frames: this._timeFrames,
          // timezone: "America/New_York",
          debug: false, // ONLY DURING DEVELOPMENT
          studies_overrides: {
            'moving average.plot.color': '#000000',
            }
        };

        const tvWidget = new widget(widgetOptions);
        this._tvWidget = tvWidget;

        tvWidget.onChartReady(() => {
            // [AK: July 2020] - using output, to avoid pollution of this file. 
            tvWidget.activeChart().onSymbolChanged().subscribe(null, () => {
                this.tvSymbolChanged.emit(tvWidget.activeChart().symbol());
            });

            if(!tvWidget.layoutName()) {
                tvWidget.activeChart().createStudy('Moving Average', false, false, [200]);
                tvWidget.activeChart().createStudy('Bollinger Bands', false, false, [50]);
                tvWidget.activeChart().createStudy('MACD');   
            }

            // tvWidget.headerReady().then(() => {
            //     const button = tvWidget.createButton();
            //     button.setAttribute('title', 'Click to show a notification popup');
            //     button.classList.add('apply-common-tooltip');
            //     button.addEventListener('click', () => tvWidget.showNoticeDialog({
            //             title: 'Notification',
            //             body: 'TradingView Charting Library API works correctly',
            //             callback: () => {

            //             },
            //         }));
            //     button.innerHTML = 'Check API';
            // });
        });
    }

    ngOnDestroy() {
        if (this._tvWidget !== null) {
            this._tvWidget.remove();
            this._tvWidget = null;
        }
    }
}
