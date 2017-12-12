
const JsReport = require('jsreport-core')
const common = require('./common')
require('should')

describe('version control', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport()
    jsreport.use(require('jsreport-templates')())
    jsreport.use(require('jsreport-data')())
    jsreport.use(require('jsreport-phantom-pdf')())
    jsreport.use(require('jsreport-assets')())
    jsreport.use(require('../')())
    return jsreport.init()
  })

  common(() => jsreport)

  it('commit should store diffs for document properties separately', async () => {
    await jsreport.documentStore.collection('templates').insert({name: 'foo', content: '1', helpers: '1'})
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').update({name: 'foo'}, {$set: { content: '2', helpers: '2' }})
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(2)
  })

  it('commit should store diffs only for changed document props', async () => {
    await jsreport.documentStore.collection('templates').insert({name: 'foo', content: '1', helpers: '1'})
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').update({name: 'foo'}, {$set: { content: '2' }})
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
  })

  it('entity insert in second commit should be present in the commit changes', async () => {
    await jsreport.documentStore.collection('templates').insert({name: '1'})
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').insert({name: '2'})
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    commit.changes[0].path.should.be.eql('2')
  })

  it('commit should store diffs for nested document properties', async () => {
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', phantom: { header: 'header' } })
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { phantom: { header: 'header2' } } })
    const commit = await jsreport.versionControl.commit('2')
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
    patch.documentProperties[0].path.should.be.eql('phantom.header')
  })
})
