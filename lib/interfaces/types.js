declare type t_SERIES = {label: string, seriesIndex: number}
declare type t_FIELD = {
  x: number,
  y: number,
  xLabel: string,
  yRaw: string,
  ySeries?: number,
  y0?: number,
  y1?: number,
  columnEl?: Element
}
declare type t_CHART_PARAM = {
  dataUrl: string;
  charts?: Array<Object>;
  seriesColors?: {[key: number]: string};
  seriesNames?: {[key: number]: string};
  grid?: string;
  color?: string;
}
declare type t_ENV = {
  dev: boolean;
}
