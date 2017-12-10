/**
 * Custom implementation of changes versioning which uses extra entity to persist
 * changes between commits. The changes are stored as string diffs of serialized individual entities
 */

const DocumentModel = require('./documentModel')
const { serialize, parse, deepEqual } = require('./customUtils')
const Patches = require('./patches')

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

  let patches
  let documentModel
  reporter.initializeListeners.add('version-control', () => {
    documentModel = DocumentModel(reporter.documentStore.model)
    patches = Patches(documentModel)
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
        patches.applyPatch(entityState.entity, parse(c.serializedPatch), c.entitySet)
      })
    })
    return state
  }

  // this custom implementation stores whole entity patch in single object
  // however the external API expects diff of document properties and
  // config are exposed as extra item in array. This is because the git
  // implementation is more limited and working just with raw files.
  // This means the API is limited and loses some nice information.
  // However it is consistent to git which I found as strong argument
  function flattenChanges (changes) {
    const result = []
    changes.forEach((c) => {
      result.push({
        operation: c.operation,
        entitySet: c.entitySet,
        path: c.path,
        patch: c.patch.config
      })
      c.patch.documentProperties.forEach((d) => result.push({
        operation: c.operation,
        entitySet: c.entitySet,
        path: c.path + '/' + d.path,
        patch: d.patch
      }))
    })
    return result
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
        // just one commit, this means only insert, we return diff of empty objets and inserted entities
        return flattenChanges(versionsToPatch[0].changes.map((c) => ({
          ...c,
          patch: JSON.parse(patches.createPatch(c.path, {}, parse(c.serializedDoc), c.entitySet, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' }))
        })))
      }

      versionsToPatch.sort((a, b) => a.creationDate - b.creationDate)

      const previousState = applyPatches(versionsToPatch.slice(0, -1))
      const commitState = applyPatches(versionsToPatch)

      return flattenChanges(commitToDiff.changes.map((c) => {
        const change = {
          path: c.path,
          operation: c.operation,
          entitySet: c.entitySet
        }

        if (c.operation === 'insert') {
          change.patch = JSON.parse(patches.createPatch(c.path, {}, parse(c.serializedDoc), c.entitySet, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' }))
        }

        if (c.operation === 'update') {
          const previousEntity = previousState.find((s) => s.entityId === c.entityId)
          const afterEntity = commitState.find((s) => s.entityId === c.entityId)
          change.patch = JSON.parse(patches.createPatch(c.path, previousEntity.entity, afterEntity.entity, c.entitySet, { context: Number.MAX_VALUE, bufferEncoding: 'utf8' }))
        }

        return change
      }))
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

            const patch = patches.createPatch(s.path, s.entity, entity, s.entitySet)
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
