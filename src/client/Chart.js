/* @flow */

import {ChartData} from "./ChartData"
import {ChartLegend} from "./ChartLegend"
import {stringToNumber, camelToHyphen, getNiceIntervals, getRoundedValue} from "../shared/utils"
import {OPTIONS, EDITABLES, PageController} from "./PageController"
import PageData from "./PageData"
import * as templates from "./templates"

export class Chart {
  pageController: PageController;
  $wrapper: Object;
  $container: Object;
  $plot: Object;
  $xBeg: Object;
  $xEnd: Object;
  $selectionElem: Object;
  $selectionXLabel: Object;
  $selectionYLabel: Object;
  $yAxis: Object;
  $zeroLine: Object;
  $selectionValue: Object;
  $optionsElem: Object;
  $pageSettings: Object;
  $chartDescription: Object;
  chartIndex: number;
  params: Object;
  data: ChartData;
  legend: ChartLegend;
  xScale: any;
  yScale: any;
  colorDark: string;
  colorLight: string;
  colorRange: Array<string>;
  layers: Object;
  yRangeStacked: Array<any>;
  yRangeUnstacked: Array<any>;
  yRange: Array<any>;
  selectedX: number;
  mouseTimer: ?number;
  focusedSeriesIndex: number;
  margin: {top: number, right: number, bottom: number, left: number};
  width: number;
  height: number;
  plotWidth: number;
  xEndEdge: number;
  xBegEdge: number;
  svg: Object;
  layerGroup: Object;

  // TODO(anton): These should be normal methods
  xPositionLine: Function;
  xPosition: Function;
  yPosition: Function;
  yPositionStacked: Function;
  yHeightStacked: Function;
  xBarWidth: Function;
  line: Function;

  constructor(pageController: PageController, chartIndex: number, $wrapper: Object, params: Object, data: PageData) {
    this.pageController = pageController
    this.$wrapper = $wrapper

    // create initial HTML
    var chartHtmlParameters = {
      editable: pageController.getEditability()
    }
    this.$wrapper.html(templates.chart(chartHtmlParameters))

    // cache elements
    this.$container = $wrapper.find('.chart').first()
    this.$plot = this.$container.find('.chart-plot').first()
    this.$xBeg = this.$container.find('.x-beginning')
    this.$xEnd = this.$container.find('.x-end')
    this.$selectionElem = this.$container.find('.selection')
    this.$selectionXLabel = this.$container.find('.selection-xlabel')
    this.$selectionYLabel = this.$container.find('.selection-ylabel')
    this.$yAxis = this.$container.find('.y-axis')
    this.$zeroLine = this.$container.find('.zero-line')
    this.$selectionValue = this.$container.find('.selection-value')
    this.$optionsElem = this.$container.find('.chart-options')
    this.$pageSettings = $('.page-settings')
    this.$chartDescription = this.$container.find('.chart-description')

    // refresh chart and bind interactions
    this.refresh(chartIndex, params, data)
    this.bindInteractions()
  }

  refresh(chartIndex: number, params: Object, data: PageData): void {
    this.chartIndex = chartIndex
    this.params = params
    this.data = new ChartData(data, this.params.series)
    this.legend = new ChartLegend(this.pageController, this.data, this)

    this.setupChart()
    this.render()
  }

  setupChart(): void {
    // Clear any existing plot
    this.$plot.empty()

    // Update chart UI
    EDITABLES.forEach((item) => {
      this.$container.find('.' + camelToHyphen(item)).text(this.params[item])
      this.updateEditablePlaceholder(item)
    })

    this.$xBeg.html(this.data.getIndexExtent()[0])
    this.$xEnd.html(this.data.getIndexExtent()[1])

    this.setScales()
    this.createChartElements()
  }

