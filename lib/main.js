const VC = require('./customVC')

module.exports = (reporter, definition) => {
  // const versions = gitVersions(reporter.options.dataDirectory)
  const versionControl = reporter.versionControl = VC(reporter)

  reporter.on('express-configure', (app) => {
    app.post('/api/source-control/commit', (req, res, next) => {
      versionControl.commit(req.body.message)
        .then(() => res.status(200).end())
        .catch(next)
    })
    app.get('/api/source-control/history', (req, res, next) => {
      versionControl.history()
        .then((h) => res.send(h))
        .catch(next)
    })
    app.get('/api/source-control/diff/:sha', (req, res, next) => {
      versionControl.diff(req.params.sha)
        .then((d) => res.send(d))
        .catch(next)
    })
    app.post('/api/source-control/checkout', (req, res, next) => {
      versionControl.checkout(req.body.sha)
        .then((d) => res.send('ok'))
        .catch(next)
    })
    app.post('/api/source-control/revert', (req, res, next) => {
      versionControl.revert()
        .then((d) => res.send('ok'))
        .catch(next)
    })
  })
}
