/* @flow */

"use strict"

import url from "url"
import path from "path"
import request from "request"
import express from "express"
import bodyParser from "body-parser"
import prepare from "./prepare"
import sha1 from "../shared/sha1"
import * as utils from "../shared/utils"

export default class ChartedServer {
  staticRoot: string;
  store: any;

  static start(port: number, staticRoot: string) {
    return new Promise((resolve) => {
      let app = express()
      let charted = new ChartedServer({}, staticRoot)

      app.use(bodyParser.json())
      app.use(express.static(staticRoot))
      app.get('/c/:id', (req, res) => charted.getChart(req, res))
      app.post('/c/:id', (req, res) => charted.saveChart(req, res))
      app.get('/load', (req, res) => charted.loadChart(req, res))

      let server = app.listen(port, () => resolve(server.address()))
    })
  }

  constructor(store: any, staticRoot: string) {
    this.store = store
    this.staticRoot = staticRoot
  }

  getChart(req: any, res: any) {
    let params = this.store[req.params.id]
    if (!params) {
      this.notFound(res, `chart ${req.params.id} was not found.`)
      return
    }

    this.respondWithHTML(res, 'index.html')
  }

  loadChart(req: any, res: any) {
    if (req.query.url) {
      let parsed = url.parse(req.query.url, true)
      let chartUrl = url.format(prepare(parsed))
      let params = {dataUrl: chartUrl}
      // Save in the “database”
      this.store[utils.getChartId(params)] = params
      this.respondWithChart(res, params)
      return
    }

    if (req.query.id) {
      let params = this.store[req.query.id]
      if (!params) {
        this.notFound(res, `chart ${req.query.id} was not found.`)
      }
      this.respondWithChart(res, params)
      return
    }


    this.badRequest(res, 'either url or id is required')
    return
  }

  saveChart(req: any, res: any) {
    let id = req.params.id
    if (utils.getChartId(req.body) != id) {
      this.badRequest(res, 'id and params are out of sync.')
      return
    }

    this.store[id] = req.body
  }

  respondWithHTML(res: any, template: string) {
    res.statusCode = 200
    res.sendFile(path.join(this.staticRoot, template))
  }

  respondWithChart(res: any, params: t_CHART_PARAM) {
    request(params.dataUrl, (err, resp, body) => {
      if (err) {
        this.badRequest(res, err)
        return
      }

      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.end(JSON.stringify({params: params, data: body}))
    })
  }

  notFound(res: any, message: string) {
    res.statusCode = 404
    res.end(`Not Found: ${message}`)
  }

  badRequest(res: any, message: string) {
    res.statusCode = 400
    res.end(`Bad Request: ${message}`)
  }
}