  setScales(): void {
    // set x- and y-axis scales and position functions
    this.xScale = d3.scale.linear().domain([0, this.data.getIndexCount()])

    this.xPosition = (d) => Math.floor(this.xScale(d.x), 0)
    this.xBarWidth = (d) => {
      // have a pixel space when columns are at least 8px wide
      var space = this.plotWidth / this.data.getIndexCount() >= 8 ? 1 : 0
      var nextXScale = d.x + 1 < this.data.getIndexCount() ? this.xScale(d.x + 1) : this.plotWidth
      return Math.floor(nextXScale, 0) - this.xPosition(d) - space
    }

    this.xPositionLine = (d) => {
      return this.xPosition(d) + 0.5 * this.xBarWidth(this.data.getDatum(0, d.x))
    }

    this.yScale = d3.scale.linear()
    this.yPosition = (d) => this.yScale(d.y)
    this.yPositionStacked = (d) => this.yScale(d.y1)
    this.yHeightStacked = (d) => d.y === 0 ? 0 : this.yScale(d.y0) - this.yScale(d.y1) + 1

    // set stacked and unstacked y ranges
    this.yRangeStacked = this.data.getStackedExtent()
    this.yRangeUnstacked = this.data.getUnstackedExtent()

    // set color scales
    this.colorLight = '#333333'
    this.colorDark = '#FFFFFF'
    this.colorRange = ['#6DCC73', '#1D7775', '#4FCFD5', '#FCE651', '#FF7050', '#FFC050', '#999999']
  }

  createChartElements(): void {
    this.svg = d3.select(this.$plot.get(0)).append('svg')
    this.line = d3.svg.line()
      .interpolate('cardinal')
      .tension(0.96)
      .x(this.xPositionLine)
      .y(this.yPosition)
    this.layerGroup = this.svg.append('g')
      .attr('class', 'layers')
    this.layers = this.layerGroup.selectAll('g')
      .data(this.data.getSeriesIndices())
      .enter().append('g')
      .attr('class', 'layer')

    var _this = this
    this.layers.each(function (seriesIndex, i) {
      var layer = d3.select(this)
      layer.append('path')
        .attr('class', 'line')
        .each(function () {
          _this.data.getSeries(i).lineEl = this
        })
      layer.selectAll('rect')
        .data(_this.data.getValuesForSeries(i))
        .enter().append('rect')
        .attr('class', 'column')
        .each(function (d) {
          _this.data.getDatum(i, d.x).columnEl = this
        })
      layer.append('circle')
        .attr('class', 'end-dot last-dot')
        .attr('r', 3)
      layer.append('circle')
        .attr('class', 'end-dot first-dot')
        .attr('r', 3)
      layer.append('circle')
        .attr('class', 'selected-dot')
        .attr('r', 4)
    })
  }

  updateSizes(): void {
    this.margin = {top: 4, right: 4, bottom: 0, left: 0}
    this.width = this.$plot.width()
    this.plotWidth = this.width - this.margin.right - this.margin.left
    this.height = this.$plot.height()
    this.svg.attr('width', this.width).attr('height', this.height)
    this.xScale.range([this.margin.left, (this.width - this.margin.right - this.margin.left)])
    this.yScale.range([this.height - this.margin.bottom, this.margin.top])
    this.xEndEdge = this.$xEnd.offset().left - this.$plot.offset().left
    this.xBegEdge = this.$xBeg.offset().left - this.$plot.offset().left + this.$xBeg.width()
  }

  render(): void {
    this.updateSizes()

    // apply general rounding and background color
    if (this.params.rounding === 'off') {
      this.$container.addClass('rounding-off')
    } else {
      this.$container.removeClass('rounding-off')
    }

    // go to last point and refresh chart
    this.selectedX = this.data.getIndexCount() - 1
    this.applyChartColors()
    this.applyChartType()
    this.updateYAxis()
    this.plotAll()
    this.updateSelectedX()
    this.legend.update()
  }

  getDefaulSeriesColor(seriesIndex: number): string {
    var seriesIndicies = this.data.getSeriesIndices()
    if (seriesIndicies.length === 1) {
      return this.pageController.params.isLight() ? this.colorLight : this.colorDark
    }

    var chartSeriesIndex = seriesIndicies.indexOf(seriesIndex)
    var colorCount = this.colorRange.length
    var seriesColorIndex = chartSeriesIndex % colorCount

    return this.colorRange[seriesColorIndex]
  }

