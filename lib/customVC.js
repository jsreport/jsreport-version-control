const jsdiff = require('diff')

module.exports = (reporter) => {
  reporter.documentStore.registerComplexType('ChangeType', {
    serializedDoc: {type: 'Edm.String'},
    serializedPatch: {type: 'Edm.String'},
    entityId: {type: 'Edm.String'},
    operation: {type: 'Edm.String'},
    path: {type: 'Edm.String'}
  })

  reporter.documentStore.registerEntityType('VersionType', {
    _id: { type: 'Edm.String', key: true },
    creationDate: {type: 'Edm.DateTimeOffset'},
    message: { type: 'Edm.String', publicKey: true },
    changes: {type: 'Collection(jsreport.ChangeType)'}
  })

  reporter.documentStore.registerEntitySet('versions', {
    entityType: 'jsreport.VersionType'
  })

  function applyPatch (str, patch) {
    return jsdiff.applyPatch(str, patch)
  }

  function createPatch (name, oldStr, newStr) {
    return jsdiff.createPatch(name, oldStr, newStr, null, null, { context: 0 })
  }

  function applyPatch2 (str, patchStr, entityType) {
    const patch = JSON.parse(patchStr)
    const doc = JSON.parse(str)
    patch.forEach()
    return jsdiff.applyPatch(str, patch)
  }

  function createPatch2 (name, oldEntity, newEntity, entityType) {
    const patch = {
      documentProperties: []
    }
    entityType.documentProperties.forEach((p) => {
      if (p.path.include('.')) {
        return // include nested for now
      }

      delete oldEntity[p.path]
      delete newEntity[p.path]

      if (oldEntity[p.path] !== newEntity[p.path]) {
        patch.documentProperties.push({
          path: p.path,
          patch: jsdiff.createPatch(name, oldEntity[p.path], newEntity[p.path], null, null, { context: 0 })
        })
      }
    })

    patch.config = jsdiff.createPatch(name, JSON.stringify(oldEntity), JSON.stringify(newEntity), null, null, { context: 0 })
    return JSON.stringify(patch)
  }

  function applyPatches (versions) {
    const state = []
    // iterate patches to the final one => get previous commit state
    versions.forEach((v) => {
      v.changes.forEach((c) => {
        if (c.operation === 'insert') {
          return state.push({ entityId: c.entityId, serializedDoc: c.serializedDoc, path: c.path })
        }

        const entityState = state.find((e) => e.entityId === c.entityId)
        const patchResult = applyPatch(entityState.serializedDoc, c.serializedPatch)
        entityState.serializedDoc = patchResult
      })
    })
    return state
  }

  return ({
    async history () {
      const versions = await reporter.documentStore.collection('versions').find({})
      return versions.sort((a, b) => a.creationDate > b.creationDate).map((v) => ({
        date: v.creationDate,
        message: v.message,
        sha: v._id.toString()
      }))
    },

    async diff (sha) {
      const versions = await reporter.documentStore.collection('versions').find({_id: sha})
      return versions[0].changes.map((c) => ({
        path: c.path
      }))
    },

    async revert () {
      reporter.logger.debug('Version control revert')
      await reporter.documentStore.collection('templates').remove({})
      const versions = await reporter.documentStore.collection('versions').find({})
      const state = applyPatches(versions.sort((a, b) => a.creationDate < b.creationDate))
      for (const e of state) {
        await reporter.documentStore.collection('templates').update({_id: e.entityId}, { $set: JSON.parse(e.serializedDoc) }, { upsert: true })
      }
    },

    async commit (message) {
      reporter.logger.debug(`Version control revert commit: ${message}`)
      const versions = await reporter.documentStore.collection('versions').find({})
      const templates = await reporter.documentStore.collection('templates').find({})
      const version = { message: message, creationDate: new Date(), changes: [] }

      if (versions.length === 0) {
        // first commit
        templates.forEach((t) => version.changes.push({
          operation: 'insert',
          path: t.name,
          entityId: t._id,
          serializedDoc: JSON.stringify(t, null, 4)
        }))
      } else {
        const lastState = applyPatches(versions.sort((a, b) => a.creationDate < b.creationDate))

        lastState.forEach((s) => {
          const template = templates.find((t) => t._id === s.entityId)
          const patch = createPatch(s.path, s.serializedDoc, JSON.stringify(template, null, 4))
          version.changes.push({
            operation: 'update',
            path: s.path,
            entityId: s.entityId,
            serializedPatch: patch
          })
        })
      }

      return reporter.documentStore.collection('versions').insert(version)
    },

    async checkout (sha) {
      const versionToCheckout = (await reporter.documentStore.collection('versions').find({ _id: sha }))[0]
      const versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: versionToCheckout.creationDate } })
      const state = applyPatches(versionsToPatch.sort((a, b) => a.creationDate < b.creationDate))
      for (const e of state) {
        await reporter.documentStore.collection('templates').update({_id: e.entityId}, { $set: JSON.parse(e.serializedDoc) })
      }
    }
  })
}
