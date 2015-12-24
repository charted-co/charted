declare class Lodash {
  flatten(list: Array<any>): Array<any>;
  pluck(list: Array<any>): Array<any>;
  eachRight(list: Array<any>): Array<any>;
  min<T>(list: Array<T>, iteratee: string): T;
}

declare var _: Lodash;
