/**
 * Diff two entities into patch which can be latter applied to replay the modification
 * The diff for document store properties is stored extra for each one
 */

const jsdiff = require('diff')
const { serialize, parse, deepGet, deepSet, deepDelete } = require('./customUtils')
const extend = require('node.extend')
const isBinaryFile = require('isbinaryfile')

function serializeConfig (doc, entitySet, documentModel) {
  const clone = extend(true, {}, doc)
  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((prop) => {
    deepDelete(clone, prop.path)
  })

  return serialize(clone)
}

module.exports.applyPatch = (doc, patch, entitySet, documentModel) => {
  patch.documentProperties.forEach((p) => {
    const prevVal = deepGet(doc, p.path) || ''
    if (Buffer.isBuffer(prevVal)) {
      if (p.type === 'binary') {
        deepSet(doc, p.path, Buffer.from(p.patch, 'base64'))
      } else {
      // buffers are using diffs on base64 encoded content
        deepSet(doc, p.path, Buffer.from(jsdiff.applyPatch(prevVal.toString('base64'), p.patch), 'base64'))
      }
    } else {
      deepSet(doc, p.path, jsdiff.applyPatch(prevVal, p.patch))
    }
  })
  // important to do deep merge, because config can have { chrome: {} } and shallow merge wouldthe headerTemplate previously set
  extend(true, doc, parse(jsdiff.applyPatch(serializeConfig(doc, entitySet, documentModel), patch.config)))
}

module.exports.createPatch = (name, oldEntity, newEntity, entitySet, documentModel, options = { context: 0, bufferEncoding: 'base64' }) => {
  const patch = {
    documentProperties: []
  }

  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((p) => {
    let older = deepGet(oldEntity, p.path)
    let newer = deepGet(newEntity, p.path)

    if (older == null && newer == null) {
      return
    }

    const olderIsBinaryBuffer = Buffer.isBuffer(older) && isBinaryFile.sync(older, older.length)

    if (olderIsBinaryBuffer) {
      if (older.equals(newer)) {
        return
      }

      return patch.documentProperties.push({
        path: p.path,
        type: 'binary',
        patch: newer.toString('base64')
      })
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

  patch.config = jsdiff.createPatch(name, serializeConfig(oldEntity, entitySet, documentModel), serializeConfig(newEntity, entitySet, documentModel), '', '', options)
  return patch
}
