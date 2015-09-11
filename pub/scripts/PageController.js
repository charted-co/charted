/*global $, _, PageData, Chart, Utils */

function PageController () {
  this.DARK = 'dark'
  this.LIGHT = 'light'
  this.FULL = 'full'
  this.SPLIT = 'split'
  this.chartObjects = []

  // default values are first
  this.OPTIONS = {
    type: ['column', 'line'],
    rounding: ['on', 'off']
  }
  this.EDITABLES = ['title', 'note']

  this.$body = $('body')
  this.$charts = $('.charts')

  // re-render charts on window resize
  $(window).resize(function () {
    clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(function () {
      this.setDimensions()
    }.bind(this), 30)
  }.bind(this))

  // setup keystrokes
  $(document).keyup(function(e) {
    if (e.keyCode == 27) {
      $('.overlay-container').remove()
      $('.page-settings').removeClass('open')

    }
  })
}


PageController.prototype.setupPage = function (parameters) {
  this.$body.addClass('loading')
  this.updatePageTitle('Charted (...)')
  this.parameters = parameters
  this.parameters.dataUrl = this.prepareDataUrl(this.parameters.dataUrl)
  this.parameters.charts = this.parameters.charts || [{}]
  this.parameters.embed = this.parameters.embed || null
  this.clearExisting()

  // populate charts and refresh every 30 minutes,
  // unless this is an embed.
  this.resetCharts()

  if (!this.parameters.embed) {
    setInterval(function () {
      this.resetCharts()
    }.bind(this), 1000 * 60 * 30)
  }
}


PageController.prototype.clearExisting = function () {
  $('.chart-wrapper, .page-settings').remove()
  this.chartObjects = []
  $('body, .settings, .settings-popover, .toggle-color, .update-data-url').unbind()
}


PageController.prototype.setupPageSettings = function () {
  // if this is an embed, don't add the page settings
  if (this.parameters.embed) return

  // populate UI
  this.$body.append(this.pageSettingsHTML())
  var $pageSettings = this.$body.find('.page-settings')

  $('.download-data').attr('href', this.parameters.dataUrl)
  $('.data-url').text(this.parameters.dataUrl)


  // bind intereactions
  $pageSettings.find('.settings').click(function (event) {
    event.stopPropagation()
    $pageSettings.addClass('open')
  })

  $pageSettings.find('.settings-popover').click(function (event) {
    event.stopPropagation()
  })

  this.$body.click(function () {
    $pageSettings.removeClass('open')
  })

  $pageSettings.find('.toggle-color').click(function () {
    this.toggleColor()
  }.bind(this))

  $pageSettings.find('.get-embed').click(function () {
    this.getEmbed()
  }.bind(this))

  $pageSettings.find('.update-data-url').click(function () {
    this.setupPage({dataUrl: $('.data-url').text()})
  }.bind(this))
}


PageController.prototype.resetCharts = function () {
  this.fetchData(this.parameters.dataUrl, function (data) {
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
    this.parameters.charts.forEach(function (chart, i) {
      this.updateChart(i)
    }.bind(this))

    this.setDimensions()
    this.updatePageState()
  }.bind(this))
}


PageController.prototype.fetchData = function (dataUrl, callback) {
  new PageData(dataUrl, function (error, data) {
    if (error) {
      return this.errorNotify(error)
    }

    callback(data)
  }.bind(this))
}


