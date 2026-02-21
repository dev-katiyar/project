import { Component, OnInit,Input,Output,EventEmitter,SimpleChanges  } from '@angular/core';
import {MessageService} from 'primeng/api';
import {CommonUtils} from '../utils/common.utils';
import {DateUtils} from   '../utils/dateutils';

@Component({
  selector: 'app-closetransactions',
  templateUrl: './closetransactions.component.html',
  styleUrls: ['./closetransactions.component.css']
})
export class ClosetransactionsComponent implements OnInit {

  constructor(private messageService: MessageService) { }
    @Input() portfolio ={"name":"","transactions":[],currentCash:0,"portfolio_type":[],startingCash: 0} ;
    @Output() public OnValidateSuccess = new EventEmitter();
    sellTransactions =[];


    ngOnInit() {
    }

      ngOnChanges(changes: SimpleChanges) {
        if (changes.portfolio !=null )
        {
          this.sellTransactions = [];
                if(this.portfolio.transactions)
                {
                let transactions = this.portfolio.transactions.filter(t=> t.side =="Buy" || t.side =="Sell Short");
                let soldTransactions = this.portfolio.transactions.filter(t=> t.side =="Sell" || t.side =="Buy To Cover");
                transactions = transactions.map(t=> {
                   let soldForThisTicker = soldTransactions.filter(s=> s.symbol ==t.symbol);
                   let soldQty = soldForThisTicker.map(s=>s.qty).reduce((a,c)=>a+c ,0);
                   t.qty= t.qty - soldQty;


                   return t;
                }).filter(t=>t.qty>0)


                            for (let transaction of transactions) {
                                let sellPosition = {
                                    "side": "",
                                    "selected": false,
                                    "buyCommission": 0,
                                    "buyDate": transaction.date,
                                    "symbol": transaction.symbol,
                                    "buyQty": transaction.qty,
                                    "qty": transaction.qty,
                                    "commission": 0,
                                    "price": 0,
                                    "date":new Date(),
                                    "buyPrice": transaction.price
                                };
                                if (transaction.side == "Buy") {
                                    sellPosition.side = "Sell";
                                } else {
                                    sellPosition.side = "Buy To Cover";
                                }
                this.sellTransactions.push(sellPosition);

                }
              }
        }
      }
      getRealizedProfit(transaction) {
              if (transaction.price == 0) {
                  return "";
              } else {
                  let realizedPnl = 0;
                  realizedPnl = transaction.qty * (transaction.price - transaction.buyPrice);
                  return realizedPnl.toFixed(2);
              }
          }

    handleCancel(){
     this.OnValidateSuccess.emit({"type":"cancel"});
    }
    showStatus(response) {
        this.messageService.add({severity:response.status, detail:response.message,life:1000});
    }
    validateTransactions(): void {
          let error = "";
          let transactions = CommonUtils.deepClone(this.sellTransactions).filter(t=>t.selected);

          if (transactions.length == 0) {
              this.showStatus({"status":"error","message": "Please select a transaction !"});
              return;
          }
          for (let transaction of transactions) {
              error = this.checkBasicDetails(transaction);
              if (error != "") {
                            break;
              }
              if (transaction.date < transaction.buyDate) {
                  error = `Sell date of ${transaction.symbol} is less than Purchase Date !`;
              }
              else if (transaction.qty > transaction.buyQty) {
                error = `Sell quantity of ${transaction.symbol} is more than purchased quantity !`;
              }
              if (error != "") {
                break;
              }
          }
          if (error == "") {
               this.OnValidateSuccess.emit({"transactions":transactions,"type":"save"});
          } else {
              this.showStatus({"status":"error","message": error});
          }
      }
      handleKeyUp(transaction){
        if(!transaction.selected){
          transaction.selected =true;
        }
      }

      checkBasicDetails(data) {

              if (data.price <= 0) {

                  return `Please enter price for ${data.symbol} !`;
              }
              if (data.qty <= 0) {

                  return `Please enter # shares for ${data.symbol} !`
              }
              if (!data.date) {

                return `Please enter transaction date for ${data.symbol} !`
              }
              return "";
          }


}
