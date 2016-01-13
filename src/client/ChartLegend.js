/* @flow */

import Chart from "./Chart"
import ChartData from "./ChartData"
import {PageController} from "./PageController"
import * as templates from "./templates"

export default class ChartLegend {
  chart: Chart;
  controller: PageController;
  data: ChartData;
  chartIndex: number;
  $container: Object;
  series: Array<any>;

  constructor(controller: PageController, data: ChartData, chart: Chart) {
    this.chart = chart
    this.controller = controller
    this.data = data
    this.chartIndex = this.chart.getChartIndex()
    this.$container = this.chart.getChartContainer()
    this.series = this.chart.getChartSeries()
  }

  update(): void {
    if (this.data.getSeriesCount() === 1 && this.controller.getOtherCharts(this.chartIndex).length === 0) {
      this.$container.find('.legend').html('')
      return
    }

    var $legend = $('')
    _.eachRight(this.data.getSerieses(), (series, i) => {
      var label = this.controller.getSeriesName(this.series[i])
      var thisLabel = {
        label: label,
        color: this.chart.getSeriesColor(series.seriesIndex),
        editable: this.controller.getEditability()
      }
      var $legendEl = $(templates.legendItem(thisLabel))
      $legend = $legend.add($legendEl)
      series.legendEl = $legendEl
    })

    this.$container.find('.legend').html($legend).removeClass('hidden')

    if (this.controller.getEditability()) {
      this.bindLegendInteractions()
    }
  }

  bindLegendInteractions(): void {
    this.data.getSerieses().forEach((series, i) => {
      // make series labels editable
      var $legendInput = series.legendEl.find('.legend-input')
      $legendInput.on('focusout', () => {
        var seriesNames = this.controller.params.seriesNames

        if ($legendInput.text() === series.label || $legendInput.text() === '') {
          $legendInput.text(series.label)
          delete seriesNames[series.seriesIndex]
        } else {
          seriesNames[series.seriesIndex] = $legendInput.text()
        }
        this.controller.updateURL()
      })

      // open color input
      series.legendEl.find('.legend-color').click((event) => {
        event.stopPropagation()
        this.removePopovers()
        this.openColorInput(series)
      })

      // open move-chart popover
      series.legendEl.find('.move-chart').click((event) => {
        event.stopPropagation()
        this.removePopovers()
        this.openMoveChart(series, i)
      })
    })

    // remove popovers
    $('html').click(() => this.removePopovers())
  }

  openColorInput(series: Object) : void{
    var colorHex = this.chart.getSeriesColor(series.seriesIndex).replace(/^#/, '')

    series.legendEl.addClass('active-color-input')
    series.legendEl.append(templates.changeSeriesColor({
      colorHex: colorHex,
      seriesIndex: series.seriesIndex
    }))

    this.data.getSeriesIndices().forEach((series) => {
      var $thisColorInput = this.$container.find('.change-series-color-' + series)
      $thisColorInput.on('focusout', () => {

        var seriesColors = this.controller.params.seriesColors
        var newColorHex = '#' + $thisColorInput.text().replace(/^#/, '').trim()

        var defaultColorHex = this.chart.getDefaulSeriesColor(series)
        var isValidHex = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newColorHex)

        if (newColorHex === defaultColorHex ||!isValidHex ) {
          $thisColorInput.text(defaultColorHex)
          delete seriesColors[series]
        } else {
          seriesColors[series] = newColorHex
        }
        this.chart.render()
        this.controller.updateURL()

      })
    })

    this.$container.find('.change-series-color').click((e) => e.stopPropagation())
  }

  openMoveChart(series: Object, i: number): void {
    var otherCharts = this.controller.getOtherCharts(this.chartIndex)

    // current number of charts = other charts + current chart
    var newChartIndex = otherCharts.length + 1

    if (otherCharts.length === 0) {
      // if no other charts, move series to a new chart
      this.controller.moveToChart(this.series[i], this.chartIndex, newChartIndex)

    } else if (otherCharts.length === 1 && this.series.length === 1) {
      // if only one series and only one other chart, move series back into that chart
      this.controller.moveToChart(this.series[i], this.chartIndex, otherCharts[0].chartIndex)

    } else {
      // else, show all the options in a popover
      series.legendEl.addClass('active')
      series.legendEl.append(templates.moveChart({otherCharts: otherCharts, series: this.series}))

      otherCharts.forEach((chart) => {
        this.$container.find('.move-to-chart-' + chart.chartIndex).click((e) => {
          e.preventDefault()
          this.controller.moveToChart(this.series[i], this.chartIndex, chart.chartIndex)
        })
      })

      this.$container.find('.move-to-new-chart').click(() => {
        this.controller.moveToChart(this.series[i], this.chartIndex, newChartIndex)
      })
    }
  }

  removePopovers(): void {
    $('html').find('.move-chart-options, .change-series-color').remove()
    $('html').find('.page-settings').removeClass('open')
    $('html').find('.legend-item').removeClass('active active-color-input')
  }
}
