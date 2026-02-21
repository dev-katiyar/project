import * as moment from 'moment';

export class DateUtils {
  static formatDate(inputDate): string {
    if (inputDate.toString().length < 12) {
      return inputDate;
    } else {
      let day: string = inputDate.getDate().toString();
      day = +day < 10 ? '0' + day : day;
      let month: string = (inputDate.getMonth() + 1).toString();
      month = +month < 10 ? '0' + month : month;
      let year = inputDate.getFullYear();
      return `${year}-${month}-${day}`;
    }
  }

  static StringtoDate(date_str) {
    return moment(date_str).toDate();
  }

  static getShortMonth(month: Number): string {
    const dict = {
      0: "Jan",
      1: "Feb",
      2: "Mar",
      3: "Apr",
      4: "May",
      5: "Jun",
      6: "Jul",
      7: "Aug",
      8: "Sep",
      9: "Oct",
      10: "Nov",
      11: "Dec",
    }
  
    return dict[String(month)];
  }
}
