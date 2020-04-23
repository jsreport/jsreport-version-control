const { applyPatches } = require('./patches')

module.exports = async function scriptApplyPatchesProcessing (inputs, callback, done) {
  const { versions, documentModel } = inputs

  const state = applyPatches(versions, documentModel)

  try {
    done(null, {
      state
    })
  } catch (e) {
    done(null, {
      error: {
        message: e.message,
        stack: e.stack
      }
    })
  }
}
