/**
 * Custom implementation of changes versioning which uses extra entity to persist
 * changes between commits. The changes are stored as string diffs of serialized individual entities
 */

const Promise = require('bluebird')
const DocumentModel = require('./documentModel')
const { serialize, parse, deepEqual } = require('./customUtils')
const { createPatch, applyPatch } = require('./patches')
const bytes = require('bytes')

module.exports = (reporter, options) => {
  // defining entity used for persisting changes in all entities across commits
  reporter.documentStore.registerComplexType('ChangeType', {
    // used when operation is insert
    serializedDoc: { type: 'Edm.String' },
    // used when operation is update
    serializedPatch: { type: 'Edm.String' },
    entityId: { type: 'Edm.String' },
    // insert, remove, update
    operation: { type: 'Edm.String' },
    // full path to hierarchy "/folder/entity"
    path: { type: 'Edm.String' },
    entitySet: { type: 'Edm.String' }
  })

  // now it basically represents a commit
  reporter.documentStore.registerEntityType('VersionType', {
    message: { type: 'Edm.String' },
    changes: { type: 'Collection(jsreport.ChangeType)' }
  })

  reporter.documentStore.registerEntitySet('versions', {
    entityType: 'jsreport.VersionType'
  })

  const diffLimit = bytes.parse(options.diffLimit)

  let documentModel
  reporter.initializeListeners.add('version-control-get-model', () => {
    documentModel = DocumentModel(reporter.documentStore.model)
  })

  async function persistChanges (state, req) {
    // folders needs go first because of validations in fs store
    // we can't move entity to a folder that doesn't yet exist
    for (const e of state.filter(e => e.entitySet === 'folders')) {
      const updateCount = await reporter.documentStore.collection('folders').update({ _id: e.entityId }, { $set: e.entity }, req)

      if (updateCount === 0) {
        await reporter.documentStore.collection('folders').insert(e.entity, req)
      }
    }

    for (const e of state.filter(e => e.entitySet !== 'folders')) {
      const updateCount = await reporter.documentStore.collection(e.entitySet).update({ _id: e.entityId }, { $set: e.entity }, req)

      if (updateCount === 0) {
        await reporter.documentStore.collection(e.entitySet).insert(e.entity, req)
      }
    }

    // remove entities that are not in the new state
    for (const es in documentModel.entitySets) {
      if (documentModel.entitySets[es].splitIntoDirectories) {
        const entities = await reporter.documentStore.collection(es).find({}, req)
        for (const entity of entities.filter((e) => !state.find((s) => s.entityId === e._id))) {
          await reporter.documentStore.collection(es).remove({ _id: entity._id }, req)
        }
      }
    }
  }

  // apply all patches in collection and return final state of entities
  function applyPatches (versions) {
    versions = sortVersions(versions, 'ASC')

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

  function sortVersions (versions, sortType) {
    if (sortType !== 'ASC' && sortType !== 'DESC') {
      throw new Error(`Invalid ${sortType} passed when trying to sort versions`)
    }

    return versions.sort((a, b) => {
      if (sortType === 'ASC') {
        return a.creationDate - b.creationDate
      } else {
        return b.creationDate - a.creationDate
      }
    })
  }

  return ({
    init () {

    },
    async history (req) {
      const versions = await reporter.documentStore.collection('versions').find({}, req)

      return sortVersions(versions, 'DESC').map((v) => ({
        date: v.creationDate,
        message: v.message,
        _id: v._id.toString()
      }))
    },

    async localChanges (req) {
      const version = await this.commit('local changes', true, req)
      return this.diff(version, req)
    },

    async diff (commitOrCommitId, req) {
      let commitToDiff
      let versionsToPatch

      if (typeof commitOrCommitId === 'string') {
        const versions = typeof commitOrCommitId === 'string' ? await reporter.documentStore.collection('versions').find({ _id: commitOrCommitId }, req) : commitOrCommitId

        if (versions.length === 0) {
          throw new Error('Commit with id ' + commitOrCommitId + ' was not found')
        }

        commitToDiff = versions[0]
        versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: commitToDiff.creationDate } }, req)
      } else {
        commitToDiff = commitOrCommitId
        versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: commitToDiff.creationDate } }, req)
        versionsToPatch.push(commitToDiff)
      }

      // currently we display only modified lines in the patch to safe some space
      // but for diff we need changes with full context, so we need to perform the full diff
      reporter.logger.debug('Version control diff for ' + commitToDiff.message)

      versionsToPatch = sortVersions(versionsToPatch, 'ASC')

      const previousState = applyPatches(versionsToPatch.slice(0, -1))
      const commitState = applyPatches(versionsToPatch)

      // This custom implementation stores whole entity patch in single object
      // with additional information like entity id. This is something git based implementation
      // cannot simply provide because it works only with files. There are no document properties
      // or entity ids availible in git. I wanted to keep the API same for both, so we return here
      // document properties as extra items (files) in array and omit some information
      const diff = await Promise.reduce(commitToDiff.changes, async (res, c) => {
        const change = {
          path: c.path,
          operation: c.operation,
          entitySet: c.entitySet
        }

        let patch
        if (c.operation === 'remove') {
          const previousEntity = previousState.find((s) => s.entityId === c.entityId)

          patch = createPatch({
            name: c.path,
            oldEntity: previousEntity.entity,
            newEntity: {},
            entitySet: c.entitySet,
            documentModel,
            diffLimit,
            context: Number.MAX_VALUE,
            bufferEncoding: 'utf8'
          })
        }

        if (c.operation === 'insert') {
          const doc = parse(c.serializedDoc)

          patch = createPatch({
            name: c.path,
            oldEntity: {},
            newEntity: doc,
            entitySet: c.entitySet,
            documentModel,
            diffLimit,
            context: Number.MAX_VALUE,
            bufferEncoding: 'utf8'
          })
        }

        if (c.operation === 'update') {
          const previousEntity = previousState.find((s) => s.entityId === c.entityId)
          const afterEntity = commitState.find((s) => s.entityId === c.entityId)

          patch = createPatch({
            name: c.path,
            oldEntity: previousEntity.entity,
            newEntity: afterEntity.entity,
            entitySet: c.entitySet,
            documentModel,
            diffLimit,
            context: Number.MAX_VALUE,
            bufferEncoding: 'utf8'
          })
        }

        return res.concat({
          ...change,
          patch: patch.config
        }, patch.documentProperties.map((p) => ({
          ...change,
          path: change.path + '/' + p.path.split('.').slice(-1)[0],
          patch: p.patch,
          type: p.type
        })))
      }, [])

      return diff
    },

    async commit (message, preview, req) {
      if (!message) {
        throw new Error('Missing message for version controll commit')
      }

      reporter.logger.debug(`Version control commit: ${message}`)

      const currentEntities = {}
      for (const entitySet in documentModel.entitySets) {
        if (documentModel.entitySets[entitySet].splitIntoDirectories) {
          currentEntities[entitySet] = await reporter.documentStore.collection(entitySet).find({}, req)
        }
      }

      const versions = await reporter.documentStore.collection('versions').find({}, req)
      const newVersion = { message: message, creationDate: new Date(), changes: [] }

      const lastState = applyPatches(versions)

      newVersion.changes = await Promise.reduce(lastState, async (res, s) => {
        const entity = currentEntities[s.entitySet].find((e) => e._id === s.entityId)
        if (!entity) {
          // entity is not in the new state, it was removed
          return res.concat({
            operation: 'remove',
            // generate the fullPath from the lastState
            path: await reporter.folders.resolveEntityPath(s.entity, s.entitySet, req, (folderShortId) => {
              const found = lastState.find((ls) => ls.entitySet === 'folders' && ls.entity.shortid === folderShortId)

              if (!found) {
                return
              }

              return found.entity
            }),
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
          path: await reporter.folders.resolveEntityPath(entity, s.entitySet, req),
          entitySet: s.entitySet,
          entityId: s.entityId,
          serializedPatch: serialize(createPatch({
            name: s.path,
            oldEntity: s.entity,
            newEntity: entity,
            entitySet: s.entitySet,
            documentModel: documentModel,
            diffLimit
          }))
        })
      }, [])

      // the entities that exist in store and are not in the last state gets insert change operation
      await Promise.each(Object.keys(currentEntities), (es) => {
        return Promise.each(currentEntities[es], async (e) => {
          if (!lastState.find((s) => s.entityId === e._id && s.entitySet === es)) {
            newVersion.changes.push({
              operation: 'insert',
              path: await reporter.folders.resolveEntityPath(e, es, req),
              entitySet: es,
              entityId: e._id,
              serializedDoc: serialize(e)
            })
          }
        })
      })

      if (preview) {
        return newVersion
      }

      return reporter.documentStore.collection('versions').insert(newVersion, req)
    },

    async revert (req) {
      reporter.logger.debug('Version control revert')
      const versions = await reporter.documentStore.collection('versions').find({}, req)
      return persistChanges(applyPatches(versions), req)
    },

    async checkout (commitId, req) {
      if (!commitId) {
        throw new Error('Missing commitId for version controll checkout')
      }
      const versionsToCheckout = await reporter.documentStore.collection('versions').find({ _id: commitId }, req)
      if (versionsToCheckout.length === 0) {
        throw new Error('Commit with id ' + commitId + ' was not found.')
      }
      const versionToCheckout = versionsToCheckout[0]
      reporter.logger.debug('Version control checkout to ' + versionToCheckout.message)

      const versionsToPatch = await reporter.documentStore.collection('versions').find({ creationDate: { $lte: versionToCheckout.creationDate } }, req)
      return persistChanges(applyPatches(versionsToPatch), req)
    }
  })
}
