const git = require('nodegit')
const Promise = require('bluebird')

module.exports = (reporter) => {
  const dataDirectory = reporter.options.dataDirectory

  reporter.initializeListeners.add('git-version-control', async () => {
    reporter.logger.debug('Version control for git is initializing repository')
    await git.Repository.init(dataDirectory, 0)

    const repo = await git.Repository.open(dataDirectory)
    if ((await repo.isEmpty()) === 0) {
      return
    }

    reporter.logger.debug('Version control for git is making initial commit')
    const index = await repo.refreshIndex()
    await index.addAll()
    await index.write()
    const oid = await index.writeTree()
    return repo.createCommit('HEAD', repo.defaultSignature(), repo.defaultSignature(), 'initial commit', oid)
  })

  function getOperationFromPatch (patch) {
    if (patch.isAdded()) {
      return 'insert'
    }

    if (patch.isDeleted()) {
      return 'remove'
    }

    return 'update'
  }

  async function patchToDiffString (patch) {
    const diffList = []

    diffList.push('Index: ' + patch.newFile().path())

    diffList.push('===================================================================')
    diffList.push('--- ' + patch.newFile().path())
    diffList.push('+++ ' + patch.newFile().path())

    const hunks = await patch.hunks()
    for (const hunk of hunks) {
      diffList.push(
        '@@ -' + hunk.oldStart() + ',' + hunk.oldLines() +
              ' +' + hunk.newStart() + ',' + hunk.newLines() +
              ' @@'
      )
      const lines = await hunk.lines()
      diffList.push.apply(diffList, lines.map((l) => String.fromCharCode(l.origin()) + l.content().trim()))
    }

    return diffList.join('\n') + '\n'
  }

  async function diffToChanges (diff) {
    const patches = await diff.patches()
    const result = []
    for (const patch of patches) {
      const filePath = patch.newFile().path()
      result.push({
        path: filePath.split('/').slice(1).join('/'),
        entitySet: filePath.split('/')[0],
        operation: getOperationFromPatch(patch),
        patch: await patchToDiffString(patch)
      })
    }

    return result
  }

  return ({
    async commit (message) {
      const repo = await git.Repository.open(dataDirectory)
      const index = await repo.refreshIndex()
      await index.addAll()
      await index.write()
      const oid = await index.writeTree()
      const head = await git.Reference.nameToId(repo, 'HEAD')
      const parent = await repo.getCommit(head)
      return repo.createCommit('HEAD', repo.defaultSignature(), repo.defaultSignature(), message, oid, [parent])
    },

    async checkout (sha) {
      const repo = await git.Repository.open(dataDirectory)
      const commit = await repo.getCommit(sha)
      const tree = await commit.getTree()
      await git.Checkout.tree(repo, tree, {
        checkoutStrategy: git.Checkout.STRATEGY.FORCE
      })
    },

    async revert () {
      const repo = await git.Repository.open(dataDirectory)
      const index = await repo.refreshIndex()
      await index.addAll()
      await index.write()
      const head = await git.Reference.nameToId(repo, 'HEAD')
      const headCommit = await repo.getCommit(head)
      await git.Reset.reset(repo, headCommit, git.Reset.TYPE.HARD)
    },

    async localChanges () {
      const repo = await git.Repository.open(dataDirectory)

      const index = await repo.refreshIndex()
      await index.addAll()
      await index.write()
      await index.writeTree()

      const head = await repo.getHeadCommit()
      const tree = await head.getTree()

      const diff = await git.Diff.treeToIndex(repo, tree, index)
      return diffToChanges(diff)
    },

    async history () {
      const repo = await git.Repository.open(dataDirectory)
      const master = await repo.getMasterCommit()
      const history = master.history(git.Revwalk.SORT.Time)

      return new Promise((resolve) => {
        const result = []
        history.on('commit', (commit) => {
          result.push({ date: commit.date(), message: commit.message(), _id: commit.sha() })
        })

        history.on('end', function (commits) {
          resolve(result)
        })

        history.start()
      })
    },

    async diff (sha) {
      const repo = await git.Repository.open(dataDirectory)
      const commit = await repo.getCommit(sha)
      const diffList = await commit.getDiff()
      let result = []
      for (const diff of diffList) {
        result = result.concat(await diffToChanges(diff))
      }

      return result
    }
  })
}
