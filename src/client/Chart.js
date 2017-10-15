/* @flow */

import Actions from "./Actions"
import ChartData from "./ChartData"
import ChartLegend from "./ChartLegend"
import {stringToNumber, camelToHyphen, getNiceIntervals, getRoundedValue} from "../shared/utils"
import {OPTIONS, PageController} from "./PageController"
import PageData from "./PageData"
import Editor from "./Editor"
import * as templates from "./templates"
import dom from "./dom"

export default class Chart {
  actions: Actions;
  pageController: PageController;
  titleEditor: Editor;
  noteEditor: Editor;

  wrapper: Element;
  container: Element;
  plot: Element;
  xBeg: Element;
  xEnd: Element;
  selectionElem: Element;
  selectionXLabel: Element;
  selectionYLabel: Element;
  yAxis: Element;
  zeroLine: Element;
  selectionValue: Element;

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

  constructor(pageController: PageController, chartIndex: number, wrapper: Element, params: Object, data: PageData) {
    this.pageController = pageController
    this.wrapper = wrapper

    // Create initial HTML
    var chartHtmlParameters = {
      editable: pageController.getEditability()
    }

    this.wrapper.innerHTML = templates.chart(chartHtmlParameters)
    this.container = dom.assert(dom.get('js-chart', this.wrapper))

    // Cache elements
    this.plot = dom.assert(dom.get('js-chartPlot', this.container))
    this.xBeg = dom.assert(dom.get('js-xBeg', this.container))
    this.xEnd = dom.assert(dom.get('js-xEnd', this.container))
    this.selectionElem = dom.assert(dom.get('js-selection', this.container))
    this.selectionXLabel = dom.assert(dom.get('js-selectionXLabel', this.container))
    this.selectionYLabel = dom.assert(dom.get('js-selectionYLabel', this.container))
    this.selectionValue = dom.assert(dom.get('js-selectionValue', this.container))
    this.yAxis = dom.assert(dom.get('js-yAxis', this.container))
    this.zeroLine = dom.assert(dom.get('js-zeroLine', this.container))

    let chartTitle = dom.assert(dom.get('js-chartTitle', this.container))
    this.titleEditor = new Editor(chartTitle)
    this.titleEditor.onChange((content) => {
      if (!content) {
        this.params.title = this.pageController.getDefaultTitle(this.chartIndex)
        this.titleEditor.setContent(this.params.title)
        return
      }

      this.params.title = content
      this.pageController.updateURL()
    })

    let chartNote = dom.assert(dom.get('js-chartNote', this.container))
    this.noteEditor = new Editor(chartNote)
    this.noteEditor.onChange((content) => {
      this.params.note = content
      this.pageController.updateURL()
    })

    // refresh chart and bind interactions
    this.refresh(chartIndex, params, data)
    this.actions = new Actions(this.container)
    this.bindInteractions()
  }

  activate() {
    this.actions
      .add('toggle-type', this.toggleType, this)
      .add('toggle-rounding', this.toggleRounding, this)
      .activate()
  }

  deactivate() {
    this.actions.deactivate()
    delete this.actions
  }

  refresh(chartIndex: number, params: Object, data: PageData): void {
    this.chartIndex = chartIndex
    this.params = params
    this.data = new ChartData(data, this.params.series)

    if (this.legend) {
      this.legend.deactivate()
    }

    this.legend = new ChartLegend(this.pageController, this.data, this)
    this.legend.activate()

    this.setupChart()
    this.render()
  }

  setupChart(): void {
    // Clear any existing plot
    this.plot.innerHTML = ''

    // Update chart UI
    this.titleEditor.setContent(this.params.title)
    this.noteEditor.setContent(this.params.note)

    this.xBeg.innerHTML = this.data.getIndexExtent()[0]
    this.xEnd.innerHTML = this.data.getIndexExtent()[1]

    this.setScales()
    this.createChartElements()
  }

