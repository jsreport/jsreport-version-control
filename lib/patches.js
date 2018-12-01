/**
 * Diff two entities into patch which can be latter applied to replay the modification
 * The diff for document store properties is stored extra for each one
 */

const jsdiff = require('diff')
const { serialize, parse, deepGet, deepSet, deepDelete } = require('./customUtils')
const extend = require('node.extend.without.arrays')
const isbinaryfile = require('isbinaryfile')

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
    if (p.type === 'bigfile') {
      deepSet(doc, p.path, p.patch ? Buffer.from(p.patch, 'base64') : null)
    } else {
      if (Buffer.isBuffer(prevVal)) {
        deepSet(doc, p.path, Buffer.from(jsdiff.applyPatch(prevVal.toString('base64'), p.patch), 'base64'))
      } else {
        deepSet(doc, p.path, jsdiff.applyPatch(prevVal, p.patch))
      }
    }
  })
  // important to do deep merge, because config can have { chrome: {} } and shallow merge wouldthe headerTemplate previously set
  extend(true, doc, parse(jsdiff.applyPatch(serializeConfig(doc, entitySet, documentModel), patch.config)))
}

module.exports.createPatch = ({
  name,
  oldEntity,
  newEntity,
  entitySet,
  documentModel,
  diffLimit = 400 * 1024,
  context = 0,
  bufferEncoding = 'base64'
}) => {
  const patch = {
    documentProperties: []
  }

  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((p) => {
    let older = deepGet(oldEntity, p.path)
    let newer = deepGet(newEntity, p.path)

    if (older == null && newer == null) {
      return
    }

    if (older === newer) {
      return
    }

    if (older && newer && Buffer.from(older).equals(Buffer.from(newer))) {
      return
    }

    const olderLength = older ? Buffer.from(older).length : 0
    const newerLength = newer ? Buffer.from(newer).length : 0

    // big files or binary files are not diffed
    if (olderLength > diffLimit || newerLength > diffLimit ||
       (Buffer.isBuffer(newer) && isbinaryfile.sync(newer, newerLength)) ||
       (Buffer.isBuffer(older) && isbinaryfile.sync(older, olderLength))) {
      return patch.documentProperties.push({
        path: p.path,
        type: 'bigfile',
        patch: newer ? Buffer.from(newer).toString('base64') : null
      })
    }

    older = Buffer.isBuffer(older) ? older.toString(bufferEncoding) : older
    newer = Buffer.isBuffer(newer) ? newer.toString(bufferEncoding) : newer

    patch.documentProperties.push({
      path: p.path,
      patch: jsdiff.createPatch(name, older || '', newer || '', '', '', { context })
    })
  })

  patch.config = jsdiff.createPatch(
    name,
    serializeConfig(oldEntity, entitySet, documentModel),
    serializeConfig(newEntity, entitySet, documentModel),
    '',
    '',
    { context })
  return patch
}