PageController.prototype.updateChart = function (chartIndex) {
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


PageController.prototype.getFirstChartSeries = function () {
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


PageController.prototype.createNewChart = function (thisChartIndex, initialChartParams) {
  var $el = $('<div class="chart-wrapper"></div>')
  var dimensions = this.getChartDimensions()
  $el.outerHeight(dimensions.height).outerWidth(dimensions.width)
  this.$charts.append($el)
  this.chartObjects.push(new Chart(this, thisChartIndex, $el, initialChartParams, this.data))
}


PageController.prototype.moveToChart = function (series, fromChartIndex, toChartIndex) {
  var fromChart = this.parameters.charts[fromChartIndex]
  var toChart = this.parameters.charts[toChartIndex]

  // remove default titles
  this.parameters.charts.forEach(function (chart, i) {
    if (chart.title && chart.title == this.getDefaultTitle(i)) {
      delete chart.title
    }
  }.bind(this))

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


PageController.prototype.removeChart = function (chartIndex) {
  // need to increment down the chartIndex for every chart that comes after
  for (var i = chartIndex + 1; i < this.chartObjects.length; i++) {
    this.chartObjects[i].chartIndex--
  }

  // remove the parameters, html element, and overall chart object
  this.parameters.charts.splice(chartIndex, 1)
  this.chartObjects[chartIndex].$wrapper.remove()
  this.chartObjects.splice(chartIndex, 1)
}


PageController.prototype.getFullParams = function (chartIndex) {
  var params = this.parameters.charts[chartIndex]
  Object.keys(this.OPTIONS).forEach(function (option) {
    params[option] = params[option] || this.OPTIONS[option][0]
  }.bind(this))

  if (chartIndex === 0) {
    params.series = this.getFirstChartSeries()
  }

  params.title = params.title || this.getDefaultTitle(chartIndex)

  return params
}


PageController.prototype.getDefaultTitle = function (chartIndex) {
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


PageController.prototype.getSeriesNames = function () {
  if (! this.parameters.seriesNames) {
    this.parameters.seriesNames = {}
  }
  return this.parameters.seriesNames
}


PageController.prototype.getSeriesName = function (i) {
  if (! this.parameters.seriesNames || ! this.parameters.seriesNames[i]) {
    return this.data.getSerieses()[i].label
  } else {
    return this.parameters.seriesNames[i]
  }
}


PageController.prototype.getChartCount = function () {
  return this.parameters.charts.length
}


PageController.prototype.getOtherCharts = function (chartIndex) {
  return this.parameters.charts.map(function (chart, i) {
    return {
      title: chart.title || this.getDefaultTitle(i),
      chartIndex: i
    }
  }.bind(this)).filter(function (chart, i) {
    return i !== chartIndex
  })
}


PageController.prototype.updateSelectedX = function (index) {
  this.chartObjects.forEach(function (chart) {
    chart.updateSelectedX(index)
  })
}


PageController.prototype.toggleColor = function () {
  this.parameters.color = this.parameters.color === this.DARK ? this.LIGHT : this.DARK
  this.applyColor()
  this.chartObjects.forEach(function (chart) {
    chart.render()
  })
  this.updatePageState()
}


PageController.prototype.applyColor = function () {
  if (this.parameters.color === this.DARK) {
    this.$body.addClass(this.DARK)
  } else {
    this.$body.removeClass(this.DARK)
  }
}


PageController.prototype.toggleGrid = function () {
  this.parameters.grid = this.parameters.grid === this.FULL ? this.SPLIT : this.FULL
  this.applyGrid()
  this.setDimensions()
  this.updatePageState()
}


PageController.prototype.applyGrid = function () {
  if (this.parameters.grid === this.FULL) {
    this.$body.addClass(this.FULL)
  } else {
    this.$body.removeClass(this.FULL)
  }

  var gridSettingHTML = this.gridSettingsHTML()
  $('.grid-option').html(gridSettingHTML)
  $('.toggle-grid').click(function () {
    this.toggleGrid()
  }.bind(this))
}


PageController.prototype.getPageColor = function () {
  return this.parameters.color
}


PageController.prototype.getEmbed = function () {
  var embedId = this._getHashCode(window.location.href)
  var embedUrl = window.location.href + '&embed=' + embedId

  this.$body.append(this.embedOverlayHTML({
    iframeHTML: '<iframe id="charted:' + embedId + '" src="' + embedUrl + '" '+
        'height="600px" width="100%" scrolling="yes" style="border: solid 1px #ccc"></iframe>',
    scriptHTML: '<script src="' + window.location.origin + '/embed.js"></script>'
  }))

  this.$body.find('.overlay-content').click(function (event) {
    event.stopPropagation()
  })

  this.$body.click(function () {
    $('.overlay-container').remove()
  })

}


PageController.prototype.applyEmbed = function () {
  if (this.parameters.embed) {
    this.$body.addClass('embed')
  } else {
    this.$body.removeClass('embed')
  }
}


PageController.prototype.getEditability = function () {
  return !this.parameters.embed
}


PageController.prototype.getChartDimensions = function () {
  // get all values to use
  var minHeightForHalfHeight = 600
  var minWidthForHalfWidth = 1200
  var minWidthForFullHeight = 800
  var windowWidth = $(window).innerWidth()
  var windowHeight = 'innerHeight' in window ? window.innerHeight: document.documentElement.offsetHeight
  var defaultHeight = windowWidth > minWidthForFullHeight ? windowHeight : 'auto'
  var chartCount = this.chartObjects ? this.chartObjects.length : 0

  // check conditions for adjusting dimensions
  var useHalfWidth = chartCount >= 2 && windowWidth > minWidthForHalfWidth && this.parameters.grid !== this.FULL
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


PageController.prototype.setDimensions = function () {
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


PageController.prototype.maybeBroadcastDimensions = function () {
  if (!this.parameters.embed) {
    return
  }

  var message = this.parameters.embed + ':' + String(document.body.scrollHeight)
  if (window.parent) {
    window.parent.postMessage(message, '*' /* Any site can embed charted */)
  }
}


PageController.prototype.errorNotify = function (error) {
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


PageController.prototype.updatePageState = function () {
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


PageController.prototype.updatePageTitle = function (pageTitleString) {
  var pageTitle = 'Charted'
  var charts = []
  if (this.parameters && this.parameters.charts) {
    charts = this.parameters.charts
  }

  if (pageTitleString) {
    pageTitle = pageTitleString
  } else if (charts.length > 0) {
    // if there's a chart, use the chart titles
    pageTitle = charts.map(function (chart, i) {
      return chart.title || this.getDefaultTitle(i)
    }.bind(this)).join(', ')

    // if it's just one chart called "Chart", add the series names
    if (pageTitle === 'Chart') {
      pageTitle += ' of ' + charts[0].series.map(function (series) {
        return this.getSeriesName(series)
      }.bind(this)).join(', ')
    }
  }

  document.title = pageTitle
}


PageController.prototype.getMinDataParams = function () {
  var minParams = {}
  minParams.dataUrl = this.parameters.dataUrl

  // add seriesNames if applicable
  if (this.parameters.seriesNames && Object.keys(this.parameters.seriesNames).length > 0) {
    minParams.seriesNames = this.parameters.seriesNames
  }

  // add color if applicable
  if (this.parameters.color && this.parameters.color !== this.LIGHT) {
    minParams.color = this.parameters.color
  }

  // add grid if applicable
  if (this.parameters.grid && this.parameters.grid !== this.SPLIT) {
    minParams.grid = this.parameters.grid
  }

  // add applicable chart parameters
  minParams.charts = []
  this.parameters.charts.forEach(function (chart, i) {
    minParams.charts.push({})

    // add applicable chart options
    Object.keys(this.OPTIONS).forEach(function (option) {
      if (chart[option] && chart[option] !==  this.OPTIONS[option][0]) {
        minParams.charts[i][option] = chart[option]
      }
    }.bind(this))

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

  }.bind(this))

  // delete charts if empty
  if (minParams.charts.length === 1 && Object.keys(minParams.charts[0]).length === 0) {
    delete minParams.charts
  }

  return minParams
}


PageController.prototype.useUrl = function () {
  var urlParameters = Utils.getUrlParameters()
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


PageController.prototype.prepareDataUrl = function (url) {
  // Prepare Google Spreadsheets url
  if (url.indexOf('https://docs.google.com/') === 0 && url.indexOf('spreadsheets/d/') != 1) {
    // the gid is the specific sheet within the document
    var gid = url.indexOf('gid=') >= 0 ? url.substring(url.indexOf('gid=') + 4) : 0

    // the structure should be: "https://docs.google.com/spreadsheets/d/[Doc_ID]/export?gid=[gid]&format=csv
    url = url.substring(0, url.indexOf('/', url.indexOf('spreadsheets/d/') + 15)) + '/export'
    url = Utils.addParamToUrl(url, 'gid', gid)
    url = Utils.addParamToUrl(url, 'format', 'csv')
    return url
  }

  // Prepare Dropbox url
  if (url.indexOf('https://www.dropbox.com/') === 0) {
    url = Utils.addParamToUrl(url, 'raw', '1')
    return url
  }

  return url
}

PageController.prototype.pageSettingsHTML = function () {
  var template = ''
  template += '<div class="page-settings">'
  template += '  <button class="option-item settings" title="Settings"><span class="icon icon-settings"></span></button>'
  template += '  <div class="settings-popover popover">'
  template += '    <div class="page-options">'
  template += '      <a class="page-option-item download-data" title="Download data"><span class="icon icon-download"></span>Download data</a>'
  template += '      <button class="page-option-item toggle-color" title="Switch background color"><span class="icon icon-color"></span>Switch background</button>'
  template += '      <div class="grid-option"></div>'
  template += '      <button class="page-option-item get-embed" title="Get embed code"><span class="icon icon-embed"></span>Get embed code</button>'
  template += '    </div>'
  template += '    <div class="data-source">'
  template += '      <p>Data File:</p>'
  template += '      <div class="data-url info-input" contenteditable="true"></div>'
  template += '      <button type="submit" class="update-data-url">Save</button>'
  template += '    </div>'
  template += '    <a href="." class="page-option-item go-home"><span class="icon icon-back"></span>Charted home</a>'
  template += '  </div>'
  template += '</div>'
  return _.template(template)
}


PageController.prototype.gridSettingsHTML = function () {
  var fullTemplate = '<button class="page-option-item toggle-grid" title="Show full width charts"><span class="icon icon-full-screen"></span>Show full width charts</button>'
  var splitTemplate = '<button class="page-option-item toggle-grid" title="Show split-screen charts"><span class="icon icon-split-screen"></span>Show split-screen charts</button>'
  var templateToUse = this.parameters.grid === this.FULL ? splitTemplate : fullTemplate
  var chartCount = this.chartObjects ? this.chartObjects.length : 0
  return chartCount > 1 ? templateToUse : ''
}


PageController.prototype.embedOverlayHTML = function (params) {
  var template = ''
  template += '<div class="overlay-container">'
  template += '  <div class="overlay-content">'
  template += '    <h1 class="overlay-title">Embed this Charted page</h1>'
  template += '    <p class="overlay-description">You can add this embed to your website by copying and pasting the HTML code below.</p>'
  template += '    <input class="embed-link" value="<%- iframeHTML %>\n<%- scriptHTML %>"/>'
  template += '    <div class="iframe-container"><%= iframeHTML %></div>'
  template += '  </div>'
  template += '  <div class="overlay-close"><span class="icon icon-x"></span></div>'
  template += '</div>'
  return _.template(template, params)
}


/**
 * Converts a string into a hash code. A clone of Java's String.hashCode()
 *
 * @param {string} str
 * @return {number}
 */
PageController.prototype._getHashCode = function (str) {
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

