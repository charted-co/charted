/*global $, _ */

function ChartLegend(controller, data, chart) {
  this.chart = chart
  this.controller = controller
  this.data = data
  this.chartIndex = this.chart.getChartIndex()
  this.$container = this.chart.getChartContainer()
  this.series = this.chart.getChartSeries()
}

ChartLegend.prototype.update = function() {
  if (this.data.getSeriesCount() === 1 && this.controller.getOtherCharts(this.chartIndex).length === 0) {
    this.$container.find('.legend').html('')
    return
  }

  var $legend = $('')
  _(this.data.getSerieses()).eachRight(function (series, i) {
    var label = this.controller.getSeriesName(this.series[i])
    var thisLabel = {
      label: label,
      color: this.chart.getSeriesColor(series.seriesIndex),
      editable: this.controller.getEditability()
    }
    var $legendEl = $(this.legendItemHTML(thisLabel))
    $legend = $legend.add($legendEl)
    series.legendEl = $legendEl
  }.bind(this))
  this.$container.find('.legend').html($legend).removeClass('hidden')

  if (this.controller.getEditability()) {
    this.bindLegendInteractions()  
  }
}

ChartLegend.prototype.bindLegendInteractions = function () {
  this.data.getSerieses().forEach(function (series, i) {
    // make series labels editable
    var $legendInput = series.legendEl.find('.legend-input')
    $legendInput.on('focusout', function () {
      var seriesNames = this.controller.getSeriesNames()

      if ($legendInput.text() === series.label || $legendInput.text() === '') {
        $legendInput.text(series.label)
        delete seriesNames[series.seriesIndex]
      } else {
        seriesNames[series.seriesIndex] = $legendInput.text()
      }
      this.controller.updatePageState()
    }.bind(this))

    // open color input
    series.legendEl.find('.legend-color').click(function (event) {
      event.stopPropagation()
      this.removePopovers()
      this.openColorInput(series)
    }.bind(this))

    // open move-chart popover
    series.legendEl.find('.move-chart').click(function (event) {
      event.stopPropagation()
      this.removePopovers()
      this.openMoveChart(series, i)
    }.bind(this))
  }, this)

  // remove popovers
  $('html').click(this.removePopovers.bind(this))
}

ChartLegend.prototype.openColorInput = function(series) {
  var colorHex = this.chart.getSeriesColor(series.seriesIndex).replace(/^#/, '')

  series.legendEl.addClass('active-color-input')
  series.legendEl.append(this.changeSeriesColorHTML({
    colorHex: colorHex, 
    seriesIndex: series.seriesIndex
  }))

  this.data.getSeriesIndices().forEach(function (series) {
    var $thisColorInput = this.$container.find('.change-series-color-' + series)
    $thisColorInput.on('focusout', function () {

      var seriesColors = this.controller.getSeriesColors()
      var newColorHex = '#' + $thisColorInput.text().replace(/^#/, '')
      var defaultColorHex = this.chart.getDefaulSeriesColor(series)
      var isValidHex = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(newColorHex)

      if (newColorHex === defaultColorHex ||!isValidHex ) {
        $thisColorInput.text(defaultColorHex)
        delete seriesColors[series]
      } else {
        seriesColors[series] = newColorHex
      }
      this.chart.render()
      this.controller.updatePageState()

    }.bind(this))
  }.bind(this))

  this.$container.find('.change-series-color').click(function (e) {
    e.stopPropagation()
  }.bind(this))
}

ChartLegend.prototype.openMoveChart = function(series, i) {
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
    series.legendEl.append(this.moveChartHTML({otherCharts: otherCharts, series: this.series}))

    otherCharts.forEach(function (chart) {
      this.$container.find('.move-to-chart-' + chart.chartIndex).click(function (e) {
        e.preventDefault()
        this.controller.moveToChart(this.series[i], this.chartIndex, chart.chartIndex)
      }.bind(this))
    }.bind(this))

    this.$container.find('.move-to-new-chart').click(function () {
      this.controller.moveToChart(this.series[i], this.chartIndex, newChartIndex)
    }.bind(this))
  }
}

ChartLegend.prototype.removePopovers = function() {
  $('html').find('.move-chart-options, .change-series-color').remove()
  $('html').find('.page-settings').removeClass('open')
  $('html').find('.legend-item').removeClass('active active-color-input')
}

ChartLegend.prototype.legendItemHTML = function(label) {
  var template = ''
  template +='<li class="legend-item">'
  template +='  <div class="legend-label info-input">'
  template +='    <span class="legend-input" <% if (editable) {%> contenteditable="true" <%}%> ><%- label %></span>'
  template +='  </div>'
  template +='  <button class="legend-color"><span style="background-color:<%- color %>;" class="legend-dot"></span></button>'
  template +='  <% if (editable) { %>'
  template +='    <button class="move-chart"><span class="icon icon-move"></span></button>'
  template +='  <% } %>'
  template +='</li>'
  return _.template(template, label)
}

ChartLegend.prototype.moveChartHTML = function (otherCharts) {
  var template = ''
  template +='<div class="move-chart-options popover">'
  template +='  <p>Move to:</p>'
  template +='  <% _.forEach(otherCharts, function (chart) { %>'
  template +='    <a href= "#" class="move-chart-option move-to-chart-<%- chart.chartIndex %>"><%- chart.title %></a>'
  template +='  <% }) %>'
  template +='  <% if(series.length > 1) { %>'
  template +='    <a href= "#" class="move-chart-option move-to-new-chart">'
  template +='      <span class="icon icon-plus"></span>New chart'
  template +='    </a>'
  template +='  <% } %>'
  template +='  <span class="arrow-bottom-right"></span>'
  template +='</div>'
  return _.template(template, otherCharts)
}

ChartLegend.prototype.changeSeriesColorHTML = function (params) {
  var template = ''
  template +='<div class="change-series-color popover">'
  template +='  <p>Change color:</p>'
  template +='  <p><span contenteditable="true" class="color-hex-input change-series-color-<%- seriesIndex %>"><%- colorHex %></span></p>'
  template +='  <span class="arrow-bottom-left"></span>'
  template +='</div>'
  return _.template(template, params)
}
