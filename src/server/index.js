/* @flow */

'use strict'

import path from "path"
import ChartedServer from './charted'
import FileDb from "./db"

new ChartedServer()
  .withStaticRoot(path.join(__dirname, '..', 'client'))
  .withStore(new FileDb(path.join(__dirname, '..', '..', '.charted_db')))
  .start()
  .then((server: ChartedServer) => {
    server.env.dev = true
    let address = server.address
    console.log(`Running at ${address.address}:${address.port}`)
  })
