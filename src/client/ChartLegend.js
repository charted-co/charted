/* @flow */

import Actions from "./Actions"
import Chart from "./Chart"
import ChartData from "./ChartData"
import {PageController} from "./PageController"
import Editor from "./Editor"
import * as templates from "./templates"
import dom from "./dom"

export default class ChartLegend {
  actions: Actions;
  chart: Chart;
  controller: PageController;
  data: ChartData;
  chartIndex: number;
  $container: Object;
  container: Element;
  series: Array<any>;

  constructor(controller: PageController, data: ChartData, chart: Chart) {
    this.chart = chart
    this.controller = controller
    this.data = data
    this.chartIndex = this.chart.getChartIndex()
    this.$container = this.chart.getChartContainer()
    this.container = this.$container.get(0)
    this.series = this.chart.getChartSeries()
    this.actions = new Actions(this.container)
  }

  activate() {
    this.actions
      .add('open-color-input', this.openColorInput, this)
      .add('open-move-chart', this.openMoveChart, this)
      .activate()
  }

  deactivate() {
    this.actions.deactivate()
    this.actions = null
  }

  getLegendElement(index: number): Element {
    let legend = dom.get(`js-legendItem[data-series-index="${index}"]`)
    if (legend) return legend
    throw `Legend item with index ${index} not found`
  }

  update(): void {
    if (this.data.getSeriesCount() === 1 && this.controller.getOtherCharts(this.chartIndex).length === 0) {
      this.$container.find('.legend').html('')
      return
    }

    let legend = document.createDocumentFragment()
    let serieses = this.data.getSerieses()

    for (let i = serieses.length - 1; i >= 0; i--) {
      let series = serieses[i]
      let label = this.controller.getSeriesName(this.series[i])
      let fragment = dom.renderFragment(templates.legendItem({
        label: label,
        color: this.chart.getSeriesColor(series.seriesIndex),
        editable: this.controller.getEditability(),
        seriesIndex: series.seriesIndex
      }))

      legend.appendChild(fragment)
    }

    let container = dom.get('js-legend', this.container)
    if (container) {
      container.innerHTML = ''
      container.appendChild(legend)
      dom.classlist.remove(container, 'hidden')
    }

    let seriesNames = this.controller.params.seriesNames
    if (this.controller.getEditability()) {
      this.data.getSerieses().forEach((series) => {
        let label = dom.get('js-legendLabel', this.getLegendElement(series.seriesIndex))
        if (!label) throw `Legend label for legend ${series.seriesIndex} not found`

        let ed = new Editor(label)
        ed.onChange((content) => {
          if (!content === '' || content === series.label) {
            ed.setContent(series.label)
            delete seriesNames[series.seriesIndex]
          } else {
            seriesNames[series.seriesIndex] = content
          }

          this.controller.updateURL()
        })
      })
    }
  }

  openColorInput(target: Element) {
    this.controller.removePopovers()
    let index = Number(target.getAttribute('data-series-index'))
    let el = this.getLegendElement(index)
    let colorHex = this.chart.getSeriesColor(index).replace(/^#/, '')

    dom.classlist.add(el, 'active-color-input')
    let fragment = dom.renderFragment(templates.changeSeriesColor({
      colorHex: colorHex,
      seriesIndex: index
    }))
    el.appendChild(fragment)

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

  openMoveChart(target: Element) {
    this.controller.removePopovers()
    let index = Number(target.getAttribute('data-series-index'))
    let series = this.data.getSeries(index)
    let otherCharts = this.controller.getOtherCharts(this.chartIndex)

    // current number of charts = other charts + current chart
    var newChartIndex = otherCharts.length + 1

    if (otherCharts.length === 0) {
      // if no other charts, move series to a new chart
      this.controller.moveToChart(this.series[index], this.chartIndex, newChartIndex)

    } else if (otherCharts.length === 1 && this.series.length === 1) {
      // if only one series and only one other chart, move series back into that chart
      this.controller.moveToChart(this.series[index], this.chartIndex, otherCharts[0].chartIndex)

    } else {
      // else, show all the options in a popover
      let el = this.getLegendElement(series.seriesIndex)
      dom.classlist.add(el, 'active')
      let fragment = dom.renderFragment(templates.moveChart({otherCharts: otherCharts, series: this.series}))
      el.appendChild(fragment)

      otherCharts.forEach((chart) => {
        this.$container.find('.move-to-chart-' + chart.chartIndex).click((e) => {
          e.preventDefault()
          this.controller.moveToChart(this.series[index], this.chartIndex, chart.chartIndex)
        })
      })

      this.$container.find('.move-to-new-chart').click(() => {
        this.controller.moveToChart(this.series[index], this.chartIndex, newChartIndex)
      })
    }
  }
}
