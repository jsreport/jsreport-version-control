const JsReport = require('jsreport-core')
require('should')

describe.only('version control', () => {
  let jsreport
  let collection

  beforeEach(async () => {
    jsreport = JsReport()
    jsreport.use(require('jsreport-templates')())
    jsreport.use(require('../')())
    await jsreport.init()
    collection = jsreport.documentStore.collection('templates')
  })

  it('revert should remove uncommited changes', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { name: 'foo2' }})
    await jsreport.versionControl.revert()
    const templates = await collection.find({})
    templates.should.have.length(1)
    templates[0].name.should.be.eql('foo')
  })

  it('revert should remove all documents if there is no commit', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.versionControl.revert()
    const templates = await collection.find({})
    templates.should.have.length(0)
  })

  it('history should list changed files', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: 'content' }})
    await jsreport.versionControl.commit('2')
    const history = await jsreport.versionControl.history()
    history.should.have.length(2)
    history[0].message.should.be.eql('1')
    history[1].message.should.be.eql('2')
  })

  it('checkout should change local state to the particular commit', async () => {
    await collection.insert({name: 'foo', content: '1'})
    const commit = await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: '2' }})
    await jsreport.versionControl.commit('2')
    await jsreport.versionControl.checkout(commit._id)
    const templates = await collection.find({})
    templates.should.have.length(1)
    templates[0].content.should.be.eql('1')
  })

  it('diff should list files changes', async () => {
    await collection.insert({name: 'foo', content: '1'})
    const commit = await jsreport.versionControl.commit('1')
    const diff = await jsreport.versionControl.diff(commit._id)
    diff.should.have.length(1)
    diff[0].path.should.be.eql('foo')
  })

  /*it.only('commit should store diffs for document props separately', async () => {
    await collection.insert({name: 'foo', content: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: '1\n2' }})
    const commit = await jsreport.versionControl.commit('2')
    console.log(commit)
  }) */
})
