declare class ExpressServer {
  address(): {address: string, port: string};
}

declare class ExpressMiddleware {
}

declare class ExpressApp {
  listen(port: number, cb: Function): ExpressServer;
  get(url: string, listener: (req: any, res?: any) => void): void;
  post(url: string, listener: (req: any, res?: any) => void): void;
  use(middleware: ExpressMiddleware): void;
}

declare module "express" {
  declare function exports(): ExpressApp;
  declare function static(path: string): ExpressMiddleware;
}

declare module "request" {
  declare function exports(url: string, cb: Function): void
}

declare module "body-parser" {
  declare function json(): ExpressMiddleware;
}

declare function unescape(str: string): string;

declare module "handlebars" {
  declare function compile(code: string): Function;
}

declare module "shelljs" {
  declare function cat(path: string): string;
}
