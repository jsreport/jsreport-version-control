const should = require('should')

module.exports = (jsreport, reload = () => {}) => {
  it('revert should remove uncommited changes', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: { name: 'foo2' }})
    await jsreport().versionControl.revert()
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({})
    templates.should.have.length(1)
    templates[0].name.should.be.eql('foo')
  })

  it('revert should remove all documents if there is no commit', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo'})
    await jsreport().versionControl.revert()
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({})
    templates.should.have.length(0)
  })

  it('revert should recover localy removed file', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo'})
    await jsreport().versionControl.commit('1')
    jsreport().documentStore.collection('templates').remove({})
    await jsreport().versionControl.revert()
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({})
    templates.should.have.length(1)
  })

  it('revert should remove new local file', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').insert({name: 'foo2'})
    await jsreport().versionControl.revert()
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({})
    templates.should.have.length(1)
  })

  it('revert should work also for binary types', async () => {
    await jsreport().documentStore.collection('assets').insert({
      name: 'foo.html',
      content: '1'
    })
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('assets').update({ name: 'foo.html' }, { $set: { content: Buffer.from('2') } })
    await jsreport().versionControl.commit('2')
    await jsreport().documentStore.collection('assets').update({ name: 'foo.html' }, { $set: { content: Buffer.from('3') } })
    await jsreport().versionControl.revert()
    await reload()
    const assets = await jsreport().documentStore.collection('assets').find({})
    assets.should.have.length(1)
    assets[0].content.toString().should.be.eql('2')
  })

  it('history should list changed files', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: { content: 'content' }})
    await jsreport().versionControl.commit('2')
    const history = await jsreport().versionControl.history()
    history[0].message.should.be.eql('2')
    history[1].message.should.be.eql('1')
  })

  it('checkout should change local state to the particular commit', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', content: '1'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: { content: '2' }})
    await jsreport().versionControl.commit('2')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: { content: '3' }})
    const commit3 = await jsreport().versionControl.commit('3')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: { content: '4' }})
    await jsreport().versionControl.commit('4')
    await jsreport().versionControl.checkout(commit3._id)
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({})
    templates.should.have.length(1)
    templates[0].content.should.be.eql('3')
  })

  it('diff should list files changes for the first commit', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', content: '1'})
    const commit = await jsreport().versionControl.commit('1')
    const diff = await jsreport().versionControl.diff(commit._id)
    diff[0].path.should.containEql('foo')
    diff[1].path.should.containEql('foo/content')
  })

  it('diff should list files changes between two commits', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', content: '1'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: {content: '2'}})
    const commit2 = await jsreport().versionControl.commit('2')
    const diff = await jsreport().versionControl.diff(commit2._id)
    diff.should.have.length(2)
    diff[0].path.should.containEql('foo')
    diff[1].path.should.containEql('foo/content')
  })

  it('diff should list files changes between two commits where second commit has insert', async () => {
    await jsreport().documentStore.collection('templates').insert({name: '1', content: '1'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').insert({name: '2', content: '2'})
    const commit2 = await jsreport().versionControl.commit('2')
    const diff = await jsreport().versionControl.diff(commit2._id)
    diff[0].path.should.containEql('2')
    diff[1].path.should.containEql('2/content')
  })

  it('diff should list deep document properties changes between two commits', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', content: '1', phantom: { header: '1' }})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: { phantom: { header: '2' } }})
    const commit2 = await jsreport().versionControl.commit('2')
    const diffs = await jsreport().versionControl.diff(commit2._id)
    should(diffs.find((p) => p.path.includes('foo/header'))).be.ok()
  })

  it('diff should compare assets using utf8', async () => {
    await jsreport().documentStore.collection('assets').insert({name: 'a', content: Buffer.from('a')})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('assets').update({name: 'a'}, {$set: {content: Buffer.from('č')}})
    const commit2 = await jsreport().versionControl.commit('2')
    const diff = await jsreport().versionControl.diff(commit2._id)
    diff.find((p) => p.path.includes('a/content')).patch.should.containEql('č')
  })

  it('should work for multiple entity types', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo'})
    await jsreport().documentStore.collection('data').insert({ name: 'foo', shortid: 'a' })
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('data').update({ name: 'foo' }, { $set: { shortid: 'b' } })
    await jsreport().versionControl.revert()
    await reload()
    const dataItems = await jsreport().documentStore.collection('data').find({})
    dataItems.should.have.length(1)
    dataItems[0].shortid.should.be.eql('a')
  })

  it('should correctly recover dates', async () => {
    await jsreport().documentStore.collection('data').insert({ name: 'foo' })
    await jsreport().versionControl.commit('1')
    await jsreport().versionControl.revert()
    const data = await jsreport().documentStore.collection('data').find({})
    data[0].creationDate.should.be.Date()
  })

  it('localChanges should diff current state with previous commit', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', recipe: '1'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, { $set: { recipe: '2' } })
    const diff = await jsreport().versionControl.localChanges()
    diff.should.have.length(1)
    diff[0].path.should.containEql('foo')
    diff[0].operation.should.be.eql('update')
  })

  it('localChanges should not return diff of unchanged entities', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', recipe: '1'})
    await jsreport().versionControl.commit('1')
    const diff = await jsreport().versionControl.localChanges()
    diff.should.have.length(0)
  })

  it('renamed entity should store the new name in path', async () => {
    await jsreport().documentStore.collection('templates').insert({name: 'foo', recipe: '1'})
    await jsreport().versionControl.commit('1')
    await jsreport().documentStore.collection('templates').update({name: 'foo'}, {$set: {name: 'foo2'}})
    await jsreport().versionControl.commit('2')
    await jsreport().documentStore.collection('templates').update({name: 'foo2'}, {$set: {recipe: '2'}})
    const diff = await jsreport().versionControl.localChanges()
    diff.should.have.length(1)
    diff[0].path.should.containEql('foo2')
  })
}
