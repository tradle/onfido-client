const { EventEmitter } = require('events')
const Promise = require('bluebird')
const co = Promise.coroutine
const changesFeed = require('changes-feed')
const typeforce = require('typeforce')
const collect = Promise.promisify(require('stream-collector'))
const memdown = require('memdown')
const testHelpers = require('@tradle/engine/test/helpers')
const { utils } = require('@tradle/engine')
const createOnfido = require('../')
const createOnfidoDB = require('../lib/db')

module.exports = {
  client: mockClient,
  api: mockAPI
}

let dbCounter = 0

function mockClient (opts) {
  const api = mockAPI(opts)
  const logdb = Promise.promisifyAll(testHelpers.nextDB())
  return createOnfido({
    changes: Promise.promisifyAll(changesFeed(logdb)),
    keeper: Promise.promisifyAll(testHelpers.keeper()),
    path: 'test',
    api: api,
    leveldown: memdown
  })
}

function mockAPI ({ applicants, documents, checks, reports }) {
  return {
    applicants: {
      create: function (obj) {
        typeforce({
          first_name: typeforce.String,
          last_name: typeforce.String,
          email: typeforce.String
         }, obj)

        return Promise.resolve(applicants.shift())
      },
      update: function (id, obj) {
        typeforce(typeforce.String, id)
        typeforce(typeforce.Object, obj)
        return Promise.resolve(applicants.shift())
      },
      uploadDocument: function (id, obj) {
        typeforce(typeforce.String, id)
        typeforce({
          type: typeforce.String
        }, obj)

        return Promise.resolve(documents.shift())
      },
      uploadLivePhoto: function (id, obj) {
        typeforce(typeforce.String, id)
        typeforce(typeforce.Object, obj)
        return Promise.resolve({
          id: 'abc'
        })
      }
    },
    checks: {
      get: function (opts) {
        typeforce({
          checkId: typeforce.String,
          expandReports: typeforce.maybe(typeforce.Boolean)
        }, opts)

        return Promise.resolve(checks.shift())
      },
      create: function (id, opts) {
        typeforce(typeforce.String, id)
        typeforce({
          reports: typeforce.Array
        }, opts)

        return Promise.resolve(checks.shift())
      },
      createDocumentCheck: function (id) {
        typeforce(typeforce.String, id)
        return Promise.resolve(checks.shift())
      }
    },
    reports: {
      get: function (id) {
        typeforce(typeforce.String, id)

        if (report) {
          return Promise.resolve(reports.shift())
        }

        const match = check.reports.find(r => r.id === id)
        if (match) Promise.resolve(match)
        else Promise.reject(new Error('report not found'))
      }
    },
    webhooks: {
      handleEvent: co(function* (req) {
        const body = yield collect(req)
        return JSON.parse(body).payload
      })
    }
  }
}
