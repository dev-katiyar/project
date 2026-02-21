export class CommonUtils {
  static shallowEqual(object1, object2) {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (let key of keys1) {
      if (object1[key] !== object2[key]) {
        return false;
      }
    }
    return true;
  }

  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static createStepArray(start, stop, step = 1) {
    return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
  }

  static createDropDownItems(start, stop, step = 1) {
    return CommonUtils.createStepArray(start, stop, step).map(x => ({
      id: x.toString(),
      name: x.toString(),
    }));
  }

  static getMarriedStatus() {
    return [
      { name: 'Single', id: '1' },
      { name: 'Married', id: '2' },
    ];
  }

  static getCreditCards() {
    return ['Visa', 'Master', 'Discover', 'Amex', 'Diners', 'Other'];
  }

  static groupBy(key, array) {
    let groupedDict = array.reduce((acc, obj) => {
      const value = obj[key];
      acc[value] = (acc[value] || []).concat(obj);
      return acc;
    }, {});
    let groupedArray = [];
    for (let key in groupedDict) {
      let value = groupedDict[key];
      groupedArray.push({ group: key, value: value, id: key });
    }
    return groupedArray;
  }

  static getRiskToleranceOptions() {
    return [
      {
        description: "Don't like losing money",
        id: '1',
      },
      {
        description: 'Willing to lose some money',
        id: '2',
      },
      {
        description: 'Want to track market returns',
        id: '3',
      },
      {
        description: 'I want to beat stock market',
        id: '4',
      },
      {
        description: "If I was in Vegas, I'd be 'all in' every hand",
        id: '5',
      },
    ];
  }

  static getFinancialGoalOptions() {
    return [
      { 
        description: 'I just want my money to be safe', 
        id: '1' 
      },
      { 
        description: 'My goal is just to beat inflation without big losses', 
        id: '2' 
      },
      { 
        description: 'I need some growth but want income to live on', 
        id: '3' 
      },
      { 
        description: 'I need growth but I am < 10 years to retirement', 
        id: '4' 
      },
      { 
        description: 'I want growth and have > 10 years to retirement', 
        id: '5' 
      },
    ];
  }

}
