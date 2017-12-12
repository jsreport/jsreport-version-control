const VC = require('./versionControl')
const { Diff2Html } = require('diff2html')
const fs = require('fs')
const path = require('path')

const diff2htmlStyle = fs.readFileSync(path.join(__dirname, '../static/diff.css')).toString()

module.exports = (reporter, definition) => {
  reporter.versionControl = {
    providers: {},
    registerProvider (name, p) {
      this.providers[name] = p
    }
  }

  reporter.versionControl.registerProvider('default', VC(reporter))
  reporter.initializeListeners.add('version-control', () => {
    const provider = reporter.versionControl.providers[definition.options.name || 'default']
    if (!provider) {
      throw new Error(`Version control provider with name ${definition.options.name} not registered`)
    }
    Object.assign(reporter.versionControl, provider)
  })

  reporter.on('express-configure', (app) => {
    app.post('/api/version-control/commit', (req, res, next) => {
      reporter.versionControl.commit(req.body.message)
        .then(() => res.status(200).end())
        .catch((next))
    })
    app.get('/api/version-control/history', (req, res, next) => {
      reporter.versionControl.history()
        .then((h) => res.send(h))
        .catch(next)
    })
    app.get('/api/version-control/diff/:id', (req, res, next) => {
      reporter.versionControl.diff(req.params.id)
        .then((d) => res.send(d))
        .catch(next)
    })
    app.get('/api/version-control/local-changes', (req, res, next) => {
      reporter.versionControl.localChanges()
        .then((d) => res.send(d))
        .catch(next)
    })
    app.post('/api/version-control/checkout', (req, res, next) => {
      reporter.versionControl.checkout(req.body._id)
        .then((d) => res.send({ status: 1 }))
        .catch(next)
    })
    app.post('/api/version-control/revert', (req, res, next) => {
      reporter.versionControl.revert()
        .then((d) => res.send({ status: 1 }))
        .catch(next)
    })
    app.post('/api/version-control/diff-html', (req, res, next) => {
      const style = '<style>' + diff2htmlStyle + '</style>'
      const diff = Diff2Html.getPrettyHtml(req.body.patch, {inputFormat: 'diff', showFiles: false, matching: 'lines'})
      res.send(`<html><head>${style}</head><body>${diff}</body></html>`)
    })
  })
}
