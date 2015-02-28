/*jshint node:true */
var charted = require('./lib/charted.js')
var express = require('express')
var app = express()

charted(app, '/')

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address
  var port = server.address().port

  console.log('Running at http://%s:%s', host, port)
})
