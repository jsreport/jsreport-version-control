const should = require('should')

module.exports = (jsreport, reload = () => {}) => {
  it('revert should remove uncommited changes', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { name: 'foo2' } }, req)
    await jsreport().versionControl.revert(req)
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({}, req)
    templates.should.have.length(1)
    templates[0].name.should.be.eql('foo')
  })

  it('revert should remove all documents if there is no commit', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.revert(req)
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({}, req)
    templates.should.have.length(0)
  })

  it('revert should recover localy removed file', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').remove({}, req)
    await jsreport().versionControl.revert(req)
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({}, req)
    templates.should.have.length(1)
  })

  it('revert should remove new local file', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').insert({ name: 'foo2', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.revert(req)
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({}, req)
    templates.should.have.length(1)
  })

  it('revert should work also for binary types', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('assets').insert({
      name: 'foo.html',
      content: Buffer.from('1')
    }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('assets').update({ name: 'foo.html' }, { $set: { content: Buffer.from('2') } }, req)
    await jsreport().versionControl.commit('2', undefined, req)
    await jsreport().documentStore.collection('assets').update({ name: 'foo.html' }, { $set: { content: Buffer.from('3') } }, req)
    await jsreport().versionControl.revert(req)
    await reload()
    const assets = await jsreport().documentStore.collection('assets').find({}, req)
    assets.should.have.length(1)
    assets[0].content.toString().should.be.eql('2')
  })

  it('revert should process folders insert the first', async () => {
    const req = jsreport().Request({})

    await jsreport().documentStore.collection('templates').beforeUpdateListeners.add('test', async (q, doc, res) => {
      if (doc.$set.folder) {
        const f = await jsreport().documentStore.collection('folders').findOne({ shortid: doc.$set.folder.shortid }, req)
        if (!f) {
          throw new Error('Folder not found')
        }
      }
    })
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    const commit1 = await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('folders').insert({ name: 'a', shortid: 'a' }, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { folder: { shortid: 'a' } } }, req)
    await jsreport().versionControl.commit('2', undefined, req)
    await jsreport().versionControl.checkout(commit1._id, req)
    await jsreport().versionControl.revert(req)
  })

  it('history should list changed files', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: 'content' } }, req)
    await jsreport().versionControl.commit('2', undefined, req)
    const history = await jsreport().versionControl.history(req)
    history[0].message.should.be.eql('2')
    history[1].message.should.be.eql('1')
  })

  it('checkout should change local state to the particular commit', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', content: '1', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '2' } }, req)
    await jsreport().versionControl.commit('2', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '3' } }, req)
    const commit3 = await jsreport().versionControl.commit('3', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '4' } }, req)
    await jsreport().versionControl.commit('4', undefined, req)
    await jsreport().versionControl.checkout(commit3._id, req)
    await reload()
    const templates = await jsreport().documentStore.collection('templates').find({}, req)
    templates.should.have.length(1)
    templates[0].content.should.be.eql('3')
  })

  it('diff should list files changes for the first commit', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', content: '1', engine: 'none', recipe: 'html' }, req)
    const commit = await jsreport().versionControl.commit('1', undefined, req)
    const diff = await jsreport().versionControl.diff(commit._id, req)
    const diffsToInspect = diff.filter((d) => d.path.startsWith('/foo'))
    diffsToInspect[0].path.should.containEql('/foo')
    diffsToInspect[1].path.should.containEql('/foo/content')
  })

  it('diff should list files changes between two commits', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', content: '1', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { content: '2' } }, req)
    const commit2 = await jsreport().versionControl.commit('2', undefined, req)
    const diff = await jsreport().versionControl.diff(commit2._id, req)
    diff.should.have.length(2)
    diff[0].path.should.containEql('foo')
    diff[1].path.should.containEql('foo/content')
  })

  it('diff should list files changes between two commits where second commit has insert', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: '1', content: '1', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('commit 1', undefined, req)
    await jsreport().documentStore.collection('templates').insert({ name: '2', content: '2', engine: 'none', recipe: 'html' }, req)
    const commit2 = await jsreport().versionControl.commit('commit 2', undefined, req)
    const diff = await jsreport().versionControl.diff(commit2._id, req)
    diff[0].path.should.containEql('2')
    diff[1].path.should.containEql('2/content')
  })

  it('diff should list deep document properties changes between two commits', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', content: '1', chrome: { headerTemplate: '1' }, engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { chrome: { headerTemplate: '2' } } }, req)
    const commit2 = await jsreport().versionControl.commit('2', undefined, req)
    const diffs = await jsreport().versionControl.diff(commit2._id, req)
    should(diffs.find((p) => p.path.includes('foo/header'))).be.ok()
  })

  it('diff should compare assets using utf8', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('assets').insert({ name: 'a', content: Buffer.from('a') }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('assets').update({ name: 'a' }, { $set: { content: Buffer.from('č') } }, req)
    const commit2 = await jsreport().versionControl.commit('2', undefined, req)
    const diff = await jsreport().versionControl.diff(commit2._id, req)
    diff.find((p) => p.path.includes('a/content')).patch.should.containEql('č')
  })

  it('diff should provide patch also for deletes', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'a', content: 'hello', engine: 'none', recipe: 'html' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').remove({}, req)
    const commit2 = await jsreport().versionControl.commit('2', undefined, req)
    const diff = await jsreport().versionControl.diff(commit2._id, req)
    diff.find((p) => p.path.includes('a/content')).patch.should.containEql('hello')
  })

  it('should work for multiple entity types', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', engine: 'none', recipe: 'html' }, req)
    await jsreport().documentStore.collection('data').insert({ name: 'dataFoo', shortid: 'a' }, req)
    await jsreport().versionControl.commit('commit 1', undefined, req)
    await jsreport().documentStore.collection('data').update({ name: 'dataFoo' }, { $set: { shortid: 'b' } }, req)
    await jsreport().versionControl.revert(req)
    await reload()
    const dataItems = await jsreport().documentStore.collection('data').find({}, req)
    dataItems.should.have.length(1)
    dataItems[0].shortid.should.be.eql('a')
  })

  it('should correctly recover dates', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('data').insert({ name: 'foo' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().versionControl.revert(req)
    const data = await jsreport().documentStore.collection('data').find({}, req)
    data[0].creationDate.should.be.Date()
  })

  it('localChanges should diff current state with previous commit', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', recipe: '1', engine: 'none' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { recipe: '2' } }, req)
    const diff = await jsreport().versionControl.localChanges(req)
    diff.should.have.length(1)
    diff[0].path.should.containEql('foo')
    diff[0].operation.should.be.eql('update')
  })

  it('localChanges should not return diff of unchanged entities', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', recipe: '1', engine: 'none', chrome: { marginTop: '5px' } }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    const diff = await jsreport().versionControl.localChanges(req)
    diff.should.have.length(0)
  })

  it('localChanges should not return diff when insert update and no change for header', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', recipe: '1', engine: 'none', chrome: { headerTemplate: 'a' } }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { chrome: { headerTemplate: 'b' } } }, req)
    await jsreport().versionControl.commit('2', undefined, req)
    const diff = await jsreport().versionControl.localChanges(req)
    diff.should.have.length(0)
  })

  it('renamed entity should store the new name in path', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('templates').insert({ name: 'foo', recipe: '1', engine: 'none' }, req)
    await jsreport().versionControl.commit('1', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo' }, { $set: { name: 'foo2' } }, req)
    await jsreport().versionControl.commit('2', undefined, req)
    await jsreport().documentStore.collection('templates').update({ name: 'foo2' }, { $set: { recipe: '2' } }, req)
    const diff = await jsreport().versionControl.localChanges(req)
    diff.should.have.length(1)
    diff[0].path.should.containEql('foo2')
  })

  it('commit should store entity\'s path hierarchy', async () => {
    const req = jsreport().Request({})
    await jsreport().documentStore.collection('folders').insert({ name: 'f1', shortid: 'f1' }, req)
    await jsreport().documentStore.collection('templates').insert({ name: '1', engine: 'none', recipe: 'html', folder: { shortid: 'f1' } }, req)
    const commit = await jsreport().versionControl.commit('commit 1', undefined, req)
    const changes = commit.changes.filter((c) => c.path.includes('/1'))
    changes.should.have.length(1)
    changes[0].path.should.be.eql('/f1/1')
  })

  it('commit should throw error when there is no changes to commit', async () => {
    const req = jsreport().Request({})
    return should(jsreport().versionControl.commit('commit 1', undefined, req)).be.rejectedWith(/there is no changes to commit/)
  })
}
