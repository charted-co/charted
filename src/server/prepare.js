/* @flow weak */

"use strict"

import url from "url"

function googledocs(uri) {
  // the gid is the specific sheet within the document
  var hash = uri.hash || ''
  var path = uri.pathname || ''
  var gid = hash.indexOf('gid=') > -1 ? hash.substring(hash.indexOf('gid=') + 4) : 0
  var doc = path.match(/^\/spreadsheets\/d\/(.*)\//)

  if (doc) doc = doc[1]
  else return uri // we couldn't extract document id

  uri.pathname = '/spreadsheets/d/' + doc + '/export'
  uri.query = uri.query || {}
  uri.query.gid = gid
  uri.query.format = 'csv'
  uri.hash = ''

  return uri
}

function dropbox(uri) {
  uri.query = uri.query || {}
  uri.query.raw = 1
  return uri
}

export default function(uri) {
  if (typeof uri == 'string') {
    uri = url.parse(uri, true)
  }

  if (uri.host == 'docs.google.com' && uri.pathname && uri.pathname.startsWith('/spreadsheets/d/')) {
    return googledocs(uri)
  }

  if (uri.host == 'dropbox.com' || uri.host == 'www.dropbox.com') {
    return dropbox(uri)
  }

  return uri
}
