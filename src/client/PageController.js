/* @flow */

import Actions from "./Actions"
import PageData from "./PageData"
import Chart from "./Chart"
import ChartParameters from "./ChartParameters"
import dom from "./dom"
import * as templates from "./templates"
import * as utils from "../shared/utils"

const MIN_30 = 1000 * 60 * 30
export const OPTIONS = {
  // Default values are first
  type: ['column', 'line'],
  rounding: ['on', 'off']
}

export class PageController {
  chartObjects: Array<Chart>;
  actions: Actions;
  resizeTimer: number;
  params: ChartParameters;
  data: PageData;
  isEmbed: boolean;

  constructor() {
    this.actions = new Actions(document.body)
    this.isEmbed = false
    this.chartObjects = []

    // Re-render charts on window resize
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => this.setDimensions(), 30)
    })

    let form = dom.get('js-loadDataForm')
    if (!form) return

    form.addEventListener('submit', (ev: Event) => {
      ev.preventDefault()

      let input = dom.get('js-dataFileInput')
      let url = input && input instanceof HTMLInputElement ? input.value : null
      if (!url) {
        let err = 'You’ll need to paste in the URL to a .csv file or Google Spreadsheet first.'
        this.errorNotify(new Error(err))
        return
      }

      this.fetchPageData(url, /* id */ null, /* params */ null)
    })
  }

  activate(): void {
    let path = /\/(c|embed)\/([a-z\d]{7})\/?$/.exec(window.location.pathname)
    let chartId = path && path[2]
    let legacyParams = ChartParameters.fromQueryString(window.location.search || '')

    this.actions
      .add('toggle-color', this.toggleColor, this)
      .add('toggle-grid', this.toggleGrid, this)
      .add('open-settings', this.openSettings, this)
      .add('get-embed', this.getEmbed, this)
      .add('close-embed', this.closeEmbed, this)
      .add('update-data-source', this.updateDataSource, this)
      .add('remove-popovers', this.removePopovers, this)
      .activate()

    if (!chartId && !legacyParams) {
      this.clearExisting()
      dom.classlist.add(document.body, 'pre-load')
      return
    }

    this.isEmbed = path && path[1] == 'embed'

    // If it's not an embed, refresh every 30 minutes (1000 * 60 * 30)
    if (!this.isEmbed) {
      setInterval(() => this.fetchPageData(), MIN_30)
    }

    if (chartId) {
      this.fetchPageData(/* url */ null, chartId, /* params */ null)
      return
    }

    // We need to convert legacy params by saving them into the database and
    // then fetch data.
    if (legacyParams) {
      this.params = legacyParams.withDefaultTitle((i) => this.getDefaultTitle(i))
      let legacyParamsCompressed = this.params.compress()
      let legacyDataUrl = legacyParamsCompressed.dataUrl || null
      this.updateURL(() => this.fetchPageData(legacyDataUrl, /* id */ null, legacyParamsCompressed))
    }
  }


  /**
   * Fetches chart data and parameters either by URL or by ID.
   */
  fetchPageData(dataUrl: ?string, id: ?string, params: ?Object): void {
    if (!dataUrl && !id) {
      if (!this.params) {
        return
      }

      // If neither dataUrl nor id is provided but there is an
      // active chart, we simply refetch that chart.
      id = utils.getChartId(this.params.compress())
    }

    dom.classlist.add(document.body, 'loading')
    this.updatePageTitle('Charted (...)')
    this.clearExisting()

    if (dataUrl) {
      let input = dom.get('js-dataFileInput')
      if (input && input instanceof HTMLInputElement) {
        input.value = dataUrl
      }
    }

    let url = `/load/?url=${encodeURIComponent(dataUrl || '')}&id=${encodeURIComponent(id || '')}`
    d3.json(url, (err, resp) => {
      if (err) {
        this.errorNotify(err)
        return
      }

      if (!resp.data || !resp.data.length) {
        this.errorNotify(new Error('Missing data from source: ' + resp.params.dataUrl))
        return
      }

      var paramsToUse = params ? params : resp.params
      paramsToUse.dataUrl = resp.params.dataUrl
      this.params = ChartParameters.fromJSON(paramsToUse)
        .withDefaultTitle((i) => this.getDefaultTitle(i))
      this.data = new PageData.fromJSON(this.params.url, resp.data)
      this.render()
    })
  }

  /**
   * Renders charts
   */
  render(): void {
    // Set background color
    let color = this.params.isLight() ? 'light' : 'dark'
    dom.classlist.add(document.body, color)

    // Set embed style
    this.applyEmbed()

    this.setupPageSettings()

    // set first title
    if (!this.params.charts[0].title) {
      this.params.charts[0].title =
        this.data.serieses.length > 1 ? 'Chart' : this.data.serieses[0].label
    }

    let classes = ['pre-load', 'loading', 'error']
    classes.forEach((c) => dom.classlist.remove(document.body, c))

    // update charts
    this.params.charts.forEach((chart, i) => this.updateChart(i))

    this.setDimensions()
    this.updateURL()

    this.setDataSourceUrl(this.params.url)
  }

  clearExisting(): void {
    let charts = dom.getAll('js-chartWrapper')
    charts.forEach((chart) => dom.remove(chart))
    dom.remove(dom.get('js-settings'))
    this.chartObjects = []
  }

  setupPageSettings(): void {
    // If this is an embed, don't add the page settings
    if (this.isEmbed) return

    // Populate UI
    let fragment = dom.renderFragment(templates.pageSettings())
    if (document.body) {
      document.body.appendChild(fragment)
    }

    let url = this.params.url
    let link = dom.get('js-downloadDataLink')
    if (link) {
      link.setAttribute('href', url)
    }

    this.setDataSourceUrl(url)
  }

  updateChart(chartIndex: number): void {
    var chartParams = this.getFullParams(chartIndex)

    // determine what to do with chart
    if (chartParams.series.length === 0) {
      // if there are no series, remove it
      this.removeChart(chartIndex)
    } else if (chartIndex <= this.chartObjects.length - 1) {
      // if it already exists, refresh it
      this.chartObjects[chartIndex].refresh(chartIndex, chartParams, this.data)
    } else {
      // if it doesn't exist yet, create it
      this.createNewChart(chartIndex, this.getFullParams(chartIndex))
    }
  }

  getFirstChartSeries(): Array<number> {
    var otherChartSeries = []
    var firstChartSeries = []

    for (var i = 1; i < this.params.charts.length; i++) {
      otherChartSeries = otherChartSeries.concat(this.params.charts[i].series)
    }

    for (var j = 0; j < this.data.serieses.length; j++) {
      if (otherChartSeries.indexOf(j) > -1) continue
      firstChartSeries.push(j)
    }

    return firstChartSeries
  }


  createNewChart(thisChartIndex: number, initialChartParams: Object): void {
    let dimensions = this.getChartDimensions()
    let chart = document.createElement('div')

    chart.style.height = `${dimensions.height}px`
    chart.style.width = `${dimensions.width}px`

    dom.classlist.add(chart, 'chart-wrapper')
    dom.classlist.add(chart, 'js-chartWrapper')

    let charts = dom.get('js-charts')
    if (charts) {
      charts.appendChild(chart)
      let chartObject = new Chart(this, thisChartIndex, chart, initialChartParams, this.data)
      chartObject.activate()
      this.chartObjects.push(chartObject)
    }
  }


  moveToChart(series: Object, fromChartIndex: number, toChartIndex: number) {
    var fromChart = this.params.charts[fromChartIndex]
    var toChart = this.params.charts[toChartIndex]

    // remove default titles
    this.params.charts.forEach((chart, i) => {
      if (chart.title && chart.title == this.getDefaultTitle(i)) {
        delete chart.title
      }
    })

    // add series to intended chart
    if (toChartIndex > this.params.charts.length - 1) {
      this.params.charts.push({series: [series]})
    } else if (toChartIndex > 0) {
      toChart.series.push(series)
      toChart.series.sort(function(a, b) {
        return a - b
      })
    }

    // remove series from initial chart
    if (fromChartIndex > 0) {
      fromChart.series = fromChart.series.filter(function (listedSeries) {
        return listedSeries !== series
      })
    }

    this.updateChart(toChartIndex)
    this.updateChart(fromChartIndex)

    // update all charts that come after, since default titles may have changed
    for (var j = fromChartIndex; j < this.chartObjects.length; j++) {
      if (j === toChartIndex) continue
      this.updateChart(j)
    }

    this.setDimensions()
    this.updateURL()
  }

  removeChart(chartIndex: number): void {
    // need to increment down the chartIndex for every chart that comes after
    for (var i = chartIndex + 1; i < this.chartObjects.length; i++) {
      this.chartObjects[i].chartIndex--
    }

    // remove the parameters, html element, and overall chart object
    this.params.charts.splice(chartIndex, 1)
    dom.remove(this.chartObjects[chartIndex].wrapper)
    this.chartObjects[chartIndex].deactivate()
    this.chartObjects.splice(chartIndex, 1)
  }


  getFullParams(chartIndex: number): Object {
    var params = this.params.charts[chartIndex]
    Object.keys(OPTIONS).forEach((option) => {
      params[option] = params[option] || OPTIONS[option][0]
    })

    if (chartIndex === 0) {
      params.series = this.getFirstChartSeries()
    }

    params.title = params.title || this.getDefaultTitle(chartIndex)

    return params
  }


  getDefaultTitle(chartIndex: number): string {
    var series = this.params.charts[chartIndex].series
    if (!series || !this.data) {
      return 'Charted'
    } else if (series.length === 1) {
      return this.getSeriesName(series[0])
    }
    var earlierCharts = this.params.charts.filter(function (chart, i) {
      return chart.series.length > 0 && i < chartIndex
    })
    return chartIndex === 0 ? 'Chart' : 'Chart ' + (1 + earlierCharts.length)
  }

  getSeriesName(i: number): string {
    return this.params.getSeriesName(i) || this.data.serieses[i].label
  }

  getChartCount(): number {
    return this.params.charts.length
  }


  getOtherCharts(chartIndex: number): Array<{title: string, chartIndex: number}> {
    return this.params.charts.map((chart, i) => {
      return {
        title: chart.title || this.getDefaultTitle(i),
        chartIndex: i
      }
    }).filter((chart, i) => i !== chartIndex)
  }


  updateSelectedX(index: number): void {
    this.chartObjects.forEach(function (chart) {
      chart.updateSelectedX(index)
    })
  }


  toggleColor(): void {
    this.params.toggleColor()
    dom.classlist.toggle(document.body, 'dark')
    this.chartObjects.forEach(function (chart) {
      chart.render()
    })
    this.updateURL()
  }

  openSettings(): void {
    dom.classlist.add(dom.get('js-settings'), 'open')
  }

  toggleGrid(): void {
    this.params.toggleGrid()
    this.applyGrid()
    this.setDimensions()
    this.updateURL()
  }

  applyGrid(): void {
    dom.classlist.toggle(document.body, 'full')

    let template = templates.gridSettingsFull
    if (this.params && this.params.isFull()) {
      template = templates.gridSettingsSplit
    }

    let chartCount = this.chartObjects ? this.chartObjects.length : 0
    let container = dom.get('js-gridOption')
    if (container && chartCount > 1) {
      container.innerHTML = template()
    }
  }

  getEmbed(): void {
    let params = this.params.compress()
    let chartId = utils.getChartId(params)

    let fragment = dom.renderFragment(templates.embedOverlay(chartId))
    if (document.body) {
      document.body.appendChild(fragment)
    }
  }

  closeEmbed(): void {
    let el = document.querySelector('.js-embedPopup')
    if (el && el.parentNode) el.parentNode.removeChild(el)
  }

  updateDataSource(): void {
    let el = document.querySelector('.js-dataSourceUrl')

    if (el && el instanceof HTMLInputElement) {
      this.fetchPageData(el.value, /* id */ null, this.params)
    }
  }

  setDataSourceUrl(url: string): void {
    let el = document.querySelector('.js-dataSourceUrl')
    if (el && el instanceof HTMLInputElement) {
      el.value = url
    }
  }

  applyEmbed(): void {
    dom.classlist.enable(document.body, 'embed', this.isEmbed)
  }

  removePopovers(): void {
    // TODO: This probably shouldn't close the popover when
    // the user clicks in empty space within the popover itself.
    dom.classlist.remove(dom.get('js-settings'), 'open')

    let legends = dom.getAll('js-legendItem')
    legends.forEach((el) => {
      dom.classlist.remove(el, 'active')
      dom.classlist.remove(el, 'active-color-input')
    })

    let selectors = ['js-moveChartOptions', 'js-changeSeriesColor']
    selectors.forEach((name: string) => {
      dom.remove(dom.get(name))
    })
  }

  getEditability(): boolean {
    return !this.isEmbed
  }


  getChartDimensions(): {width: number | string, height: number | string, isHalfHeight: boolean, isGrid: boolean} {
    // get all values to use
    var minHeightForHalfHeight = 600
    var minWidthForHalfWidth = 1200
    var minWidthForFullHeight = 800
    var windowWidth = window.innerWidth
    var offsetHeight = document.documentElement ? document.documentElement.offsetHeight : 0
    var windowHeight = 'innerHeight' in window ? window.innerHeight : offsetHeight
    var defaultHeight = windowWidth > minWidthForFullHeight ? windowHeight : 'auto'
    var chartCount = this.chartObjects ? this.chartObjects.length : 0

    // check conditions for adjusting dimensions
    var useHalfWidth = chartCount >= 2 && windowWidth > minWidthForHalfWidth && !this.params.isFull()
    var enoughHeightForHalfHeight = windowHeight > minHeightForHalfHeight && windowWidth > minWidthForFullHeight
    var enoughChartsForHalfHeight = chartCount >= 3 || (chartCount === 2 && !useHalfWidth)
    var useHalfHeight = enoughHeightForHalfHeight && enoughChartsForHalfHeight

    return {
      width: useHalfWidth ? windowWidth / 2 : windowWidth,
      height: useHalfHeight ? windowHeight / 2 : defaultHeight,
      isHalfHeight: useHalfHeight,
      isGrid: useHalfWidth
    }
  }


  setDimensions(): void {
    var dimensions = this.getChartDimensions()

    dom.classlist.enable(document.body, 'chart-grid', dimensions.isGrid)
    dom.classlist.enable(document.body, 'half-height', dimensions.isHalfHeight)

    dom.getAll('js-chartWrapper').forEach((wrapper) => {
      if (wrapper instanceof HTMLElement) {
        wrapper.style.height = `${dimensions.height}px`
        wrapper.style.width = `${dimensions.width}px`
      }
    })

    var bottomRowIndex = Math.floor((this.chartObjects.length - 1) / 2) * 2
    this.chartObjects.forEach(function (chart, i) {
      dom.classlist.enable(chart.wrapper, 'bottom-row', dimensions.isGrid && i >= bottomRowIndex)
      chart.render()
    })

    this.applyGrid()
    this.maybeBroadcastDimensions()
  }


  maybeBroadcastDimensions(): void {
    if (!this.isEmbed) {
      return
    }

    // Charted does a redirect away from the /embed/:id url, so we need to recreate the embed URL.
    let src = window.location.toString().replace('/c/', '/embed/')

    // scrollHeight is not great as the embed can never get shorter. This is a short term
    // fix to deal with this fact.
    let offsetWidth = document.body ? document.body.offsetWidth : 0
    let height = document.body ? document.body.scrollHeight : 0
    height = height > 600 && offsetWidth >= 800 ? 600 : height

    // Going to send a modified version of the standard resize context.
    var message = {
      chartId: utils.getChartId(this.params.compress()),
      src: src,
      context: "iframe.resize",
      height: height
    }

    if (window.parent) {
      window.parent.postMessage(JSON.stringify(message), '*' /* Any site can embed charted */)
    }
  }


  errorNotify(error: Object): void {
    dom.classlist.add(document.body, 'error')
    dom.classlist.remove(document.body, 'loading')

    this.updatePageTitle()
    var displayMessage = error.message || error.responseText || 'There’s been an error. Please check that '+
      'you are using a valid .csv file. If you are using a Google Spreadsheet or Dropbox '+
      'link, the privacy setting must be set to shareable.'

    let container = dom.get('js-errorMessage')
    if (container) {
      container.appendChild(dom.renderFragment(displayMessage))
    }
  }


  updateURL(cb: ?Function): void {
    this.updatePageTitle()
    let params = this.params.compress()
    let chartId = utils.getChartId(params)
    let path = `/c/${chartId}`
    window.history.pushState({}, null, path)

    // TODO (anton): Show an error if save failed
    d3.xhr(path)
      .header('Content-Type', 'application/json')
      .post(JSON.stringify(params), () => {
        if (cb) cb()
      })
  }


  updatePageTitle(pageTitleString: ?string): void {
    var pageTitle = 'Charted'
    var charts = []
    if (this.params && this.params.charts) {
      charts = this.params.charts
    }

    if (pageTitleString) {
      pageTitle = pageTitleString
    } else if (charts.length > 0) {
      // if there's a chart, use the chart titles
      pageTitle = charts.map((chart, i) => chart.title || this.getDefaultTitle(i)).join(', ')

      // if it's just one chart called "Chart", add the series names
      if (pageTitle === 'Chart') {
        pageTitle += ' of ' + charts[0].series.map((series) => this.getSeriesName(series)).join(', ')
      }
    }

    document.title = pageTitle
  }
}
