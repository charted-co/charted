"use strict"

import charted from "./charted.js"
import express from "express"

const app = express()

charted(app, '/')

var server = app.listen(process.env.PORT || 3000, function () {
  let host = server.address().address
  let port = server.address().port

  console.log('Running at http://%s:%s', host, port)
})
