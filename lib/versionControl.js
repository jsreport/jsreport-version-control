/**
 * Custom implementation of changes versioning which uses extra entity to persist
 * changes between commits. The changes are stored as string diffs of serialized individual entities
 */

const path = require('path')
const bytes = require('bytes')
const DocumentModel = require('./documentModel')
const sortVersions = require('./sortVersions')
const scriptCallbackResolveEntityPath = require('./scriptCallbackResolveEntityPath')

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
    entityType: 'jsreport.VersionType',
    exportable: false
  })

  const diffLimit = bytes.parse(options.diffLimit)

  let documentModel

  reporter.initializeListeners.add('version-control-get-model', () => {
    documentModel = DocumentModel(reporter.documentStore.model)
  })

  async function persistChanges (state, req) {
    await reporter.documentStore.beginTransaction(req)

    try {
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

      await reporter.documentStore.commitTransaction(req)
    } catch (e) {
      await reporter.documentStore.rollbackTransaction(req)

      throw e
    }
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

      const result = await reporter.executeScript(
        {
          commitToDiff,
          versions: versionsToPatch,
          documentModel,
          diffLimit
        },
        {
          execModulePath: path.join(__dirname, 'scriptDiffProcessing.js'),
          timeoutErrorMessage: 'Timeout during execution of version control diff'
        },
        req
      )

      if (result.logs) {
        result.logs.forEach(m => {
          reporter.logger[m.level](m.message, { ...req, timestamp: m.timestamp })
        })
      }

      if (result.error) {
        const error = new Error(result.error.message)
        error.stack = result.error.stack

        throw reporter.createError('Error while executing version control diff', {
          original: error,
          weak: true
        })
      }

      return result.diff
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

      const result = await reporter.executeScript(
        {
          commitMessage: message,
          versions,
          currentEntities,
          documentModel,
          diffLimit
        },
        {
          execModulePath: path.join(__dirname, 'scriptCommitProcessing.js'),
          timeoutErrorMessage: 'Timeout during execution of version control commit',
          callback: (params, cb) => scriptCallbackResolveEntityPath(reporter, req, params, cb)
        },
        req
      )

      if (result.logs) {
        result.logs.forEach(m => {
          reporter.logger[m.level](m.message, { ...req, timestamp: m.timestamp })
        })
      }

      if (result.error) {
        const error = new Error(result.error.message)
        error.stack = result.error.stack

        throw reporter.createError('Error while executing version control commit', {
          original: error,
          weak: true
        })
      }

      const newCommit = result.commit

      if (preview) {
        return newCommit
      }

      if (newCommit.changes.length === 0) {
        throw new Error('Can not save an empty commit, there is no changes to commit')
      }

      return reporter.documentStore.collection('versions').insert(newCommit, req)
    },

    async revert (req) {
      reporter.logger.debug('Version control revert')

      const versions = await reporter.documentStore.collection('versions').find({}, req)

      const result = await reporter.executeScript(
        {
          versions,
          documentModel
        },
        {
          execModulePath: path.join(__dirname, 'scriptApplyPatchesProcessing.js'),
          timeoutErrorMessage: 'Timeout during execution of version control revert'
        },
        req
      )

      if (result.logs) {
        result.logs.forEach(m => {
          reporter.logger[m.level](m.message, { ...req, timestamp: m.timestamp })
        })
      }

      if (result.error) {
        const error = new Error(result.error.message)
        error.stack = result.error.stack

        throw reporter.createError('Error while executing version control revert', {
          original: error,
          weak: true
        })
      }

      const state = result.state

      return persistChanges(state, req)
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

      const result = await reporter.executeScript(
        {
          versions: versionsToPatch,
          documentModel
        },
        {
          execModulePath: path.join(__dirname, 'scriptApplyPatchesProcessing.js'),
          timeoutErrorMessage: 'Timeout during execution of version control checkout'
        },
        req
      )

      if (result.logs) {
        result.logs.forEach(m => {
          reporter.logger[m.level](m.message, { ...req, timestamp: m.timestamp })
        })
      }

      if (result.error) {
        const error = new Error(result.error.message)
        error.stack = result.error.stack

        throw reporter.createError('Error while executing version control checkout', {
          original: error,
          weak: true
        })
      }

      const state = result.state

      return persistChanges(state, req)
    }
  })
}
