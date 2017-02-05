declare class jQuery {
  find(selector: string): jQuery;
  add(el: jQuery): jQuery;
  remove(): jQuery;

  attr(name: string, value: string): jQuery;
  animate(properties: Object, duration: number): jQuery;

  innerWidth(): number;
  outerHeight: ((height: number|string) => jQuery) & (() => number);
  outerWidth(): number;
  outerWidth: ((width: number|string) => jQuery) & (() => number);

  html(val: string): jQuery;
}

declare function $(obj: string|Object|Function): jQuery;
