
module.exports = async function resolveEntityPath (reporter, req, { queries, localFolders }, cb) {
  try {
    const entityPaths = await Promise.all(queries.map(async (record) => {
      const { entity, entitySet, fromLocal } = record
      let entityPath

      if (fromLocal) {
        entityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req, (folderShortId) => {
          const found = localFolders.find((ls) => ls.shortid === folderShortId)

          if (!found) {
            return
          }

          return found
        })
      } else {
        entityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req)
      }

      return entityPath
    }))

    cb(null, entityPaths)
  } catch (e) {
    cb(e)
  }
}
