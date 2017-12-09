const VC = require('./customVC')
const { Diff2Html } = require('diff2html')
const fs = require('fs')
const path = require('path')

const diff2htmlStyle = fs.readFileSync(path.join(__dirname, '../static/diff.css')).toString()

module.exports = (reporter, definition) => {
  const versionControl = reporter.versionControl = VC(reporter)

  reporter.on('express-configure', (app) => {
    app.post('/api/version-control/commit', (req, res, next) => {
      versionControl.commit(req.body.message)
        .then(() => res.status(200).end())
        .catch((next))
    })
    app.get('/api/version-control/history', (req, res, next) => {
      versionControl.history()
        .then((h) => res.send(h))
        .catch(next)
    })
    app.get('/api/version-control/diff/:id', (req, res, next) => {
      versionControl.diff(req.params.id)
        .then((d) => res.send(d))
        .catch(next)
    })
    app.get('/api/version-control/local-changes', (req, res, next) => {
      versionControl.localChanges()
        .then((d) => res.send(d))
        .catch(next)
    })
    app.post('/api/version-control/checkout', (req, res, next) => {
      versionControl.checkout(req.body._id)
        .then((d) => res.send({ status: 1 }))
        .catch(next)
    })
    app.post('/api/version-control/revert', (req, res, next) => {
      versionControl.revert()
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
