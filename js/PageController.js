/* @flow */

import {getUrlParameters} from "./Utils"
import {PageData} from "./PageData"
import {Chart} from "./Chart"
import * as templates from "./templates"

export const EDITABLES = ['title', 'note'];
export const OPTIONS = {
  // Default values are first
  type: ['column', 'line'],
  rounding: ['on', 'off']
}
const DARK = 'dark';
const LIGHT = 'light';
const FULL = 'full';
const SPLIT = 'split';

export class PageController {
  chartObjects: Array<Chart>;
  $body: Object;
  $charts: Object;
  resizeTimer: number;
  parameters: Object; // TODO(anton): this should have an explicit type
  data: PageData;

  constructor() {
    this.chartObjects = []
    this.$body = $('body')
    this.$charts = $('.charts')

    // re-render charts on window resize
    $(window).resize(() => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => this.setDimensions(), 30)
    })

    // setup keystrokes
    $(document).keyup(function(e) {
      if (e.keyCode == 27) {
        $('.overlay-container').remove()
        $('.page-settings').removeClass('open')
      }
    })
  }

  setupPage(parameters: Object): void {
    this.$body.addClass('loading')
    this.updatePageTitle('Charted (...)')
    this.parameters = parameters
    this.parameters.charts = this.parameters.charts || [{}]
    this.parameters.embed = this.parameters.embed || null
    this.clearExisting()

    // populate charts and refresh every 30 minutes,
    // unless this is an embed.
    this.resetCharts()

    if (!this.parameters.embed) {
      setInterval(() => this.resetCharts(), 1000 * 60 * 30)
    }
  }


  clearExisting(): void {
    $('.chart-wrapper, .page-settings').remove()
    this.chartObjects = []
    $('body, .settings, .settings-popover, .toggle-color').unbind()
  }


  setupPageSettings(): void {
    // if this is an embed, don't add the page settings
    if (this.parameters.embed) return

    // populate UI
    this.$body.append(templates.pageSettings())
    var $pageSettings = this.$body.find('.page-settings')

    $('.download-data').attr('href', this.parameters.dataUrl)

    // bind intereactions
    $pageSettings.find('.settings').click((event) => {
      event.stopPropagation()
      $pageSettings.addClass('open')
    })

    $pageSettings.find('.settings-popover').click((event) => event.stopPropagation())

    this.$body.click(() => $pageSettings.removeClass('open'))

    $pageSettings.find('.toggle-color').click(() => this.toggleColor())
    $pageSettings.find('.get-embed').click(() => this.getEmbed())
  }


  resetCharts(): void {
    this.fetchData(this.parameters.dataUrl, (data) => {
      // set background color
      this.applyColor()

      // set embed style
      this.applyEmbed()

      this.setupPageSettings()
      this.data = data

      // set first title
      if (!this.parameters.charts[0].title) {
        this.parameters.charts[0].title = data.getSeriesCount() > 1 ? 'Chart' : data.getSeries(0).label
      }

      this.$body.removeClass('pre-load loading error')

      // update charts
      this.parameters.charts.forEach((chart, i) => this.updateChart(i))

      this.setDimensions()
      this.updatePageState()
    })
  }


  fetchData(dataUrl: string, callback: (data: PageData) => void): void {
    new PageData(dataUrl, (error, data) => {
      if (error) {
        this.errorNotify(error)
        return
      }

      if (data) {
        callback(data)
      }
    })
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

    for (var i = 1; i < this.parameters.charts.length; i++) {
      otherChartSeries = otherChartSeries.concat(this.parameters.charts[i].series)
    }

    for (var j = 0; j < this.data.getSeriesCount(); j++) {
      if (otherChartSeries.indexOf(j) > -1) continue
      firstChartSeries.push(j)
    }

    return firstChartSeries
  }


  createNewChart(thisChartIndex: number, initialChartParams: Object): void {
    var $el = $('<div class="chart-wrapper"></div>')
    var dimensions = this.getChartDimensions()
    $el.outerHeight(dimensions.height).outerWidth(dimensions.width)
    this.$charts.append($el)
    this.chartObjects.push(new Chart(this, thisChartIndex, $el, initialChartParams, this.data))
  }


  moveToChart(series: Object, fromChartIndex: number, toChartIndex: number) {
    var fromChart = this.parameters.charts[fromChartIndex]
    var toChart = this.parameters.charts[toChartIndex]

    // remove default titles
    this.parameters.charts.forEach((chart, i) => {
      if (chart.title && chart.title == this.getDefaultTitle(i)) {
        delete chart.title
      }
    })

    // add series to intended chart
    if (toChartIndex > this.parameters.charts.length - 1) {
      this.parameters.charts.push({series: [series]})
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

    $('html, body').animate({
        scrollTop: this.chartObjects[toChartIndex].$wrapper.offset().top
    }, 300)

    this.updateChart(fromChartIndex)

    // update all charts that come after, since default titles may have changed
    for (var j = fromChartIndex; j < this.chartObjects.length; j++) {
      if (j === toChartIndex) continue
      this.updateChart(j)
    }

    this.setDimensions()
    this.updatePageState()
  }


  removeChart(chartIndex: number): void {
    // need to increment down the chartIndex for every chart that comes after
    for (var i = chartIndex + 1; i < this.chartObjects.length; i++) {
      this.chartObjects[i].chartIndex--
    }

    // remove the parameters, html element, and overall chart object
    this.parameters.charts.splice(chartIndex, 1)
    this.chartObjects[chartIndex].$wrapper.remove()
    this.chartObjects.splice(chartIndex, 1)
  }


  getFullParams(chartIndex: number): Object {
    var params = this.parameters.charts[chartIndex]
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
    var series = this.parameters.charts[chartIndex].series
    if (!series) {
      return 'Charted'
    } else if (series.length === 1) {
      return this.getSeriesName(series[0])
    }
    var earlierCharts = this.parameters.charts.filter(function (chart, i) {
      return chart.series.length > 0 && i < chartIndex
    })
    return chartIndex === 0 ? 'Chart' : 'Chart ' + (1 + earlierCharts.length)
  }


  getSeriesNames(): Object {
    if (! this.parameters.seriesNames) {
      this.parameters.seriesNames = {}
    }
    return this.parameters.seriesNames
  }


  getSeriesName(i: number): string {
    if (! this.parameters.seriesNames || ! this.parameters.seriesNames[i]) {
      return this.data.getSerieses()[i].label
    } else {
      return this.parameters.seriesNames[i]
    }
  }


  getSeriesColors(): Object {
    if (! this.parameters.seriesColors) {
      this.parameters.seriesColors = {}
    }
    return this.parameters.seriesColors
  }


  getSeriesColor(i: number): ?string {
    if (this.parameters.seriesColors) {
      return this.parameters.seriesColors[i]
    }
  }


  getChartCount(): number {
    return this.parameters.charts.length
  }


  getOtherCharts(chartIndex: number): Array<{title: string, chartIndex: number}> {
    return this.parameters.charts.map((chart, i) => {
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
    this.parameters.color = this.parameters.color === DARK ? LIGHT : DARK
    this.applyColor()
    this.chartObjects.forEach(function (chart) {
      chart.render()
    })
    this.updatePageState()
  }


  applyColor(): void {
    if (this.parameters.color === DARK) {
      this.$body.addClass(DARK)
    } else {
      this.$body.removeClass(DARK)
    }
  }


  toggleGrid(): void {
    this.parameters.grid = this.parameters.grid === FULL ? SPLIT : FULL
    this.applyGrid()
    this.setDimensions()
    this.updatePageState()
  }


  applyGrid(): void {
    if (this.parameters.grid === FULL) {
      this.$body.addClass(FULL)
    } else {
      this.$body.removeClass(FULL)
    }

    var template = templates.gridSettingsFull
    if (this.parameters.grid == FULL) {
      template = templates.gridSettingsSplit
    }

    var chartCount = this.chartObjects ? this.chartObjects.length : 0
    $('.grid-option').html(chartCount > 1 ? template() : '')
    $('.toggle-grid').click(() => this.toggleGrid())
  }


  getPageColor(): string {
    return this.parameters.color
  }


  getEmbed(): void {
    var embedId = this._getHashCode(window.location.href)
    var embedUrl = window.location.href + '&embed=' + embedId

    this.$body.append(templates.embedOverlay({id: embedId, url: embedUrl}))

    this.$body.find('.overlay-content').click(function (event) {
      event.stopPropagation()
    })

    this.$body.click(function () {
      $('.overlay-container').remove()
    })

  }


  applyEmbed(): void {
    if (this.parameters.embed) {
      this.$body.addClass('embed')
    } else {
      this.$body.removeClass('embed')
    }
  }


  getEditability(): boolean {
    return !this.parameters.embed
  }


  getChartDimensions(): {width: number | string, height: number | string, isHalfHeight: boolean, isGrid: boolean} {
    // get all values to use
    var minHeightForHalfHeight = 600
    var minWidthForHalfWidth = 1200
    var minWidthForFullHeight = 800
    var windowWidth = $(window).innerWidth()
    var windowHeight = 'innerHeight' in window ? window.innerHeight: document.documentElement.offsetHeight
    var defaultHeight = windowWidth > minWidthForFullHeight ? windowHeight : 'auto'
    var chartCount = this.chartObjects ? this.chartObjects.length : 0

    // check conditions for adjusting dimensions
    var useHalfWidth = chartCount >= 2 && windowWidth > minWidthForHalfWidth && this.parameters.grid !== FULL
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
    if (dimensions.isGrid) {
      this.$body.addClass('chart-grid')
      this.$body.removeClass('half-height')
    } else if (dimensions.isHalfHeight) {
      this.$body.removeClass('chart-grid')
      this.$body.addClass('half-height')
    } else {
      this.$body.removeClass('chart-grid half-height')
    }
    $('.chart-wrapper').outerHeight(dimensions.height).outerWidth(dimensions.width)

    var bottomRowIndex = Math.floor((this.chartObjects.length - 1) / 2) * 2
    this.chartObjects.forEach(function (chart, i) {
      if (dimensions.isGrid && i >= bottomRowIndex) {
        chart.$wrapper.addClass('bottom-row')
      } else {
        chart.$wrapper.removeClass('bottom-row')
      }
      chart.render()
    })

    this.applyGrid()
    this.maybeBroadcastDimensions()
  }


  maybeBroadcastDimensions(): void {
    if (!this.parameters.embed) {
      return
    }

    var message = this.parameters.embed + ':' + String(document.body.scrollHeight)
    if (window.parent) {
      window.parent.postMessage(message, '*' /* Any site can embed charted */)
    }
  }


  errorNotify(error: Object): void {
    /*jshint devel:true */

    this.$body.addClass('error').removeClass('loading')
    this.updatePageTitle()
    var displayMessage = error.message || 'There’s been an error. Please check that '+
      'you are using a valid .csv file. If you are using a Google Spreadsheet or Dropbox '+
      'link, the privacy setting must be set to shareable.'

    $('.error-message').html(displayMessage)

    if(error && error.reponseText) {
      console.error(error.responseText)
    }
  }


  updatePageState(): void {
    //update page title
    this.updatePageTitle()

    // set url
    var minDataParams = this.getMinDataParams()
    var embedString = this.parameters.embed ? '&format=embed' : ''
    var url = '?' + encodeURIComponent(JSON.stringify(minDataParams)) + embedString

    // only push a new state if the new url differs from the current url
    if (window.location.search !== url) {
      window.history.pushState({isChartUpdate: true}, null, url)
    }
  }


  updatePageTitle(pageTitleString: ?string): void {
    var pageTitle = 'Charted'
    var charts = []
    if (this.parameters && this.parameters.charts) {
      charts = this.parameters.charts
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


  getMinDataParams(): Object {
    var minParams = {}
    minParams.dataUrl = this.parameters.dataUrl

    // add seriesNames if applicable
    if (this.parameters.seriesNames && Object.keys(this.parameters.seriesNames).length > 0) {
      minParams.seriesNames = this.parameters.seriesNames
    }

    // add seriesColors if applicable
    if (this.parameters.seriesColors && Object.keys(this.parameters.seriesColors).length > 0) {
      minParams.seriesColors = this.parameters.seriesColors
    }

    // add color if applicable
    if (this.parameters.color && this.parameters.color !== LIGHT) {
      minParams.color = this.parameters.color
    }

    // add grid if applicable
    if (this.parameters.grid && this.parameters.grid !== SPLIT) {
      minParams.grid = this.parameters.grid
    }

    // add applicable chart parameters
    minParams.charts = []
    this.parameters.charts.forEach((chart, i) => {
      minParams.charts.push({})

      // add applicable chart options
      Object.keys(OPTIONS).forEach((option) => {
        if (chart[option] && chart[option] !==  OPTIONS[option][0]) {
          minParams.charts[i][option] = chart[option]
        }
      })

      // add applicable title
      if (chart.title !== this.getDefaultTitle(i) && chart.title !== '') {
        minParams.charts[i].title = chart.title
      }

      // add applicable note
      if (chart.note) {
        minParams.charts[i].note = chart.note
      }

      // add applicable series
      if (i > 0) {
        minParams.charts[i].series = chart.series
      }

    })

    // delete charts if empty
    if (minParams.charts.length === 1 && Object.keys(minParams.charts[0]).length === 0) {
      delete minParams.charts
    }

    return minParams
  }


  useUrl(): void {
    var urlParameters = getUrlParameters()
    var parameters = urlParameters.data || {}

    // support prior csvUrl parameter and array format
    parameters = (parameters instanceof Array) ? parameters[0] : parameters
    parameters.dataUrl = parameters.csvUrl || parameters.dataUrl

    // add embed values
    if (urlParameters.embed) {
      parameters.embed = urlParameters.embed
      this.$body.addClass('is-embed')

    }

    // handle the state change from chart -> pre-load
    if (!parameters.dataUrl) {
      this.clearExisting()
      this.$body.addClass('pre-load')
      return
    }

    $('.data-file-input').val(parameters.dataUrl)
    this.setupPage(parameters)
  }


  /** Converts a string into a hash code. A clone of Java's String.hashCode() */
  _getHashCode(str: string): number {
    if (str.length == 0) {
      return 0
    }

    var hash = 0
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash // convert to 32 bit integer
    }

    return hash
  }
}
