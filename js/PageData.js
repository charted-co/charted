/* @flow */

import {getFileExtension, stringToNumber} from "./Utils"

export class PageData {
  dataUrl: string;
  callback: (error: ?Object, data: ?PageData) => void;
  _serieses: Array<Object>;
  _indices: Array<string>;
  _data: Array<any>;

  constructor(dataUrl: string, callback: (error: ?Object, data: ?PageData) => void) {
    this.dataUrl = dataUrl
    this.callback = callback
    this._serieses = []
    this._indices = []
    this.fetchData()
  }

  fetchData(): void {
    var url = 'get/?url=' + encodeURIComponent(this.dataUrl)
    d3.text(url, function (error, fileString) {
      if (error) {
        this.callback(error, null)
        return
      }

      var fileExtention = getFileExtension(this.dataUrl)
      var fileRows = []
      if (fileExtention === 'tsv') {
        fileRows = d3.tsv.parseRows(fileString)
      } else {
        fileRows = d3.csv.parseRows(fileString)
      }

      var fileFieldNames = fileRows.shift()
      // create array of row objects with the field names as keys
      var fileData = fileRows.map(function (fileRow) {
        return fileFieldNames.reduce(function (memo, name, i) {
          memo[name] = fileRow[i]
          return memo
        }, {})
      })

      var indexFieldName

      if (fileFieldNames.length !== 1) {
        indexFieldName = fileFieldNames.shift()
        this._indices = fileData.map(function (fileRow) {
          return fileRow[indexFieldName]
        })
      } else {
        this._indices = d3.range(fileData.length).map(function (i) {
          return 'Row ' + (i + 1)
        })
      }

      this._serieses = fileFieldNames.map(function (label, i) {
        return {
          label: label,
          seriesIndex: i
        }
      })

      this._data = fileFieldNames.map(function (label) {
        return fileData.map(function (fileRow, i) {
          return {
            x: i,
            xLabel: this._indices[i],
            y: stringToNumber(fileRow[label]),
            yRaw: fileRow[label]
          }
        }.bind(this))
      }.bind(this))

      this.callback(null, this)
    }.bind(this))
  }

  getSerieses(): Array<Object> {
    return this._serieses
  }

  getSeries(i: number): Object {
    return this._serieses[i]
  }

  getSeriesCount(): number {
    return this._serieses.length
  }

  getDatumCount(): number {
    return this._data[0].length
  }
}
