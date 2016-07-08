/* @flow */

import PageData from "./PageData"
import Chart from "./Chart"
import ChartParameters from "./ChartParameters"
import * as templates from "./templates"
import * as utils from "../shared/utils"

const MIN_30 = 1000 * 60 * 30
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
  isEmbed: boolean;

  constructor() {
    this.isEmbed = false
    this.chartObjects = []
    this.$body = $('body')
    this.$charts = $('.charts')

    // re-render charts on window resize
    $(window).resize(() => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => this.setDimensions(), 30)
    })

    // setup keystrokes
    $(document).keyup((ev) => {
      if (ev.keyCode == 27) {
        $('.overlay-container').remove()
        $('.page-settings').removeClass('open')
      }
    })

    $('.load-data-form').submit((ev) => {
      ev.preventDefault()

      let url = $('.data-file-input').val()
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

    if (!chartId && !legacyParams) {
      this.clearExisting()
      this.$body.addClass('pre-load')
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
      this.updateURL(/* withoutServerUpdate */ false, () => this.fetchPageData(legacyDataUrl, /* id */ null, legacyParamsCompressed))
    }
  }


  /**
   * Fetches chart data and parameters either by URL or by ID.
   */
  fetchPageData(dataUrl: ?string, id: ?string, params: ?object): void {
    if (!dataUrl && !id) {
      if (!this.params) {
        return
      }

      // If neither dataUrl nor id is provided but there is an
      // active chart, we simply refetch that chart.
      id = utils.getChartId(this.params.compress())
    }

    this.$body.addClass('loading')
    this.updatePageTitle('Charted (...)')
    this.clearExisting()

    let url = `/load/?url=${encodeURIComponent(dataUrl || '')}&id=${encodeURIComponent(id || '')}`
    d3.json(url, (err, resp) => {
      if (err) {
        this.errorNotify(err)
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
    this.$body.addClass(color)

    // Set embed style
    this.applyEmbed()

    this.setupPageSettings()

    // set first title
    if (!this.params.charts[0].title) {
      this.params.charts[0].title =
        this.data.serieses.length > 1 ? 'Chart' : this.data.serieses[0].label
    }

    this.$body.removeClass('pre-load loading error')

    // update charts
    this.params.charts.forEach((chart, i) => this.updateChart(i))

    this.setDimensions()
    this.updateURL()
    $('.data-source-url').val(this.params.url)
  }


  clearExisting(): void {
    $('.chart-wrapper, .page-settings').remove()
    this.chartObjects = []
    $('body, .settings, .settings-popover, .toggle-color').unbind()
  }


  setupPageSettings(): void {
    // if this is an embed, don't add the page settings
    if (this.isEmbed) return

    // populate UI
    this.$body.append(templates.pageSettings())
    var $pageSettings = this.$body.find('.page-settings')

    $('.download-data').attr('href', this.params.url)
    $('.data-source-url').val(this.params.url)

    // bind intereactions
    $pageSettings.find('.settings').click((event) => {
      event.stopPropagation()
      $pageSettings.addClass('open')
    })

    $pageSettings.find('.settings-popover').click((event) => event.stopPropagation())

    this.$body.click(() => $pageSettings.removeClass('open'))

    $pageSettings.find('.toggle-color').click(() => this.toggleColor())
    $pageSettings.find('.get-embed').click(() => this.getEmbed())
    $pageSettings.find('.update-data-source').click(() => this.fetchPageData($('.data-source-url').val(), /* id */ null, this.params))
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
    this.updateURL()
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
    this.$body.toggleClass('dark')
    this.chartObjects.forEach(function (chart) {
      chart.render()
    })
    this.updateURL()
  }


  toggleGrid(): void {
    this.params.toggleGrid()
    this.applyGrid()
    this.setDimensions()
    this.updateURL()
  }


  applyGrid(): void {
    this.$body.toggleClass('full')

    var template = templates.gridSettingsFull
    if (this.params && this.params.isFull()) {
      template = templates.gridSettingsSplit
    }

    var chartCount = this.chartObjects ? this.chartObjects.length : 0
    $('.grid-option').html(chartCount > 1 ? template() : '')
    $('.toggle-grid').click(() => this.toggleGrid())
  }


  getEmbed(): void {
    let params = this.params.compress()
    let chartId = utils.getChartId(params)

    this.$body.append(templates.embedOverlay(chartId))
    this.$body.find('.overlay-content').click((ev) => ev.stopPropagation())
    this.$body.click(() => $('.overlay-container').remove())

  }


  applyEmbed(): void {
    if (this.params.embed) {
      this.$body.addClass('embed')
    } else {
      this.$body.removeClass('embed')
    }
  }


  getEditability(): boolean {
    return !this.isEmbed
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
    if (!this.isEmbed) {
      return
    }

    // Charted does a redirect away from the /embed/:id url, so we need to recreate the embed URL.
    let src = window.location.toString().replace('/c/', '/embed/')

    // scrollHeight is not great as the embed can never get shorter. This is a short term
    // fix to deal with this fact.
    let height = document.body.scrollHeight
    height = height > 600 && document.body.offsetWidth >= 800 ? 600 : height

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


  updateURL(withoutServerUpdate: boolean = false, cb: ?Function): void {
    this.updatePageTitle()
    let params = this.params.compress()
    let chartId = utils.getChartId(params)
    let path = `/c/${chartId}`
    window.history.pushState({}, null, path)

    if (!withoutServerUpdate) {
      d3.xhr(path)
        .header('Content-Type', 'application/json')
        .post(JSON.stringify(params), () => {
          if (cb) cb()
        })
      // TODO (anton): Show an error if save failed
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
}
