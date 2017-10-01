/* @flow */

export {
  pageSettings,
  embedOverlay,
  gridSettingsFull,
  gridSettingsSplit,
  yAxisLabel,
  chart,
  changeSeriesColor,
  legendItem,
  moveChart
}

function pageSettings(): string {
  return `
    <div class="page-settings js-settings">
      <button class="option-item settings" data-click="open-settings" title="Settings">
        <span class="icon icon-settings"></span>
      </button>

      <div class="settings-popover popover">
        <div class="page-options">
          <a class="page-option-item js-downloadDataLink" title="Download data">
            <span class="icon icon-download"></span>Download data
          </a>

          <button class="page-option-item toggle-color" data-click="toggle-color" title="Switch background color">
            <span class="icon icon-color"></span>Switch background
          </button>

          <div class="js-gridOption"></div>

          <button class="page-option-item" data-click="get-embed" title="Get embed code">
            <span class="icon icon-embed"></span>Get embed code
          </button>

          <div class="page-data-source">
            <label>Update data source</label>
            <div class="page-data-source-form">
              <input class="js-dataSourceUrl">
              <button data-click="update-data-source">Go</button>
            </div>
          </div>
        </div>

        <a href="/" class="page-option-item">
          <span class="icon icon-back"></span>Charted home
        </a>
      </div>
    </div>
  `
}

function embedOverlay(chartId: string): string {
  var script = `<script src="${window.location.origin}/embed.js" data-charted="${chartId}"></script>`

  return `
    <div class="overlay-container js-embedPopup">
      <div class="overlay-content">
        <h1 class="overlay-title">Embed this Charted page</h1>
        <p class="overlay-description">
          You can add this embed to your website by copying and pasting the HTML code below.
        </p>

        <textarea class="embed-link">${script}</textarea>
        <div class="iframe-container">${script}</div>
      </div>
      <div class="overlay-close" data-click="close-embed"><span class="icon icon-x"></span></div>
    </div>
  `
}

function gridSettingsFull(): string {
  return `
    <button class="page-option-item" data-click="toggle-grid" title="Show full width charts">
      <span class="icon icon-full-screen"></span>Show full width charts
    </button>
  `
}

function gridSettingsSplit(): string {
  return `
    <button class="page-option-item" data-click="toggle-grid" title="Show split-screen charts">
      <span class="icon icon-split-screen"></span>Show split-screen charts
    </button>
  `
}

function yAxisLabel(interval: {top: string, display: string}): string {
  return `
    <div class="y-axis-label" style="top:${interval.top}px">${interval.display}</div>
  `
}

function chart(params: {editable: boolean}): string {
  var editableAttribute = ''
  var editableButtons = ''

  if (params.editable) {
    editableAttribute = 'contenteditable="true"'
    editableButtons = `
      <div class="chart-options js-chartOptions">
        <a class="option-item toggle-type" data-click="toggle-type" href="#" title="Switch chart type">
          <span class="icon icon-line"></span>
          <span class="icon icon-column"></span>
        </a>

        <a class="option-item toggle-rounding" data-click="toggle-rounding" href="#" title="Turn rounding on/off">
          <span class="icon icon-round-off"></span>
          <span class="icon icon-round-on"></span>
        </a>
      </div>
    `
  }

  return `
    <div class="chart js-chart show-columns">
      <div class="chart-description js-chartDescription">
        <h1 class="js-chartTitle title info-input" ${editableAttribute}></h1>
        <div class="js-chartNote note info-input" ${editableAttribute}></div>
      </div>

      <div class="chart-plot-outer-container">
        <div class="chart-plot-inner-container">
          <div class="y-axis-container"><div class="y-axis js-yAxis chart-height"></div></div>
          <div class="zero-line-container chart-height"><div class="zero-line js-zeroLine"></div></div>
          <div class="x-axis"><span class="js-xBeg x-beginning"></span><span class="js-xEnd x-end"></span></div>
          <div class="selection js-selection">
            <div class="selection-info">
              <div class="selection-value js-selectionValue"></div>
              <div class="selection-xlabel js-selectionXLabel"></div>
              <div class="selection-ylabel js-selectionYLabel"></div>
            </div>
          </div>
          <figure class="chart-plot chart-height js-chartPlot"></figure>
        </div>
      </div>

      <aside class="chart-info">
        <ul class="legend js-legend hidden"></ul>
        ${editableButtons}
      </aside>
    </div>
  `
}

function changeSeriesColor(params: {seriesIndex: number, colorHex: string}): string {
  return `
    <div class="change-series-color popover js-changeSeriesColor">
      <p>Change color:</p>
      <p>
        <span contenteditable="true" class="color-hex-input js-colorEditor">${params.colorHex}</span>
      </p>
      <span class="arrow-bottom-left"></span>
    </div>
  `
}

function legendItem(label: {editable: boolean, label: string, color: string, seriesIndex: number}): string {
  var editableAttribute = ''
  var editableButtons = ''

  if (label.editable) {
    editableAttribute = 'contenteditable="true"'
    editableButtons = `
      <button class="move-chart" data-click="open-move-chart" data-series-index="${label.seriesIndex}">
        <span class="icon icon-move"></span>
      </button>`
  }

  return `
    <li class="legend-item js-legendItem" data-series-index="${label.seriesIndex}">
      <div class="legend-label info-input">
        <span class="legend-input js-legendLabel" ${editableAttribute}>${label.label}</span>
      </div>
      <button class="legend-color" data-click="open-color-input" data-series-index="${label.seriesIndex}">
        <span style="background-color:${label.color};" class="legend-dot"></span>
      </button>
      ${editableButtons}
    </li>
  `
}

function moveChart(params: {otherCharts: Array<any>, series: Array<any>, newChartIndex: number, position: number}): string {
  var chartList = params.otherCharts.map(function (chart) {
    return `
      <a href= "#" class="move-chart-option" data-click="move-to-chart" data-dest="${chart.chartIndex}" data-position="${params.position}">
        ${chart.title}
      </a>
    `
  }).join('\n')

  var newChartButton = ''
  if (params.series.length > 1) {
    newChartButton = `
      <a href= "#" class="move-chart-option u-paddingLeft30" data-click="move-to-chart" data-dest="${params.newChartIndex}" data-position="${params.position}">
        <span class="icon icon-plus"></span>New chart
      </a>
    `
  }

  return `
    <div class="move-chart-options popover js-moveChartOptions">
      <p>Move to:</p>
      ${chartList}
      ${newChartButton}
      <span class="arrow-bottom-right"></span>
    </div>
  `
}
