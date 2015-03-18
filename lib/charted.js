/*jshint node:true, onevar:false, indent:4 */

var url = require('url')
var path = require('path')
var request = require('request')
var serveStatic = require('serve-static')

module.exports = function(app, charted_root) {
  if (charted_root === undefined) { charted_root = '/charted/' }

  app.use(charted_root + 'get', function (req, res, next) {
    var urlObj = url.parse(req.url, true)

    if (!urlObj.query.url) {
      res.statusCode = 400
      res.end('Bad Request: no url provided')
      return
    }

    var get_url = urlObj.query.url.match(/:\/\//) ? urlObj.query.url :
        ('http://' + req.headers.host + '/' +
         urlObj.query.url.replace(/^\//, ''))

    request(get_url, function (err, resp, body) {
      if (err) {
        res.statusCode = 400
        res.end('Bad Request: ' + err)

      } else if (resp.statusCode != 200) {
        res.statusCode = 400
        res.end('Bad Request: response status code was not 200')

      } else {
        res.setHeader('Content-Type', 'text/plain')
        res.statusCode = 200
        res.end(body)
      }
    })
  })

  app.use(charted_root, serveStatic(path.join(__dirname, '..', 'pub')))
}
