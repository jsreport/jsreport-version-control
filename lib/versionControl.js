/**
 * Custom implementation of changes versioning which uses extra entity to persist
 * changes between commits. The changes are stored as string diffs of serialized individual entities
 */

const DocumentModel = require('./documentModel')
const { serialize, parse, deepEqual } = require('./customUtils')
const { createPatch, applyPatch } = require('./patches')

module.exports = (reporter) => {
  // defining entity used for persisting changes in all entities across commits
  reporter.documentStore.registerComplexType('ChangeType', {
    // used when operation is insert
    serializedDoc: {type: 'Edm.String'},
    // used when operation is update
    serializedPatch: {type: 'Edm.String'},
    entityId: {type: 'Edm.String'},
    // insert, remove, update
    operation: {type: 'Edm.String'},
    // entity[publicKey]
    path: {type: 'Edm.String'}
  })

  // now it basically represents a commit
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

  async function persistChanges (state) {
    for (const e of state) {
      await reporter.documentStore.collection(e.entitySet).update({_id: e.entityId}, { $set: e.entity }, { upsert: true })
    }

    // remove entities that are not in the new state
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

  // apply all patches in collection and return final state of entities
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
        applyPatch(entityState.entity, parse(c.serializedPatch), c.entitySet, documentModel)
      })
    })
    return state
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

      versionsToPatch.sort((a, b) => a.creationDate - b.creationDate)

      const previousState = applyPatches(versionsToPatch.slice(0, -1))
      const commitState = applyPatches(versionsToPatch)

      // This custom implementation stores whole entity patch in single object
      // with additional information like entity id. This is something git based implementation
      // cannot simply provide because it works only with files. There are no document properties
      // or entity ids availible in git. I wanted to keep the API same for both, so we return here
      // document properties as extra items (files) in array and omit some information
      return commitToDiff.changes.reduce((res, c) => {
        const change = {
          path: c.path,
          operation: c.operation,
          entitySet: c.entitySet
        }

        if (c.operation === 'remove') {
          return res.concat(change)
        }

        let patch
        if (c.operation === 'insert') {
          patch = createPatch(c.path, {}, parse(c.serializedDoc), c.entitySet, documentModel, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' })
        }

        if (c.operation === 'update') {
          const previousEntity = previousState.find((s) => s.entityId === c.entityId)
          const afterEntity = commitState.find((s) => s.entityId === c.entityId)
          patch = createPatch(c.path, previousEntity.entity, afterEntity.entity, c.entitySet, documentModel, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' })
        }

        return res.concat({
          ...change,
          patch: patch.config
        }, patch.documentProperties.map((p) => ({
          ...change,
          path: change.path + '/' + p.path.split('.').slice(-1)[0],
          patch: p.patch
        })))
      }, [])
    },

    async commit (message, preview = false) {
      if (!message) {
        throw new Error('Missing message for version controll commit')
      }

      reporter.logger.debug(`Version control commit: ${message}`)

      const currentEntities = {}
      for (const entitySet in documentModel.entitySets) {
        if (documentModel.entitySets[entitySet].splitIntoDirectories) {
          currentEntities[entitySet] = await reporter.documentStore.collection(entitySet).find({})
        }
      }

      const versions = await reporter.documentStore.collection('versions').find({})
      const newVersion = { message: message, creationDate: new Date(), changes: [] }

      const lastState = applyPatches(versions)

      newVersion.changes = lastState.reduce((res, s) => {
        const entity = currentEntities[s.entitySet].find((e) => e._id === s.entityId)
        if (!entity) {
          // entity is not in the new state, it was removed
          return res.concat({
            operation: 'remove',
            path: entityPath(s.entity, s.entitySet),
            entitySet: s.entitySet,
            entityId: s.entityId
          })
        }

        // entity is equal so it was not modified, don't adding change
        if (deepEqual(entity, s.entity)) {
          return res
        }

        return res.concat({
          operation: 'update',
          path: entityPath(s.entity, s.entitySet),
          entitySet: s.entitySet,
          entityId: s.entityId,
          serializedPatch: serialize(createPatch(s.path, s.entity, entity, s.entitySet, documentModel))
        })
      }, [])

      // the entities that exist in store and are not in the last state gets insert change operation
      Object.keys(currentEntities).forEach((es) => currentEntities[es].forEach((e) => {
        if (!lastState.find((s) => s.entityId === e._id && s.entitySet === es)) {
          newVersion.changes.push({
            operation: 'insert',
            path: entityPath(e, es),
            entitySet: es,
            entityId: e._id,
            serializedDoc: serialize(e)
          })
        }
      }))

      if (preview) {
        return newVersion
      }

      return reporter.documentStore.collection('versions').insert(newVersion)
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
