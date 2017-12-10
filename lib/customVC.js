const jsdiff = require('diff')
const DocumentModel = require('./documentModel')
const extend = require('node.extend')
const { serialize, parse, deepGet, deepSet, deepDelete, deepEqual } = require('./customUtils')

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
      const prevVal = deepGet(doc, p.path) || ''
      if (Buffer.isBuffer(prevVal)) {
        deepSet(doc, p.path, Buffer.from(jsdiff.applyPatch(prevVal.toString('base64'), p.patch), 'base64'))
      } else {
        deepSet(doc, p.path, jsdiff.applyPatch(prevVal, p.patch))
      }
    })
    Object.assign(doc, parse(jsdiff.applyPatch(serializeConfig(doc, entitySet), patch.config)))
  }

  function createPatch (name, oldEntity, newEntity, entitySet, options = { context: 0, bufferEncoding: 'base64' }) {
    const patch = {
      documentProperties: []
    }

    documentModel.entitySets[entitySet].entityType.documentProperties.forEach((p) => {
      let older = deepGet(oldEntity, p.path)
      let newer = deepGet(newEntity, p.path)

      if (older == null && newer == null) {
        return
      }

      older = Buffer.isBuffer(older) ? older.toString(options.bufferEncoding) : older
      newer = Buffer.isBuffer(newer) ? newer.toString(options.bufferEncoding) : newer

      if (older !== newer) {
        patch.documentProperties.push({
          path: p.path,
          patch: jsdiff.createPatch(name, older || '', newer || '', '', '', options)
        })
      }
    })

    patch.config = jsdiff.createPatch(name, serializeConfig(oldEntity, entitySet), serializeConfig(newEntity, entitySet), '', '', options)
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
      if (documentModel.entitySets[es].splitIntoDirectories) {
        const entities = await reporter.documentStore.collection(es).find({})
        for (const entity of entities.filter((e) => !state.find((s) => s.entityId === e._id))) {
          await reporter.documentStore.collection(es).remove({_id: entity._id})
        }
      }
    }
  }

  function entityPath (entity, es) {
    return entity[documentModel.entitySets[es].entityType.publicKey]
  }

  return ({
    async history () {
      const versions = await reporter.documentStore.collection('versions').find({})
      return versions.sort((a, b) => b.creationDate - a.creationDate).map((v) => ({
        date: v.creationDate,
        message: v.message,
        _id: v._id.toString()
      }))
    },

    async localChanges () {
      const version = await this.commit('local changes', true)
      return this.diff(version)
    },

    async diff (commitOrCommitId) {
      let commitToDiff
      let versionsToPatch

      if (typeof commitOrCommitId === 'string') {
        const versions = typeof commitOrCommitId === 'string' ? await reporter.documentStore.collection('versions').find({_id: commitOrCommitId}) : commitOrCommitId

        if (versions.length === 0) {
          throw new Error('Commit with id ' + commitOrCommitId + ' was not found')
        }

        commitToDiff = versions[0]
        versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: commitToDiff.creationDate } })
      } else {
        commitToDiff = commitOrCommitId
        versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: commitToDiff.creationDate } })
        versionsToPatch.push(commitToDiff)
      }

      // currently we display only modified lines in the patch to safe some space
      // but for diff we need changes with full context, so we need to perform the full diff
      reporter.logger.debug('Version control diff for ' + commitToDiff.message)

      if (versionsToPatch.length === 1) {
        return versionsToPatch[0].changes.map((c) => ({
          ...c,
          patch: JSON.parse(createPatch(c.path, {}, parse(c.serializedDoc), c.entitySet, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' }))
        }))
      }

      versionsToPatch.sort((a, b) => a.creationDate - b.creationDate)

      const previousState = applyPatches(versionsToPatch.slice(0, -1))
      const commitState = applyPatches(versionsToPatch)

      return commitToDiff.changes.map((c) => {
        const change = {
          path: c.path,
          operation: c.operation,
          entitySet: c.entitySet
        }

        if (c.operation === 'insert') {
          change.patch = JSON.parse(createPatch(c.path, {}, parse(c.serializedDoc), c.entitySet, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' }))
        }

        if (c.operation === 'update') {
          const previousEntity = previousState.find((s) => s.entityId === c.entityId)
          const afterEntity = commitState.find((s) => s.entityId === c.entityId)
          change.patch = JSON.parse(createPatch(c.path, previousEntity.entity, afterEntity.entity, c.entitySet, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' }))
        }

        return change
      })
    },

    async commit (message, preview = false) {
      if (!message) {
        throw new Error('Missing message for version controll commit')
      }

      reporter.logger.debug(`Version control commit: ${message}`)
      const versions = await reporter.documentStore.collection('versions').find({})
      const version = { message: message, creationDate: new Date(), changes: [] }

      const currentEntities = {}
      for (const entitySet in documentModel.entitySets) {
        if (documentModel.entitySets[entitySet].splitIntoDirectories) {
          currentEntities[entitySet] = await reporter.documentStore.collection(entitySet).find({})
        }
      }

      if (versions.length === 0) {
        reporter.logger.debug(`Version the first control commit: ${message}`)

        Object.keys(currentEntities).forEach((es) => {
          currentEntities[es].forEach((e) => {
            version.changes.push({
              operation: 'insert',
              path: entityPath(e, es),
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
              path: entityPath(s.entity, s.entitySet),
              entitySet: s.entitySet,
              entityId: s.entityId
            })
          } else {
            if (deepEqual(entity, s.entity)) {
              return
            }

            const patch = createPatch(s.path, s.entity, entity, s.entitySet)
            version.changes.push({
              operation: 'update',
              path: entityPath(s.entity, s.entitySet),
              entitySet: s.entitySet,
              entityId: s.entityId,
              serializedPatch: patch
            })
          }
        })

        Object.keys(currentEntities).forEach((es) => currentEntities[es].forEach((e) => {
          if (!lastState.find((s) => s.entityId === e._id && s.entitySet === es)) {
            version.changes.push({
              operation: 'insert',
              path: entityPath(e, es),
              entitySet: es,
              entityId: e._id,
              serializedDoc: serialize(e)
            })
          }
        }))
      }

      if (preview) {
        return version
      }

      return reporter.documentStore.collection('versions').insert(version)
    },

    async revert () {
      reporter.logger.debug('Version control revert')
      const versions = await reporter.documentStore.collection('versions').find({})
      return persistChanges(applyPatches(versions))
    },

    async checkout (commitId) {
      if (!commitId) {
        throw new Error('Missing commitId for version controll checkout')
      }
      const versionsToCheckout = await reporter.documentStore.collection('versions').find({ _id: commitId })
      if (versionsToCheckout.length === 0) {
        throw new Error('Commit with id ' + commitId + ' was not found.')
      }
      const versionToCheckout = versionsToCheckout[0]
      reporter.logger.debug('Version control checkout to ' + versionToCheckout.message)

      const versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: versionToCheckout.creationDate } })
      return persistChanges(applyPatches(versionsToPatch))
    }
  })
}
