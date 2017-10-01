declare class _D3_TSV_CSV {
  parseRows(file: string): Array<Array<string>>
}

declare class _D3_SCALE {
  linear(): Object
}

declare class _D3_SVG {
  line(): Object;
}

declare class _D3_XHR {
  header(key: string, value: string): _D3_XHR;
  post(data: string, callback: Function): _D3_XHR;
}

declare class _D3 {
  tsv: _D3_TSV_CSV;
  csv: _D3_TSV_CSV;
  scale: _D3_SCALE;
  svg: _D3_SVG;

  ascending(a: any, b: any): number;
  json(url: string, callback: Function): void;
  xhr(url: string): _D3_XHR;
  range(range: number): Array<number>;
  extent<T>(list: Array<T>, callback: (item: T) => any): Array<T>;
  max<T>(list: Array<T>): T;
  select(selector: string|Object): Object;
}

declare var d3: _D3;
