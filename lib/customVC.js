const jsdiff = require('diff')
const DocumentModel = require('./documentModel')
const extend = require('node.extend')
const { serialize, parse, deepGet, deepSet, deepDelete } = require('./customUtils')

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

  let documentModel
  reporter.initializeListeners.add('version-control', () => {
    documentModel = DocumentModel(reporter.documentStore.model)
  })

  function serializeConfig (doc, entitySet) {
    const clone = extend(true, {}, doc)
    documentModel.entitySets[entitySet].entityType.documentProperties.forEach((prop) => {
      deepDelete(clone, prop.path)
    })

    return serialize(clone)
  }

  function applyPatch (doc, patch, entitySet) {
    patch.documentProperties.forEach((p) => {
      deepSet(doc, p.path, jsdiff.applyPatch(deepGet(doc, p.path), p.patch))
    })
    Object.assign(doc, parse(jsdiff.applyPatch(serializeConfig(doc, entitySet), patch.config)))
  }

  function createPatch (name, oldEntity, newEntity, entitySet) {
    const patch = {
      documentProperties: []
    }

    documentModel.entitySets[entitySet].entityType.documentProperties.forEach((p) => {
      if (deepGet(oldEntity, p.path) !== deepGet(newEntity, p.path)) {
        patch.documentProperties.push({
          path: p.path,
          patch: jsdiff.createPatch(name, deepGet(oldEntity, p.path) || '', deepGet(newEntity, p.path) || '', null, null, { context: 0 })
        })
      }
    })

    patch.config = jsdiff.createPatch(name, serializeConfig(oldEntity, entitySet), serializeConfig(newEntity, entitySet), null, null, { context: 0 })
    return serialize(patch)
  }

  function applyPatches (versions) {
    versions.sort((a, b) => a.creationDate - b.creationDate)
    let state = []
    // iterate patches to the final one => get previous commit state
    versions.forEach((v) => {
      v.changes.forEach((c) => {
        if (c.operation === 'insert') {
          return state.push({
            entityId: c.entityId,
            entitySet: c.entitySet,
            entity: parse(c.serializedDoc),
            path: c.path
          })
        }

        if (c.operation === 'remove') {
          state = state.filter((e) => e.entityId !== c.entityId)
          return
        }

        const entityState = state.find((e) => e.entityId === c.entityId)
        applyPatch(entityState.entity, parse(c.serializedPatch), c.entitySet)
      })
    })
    return state
  }

  async function persistChanges (state) {
    for (const e of state) {
      await reporter.documentStore.collection(e.entitySet).update({_id: e.entityId}, { $set: e.entity }, { upsert: true })
    }

    for (const es in documentModel.entitySets) {
      if (es !== 'settings' && es !== 'versions') {
        const entities = await reporter.documentStore.collection(es).find({})
        for (const entity of entities.filter((e) => !state.find((s) => s.entityId === e._id))) {
          await reporter.documentStore.collection(es).remove({_id: entity._id})
        }
      }
    }
  }

  return ({
    async history () {
      const versions = await reporter.documentStore.collection('versions').find({})
      return versions.sort((a, b) => b.creationDate - a.creationDate).map((v) => ({
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

    async commit (message) {
      reporter.logger.debug(`Version control commit: ${message}`)
      const versions = await reporter.documentStore.collection('versions').find({})
      const version = { message: message, creationDate: new Date(), changes: [] }

      const currentEntities = {}
      for (const entitySet in documentModel.entitySets) {
        if (entitySet !== 'settings' && entitySet !== 'versions') {
          currentEntities[entitySet] = await reporter.documentStore.collection(entitySet).find({})
        }
      }

      if (versions.length === 0) {
        reporter.logger.debug(`Version the first control commit: ${message}`)

        Object.keys(currentEntities).forEach((es) => {
          currentEntities[es].forEach((e) => {
            version.changes.push({
              operation: 'insert',
              path: e.name,
              entityId: e._id,
              entitySet: es,
              serializedDoc: serialize(e)
            })
          })
        })
      } else {
        const lastState = applyPatches(versions)

        lastState.forEach((s) => {
          const entity = currentEntities[s.entitySet].find((e) => e._id === s.entityId)
          if (!entity) {
            version.changes.push({
              operation: 'remove',
              path: s.path,
              entitySet: s.entitySet,
              entityId: s.entityId
            })
          } else {
            const patch = createPatch(s.path, s.entity, entity, s.entitySet)
            version.changes.push({
              operation: 'update',
              path: s.path,
              entitySet: s.entitySet,
              entityId: s.entityId,
              serializedPatch: patch
            })
          }
        })
      }

      return reporter.documentStore.collection('versions').insert(version)
    },

    async revert () {
      reporter.logger.debug('Version control revert')
      const versions = await reporter.documentStore.collection('versions').find({})
      return persistChanges(applyPatches(versions))
    },

    async checkout (sha) {
      const versionToCheckout = (await reporter.documentStore.collection('versions').find({ _id: sha }))[0]
      reporter.logger.debug('Version control checkout to ' + versionToCheckout.message)

      const versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: versionToCheckout.creationDate } })
      return persistChanges(applyPatches(versionsToPatch))
    }
  })
}
