const JsReport = require('jsreport-core')
const request = require('supertest')
require('should')

describe('version control API', () => {
  let jsreport
  beforeEach(() => {
    jsreport = JsReport()
    jsreport.use(require('jsreport-templates')())
    jsreport.use(require('jsreport-express')({ httpPort: 5000 }))
    jsreport.use(require('../')())
    return jsreport.init()
  })

  afterEach(() => {
    jsreport.express.server.close()
  })

  it('GET /api/source-control/history', async () => {
    await jsreport.versionControl.commit('foo')
    const res = await request(jsreport.express.app)
      .get('/api/source-control/history')
      .expect(200)

    res.body.should.have.length(1)
  })

  it('POST /api/source-control/commit', async () => {
    await request(jsreport.express.app)
      .post('/api/source-control/commit')
      .send({ message: 'foo' })
      .type('form')
      .expect(200)

    const history = await jsreport.versionControl.history()
    history.should.have.length(1)
  })

  it('POST /api/source-control/revert', async () => {
    await jsreport.documentStore.collection('templates').insert({name: 'foo'})
    await request(jsreport.express.app)
      .post('/api/source-control/revert')
      .expect(200)

    const templates = await jsreport.documentStore.collection('templates').find({})
    templates.should.have.length(0)
  })
})
