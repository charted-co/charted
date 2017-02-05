declare class jQuery {
  outerHeight: ((height: number|string) => jQuery) & (() => number);
  outerWidth(): number;
  outerWidth: ((width: number|string) => jQuery) & (() => number);
}

declare function $(obj: string|Object|Function): jQuery;
