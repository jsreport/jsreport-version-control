const JsReport = require('jsreport-core')
require('should')

describe('version control', () => {
  let jsreport
  let collection

  beforeEach(async () => {
    jsreport = JsReport()
    jsreport.use(require('jsreport-templates')())
    jsreport.use(require('jsreport-data')())
    jsreport.use(require('jsreport-phantom-pdf')())
    jsreport.use(require('jsreport-assets')())
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

  it('revert should recover localy removed file', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.versionControl.commit('1')
    collection.remove({})
    await jsreport.versionControl.revert()
    const templates = await collection.find({})
    templates.should.have.length(1)
  })

  it('revert should remove new local file', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.versionControl.commit('1')
    await collection.insert({name: 'foo2'})
    await jsreport.versionControl.revert()
    const templates = await collection.find({})
    templates.should.have.length(1)
  })

  it('revert should work also for binary types', async () => {
    await jsreport.documentStore.collection('assets').insert({
      name: 'foo.html',
      content: '1'
    })
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('assets').update({ name: 'foo.html' }, { $set: { content: '2' } })
    await jsreport.versionControl.commit('2')
    await jsreport.documentStore.collection('assets').update({ name: 'foo.html' }, { $set: { content: '3' } })
    await jsreport.versionControl.revert()
    const assets = await jsreport.documentStore.collection('assets').find({})
    assets.should.have.length(1)
    assets[0].content.toString().should.be.eql('2')
  })

  it('history should list changed files', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: 'content' }})
    await jsreport.versionControl.commit('2')
    const history = await jsreport.versionControl.history()
    history.should.have.length(2)
    history[0].message.should.be.eql('2')
    history[1].message.should.be.eql('1')
  })

  it('checkout should change local state to the particular commit', async () => {
    await collection.insert({name: 'foo', content: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: '2' }})
    await jsreport.versionControl.commit('2')
    await collection.update({name: 'foo'}, {$set: { content: '3' }})
    const commit3 = await jsreport.versionControl.commit('3')
    await collection.update({name: 'foo'}, {$set: { content: '4' }})
    await jsreport.versionControl.commit('4')
    await jsreport.versionControl.checkout(commit3._id)
    const templates = await collection.find({})
    templates.should.have.length(1)
    templates[0].content.should.be.eql('3')
  })

  it('diff should list files changes for the first commit', async () => {
    await collection.insert({name: 'foo', content: '1'})
    const commit = await jsreport.versionControl.commit('1')
    const diff = await jsreport.versionControl.diff(commit._id)
    diff.should.have.length(1)
    diff[0].path.should.be.eql('foo')
  })

  it('diff should list files changes between two commits', async () => {
    await collection.insert({name: 'foo', content: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: {content: '2'}})
    const commit2 = await jsreport.versionControl.commit('2')
    const diff = await jsreport.versionControl.diff(commit2._id)
    diff.should.have.length(1)
    diff[0].path.should.be.eql('foo')
    diff[0].patch.documentProperties.should.have.length(1)
  })

  it('diff should list files changes between two commits where second commit has insert', async () => {
    await collection.insert({name: '1', content: '1'})
    await jsreport.versionControl.commit('1')
    await collection.insert({name: '2', content: '2'})
    const commit2 = await jsreport.versionControl.commit('2')
    const diff = await jsreport.versionControl.diff(commit2._id)
    diff.should.have.length(1)
    diff[0].path.should.be.eql('2')
    diff[0].patch.documentProperties.should.have.length(1)
  })

  it('diff should list deep document properties changes between two commits', async () => {
    await collection.insert({name: 'foo', content: '1', phantom: { header: '1' }})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { phantom: { header: '2' } }})
    const commit2 = await jsreport.versionControl.commit('2')
    const diff = await jsreport.versionControl.diff(commit2._id)
    diff.should.have.length(1)
    diff[0].path.should.be.eql('foo')
    diff[0].patch.documentProperties.should.have.length(1)
    diff[0].patch.documentProperties[0].path.should.be.eql('phantom.header')
  })

  it('diff should compare assets using utf8', async () => {
    await jsreport.documentStore.collection('assets').insert({name: 'a', content: 'a'})
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('assets').update({name: 'a'}, {$set: {content: 'č'}})
    const commit2 = await jsreport.versionControl.commit('2')
    const diff = await jsreport.versionControl.diff(commit2._id)
    diff.should.have.length(1)
    diff[0].patch.documentProperties[0].patch.should.containEql('č')
  })

  it('commit should store diffs for document properties separately', async () => {
    await collection.insert({name: 'foo', content: '1', helpers: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: '2', helpers: '2' }})
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(2)
  })

  it('commit should store diffs only for changed document props', async () => {
    await collection.insert({name: 'foo', content: '1', helpers: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: { content: '2' }})
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
  })

  it('should work for multiple entity types', async () => {
    await collection.insert({name: 'foo'})
    await jsreport.documentStore.collection('data').insert({ name: 'foo', shortid: 'a' })
    await jsreport.versionControl.commit('1')
    await jsreport.documentStore.collection('data').update({ name: 'foo' }, { $set: { shortid: 'b' } })
    await jsreport.versionControl.revert()
    const dataItems = await jsreport.documentStore.collection('data').find({})
    dataItems.should.have.length(1)
    dataItems[0].shortid.should.be.eql('a')
  })

  it('entity insert in second commit should be present in the commit changes', async () => {
    await collection.insert({name: '1'})
    await jsreport.versionControl.commit('1')
    await collection.insert({name: '2'})
    const commit = await jsreport.versionControl.commit('2')
    commit.changes.should.have.length(1)
    commit.changes[0].path.should.be.eql('2')
  })

  it('should correctly recover dates', async () => {
    await jsreport.documentStore.collection('data').insert({ name: 'foo' })
    await jsreport.versionControl.commit('1')
    await jsreport.versionControl.revert()
    const data = await jsreport.documentStore.collection('data').find({})
    data[0].creationDate.should.be.Date()
  })

  it('commit should store diffs for nested document properties', async () => {
    await collection.insert({ name: 'foo', phantom: { header: 'header' } })
    await jsreport.versionControl.commit('1')
    await collection.update({ name: 'foo' }, { $set: { phantom: { header: 'header2' } } })
    const commit = await jsreport.versionControl.commit('2')
    const patch = JSON.parse(commit.changes[0].serializedPatch)
    patch.documentProperties.should.have.length(1)
    patch.documentProperties[0].path.should.be.eql('phantom.header')
  })

  it('localChanges should diff current state with previous commit', async () => {
    await collection.insert({name: 'foo', recipe: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, { $set: { recipe: '2' } })
    const diff = await jsreport.versionControl.localChanges()
    diff.should.have.length(1)
    diff[0].path.should.be.eql('foo')
    diff[0].operation.should.be.eql('update')
  })

  it('localChanges should not return diff of unchanged entities', async () => {
    await collection.insert({name: 'foo', recipe: '1'})
    await jsreport.versionControl.commit('1')
    const diff = await jsreport.versionControl.localChanges()
    diff.should.have.length(0)
  })

  it('renamed entity should store the new name in path', async () => {
    await collection.insert({name: 'foo', recipe: '1'})
    await jsreport.versionControl.commit('1')
    await collection.update({name: 'foo'}, {$set: {name: 'foo2'}})
    await jsreport.versionControl.commit('2')
    await collection.update({name: 'foo2'}, {$set: {recipe: '2'}})
    const diff = await jsreport.versionControl.localChanges()
    diff.should.have.length(1)
    diff[0].path.should.be.eql('foo2')
  })
})
