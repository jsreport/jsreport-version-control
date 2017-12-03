const git = require('nodegit')
const Promise = require('bluebird')

module.export = (dataDirectory) => ({
  async commit (message) {
    const repo = await git.Repository.open(dataDirectory)
    const index = await repo.refreshIndex()
    await index.addAll()
    await index.write()
    const oid = await index.writeTree()
    const head = await git.Reference.nameToId(repo, 'HEAD')
    const parent = await repo.getCommit(head)
    const author = git.Signature.create('Scott Chacon',
      'schacon@gmail.com', 123456789, 60)
    const committer = git.Signature.create('Scott A Chacon',
      'scott@github.com', 987654321, 90)

    return repo.createCommit('HEAD', author, committer, message, oid, [parent])
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

  async history () {
    const repo = await git.Repository.open(dataDirectory)
    const master = await repo.getMasterCommit()
    const history = master.history(git.Revwalk.SORT.Time)

    return new Promise((resolve) => {
      const result = []
      history.on('commit', (commit) => {
        result.push({ date: commit.date(), message: commit.message(), sha: commit.sha() })
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

    const result = []

    for (const diff of diffList) {
      const patches = await diff.patches()
      for (const patch of patches) {
        // console.log('diff', patch.oldFile().path(), patch.newFile().path())
        result.push({
          path: patch.newFile().path()
        })

        const hunks = await patch.hunks()
        for (const hunk of hunks) {
          // console.log(hunk.header().trim())
          const lines = await hunk.lines()
          for (const line of lines) {
            // console.log(String.fromCharCode(line.origin()) + line.content().trim())
          }
        }
      }
    }

    return result
  }
})
