import { Component, OnInit } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { LiveService } from '../services/live.service';

@Component({
    selector: 'app-test-abhilash',
    templateUrl: './test-abhilash.component.html',
    styleUrls: ['./test-abhilash.component.css']
})
export class TestAbhilashComponent implements OnInit {

    constructor(private liveService: LiveService) { }

    symbols = ['AAPL', 'MSFT'];
    technicalData;
    compositeChartConfig;
    stgData;
    stgCols;
    indicators;
    selectedBuyIndicator;
    selectedSellIndicator;
    stgInputs;
    start_date = new Date();

    cities;
    selectedCity;

    loadData() {
        this.liveService.getUrlData('/symbol/list_type/' + 8).subscribe(d => this.setIndicesSymbol(d));
    }

    setIndicesSymbol(d) {
        this.symbols = d;
        this.loadTechnicalData();
    }

    loadTechnicalData() {
        if (this.symbols) {
            this.liveService.getTechnicals(this.symbols).subscribe(d => this.setTechnicalData(d));
        }
    }

    setTechnicalData(data) {
        if (data) {
            this.technicalData = data;
            this.setCompositeChartData();
        }
    }

    setCompositeChartData() {
        this.compositeChartConfig = {
            dataArray: this.technicalData,
            colsToPlot: [
                { xCol: 'symbol', xColName: 'alternate_name', yCol: 'ytd', yColName: 'YTD', clickEventCol: 'symbol', colorPos: 'green', colorNeg: 'red', chartTypes: ['Bubble', 'Bar', 'Heat Map'] },
                { xCol: 'symbol', xColName: 'alternate_name', yCol: 'mtd', yColName: 'MTD', clickEventCol: 'symbol', colorPos: 'green', colorNeg: 'red', chartTypes: ['Bubble', 'Bar', 'Heat Map'] }
            ]
        };
    }



    barClass = "chart";
    barChart = new Chart({
        chart: {
            type: 'line'
        },
        title: {
            text: 'Linechart'
        },
        credits: {
            enabled: false
        },
        series: [
            {
                name: 'Line 1',
                type: 'line',
                data: [1, 2, 3]
            }
        ]
    });

    sales: any[];

