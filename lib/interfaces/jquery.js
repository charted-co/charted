declare class jQuery {
  resize(cb: (ev: Object) => void): jQuery;
  keyup(cb: (ev: Object) => void): jQuery;
  submit(cb: (ev: Object) => void): jQuery;

  find(selector: string): jQuery;
  add(el: jQuery): jQuery;
  remove(): jQuery;
  unbind(): jQuery;

  addClass(name: string): jQuery;
  removeClass(name: string): jQuery;
  attr(name: string, value: string): jQuery;
  animate(properties: Object, duration: number): jQuery;

  innerWidth(): number;
  outerHeight: ((height: number|string) => jQuery) & (() => number);
  outerWidth(): number;
  outerWidth: ((width: number|string) => jQuery) & (() => number);

  val(): string;
  html(val: string): jQuery;
}

declare function $(obj: string|Object|Function): jQuery;
