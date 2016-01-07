declare class Lodash {
  flatten(list: Array<any>): Array<any>;
  pluck(list: Array<any>): Array<any>;
  eachRight(list: Array<any>): Array<any>;
  min<T>(list: Array<T>, iteratee: string): T;
  size(list: any): number;
  forEach(list: any, cb: (val: any, key: any) => void): void;
}

declare var _: Lodash;
