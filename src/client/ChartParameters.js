/* @flow */

import * as utils from "../shared/utils"
import sha1 from "../shared/sha1"

// TODO(anton): These should be in shared/constants
const COLOR_DARK = 'dark'
const COLOR_LIGHT = 'light'
const GRID_FULL = 'full'
const GRID_SPLIT = 'split'
const OPTIONS = {
  // Default values are first
  type: ['column', 'line'],
  rounding: ['on', 'off']
}

export default class ChartParameters {
  url: string;
  charts: Array<Object>;
  seriesColors: {[key: number]: string};
  seriesNames: {[key: number]: string};

  _grid: string;
  _color: string;
  _getDefaultTitle: (i: number) => string;

  constructor(url: string) {
    this.url = url
    this.charts = [{}]
    this.seriesColors = {}
    this.seriesNames = {}
    this._color = COLOR_LIGHT
    this._grid = GRID_SPLIT
    this._getDefaultTitle = (i) => '' // no-op
  }

  static fromJSON(data: Object): ChartParameters {
    let params = new ChartParameters(data.dataUrl)
    if (data.charts) params.charts = data.charts
    if (data.seriesNames) params.seriesNames = data.seriesNames
    if (data.seriesColors) params.seriesColors = data.seriesColors
    if (data.grid) params._grid = data.grid
    if (data.color) params._color = data.color

    return params
  }

  static fromQueryString(qs: string): ?ChartParameters {
    let urlParams = utils.parseQueryString(qs)
    let data = urlParams.data
    if (!data) {
      return null
    }

    let url = data.csvUrl || data.dataUrl
    if (!url) {
      return null
    }

    let params = new ChartParameters(url)
    if (data.charts) params.charts = data.charts
    if (data.seriesNames) params.seriesNames = data.seriesNames
    if (data.seriesColors) params.seriesColors = data.seriesColors
    if (data.grid) params._grid = data.grid
    if (data.color) params._color = data.color

    return params
  }

  withDefaultTitle(fn: (i: number) => string): ChartParameters {
    this._getDefaultTitle = fn
    return this
  }

  isLight(): boolean {
    return this._color == COLOR_LIGHT;
  }

  toggleColor(): void {
    this._color = this.isLight() ? COLOR_DARK : COLOR_LIGHT;
  }

  isFull(): boolean {
    return this._grid == GRID_FULL;
  }

  toggleGrid(): void {
    this._grid = this.isFull() ? GRID_SPLIT : GRID_FULL
  }

  getSeriesColor(index: number): ?string {
    return this.seriesColors[index]
  }

  getSeriesName(index: number): ?string {
    return this.seriesNames[index]
  }

  compress(): t_CHART_PARAM {
    let params: t_CHART_PARAM = {dataUrl: this.url}

    // Add seriesNames, if applicable.
    if (Object.keys(this.seriesNames).length) {
      params.seriesNames = this.seriesNames
    }

    // Add seriesColors, if applicable.
    if (Object.keys(this.seriesColors).length) {
      params.seriesColors = this.seriesColors
    }

    // Add color, if applicable.
    if (!this.isLight()) {
      params.color = this._color
    }

    // Add grid, if applicable.
    if (this.isFull()) {
      params.grid = this._grid
    }

    // Add applicable chart parameters.
    params.charts = this.charts.map((chart, i) => {
      let compressed = {}

      // Add applicable chart options.
      Object.keys(OPTIONS).forEach((option) => {
        if (chart[option] && chart[option] !== OPTIONS[option][0]) {
          compressed[option] = chart[option]
        }
      })

      // Add applicable title.
      if (chart.title && chart.title !== this._getDefaultTitle(i)) {
        compressed.title = chart.title
      }

      // Add applicable note.
      if (chart.note) {
        compressed.note = chart.note
      }

      // Add applicable series.
      if (i > 0 && chart.series) {
        compressed.series = chart.series
      }

      return compressed
    })

    // Delete charts if empty.
    if (params.charts.length === 1 && !Object.keys(params.charts[0]).length) {
      delete params.charts
    }

    return params
  }
}
