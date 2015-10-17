/*jshint node:true, onevar:false, indent:4 */

var url = require('url')
var path = require('path')
var request = require('request')
var serveStatic = require('serve-static')

function fetchData(req, res) {
  var dataUrl = getDataUrl(req)

  if (!dataUrl) {
    res.statusCode = 400
    res.end('Bad Request: no url provided')
    return
  }

  request(dataUrl, function (err, resp, body) {
    if (err) {
      res.statusCode = 400
      res.end('Bad Request: ' + err)
      return
    }

    if (resp.statusCode != 200) {
      res.statusCode = 400
      res.end('Bad Request: response status code was not 200')
      return
    }

    res.setHeader('Content-Type', 'text/plain')
    res.statusCode = 200
    res.end(body)
  })
}

function getDataUrl(req) {
  var uri = url.parse(req.url, true)
  if (!uri.query) {
    return null
  }

  uri = uri.query.url
  if (!uri) {
    return null
  }

  var parsed = url.parse(uri)
  if (parsed.host) {
    return uri // url is already absolute
  }

  return url.format({
    protocol: req.protocol || 'http',
    host: req.headers.host,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash
  })
}

module.exports = function (app, root) {
  if (!root) {
    root = '/charted/'
  }

  app.use(root + 'get', fetchData)
  app.use(root, serveStatic(path.join(__dirname, '..', 'pub')))
}