  getSeriesColor(seriesIndex: number): string {
    return this.pageController.params.getSeriesColor(seriesIndex) || this.getDefaulSeriesColor(seriesIndex)
  }

  applyChartColors(): void {
    var _this = this
    this.layers.each(function (seriesIndex) {
      var layer = d3.select(this)
      layer.selectAll('.line')
        .attr('stroke', _this.getSeriesColor(seriesIndex))
      layer.selectAll('.column, .selected-column, .selected-dot, .end-dot')
        .attr('fill', _this.getSeriesColor(seriesIndex))
    })
  }

  applyChartType() : void{
    if (this.params.type === 'column') {
      this.$container.addClass('show-columns')
      this.yRange = this.yRangeStacked
      this.focusedSeriesIndex = this.data.getSeriesCount()
    } else {
      this.$container.removeClass('show-columns')
      this.yRange = this.yRangeUnstacked

      // focus the series with the max value at the selected point
      var dataAtLastIndex = this.data.getUnstackedValuesAtIndex(this.selectedX)
      this.focusedSeriesIndex = dataAtLastIndex.indexOf(d3.max(dataAtLastIndex)) // TODO
    }

    // yScale range should always include 0, abd add 10% margin for negatives; TODO: make margin pixel based
    var adjustExtent = function (extent) {
      var min = extent[0] < 0 ? extent[0] * 1.1 : 0
      return [min, Math.max(0, extent[1])]
    }
    this.yScale.domain(adjustExtent(this.yRange))
  }

  plotAll(): void {
    var _this = this
    this.layers.each(function (seriesIndex, i) {
      var layer = d3.select(this)
      layer.selectAll('.column')
        .attr('x', _this.xPosition)
        .attr('y', _this.yPositionStacked)
        .attr('height', _this.yHeightStacked)
        .attr('width', _this.xBarWidth)
      layer.selectAll('.line')
        .attr('d', _this.line(_this.data.getValuesForSeries(i)))

      // plot the dot at the last point
      var firstPoint = _this.data.getFirstDatum(i)
      var lastPoint = _this.data.getLastDatum(i)
      layer.selectAll('.last-dot')
        .attr('cx', _this.xPositionLine(lastPoint))
        .attr('cy', _this.yPosition(lastPoint))
      layer.selectAll('.first-dot')
        .attr('cx', _this.xPositionLine(firstPoint))
        .attr('cy', _this.yPosition(firstPoint))
    })
  }

  updateYAxis(): void {
    // apply Y axis labels
    var HTML = ''
    var intervals = getNiceIntervals(this.yRange, this.height)
    var maxTop = this.$yAxis.height() - this.$container.height() + 60 // must be 60px below the top
    intervals.forEach((interval) => {
      interval.top = this.yScale(interval.value)
      if (interval.top >= maxTop) {
        interval.display = this.params.rounding === 'on' ? interval.displayString : interval.rawString
        HTML += templates.yAxisLabel(interval)
      }
    })
    this.$yAxis.html(HTML)

    // update zero line position
    this.$zeroLine.removeClass('hidden').css('top', this.yScale(0))
  }

