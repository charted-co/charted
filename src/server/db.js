/* @flow */

"use strict"

import fs from "fs"

export default class FileDb {
  path: string;

  constructor(path: string) {
    try {
      fs.accessSync(path)
    } catch (err) {
      if (err.code != 'ENOENT') {
        throw err
      }

      fs.writeFileSync(path, '{}', 'utf8')
    }

    this.path = path
  }

  getAll(): Promise<Object> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, 'utf8', (err, data) => {
        if (err) reject(err)
        resolve(JSON.parse(data))
      })
    })
  }

  get(key: string): Promise<Object> {
    return this.getAll().then((data) => data[key])
  }

  set(key: string, value: any): Promise<void> {
    return this.getAll().then((data) => {
      data[key] = value

      return new Promise((resolve, reject) => {
        fs.writeFile(this.path, JSON.stringify(data), 'utf8', (err) => {
          if (err) reject(err)
          resolve()
        })
      })
    })
  }
}
