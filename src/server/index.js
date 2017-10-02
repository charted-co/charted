/* @flow */

'use strict'

import path from "path"
import express from "express"
import ChartedServer from './charted'
import FileDb from "./db"

const demo = express()
demo.get('/', (req: express$Request, res: express$Response) => {
  res.send('Hello, World!')
})

new ChartedServer()
  .withStaticRoot(path.join(__dirname, '..', 'client'))
  .withStore(new FileDb(path.join(__dirname, '..', '..', '.charted_db')))
  .withApp('/demo', demo)
  .start()
  .then((server: ChartedServer) => {
    server.env.dev = true
    let address = server.address
    console.log(`Running at ${address.address}:${address.port}`)
  })
