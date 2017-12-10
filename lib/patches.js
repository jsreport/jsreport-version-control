const jsdiff = require('diff')
const { serialize, parse, deepGet, deepSet, deepDelete } = require('./customUtils')
const extend = require('node.extend')

function serializeConfig (doc, entitySet, documentModel) {
  const clone = extend(true, {}, doc)
  documentModel.entitySets[entitySet].entityType.documentProperties.forEach((prop) => {
    deepDelete(clone, prop.path)
  })

  return serialize(clone)
}

module.exports = (documentModel) => ({
  applyPatch (doc, patch, entitySet) {
    patch.documentProperties.forEach((p) => {
      const prevVal = deepGet(doc, p.path) || ''
      if (Buffer.isBuffer(prevVal)) {
        deepSet(doc, p.path, Buffer.from(jsdiff.applyPatch(prevVal.toString('base64'), p.patch), 'base64'))
      } else {
        deepSet(doc, p.path, jsdiff.applyPatch(prevVal, p.patch))
      }
    })
    Object.assign(doc, parse(jsdiff.applyPatch(serializeConfig(doc, entitySet, documentModel), patch.config)))
  },

  createPatch (name, oldEntity, newEntity, entitySet, options = { context: 0, bufferEncoding: 'base64' }) {
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

    patch.config = jsdiff.createPatch(name, serializeConfig(oldEntity, entitySet, documentModel), serializeConfig(newEntity, entitySet, documentModel), '', '', options)
    return serialize(patch)
  }
})
