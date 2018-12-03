
const Promise = require('bluebird')
const JsReport = require('jsreport-core')
const common = require('./common')
const should = require('should')

describe('version control', () => {
  let jsreport

  beforeEach(async () => {
    jsreport = JsReport()
    jsreport.use(require('jsreport-templates')())
    jsreport.use(require('jsreport-data')())
    jsreport.use(require('jsreport-chrome-pdf')())
    jsreport.use(require('jsreport-assets')())
    jsreport.use(require('../')())
    await jsreport.init()

    // postpone the commit to avoid having two commits in same ms
    const old = jsreport.versionControl.commit.bind(jsreport.versionControl)
    jsreport.versionControl.commit = (...args) => Promise.delay(3).then(() => old(...args))
  })

  common(() => jsreport)

  it('commit should store diffs for document properties separately', async () => {
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', content: '1', helpers: '1', engine: 'none', recipe: 'html' })
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '2', helpers: '2' } })
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(2)
  })

  it('commit should store diffs only for changed document props', async () => {
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', content: '1', helpers: '1', engine: 'none', recipe: 'html' })
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '2' } })
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
  })

  it('entity insert in second commit should be present in the commit changes', async () => {
    await jsreport.documentStore.collection('templates').insert({ name: '1', engine: 'none', recipe: 'html' })
    await jsreport.versionControl.commit('commit 1')
    await jsreport.documentStore.collection('templates').insert({ name: '2', engine: 'none', recipe: 'html' })
    const commit = await jsreport.versionControl.commit('commit 2')
    commit.changes.should.have.length(1)
    commit.changes[0].path.should.be.eql('/2')
  })

  it('commit should store diffs for nested document properties', async () => {
    await jsreport.documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html', chrome: { headerTemplate: 'header' } })

    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('templates').update({ name: 'foo' }, { $set: { chrome: { headerTemplate: 'header2' } } })
    const commit = await jsreport.versionControl.commit('2')
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
    patch.documentProperties[0].path.should.be.eql('chrome.headerTemplate')
    should(patch.documentProperties[0].type).not.be.eql('bigfile')
  })

  it('commit should store raw base64 for big nested document properties', async () => {
    const longArray = []
    const longArray2 = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
      longArray2.push(i - 1)
    }
    await jsreport.documentStore.collection('assets').insert({ name: 'foo', content: Buffer.from(longArray) })

    await jsreport.versionControl.commit('1')

    await jsreport.documentStore.collection('assets').update({ name: 'foo' }, { $set: { content: Buffer.from(longArray2) } })
    const commit = await jsreport.versionControl.commit('2')
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
    patch.documentProperties[0].path.should.be.eql('content')
    patch.documentProperties[0].type.should.be.eql('bigfile')
  })

  it('diff of removed entity should show null in patch', async () => {
    const longArray = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
    }

    await jsreport.documentStore.collection('assets').insert({ name: 'foo', content: Buffer.from(longArray) })
    await jsreport.versionControl.commit('1')

    await jsreport.documentStore.collection('assets').remove({ name: 'foo' })

    const changes = await jsreport.versionControl.localChanges()
    changes.should.have.length(2)
    changes[0].path.should.be.eql('/foo')
    changes[1].path.should.be.eql('/foo/content')
    should(changes[1].patch).be.null()
  })

  it('big document property insert array/commit, update null/commit, update array and revert should restore to null', async () => {
    const longArray = []
    for (let i = 0; i < 600 * 1024; i++) {
      longArray.push(i)
    }

    await jsreport.documentStore.collection('assets').insert({ name: 'foo', content: Buffer.from(longArray) })
    await jsreport.versionControl.commit('1')

    await jsreport.documentStore.collection('assets').update({ name: 'foo' }, { $set: { content: null } })
    await jsreport.versionControl.commit('2')

    await jsreport.documentStore.collection('assets').update({ name: 'foo' }, { $set: { content: Buffer.from([]) } })

    await jsreport.versionControl.revert()

    const asset = await jsreport.documentStore.collection('assets').findOne({ name: 'foo' })
    should(asset.content).be.null()
  })
})
