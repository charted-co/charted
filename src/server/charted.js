/* @flow weak */

"use strict"

import url from "url"
import path from "path"
import request from "request"
import serveStatic from "serve-static"
import prepare from "./prepare.js"

function fetchData(req, res) {
  var dataUrl = getDataUrl(req)

  if (!dataUrl) {
    res.statusCode = 400
    res.end('Bad Request: no url provided')
    return
  }

  var defaults = {}
  // Pass the headers from the original request
  if (url.parse(dataUrl).host === req.headers.host) {
    defaults['headers'] = req.headers
  }

  var baseRequest = request.defaults(defaults)

  baseRequest(dataUrl, (err, resp, body) => {
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

  var parsed = url.parse(uri, true)
  if (parsed.host) { // url is already absolute
    return prepare(parsed).format()
  }

  return url.format({
    protocol: req.protocol || 'http',
    host: req.headers.host,
    pathname: parsed.pathname || '',
    search: parsed.search || '',
    hash: parsed.hash || ''
  })
}

export default function(app, root) {
  if (!root) {
    root = '/charted/'
  }

  app.use(root + 'get', fetchData)
  app.use(root, serveStatic(path.join(__dirname, '..', 'client')))
}
