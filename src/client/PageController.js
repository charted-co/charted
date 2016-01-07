/* @flow */

import {fetchPageData, PageData} from "./PageData"
import {Chart} from "./Chart"
import ChartParameters from "../shared/ChartParameters"
import * as templates from "./templates"
import * as utils from "../shared/utils"

export const EDITABLES = ['title', 'note'];
export const OPTIONS = {
  // Default values are first
  type: ['column', 'line'],
  rounding: ['on', 'off']
}

export class PageController {
  chartObjects: Array<Chart>;
  $body: Object;
  $charts: Object;
  resizeTimer: number;
  params: ChartParameters;
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

  setupPage(params: ChartParameters): void {
    this.params = params.withDefaultTitle((i) => this.getDefaultTitle(i))
    this.$body.addClass('loading')
    this.updatePageTitle('Charted (...)')
    this.clearExisting()

    // populate charts and refresh every 30 minutes,
    // unless this is an embed.
    this.resetCharts()

    if (!this.params.isEmbed) {
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
    if (this.params.isEmbed) return

    // populate UI
    this.$body.append(templates.pageSettings())
    var $pageSettings = this.$body.find('.page-settings')

    $('.download-data').attr('href', this.params.url)

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
    this.fetchData(this.params.url, (data) => {
      // set background color
      let color = this.params.isLight() ? 'light' : 'dark'
      this.$body.addClass(color)

      // set embed style
      this.applyEmbed()

      this.setupPageSettings()
      this.data = data

      // set first title
      if (!this.params.charts[0].title) {
        this.params.charts[0].title = data.serieses.length > 1 ? 'Chart' : data.serieses[0].label
      }

      this.$body.removeClass('pre-load loading error')

      // update charts
      this.params.charts.forEach((chart, i) => this.updateChart(i))

      this.setDimensions()
      this.updatePageState()
    })
  }


  fetchData(dataUrl: string, callback: (data: PageData) => void): void {
    fetchPageData(dataUrl, (error, data) => {
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
    var $el = $('<div class="chart-wrapper"></div>')
    var dimensions = this.getChartDimensions()
    $el.outerHeight(dimensions.height).outerWidth(dimensions.width)
    this.$charts.append($el)
    this.chartObjects.push(new Chart(this, thisChartIndex, $el, initialChartParams, this.data))
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
    this.params.charts.splice(chartIndex, 1)
    this.chartObjects[chartIndex].$wrapper.remove()
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
    if (!series) {
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
    this.$body.toggleClass('dark')
    this.chartObjects.forEach(function (chart) {
      chart.render()
    })
    this.updatePageState()
  }


  toggleGrid(): void {
    this.params.toggleGrid()
    this.applyGrid()
    this.setDimensions()
    this.updatePageState()
  }


  applyGrid(): void {
    this.$body.toggleClass('full')

    var template = templates.gridSettingsFull
    if (this.params.isFull()) {
      template = templates.gridSettingsSplit
    }

    var chartCount = this.chartObjects ? this.chartObjects.length : 0
    $('.grid-option').html(chartCount > 1 ? template() : '')
    $('.toggle-grid').click(() => this.toggleGrid())
  }


  getEmbed(): void {
    var embedId = utils.getHashCode(window.location.href)
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
    if (this.params.embed) {
      this.$body.addClass('embed')
    } else {
      this.$body.removeClass('embed')
    }
  }


  getEditability(): boolean {
    return !this.params.isEmbed
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
    if (!this.params.embed) {
      return
    }

    var message = this.params.embed + ':' + String(document.body.scrollHeight)
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
    var minDataParams = this.params.compress((i) => this.getDefaultTitle(i))
    var embedString = this.params.embed ? '&format=embed' : ''
    var url = '?' + encodeURIComponent(JSON.stringify(minDataParams)) + embedString

    // only push a new state if the new url differs from the current url
    if (window.location.search !== url) {
      window.history.pushState({isChartUpdate: true}, null, url)
    }
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

  useUrl(): void {
    var params = ChartParameters.fromQueryString(window.location.search)

    // Handle the state change from chart -> pre-load
    if (!params) {
      this.clearExisting()
      this.$body.addClass('pre-load')
      return
    }

    if (params.isEmbed) {
      this.$body.addClass('is-embed')
    }

    $('.data-file-input').val(params.url)
    this.setupPage(params)
  }
}
