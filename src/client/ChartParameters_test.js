import ChartParameters from "./ChartParameters"

export function testDefaultParameters(test) {
  let params = new ChartParameters('http://charted.co/data.csv')
  test.equal(params.url, 'http://charted.co/data.csv')
  test.ok(params.isLight())
  test.ok(!params.isFull())
  test.equal(1, params.charts.length)
  test.done()
}

export function testFromQueryString(test) {
  // This is URL for our demo chart
  let qs =
    '?%7B"dataUrl"%3A"https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1PSaAXtklG4UyFm2' +
    'lui5d4k_UNEO1laAMpzMWVh0FMTU%2Fexport%3Fgid%3D0%26format%3Dcsv"%2C"charts"%3A%5B%7B"' +
    'title"%3A"An%20Example%20Chart"%2C"note"%3A"This%20is%20an%20example%20chart%20visua' +
    'lizing%20some%20fake%20data"%7D%5D%7D'

  let params = ChartParameters.fromQueryString(qs)
  test.equal(params.url, 'https://docs.google.com/spreadsheets/d/1PSaAXtklG4UyFm2lui5d4k_UNEO1laAMpzMWVh0FMTU/export?gid=0&format=csv')
  test.equal(1, params.charts.length)
  test.equal('This is an example chart visualizing some fake data', params.charts[0].note)
  test.equal('An Example Chart', params.charts[0].title)
  test.done()
}

export function testToggleColor(test) {
  let params = new ChartParameters('http://charted.co')
  test.ok(params.isLight())
  params.toggleColor()
  test.ok(!params.isLight())
  test.done()
}

export function testToggleGrid(test) {
  let params = new ChartParameters('http://charted.co')
  test.ok(!params.isFull())
  params.toggleGrid()
  test.ok(params.isFull())
  test.done()
}

export function testGetSeriesColor(test) {
  let params = new ChartParameters('http://charted.co')
  params.seriesColors[3] = '#fff'
  test.equal('#fff', params.getSeriesColor(3))
  test.done()
}

export function testGetSeriesName(test) {
  let params = new ChartParameters('http://charted.co')
  params.seriesNames[3] = 'test name'
  test.equal('test name', params.getSeriesName(3))
  test.done()
}

export function testCompressParams(test) {
  // We start with a completely empty instance and then gradually
  // add bits to it one by one.
  let params = new ChartParameters('http://charted.co')

  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co'
  })

  params.seriesNames[1] = 'test name'
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    seriesNames: {1: 'test name'}
  })

  params.seriesColors[1] = '#fff'
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    seriesNames: {1: 'test name'},
    seriesColors: {1: '#fff'}
  })

  params.toggleColor()
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    seriesNames: {1: 'test name'},
    seriesColors: {1: '#fff'},
    color: 'dark'
  })

  params.toggleGrid()
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    seriesNames: {1: 'test name'},
    seriesColors: {1: '#fff'},
    color: 'dark',
    grid: 'full'
  })

  params.charts = [{title: 'my title', note: 'my note'}]
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    seriesNames: {1: 'test name'},
    seriesColors: {1: '#fff'},
    color: 'dark',
    grid: 'full',
    charts: [{title: 'my title', note: 'my note'}]
  })

  params.charts = [
    {title: 'chart 1', type: 'column', rounding: 'on'},
    {title: 'chart 2', type: 'line', rounding: 'off', series: []}
  ]
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    seriesNames: {1: 'test name'},
    seriesColors: {1: '#fff'},
    color: 'dark',
    grid: 'full',
    charts: [
      {title: 'chart 1'},
      {title: 'chart 2', type: 'line', rounding: 'off', series: ''}
    ]
  })

  test.done()
}

export function testDefaultTitle(test) {
  // We start with a completely empty instance and then gradually
  // add bits to it one by one.
  let params = new ChartParameters('http://charted.co')
  params.withDefaultTitle((i) => `title ${i+1}`)
  params.charts = [
    {title: 'title 1'},
    {title: 'title 2'},
    {title: 'title X'}
  ]
  test.deepEqual(params.compress(), {
    dataUrl: 'http://charted.co',
    charts: [{}, {}, {title: 'title X'}]
  })

  test.done()
}
