import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { SymbolPopupService } from '../symbol-popup.service';
import { color } from 'highcharts';

@Component({
  selector: 'app-stocks-map',
  templateUrl: './stocks-map.component.html',
  styleUrls: ['./stocks-map.component.scss'],
})
export class StocksMapComponent implements OnInit, OnChanges {
  treeChart: Chart;
  options: Object;
  @Input() chartData;
  @Input() isFullWidth = false;

  constructor(private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chartData && this.chartData['rawData'].length > 0) {
      this.createTreeMapData(this.chartData['rawData']);
    }
  }

  createTreeMapData(rawData) {
    let symbolChilds = [];
    let sectorParents = new Set();
    let minChange = -0.00001;
    let maxChange = 0.00001;
    let minRed = 255;
    let maxRed = 100;
    let minGreen = 230;
    let maxGreen = 100;

    const nameColumn = this.chartData['nameColumn'];
    const valColumn = this.chartData['valColumn'];
    const parentColumn = this.chartData['parentColumn'];
    const sizeColumn = this.chartData['sizeColumn'];

    if (rawData && rawData.length > 0) {
      // get min and max TODO: should we get it from backend?
      for (let row of rawData) {
        if (row[valColumn] < minChange) {
          minChange = row[valColumn];
        }
        if (row[valColumn] > maxChange) {
          maxChange = row[valColumn];
        }
      }

      // add all the child boxes and collect parent sector names
      for (let row of rawData) {
        let boxColor = '';
        sectorParents.add(row[parentColumn]);
        if (row[valColumn] < 0) {
          let colNum = minRed - (row[valColumn] / minChange) * (minRed - maxRed);
          boxColor = `rgb(${colNum}, 0, 0)`;
        }
        if (row[valColumn] > 0) {
          let colNum = minGreen - (row[valColumn] / maxChange) * (minGreen - maxGreen);
          boxColor = `rgb(0, ${colNum}, 0)`;
        }
        symbolChilds.push({
          name: `${row[nameColumn]}\n${parseFloat(row[valColumn]).toFixed(2)}%`,
          parent: row[parentColumn],
          value: parseFloat(row[sizeColumn]),
          color: boxColor,
          symbol: 'symbol' in row? row['symbol'] : ''
        });
      }

      // add parent sectors
      for (let sector of sectorParents) {
        symbolChilds.push({ 
          id: sector, 
          name: sector, 
          color: 'rgb(0,255,0)', 
          dataLabels: {
            enabled: true,
            borderRadius: 5,
            backgroundColor: 'rgba(252, 255, 197, 0.7)',
            borderWidth: 1,
            borderColor: '#AAA',
            color: 'black',
            y: -6
        }
        });
      }
    }

    this.setData(symbolChilds);
  }

  setData(chartData) {
    const that = this;
    this.options = {
      series: [
        {
          name: 'Regions',
          type: 'treemap',
          layoutAlgorithm: 'squarified',
          allowDrillToNode: true,
          animationLimit: 1000,
          dataLabels: {
            enabled: true,
          },
          levels: [
            {
              level: 1,
              dataLabels: {
                enabled: true,
              },
              borderWidth: 3,
              levelIsConstant: false,
            },
            {
              level: 1,
              dataLabels: {
                style: {
                  fontSize: '14px',
                },
              },
            },
          ],
          accessibility: {
            exposeAsGroupOnly: true,
          },
          data: chartData,
        },
      ],
      title: {
        text: '',
      },
      plotOptions: {
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function () {
                if(this.symbol) {
                  that.symbolPopupService.showPopup(this.symbol);
                }
              },
            },
          },
        },
      },
      subtitle: {
        text: 'Click points to drill down.',
        align: 'center',
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        formatter: function () {
          return (
            '<b>' +
            this.point.name +
            '</b>: ' +
            (this.point.value > 1000000 && this.point.value < 1000000000
              ? Math.floor(this.point.value / 1000000).toLocaleString() + 'M'
              : this.point.value > 1000000000
              ? Math.floor(this.point.value / 1000000000).toLocaleString() + 'B'
              : this.point.value.toLocaleString())
          );
        },
      },
    };
    this.treeChart = new Chart(this.options);
  }
}
