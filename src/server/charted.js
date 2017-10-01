/* @flow */

"use strict"

import url from "url"
import path from "path"
import request from "request"
import express from "express"
import sh from "shelljs"
import handlebars from "handlebars"
import bodyParser from "body-parser"
import prepare from "./prepare"
import FileDb from "./db.js"
import sha1 from "../shared/sha1"
import * as utils from "../shared/utils"

export default class ChartedServer {
  address: any;
  env: t_ENV;
  staticRoot: string;
  store: FileDb;

  static start(port: number, staticRoot: string, db: FileDb) {
    return new Promise((resolve) => {
      let app = express()
      let charted = new ChartedServer(db, staticRoot)

      app.enable('trust proxy')
      app.use(bodyParser.json())
      app.use(express.static(staticRoot))
      app.get('/c/:id', charted.getChart.bind(charted))
      app.get('/embed/:id', charted.getChart.bind(charted))
      app.post('/c/:id', charted.saveChart.bind(charted))
      app.get('/load', charted.loadChart.bind(charted))
      app.get('/oembed', charted.getOembed.bind(charted))

      let server = app.listen(port, () => {
        charted.address = server.address()
        resolve(charted)
      })
    })
  }

  constructor(store: FileDb, staticRoot: string) {
    this.store = store
    this.staticRoot = staticRoot
    this.env = {dev: false}
  }

  getChart(req: express$Request, res: express$Response) {
    this.store.get(req.params.id).then((params) => {
      if (!params) {
        this.notFound(res, `chart ${req.params.id} was not found.`)
        return
      }

      let code = sh.cat(path.join(__dirname, '..', 'templates', 'index.html'))
      let html = handlebars.compile(code)({
        ENV: this.env,
        dataUrl: params.dataUrl
      })

      res.status(200).send(html)
    })
  }

  loadChart(req: express$Request, res: express$Response) {
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

  saveChart(req: express$Request, res: express$Response) {
    let id = req.params.id
    if (utils.getChartId(req.body) != id) {
      this.badRequest(res, 'id and params are out of sync.')
      return
    }

    this.store.set(id, req.body)
    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.end(JSON.stringify({status: 'ok'}))
  }

  getOembed(req: express$Request, res: express$Response) {
    // oEmbed requires a URL.
    if (!req.query.url) {
      this.badRequest(res, 'URL Required.')
      return
    }

    // Grab the id from the url.
    const id = utils.parseChartId(req.query.url)

    if (!id) {
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
        res.status(200)

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

  respondWithChart(res: express$Response, params: t_CHART_PARAM) {
    request(params.dataUrl, (err, resp, body) => {
      if (err) {
        this.badRequest(res, err)
        return
      }

      if (resp.statusCode != 200) {
        this.badRequest(res, `Received HTTP-${resp.statusCode} status code from ${params.dataUrl}`)
        return
      }

      res.setHeader('Content-Type', 'application/json')
      res.status(200)
      res.end(JSON.stringify({params: params, data: body}))
    })
  }

  notFound(res: express$Response, message: string) {
    res.status(404)
    res.end(`Not Found: ${message}`)
  }

  badRequest(res: express$Response, message: string) {
    res.status(400)
    res.end(`Bad Request: ${message}`)
  }
}
