/* @flow weak */

"use strict"

import url from "url"
import prepare from "./prepare.js"

export function testSupportsStringsAndURIs(test) {
  var address = 'http://charted.co/'
  var parsed = url.parse(address)

  test.equal(prepare(parsed).format(), address)
  test.equal(prepare(address).format(), address)
  test.done();
}

export function testDropbox(test) {
  test.equal(prepare('http://dropbox.com/s/abcdef/my.csv').format(),
    'http://dropbox.com/s/abcdef/my.csv?raw=1')
  test.equal(prepare('http://www.dropbox.com/s/abcdef/my.csv').format(),
    'http://www.dropbox.com/s/abcdef/my.csv?raw=1')
  test.done()
}

export function testGoogleSpreadsheets(test) {
  test.equal(
    prepare('https://docs.google.com/spreadsheets/d/1N9Vpl941bR-yN_ZlMHvlc4soDrCxswsORpvjDTbKaiw/edit#gid=2090366728').format(),
    'https://docs.google.com/spreadsheets/d/1N9Vpl941bR-yN_ZlMHvlc4soDrCxswsORpvjDTbKaiw/export?gid=2090366728&format=csv')
  test.equal(
    prepare('https://docs.google.com/spreadsheets/d/1N9Vpl941bR-yN_ZlMHvlc4soDrCxswsORpvjDTbKaiw/edit').format(),
    'https://docs.google.com/spreadsheets/d/1N9Vpl941bR-yN_ZlMHvlc4soDrCxswsORpvjDTbKaiw/export?gid=0&format=csv')
  test.done()
}