  updateSelectedX(index: ?number): void {
    if (index != undefined) {
      this.selectedX = index
    }

    var thisXPosition = this.xPosition(this.data.getDatum(0, this.selectedX))
    var adjust = 0.5 * this.xBarWidth(this.data.getDatum(0, this.selectedX))
    var selectionLeft = thisXPosition + adjust

    // move selection
    this.$selectionElem.css('left', selectionLeft)

    var beg = selectionLeft
    var end = selectionLeft + this.$selectionXLabel.width()

    if (selectionLeft < (this.width / 2)) {
      this.$selectionElem.addClass('on-right')
    } else {
      this.$selectionElem.removeClass('on-right')
      beg = selectionLeft - this.$selectionXLabel.width()
      end = selectionLeft
    }

    // hide x-axis labels if necessary
    if (beg <= this.xBegEdge) {
      this.$xBeg.addClass('hidden')
    } else {
      this.$xBeg.removeClass('hidden')
    }

    if (end >= this.xEndEdge) {
      this.$xEnd.addClass('hidden')
    } else {
      this.$xEnd.removeClass('hidden')
    }

    // move selected dots
    var _this = this
    this.layers.each(function (seriesIndex, i) {
      var seriesExtent = _this.data.getSeriesExtent(i)
      if (_this.selectedX >= seriesExtent[0] && _this.selectedX <= seriesExtent[1]) {
        d3.select(this).selectAll('.selected-dot')
          .attr('cx', _this.xPositionLine(_this.data.getDatum(i, _this.selectedX)))
          .attr('cy', _this.yPosition(_this.data.getDatum(i, _this.selectedX)))
          .style({'opacity': '1'})
      } else {
        d3.select(this).selectAll('.selected-dot').style({'opacity': '0'})
      }
    })

    // add selected class to the appropriate columns
    var columns = this.data.getIndexCount()
    for (var i = 0; i < columns; i++) {
      var columnClass = 'column'
      if (_this.selectedX === i) {
        columnClass = 'column selected'
      }

      for (var j = 0; j < _this.data.getSeriesCount(); j++) {
        let el = _this.data.getDatum(j, i).columnEl
        if (el) {
          d3.select(el).attr('class', columnClass)
        }
      }
    }

    this.updateSelectionText()
  }

  updateSelectionText(): void {
    // a focusedSeriesIndex >= to the ySeries length means use the total
    var showTotal = this.focusedSeriesIndex >= this.data.getSeriesCount()
    var chartYSeries = showTotal ? this.data.getSeriesCount() - 1 : this.focusedSeriesIndex
    var thisPoint = this.data.getDatum(chartYSeries, this.selectedX)

    var thisYLabel = ''
    var thisYColor = this.pageController.params.isLight() ? this.colorLight : this.colorDark

    if (!showTotal) {
      if (thisPoint.ySeries != null) {
        thisYColor = this.getSeriesColor(this.data.getSeries(thisPoint.ySeries).seriesIndex)
      }
    }

    if (this.data.getSeriesCount() > 1) {
      var pageYSeries = this.getChartSeries()[chartYSeries]
      thisYLabel = showTotal ? 'total' : this.pageController.getSeriesName(pageYSeries)
    }

    var seriesExtent = this.data.getStackedExtentForIndex(this.selectedX)
    var seriesTotal = seriesExtent[1] + seriesExtent[0]
    var thisValue = showTotal ? seriesTotal : stringToNumber(thisPoint.yRaw)
    var thisValueFormatted = this.params.rounding === 'on' ? getRoundedValue(thisValue, this.yRange) : thisValue

    // update selection
    this.$selectionYLabel.text(thisYLabel).css('color', thisYColor)
    this.$selectionXLabel.text(thisPoint.xLabel)
    this.$selectionValue.text(thisValueFormatted).css('color', thisYColor)
  }

  bindInteractions(): void {
    // chart option toggles
    Object.keys(OPTIONS).forEach((option) => {
      this.$container.find('.toggle-' + option).click((event) => {
        event.preventDefault()
        var options = OPTIONS[option]
        this.params[option] = this.params[option] === options[0] ? options[1] : options[0]
        this.render()
        this.pageController.updatePageState()
      })
    })

    // chart editables
    EDITABLES.forEach((item) => {
      var $elem = this.$container.find('.' + camelToHyphen(item))
      $elem.on('focusout', () => {
        if ($elem.text() === '' && item === 'title') {
          this.params[item] = this.pageController.getDefaultTitle(this.chartIndex)
          $elem.text(this.params[item])
        } else {
          this.params[item] = $elem.text()
          this.updateEditablePlaceholder(item)
        }
        this.pageController.updatePageState()
      })
    })

    // handle mouseover
    this.$container.mousemove((pixel) => this.handleMouseover(pixel))
  }

