declare module "request" {
  declare function defaults(obj: Object): Function;
}

declare module "serve-static" {
  declare function exports(url: string): Function;
}

declare class ExpressServer {
  address(): {address: string, port: string};
}

declare class ExpressApp {
  listen(port: number, cb: Function): ExpressServer;
  use(url: string, listener: (req: any, res?: any) => void): void;
}

declare module "express" {
  declare function exports(): ExpressApp;
}

declare function unescape(str: string): string;
