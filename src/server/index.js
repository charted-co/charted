/* @flow */

'use strict'

import path from "path"
import ChartedServer from './charted'
import FileDb from "./db"

let db = new FileDb(path.join(__dirname, '..', '..', '.charted_db'))
ChartedServer.start(Number(process.env.PORT) || 3000, path.join(__dirname, '..', 'client'), db)
  .then((address: any) => console.log(`Running at ${address.address}:${address.port}`))