  handleMouseover(pixel: Object): void {
    // show the options
    this.$container.addClass('active')
    $('body').addClass('page-active')

    if (this.mouseTimer) {
      clearTimeout(this.mouseTimer)
      this.mouseTimer = null
    }

    this.mouseTimer = setTimeout(() => {
      if (this.$optionsElem.length && this.$optionsElem.is(':hover')) {
        return
      }

      if (this.$chartDescription.length && this.$chartDescription.is(':hover')) {
        return
      }

      if (this.$pageSettings.length && this.$pageSettings.is(':hover')) {
        return
      }

      this.$container.removeClass('active')
      $('body').removeClass('page-active')
      this.$pageSettings.removeClass('open')
    }, 1000)

    // don't change the selection if mouseover is below the plot
    if (pixel.pageY - this.$plot.offset().top > this.$plot.height()) return

    // update everything if the selextedX or focusedSeriesIndex is different
    var closestPoint = this.getClosestPoint(pixel)
    if (closestPoint.selectedX !== this.selectedX || closestPoint.focusedSeriesIndex !== this.focusedSeriesIndex) {
      this.selectedX = closestPoint.selectedX
      this.focusedSeriesIndex = closestPoint.focusedSeriesIndex
      this.updatefocusedSeriesIndex()
      this.pageController.updateSelectedX(this.selectedX)
    }
  }

  getClosestPoint(pixel: Object): {selectedX: number, focusedSeriesIndex: number} {
    var pixelX = (pixel.pageX - this.$plot.offset().left) * this.data.getIndexCount() / (this.width - this.margin.right)
    var pixelY = pixel.pageY - this.$plot.offset().top
    var currentX = Math.min(Math.floor(Math.max(pixelX, 0)), this.data.getIndexCount() - 1)
    var currentY = this.focusedSeriesIndex

    // determine the closest y series
    var diffs = d3.range(this.data.getSeriesCount()).map((i) => {
      var thisDatum = this.data.getDatum(i, currentX)
      var indexPixelY = this.params.type === 'line' ? this.yPosition(thisDatum) : this.yPositionStacked(thisDatum)
      var diff = this.params.type === 'line' ? Math.abs(pixelY - indexPixelY) : pixelY - indexPixelY
      var isValid = (this.params.type === 'line' || diff > 0)
      return {diff: diff, series: i, isValid: isValid}
    })

    currentY = _.min(diffs.filter((diff) => diff.isValid), 'diff').series

    // use the total if it's a column chart and the mouse position it
    if (this.params.type === 'column') {
      // determine if position is over a y series stack, else show the total
      var yValueExtent = this.data.getStackedExtentForIndex(currentX)
      var yPixelExtent = [this.yScale(yValueExtent[0]), this.yScale(yValueExtent[1])]
      if (pixelY <= yPixelExtent[1] || pixelY > yPixelExtent[0]) {
        currentY = this.data.getSeriesCount()
      }
    }

    return {selectedX: currentX, focusedSeriesIndex: currentY}
  }

  updatefocusedSeriesIndex(): void {
    if (this.params.type === 'line') {
      this.$container.find('.line').attr('class', 'line')
      var selectedLine = d3.select(this.data.getSeries(this.focusedSeriesIndex).lineEl)
      selectedLine.attr('class', 'line focused')
      d3.select(selectedLine.node().parentNode).each(function () {
        this.parentNode.appendChild(this)
      })
    }
  }

  updateEditablePlaceholder(item: string): void {
    if (!this.params[item] || this.params[item] === '') {
      this.$container.find('.' + camelToHyphen(item)).addClass('empty')
    } else {
      this.$container.find('.' + camelToHyphen(item)).removeClass('empty')
    }
  }

  getChartIndex(): number {
    return this.chartIndex
  }

  getChartContainer(): Object {
    return this.$container
  }

  getChartSeries(): Array<any> {
    return this.params.series
  }
}
