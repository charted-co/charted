/* @flow */

import {getTrimmedExtent} from "../shared/utils"
import PageData from "./PageData"

export default class ChartData {
  _data: Array<Array<t_FIELD>>;
  _serieses: Array<t_SERIES>;
  _indices: Array<string>;

  constructor(pageData: PageData, seriesIndicesToUse: Array<any>) {
    this._data = pageData.data.filter((series, i) => seriesIndicesToUse.indexOf(i) > -1)
    this._serieses = pageData.serieses.filter((series, i) => seriesIndicesToUse.indexOf(i) > -1)
    this._indices = pageData.indices
    this.formatData()
  }

  formatData(): void {
    // add stackedPosition
    this._data[0].forEach((row, i) => {
      var negY0 = 0
      var posY0 = 0

      this._data.forEach((series, j) => {
        var datum = this._data[j][i]
        datum.ySeries = j

        if (datum.y < 0) {
          negY0 = negY0 + datum.y
          datum.y0 = negY0
          datum.y1 = datum.y0 - datum.y
        } else {
          datum.y0 = posY0
          datum.y1 = datum.y0 + datum.y
          posY0 = posY0 + datum.y
        }
      })
    })
  }

  getFlattenedData(): Array<any> {
    return this._data.reduce((a, b) => a.concat(b))
  }

  getSerieses(): Array<Object> {
    return this._serieses
  }

  getSeries(i: number): Object {
    return this._serieses[i]
  }

  getSeriesByIndex(index: number): ?t_SERIES {
    for (let i = 0; i < this._serieses.length; i++) {
      if (this._serieses[i].seriesIndex == index) {
        return this._serieses[i]
      }
    }
  }

  getSeriesPositionByIndex(index: number): number {
    for (let i = 0; i < this._serieses.length; i++) {
      if (this._serieses[i].seriesIndex == index) {
        return i
      }
    }

    return -1
  }

  getDatum(seriesIndex: number, index: number): t_FIELD {
    return this._data[seriesIndex][index]
  }

  getSeriesLabels(): Array<string> {
    return this._serieses.map(function (series) { return series.label })
  }

  getSeriesIndices(): Array<number> {
    return this._serieses.map(function (series) { return series.seriesIndex })
  }

  getSeriesCount(): number {
    return this._serieses.length
  }

  getUnstackedValuesAtIndex(i: number): Array<any> {
    return this._data.map(function (series) {
      return series[i].y
    })
  }

  getValuesForSeries(seriesIndex: number): any {
    var seriesExtent = this.getSeriesExtent(seriesIndex)
    return this._data[seriesIndex].slice(seriesExtent[0], seriesExtent[1] + 1)
  }

  getFirstDatum(seriesIndex: number): any {
    var firstPointIndex = this.getSeriesExtent(seriesIndex)[0]
    return this._data[seriesIndex][firstPointIndex]
  }

  getLastDatum(seriesIndex: number): any {
    var lastPointIndex = this.getSeriesExtent(seriesIndex)[1]
    return this._data[seriesIndex][lastPointIndex]
  }

  getSeriesExtent(seriesIndex: number): Array<number> {
    let yRawValues = this._data[seriesIndex].map((item) => item.yRaw)
    return getTrimmedExtent(yRawValues)
  }

  getIndices(): Array<string> {
    return this._indices
  }

  getIndexCount(): number {
    return this._indices.length
  }

  getStackedExtent(): Array<any> {
    return d3.extent(this.getFlattenedData(), function (datum) {
      return datum.y < 0 ? datum.y0 : datum.y1
    })
  }

  getStackedExtentForIndex(index: number): Array<number> {
    var extent = [0, 0]
    this._data.forEach(function (series) {
      var minOrMax = series[index].y < 0 ? 0 : 1
      extent[minOrMax] += series[index].y
    })

    return extent
  }

  getUnstackedExtent(): Array<any> {
    return d3.extent(this.getFlattenedData(), function (datum) {
      return datum.y
    })
  }

  getIndexExtent(): Array<string> {
    return [this._indices[0], this._indices[this._indices.length - 1]]
  }
}
