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
  series: Array<any>;

  constructor(controller: PageController, data: ChartData, chart: Chart) {
    this.chart = chart
    this.controller = controller
    this.data = data
    this.chartIndex = this.chart.getChartIndex()
    this.series = this.chart.getChartSeries()
    this.actions = new Actions(this.chart.container)
  }

  activate() {
    this.actions
      .add('open-color-input', this.openColorInput, this)
      .add('open-move-chart', this.openMoveChart, this)
      .add('move-to-chart', this.moveToChart, this)
      .activate()
  }

  deactivate() {
    this.actions.deactivate()
    delete this.actions
  }

  getLegendElement(index: number): Element {
    let legend = dom.get(`js-legendItem[data-series-index="${index}"]`)
    if (legend) return legend
    throw `Legend item with index ${index} not found`
  }

  update(): void {
    if (this.data.getSeriesCount() === 1 && this.controller.getOtherCharts(this.chartIndex).length === 0) {
      let legend = dom.get('js-legend', this.chart.container)
      if (legend) {
        legend.innerHTML = ''
      }
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

    let container = dom.get('js-legend', this.chart.container)
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

    // TODO: Replace all this with Editor
    let input = dom.assert(dom.get('js-colorEditor', el))
    input.addEventListener('focusout', () => {
      let seriesColors = this.controller.params.seriesColors
      let newColorHex = ''
      if (input.innerText) {
        newColorHex = '#' + input.innerText.replace(/^#/, '').trim()
      }

      let defaultColorHex = this.chart.getDefaulSeriesColor(index)
      let isValidHex = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newColorHex)

      if (newColorHex === defaultColorHex ||!isValidHex ) {
        input.innerHTML = defaultColorHex
        delete seriesColors[index]
      } else {
        seriesColors[index] = newColorHex
      }
      this.chart.render()
      this.controller.updateURL()
    })
  }

  openMoveChart(target: Element) {
    this.controller.removePopovers()
    let index = Number(target.getAttribute('data-series-index'))
    let series = this.data.getSeriesByIndex(index)
    if (!series) throw `Series ${index} not found`

    let position = this.data.getSeriesPositionByIndex(index)
    if (position < 0) throw `Series ${index} not found`

    let otherCharts = this.controller.getOtherCharts(this.chartIndex)

    // current number of charts = other charts + current chart
    var newChartIndex = otherCharts.length + 1

    if (otherCharts.length === 0) {
      // if no other charts, move series to a new chart
      this.controller.moveToChart(this.series[position], this.chartIndex, newChartIndex)

    } else if (otherCharts.length === 1 && this.series.length === 1) {
      // if only one series and only one other chart, move series back into that chart
      this.controller.moveToChart(this.series[position], this.chartIndex, otherCharts[0].chartIndex)

    } else {
      // else, show all the options in a popover
      let el = this.getLegendElement(series.seriesIndex)
      dom.classlist.add(el, 'active')

      el.appendChild(dom.renderFragment(templates.moveChart({
        position: position,
        otherCharts: otherCharts,
        series: this.series,
        newChartIndex: newChartIndex
      })))
    }
  }

  moveToChart(target: Element) {
    let src = this.chartIndex
    let dest = Number(target.getAttribute('data-dest'))
    let series = this.series[Number(target.getAttribute('data-position'))]
    this.controller.moveToChart(series, src, dest)
  }
}