    pieChart = new Chart(
        {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,

            },
            title: {
                text: 'Browser market shares in January, 2018'
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            accessibility: {
                point: {
                    valueSuffix: '%'
                }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    }
                }
            },
            series: [{
                name: 'Brands',
                type: 'pie',
                data: [{
                    name: 'Chrome',
                    y: 61.41,
                    sliced: true,
                    selected: true
                }, {
                    name: 'Internet Explorer',
                    y: 11.84
                }, {
                    name: 'Firefox',
                    y: 10.85
                }, {
                    name: 'Edge',
                    y: 4.67
                }, {
                    name: 'Safari',
                    y: 4.18
                }, {
                    name: 'Sogou Explorer',
                    y: 1.64
                }, {
                    name: 'Opera',
                    y: 1.6
                }, {
                    name: 'QQ',
                    y: 1.2
                }, {
                    name: 'Other',
                    y: 2.61
                }]
            }]
        }
    )

    dropDownChanged(event) {

    }


    ngOnInit(): void {
        this.sales = [
            { brand: 'Apple', lastYearSale: '51%', thisYearSale: '40%', lastYearProfit: '$54,406.00', thisYearProfit: '$43,342' },
            { brand: 'Samsung', lastYearSale: '83%', thisYearSale: '96%', lastYearProfit: '$423,132', thisYearProfit: '$312,122' },
            { brand: 'Microsoft', lastYearSale: '38%', thisYearSale: '5%', lastYearProfit: '$12,321', thisYearProfit: '$8,500' },
            { brand: 'Philips', lastYearSale: '49%', thisYearSale: '22%', lastYearProfit: '$745,232', thisYearProfit: '$650,323,' },
            { brand: 'Song', lastYearSale: '17%', thisYearSale: '79%', lastYearProfit: '$643,242', thisYearProfit: '500,332' },
            { brand: 'LG', lastYearSale: '52%', thisYearSale: ' 65%', lastYearProfit: '$421,132', thisYearProfit: '$150,005' },
            { brand: 'Sharp', lastYearSale: '82%', thisYearSale: '12%', lastYearProfit: '$131,211', thisYearProfit: '$100,214' },
            { brand: 'Panasonic', lastYearSale: '44%', thisYearSale: '45%', lastYearProfit: '$66,442', thisYearProfit: '$53,322' },
            { brand: 'HTC', lastYearSale: '90%', thisYearSale: '56%', lastYearProfit: '$765,442', thisYearProfit: '$296,232' },
            { brand: 'Toshiba', lastYearSale: '75%', thisYearSale: '54%', lastYearProfit: '$21,212', thisYearProfit: '$12,533' }
        ];

        this.cities = [
            {name: 'New York', code: 'NY'},
            {name: 'Rome', code: 'RM'},
            {name: 'London', code: 'LDN'},
            {name: 'Istanbul', code: 'IST'},
            {name: 'Paris', code: 'PRS'},
            {name: 'Kanpur', code: 'PRS'},

        ];

        // this.loadData();
        this.loadStgData();
        this.start_date.setDate(new Date().getDate()-365);          // DEFAULT test_period IS 365 DAYS
        this.stgInputs = {
            'symbol': 'SPY',
            'start_date':  this.start_date,
            'end_date':  new Date(),
            'buy_conditions': [],
            'sell_conditions': []
        };
    }

    loadStgData() {
        this.liveService.getUrlData('/stg/indicators').subscribe(d => this.setIndicators(d));
    }

    setStgData(data) {
        this.stgData = data;
        if(this.stgData) {
            this.stgCols = [];
            let colNames = Object(this.stgData[0]);
            for (let colName in colNames) {
                this.stgCols.push({field: colName, header: colName});
            }
        }
    }    

    setIndicators(data) {
        this.indicators = data;
        if(this.indicators && this.indicators.length > 0) {
            this.selectedBuyIndicator = this.indicators[0];
            this.selectedSellIndicator = this.indicators[0];
        }
    }

    buyIndicatorChanged(event) {
        this.selectedBuyIndicator = event.value;
    }

    sellIndicatorChanged(event) {
        this.selectedSellIndicator = event.value;
    }

    addBuyCondition() {
        this.stgInputs.buy_conditions.push(this.getEmptyCondition(this.selectedBuyIndicator));
    }

    addSellCondition() {
        this.stgInputs.sell_conditions.push(this.getEmptyCondition(this.selectedSellIndicator));
    }

    getEmptyCondition(indicator) {
        return {
            left_option: {
                indicator: indicator.key,
                settings: indicator.settings
            },
            operator: {
                key: indicator.operators[0].key,
                right_option: {
                    indicator: indicator.operators[0].right_options[0].key,
                    settings: indicator.operators[0].right_options[0].settings
                }
            },
            ind_temp: JSON.parse(JSON.stringify(indicator))
        }
    }

    getIndicatorObj(key) {
        let indicator = this.indicators.find(ind => {return ind.key === key});
        return indicator;
    }

    getRightOptionsObj(operators, key) {
        let indicator = operators.find(ind => { return ind.key === key});
        return indicator;
    }

    getRightOptionsObjSetting(right_options, key) {
        let indicator = right_options.find(ind => { return ind.key === key});
        return indicator;
    }

    deleteBuyCondition(condition) {
        if (this.stgInputs.buy_conditions.length > 0) {
            this.stgInputs.buy_conditions.splice(this.stgInputs.buy_conditions.indexOf(condition), 1);
        }
    }

    deleteSellCondition(condition) {
        if (this.stgInputs.sell_conditions.length > 0) {
            this.stgInputs.sell_conditions.splice(this.stgInputs.sell_conditions.indexOf(condition), 1);
        }
    }

    runStrategy() {
        this.stgInputs.buy_conditions.forEach(condition => {
            condition.operator.right_option.settings = this.getRightOptionsObjSetting(this.getRightOptionsObj(condition.ind_temp.operators, condition.operator.key).right_options, condition.operator.right_option.indicator).settings;
        });
        this.stgInputs.sell_conditions.forEach(condition => {
            condition.operator.right_option.settings = this.getRightOptionsObjSetting(this.getRightOptionsObj(condition.ind_temp.operators, condition.operator.key).right_options, condition.operator.right_option.indicator).settings;
        });

        this.liveService.postRequest('/stg/runstrategy', this.stgInputs).subscribe(d => this.setStgData(d));
    }
}