  setScales(): void {
    // set x- and y-axis scales and position functions
    this.xScale = d3.scale.linear().domain([0, this.data.getIndexCount()])

    this.xPosition = (d) => Math.floor(this.xScale(d.x))
    this.xBarWidth = (d) => {
      // have a pixel space when columns are at least 8px wide
      var space = this.plotWidth / this.data.getIndexCount() >= 8 ? 1 : 0
      var nextXScale = d.x + 1 < this.data.getIndexCount() ? this.xScale(d.x + 1) : this.plotWidth
      return Math.floor(nextXScale) - this.xPosition(d) - space
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
    this.svg = d3.select(this.plot).append('svg')
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
    let plotRect = dom.rect(this.plot)
    let xBegRect = dom.rect(this.xBeg)

    this.margin = {top: 4, right: 4, bottom: 0, left: 0}
    this.width = plotRect.width
    this.plotWidth = this.width - this.margin.right - this.margin.left
    this.height = plotRect.height
    this.svg.attr('width', this.width).attr('height', this.height)
    this.xScale.range([this.margin.left, (this.width - this.margin.right - this.margin.left)])
    this.yScale.range([this.height - this.margin.bottom, this.margin.top])
    this.xEndEdge = dom.rect(this.xEnd).left - plotRect.left
    this.xBegEdge = xBegRect.left - plotRect.left + xBegRect.width
  }

  render(): void {
    this.updateSizes()

    // apply general rounding and background color
    dom.classlist.enable(this.container, 'rounding-off', this.params.rounding === 'off')

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
    dom.classlist.enable(this.container, 'show-columns', this.params.type === 'column')
    if (this.params.type === 'column') {
      this.yRange = this.yRangeStacked
      this.focusedSeriesIndex = this.data.getSeriesCount()
    } else {
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
    let HTML = ''
    let intervals = getNiceIntervals(this.yRange, this.height)
    let maxTop = dom.rect(this.yAxis).height - dom.rect(this.container).height + 60 // must be 60px below the top
    intervals.forEach((interval) => {
      interval.top = this.yScale(interval.value)
      if (interval.top >= maxTop) {
        interval.display = this.params.rounding === 'on' ? interval.displayString : interval.rawString
        HTML += templates.yAxisLabel(interval)
      }
    })

    this.yAxis.innerHTML = HTML

    // update zero line position
    dom.classlist.remove(this.zeroLine, 'hidden')

    let zeroLine = this.zeroLine
    if (zeroLine instanceof HTMLElement) {
      zeroLine.style.top = `${this.yScale(0)}px`
    }
  }

  updateSelectedX(index: ?number): void {
    if (index != undefined) {
      this.selectedX = index
    }

    var thisXPosition = this.xPosition(this.data.getDatum(0, this.selectedX))
    var adjust = 0.5 * this.xBarWidth(this.data.getDatum(0, this.selectedX))
    var selectionLeft = thisXPosition + adjust

    // move selection
    let selectionElem = this.selectionElem
    if (selectionElem instanceof HTMLElement) {
      selectionElem.style.left = `${selectionLeft}px`
    }

    let xLabelRect = dom.rect(this.selectionXLabel)
    let beg = selectionLeft
    let end = selectionLeft + xLabelRect.width

    let onRight = selectionLeft < (this.width / 2)
    dom.classlist.enable(this.selectionElem, 'on-right', onRight)
    if (!onRight) {
      beg = selectionLeft - xLabelRect.width
      end = selectionLeft
    }

    // hide x-axis labels if necessary
    dom.classlist.enable(this.xBeg, 'hidden', beg <= this.xBegEdge)
    dom.classlist.enable(this.xEnd, 'hidden', end >= this.xEndEdge)

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
    this.selectionYLabel.innerHTML = thisYLabel
    this.selectionXLabel.innerHTML = thisPoint.xLabel
    this.selectionValue.innerHTML = String(thisValueFormatted)

    let label = this.selectionYLabel
    if (label instanceof HTMLElement) {
      label.style.color = thisYColor
    }

    let value = this.selectionValue
    if (value instanceof HTMLElement) {
      value.style.color = thisYColor
    }
  }

  bindInteractions(): void {
    this.container.addEventListener('mousemove', this.handleMousemove.bind(this))
  }

  toggleType() {
    let options = OPTIONS.type
    this.params.type = this.params.type === options[0] ? options[1] : options[0]
    this.render()
    this.pageController.updateURL()
  }

  toggleRounding() {
    let options = OPTIONS.rounding
    this.params.rounding = this.params.rounding === options[0] ? options[1] : options[0]
    this.render()
    this.pageController.updateURL()
  }

  handleMousemove(ev: MouseEvent): void {
    // Show the options
    dom.classlist.add(this.container, 'active')
    dom.classlist.add(document.body, 'page-active')

    // don't change the selection if mouseover is below the plot
    let plotRect = dom.rect(this.plot)
    if (ev.clientY - plotRect.top > plotRect.height) return

    // update everything if the selextedX or focusedSeriesIndex is different
    var closestPoint = this.getClosestPoint(ev)
    if (closestPoint.selectedX !== this.selectedX || closestPoint.focusedSeriesIndex !== this.focusedSeriesIndex) {
      this.selectedX = closestPoint.selectedX
      this.focusedSeriesIndex = closestPoint.focusedSeriesIndex
      this.updatefocusedSeriesIndex()
      this.pageController.updateSelectedX(this.selectedX)
    }
  }

  getClosestPoint(ev: MouseEvent): {selectedX: number, focusedSeriesIndex: number} {
    let plotRect = dom.rect(this.plot)
    var pixelX = (ev.clientX - plotRect.left) * this.data.getIndexCount() / (this.width - this.margin.right)
    var pixelY = ev.clientY - plotRect.top
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

    diffs = diffs.filter((diff) => diff.isValid)
    diffs.sort((a, b) => d3.ascending(a.diff, b.diff))
    currentY = diffs.length ? diffs[0].series : 0

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
      let lines = dom.queryAll('.line', this.container)
      lines.forEach((line) => line.className = 'line')

      var selectedLine = d3.select(this.data.getSeries(this.focusedSeriesIndex).lineEl)
      selectedLine.attr('class', 'line focused')
      d3.select(selectedLine.node().parentNode).each(function () {
        this.parentNode.appendChild(this)
      })
    }
  }

  getChartIndex() {
    return this.chartIndex
  }

  getChartSeries(): Array<any> {
    return this.params.series
  }
}
