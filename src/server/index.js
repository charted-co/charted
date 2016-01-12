/* @flow */

'use strict'

import path from "path"
import ChartedServer from './charted'

ChartedServer.start(process.env.PORT || 3000, path.join(__dirname, '..', 'client'))
  .then((address: any) => console.log(`Running at ${address.address}:${address.port}`))
