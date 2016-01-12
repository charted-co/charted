/* @flow */

import * as utils from "../shared/utils"

export default class PageData {
  indices: Array<string>;
  serieses: Array<t_SERIES>;
  data: Array<Array<t_FIELD>>;

  static fromJSON(url: string, data: string) {
    let ext = utils.getFileExtension(url)
    let rows = ext == 'tsv' ? d3.tsv.parseRows(data) : d3.csv.parseRows(data)
    return new PageData(rows)
  }

  constructor(rows: Array<Array<string>>) {
    // Extract field names and build an array of row objects
    // with field names as keys.
    let fieldNames = rows.shift()
    let fields = rows.map((row) => {
      return fieldNames.reduce((memo, name, i) => {
        memo[name] = row[i]
        return memo
      }, {})
    })

    // Build a list of indices.
    if (fieldNames.length != 1) {
      let indexField = fieldNames.shift()
      this.indices = fields.map((row) => row[indexField])
    } else {
      this.indices = fields.map((row, i) => `Row ${i + 1}`)
    }

    // Build a list of serieses.
    this.serieses = fieldNames.map((label, i) => {
      return {label: label, seriesIndex: i}
    })

    // Build a list of lists per each column.
    this.data = fieldNames.map((label) => {
      return fields.map((row, i) => {
        return {
          x: i,
          y: utils.stringToNumber(row[label]),
          xLabel: this.indices[i],
          yRaw: row[label]
        }
      })
    })
  }
}
