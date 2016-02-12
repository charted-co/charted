/* @flow weak */

"use strict"

import fs from "fs"
import path from "path"
import FileDb from "./db.js"

const PATH = path.join(__dirname, '..', '..', '.charted_test_db')

export function tearDown(callback) {
  fs.unlinkSync(PATH)
  callback()
}

export function testInitialize(test) {
  let db = new FileDb(PATH)
  db.getAll()
    .then((data) => {
      test.deepEqual(data, {})
      test.done()
    })
}

export function testAccess(test) {
  let db = new FileDb(PATH)
  db.set('12345', {name: 'Charted'})
    .then(() => db.get('12345'))
    .then((data) => {
      test.equal(data.name, 'Charted')
      test.done()
    })
}
