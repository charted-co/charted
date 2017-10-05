/* @flow */

"use strict"

import url from "url"
import path from "path"
import request from "request"
import express from "express"
import fs from 'fs'
import handlebars from "handlebars"
import bodyParser from "body-parser"
import prepare from "./prepare"
import FileDb from "./db.js"
import sha1 from "../shared/sha1"
import * as utils from "../shared/utils"

type TemplateParams = {
  ENV?: Object,
  links?: Array<Object>,
  dataUrl?: string
}

export default class ChartedServer {
  address: any;
  staticRoot: string;
  store: FileDb;
  app: express$Application;

  env = {dev: false};
  port = Number(process.env.PORT) || 3000;
  links = [
    {text: 'GitHub', href: 'https://github.com/charted-co/charted'},
  ];

  static start(port: number, staticRoot: string, db: FileDb) {
    return new ChartedServer()
      .withPort(port)
      .withStaticRoot(staticRoot)
      .withStore(db)
      .start()
  }

  constructor() {
    this.app = express()
  }

  withPort(port: number): ChartedServer {
    this.port = port
    return this
  }

  withStaticRoot(path: string): ChartedServer {
    this.staticRoot = path
    return this
  }

  withForceSSL(): ChartedServer {
    this.app.all('*', (req: express$Request, res: express$Response, next: express$NextFunction) => {
      if (req.hostname != 'localhost' && req.protocol == 'http') {
        res.redirect(`https://${req.headers.host}${req.originalUrl}`);
        return;
      }

      return next()
    })

    return this
  }

  withLinks(links: Array<Object>): ChartedServer {
    this.links = links
    return this
  }

  withApp(path: string, app: express$Application): ChartedServer {
    this.app.use(path, app)
    return this
  }

  withStore(store: FileDb): ChartedServer {
    this.store = store
    return this
  }

  start() {
    if (!this.staticRoot) throw new Error('You have to set static root')
    if (!this.store) throw new Error('You have to specify a store')

    return new Promise((resolve) => {
      const app = this.app

      app.enable('trust proxy')
      app.use(bodyParser.json())
      app.use(express.static(this.staticRoot))

      app.get('/', this.getHome.bind(this))
      app.get('/c/:id', this.getChart.bind(this))
      app.get('/embed/:id', this.getChart.bind(this))
      app.post('/c/:id', this.saveChart.bind(this))
      app.get('/load', this.loadChart.bind(this))
      app.get('/oembed', this.getOembed.bind(this))

      let server = app.listen(this.port, () => {
        this.address = server.address()
        resolve(this)
      })
    })
  }

  render(name: string, options: ?TemplateParams): Promise<string> {
    return new Promise((resolve, reject) => {
      const fp = path.join(__dirname, '..', 'templates', name)

      fs.readFile(fp, 'utf8', (err, data) => {
        if (err) {
          reject(err)
          return
        }

        options = options || {}
        options.ENV = this.env
        const html = handlebars.compile(data)(options)
        resolve(html)
      })
    })
  }

  getHome(req: express$Request, res: express$Response) {
    this.render('index.html', {links: this.links})
      .then((html) => {
        res.status(200).send(html)
      })
  }

  getChart(req: express$Request, res: express$Response) {
    this.store.get(req.params.id).then((params) => {
      if (!params) {
        this.notFound(res, `chart ${req.params.id} was not found.`)
        return
      }

      this.render('index.html', {dataUrl: params.dataUrl,})
        .then((html) => {
          res.status(200).send(html)
        })
    })
  }

  loadChart(req: express$Request, res: express$Response) {
    if (req.query.url && typeof req.query.url == 'string') {
      let parsed = url.parse(req.query.url, /* parse query string */ true)
      let chartUrl = url.format(prepare(parsed))
      let params = {dataUrl: chartUrl}

      this.store.set(utils.getChartId(params), params)
        .then(() => this.respondWithChart(res, params))

      return
    }

    if (req.query.id && typeof req.query.id == 'string') {
      const id:string  = req.query.id
      this.store.get(id)
        .then((params) => {
          if (!params) {
            this.notFound(res, `chart ${id} was not found.`)
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
