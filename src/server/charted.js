/* @flow */

"use strict"

import url from "url"
import path from "path"
import request from "request"
import express from "express"
import bodyParser from "body-parser"
import prepare from "./prepare"
import FileDb from "./db.js"
import sha1 from "../shared/sha1"
import * as utils from "../shared/utils"

export default class ChartedServer {
  staticRoot: string;
  store: FileDb;

  static start(port: number, staticRoot: string, db: FileDb) {
    return new Promise((resolve) => {
      let app = express()
      let charted = new ChartedServer(db, staticRoot)

      app.use(bodyParser.json())
      app.use(express.static(staticRoot))
      app.get('/c/:id', (req, res) => charted.getChart(req, res))
      app.get('/embed/:id', (req, res) => charted.getChart(req, res))
      app.post('/c/:id', (req, res) => charted.saveChart(req, res))
      app.get('/load', (req, res) => charted.loadChart(req, res))
      app.get('/oembed', (req, res) => charted.getOembed(req, res))

      let server = app.listen(port, () => resolve(server.address()))
    })
  }

  constructor(store: FileDb, staticRoot: string) {
    this.store = store
    this.staticRoot = staticRoot
  }

  getChart(req: any, res: any) {
    this.store.get(req.params.id).then((params) => {
      if (!params) {
        this.notFound(res, `chart ${req.params.id} was not found.`)
        return
      }

      this.respondWithHTML(res, 'index.html')
    })
  }

  loadChart(req: any, res: any) {
    if (req.query.url) {
      let parsed = url.parse(req.query.url, /* parse query string */ true)
      let chartUrl = url.format(prepare(parsed))
      let params = {dataUrl: chartUrl}

      this.store.set(utils.getChartId(params), params)
        .then(() => this.respondWithChart(res, params))

      return
    }

    if (req.query.id) {
      this.store.get(req.query.id)
        .then((params) => {
          if (!params) {
            this.notFound(res, `chart ${req.query.id} was not found.`)
            return
          }

          this.respondWithChart(res, params)
        })

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

    this.store.set(id, req.body)
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.end(JSON.stringify({status: 'ok'}))
  }

  getOembed(req: any, res: any) {
    // oEmbed requires a URL.
    if (!req.query.url) {
      this.badRequest(res, 'URL Required.')
      return
    }

    // Grab the id from the url.
    const id = utils.parseChartId(req.query.url)

    if (!id){
      this.badRequest(res, 'Could not parse ID from url')
      return
    }

    // get the chart.
    this.store.get(id)
      .then((params) => {
        if (!params) {
          this.notFound(res, `chart ${id} was not found.`)
          return
        }

        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200

        res.end(JSON.stringify({
          type: 'rich',
          version: '1.0',
          width: 1280,
          height: 600,
          title: "Charted",
          html: `<iframe src="https://www.charted.co/embed/${id}" width="1280" height="600" scrolling="no" frameborder="0"></iframe>`
        }))
      })
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
