
module.exports = async function resolveEntityPath (reporter, req, { queries, localFolders }) {
  const entityPaths = await Promise.all(queries.map(async (record) => {
    const { entity, entitySet, entityPath, fromLocal } = record
    let currentEntityPath

    if (fromLocal) {
      currentEntityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req, (folderShortId) => {
        const found = localFolders.find((ls) => ls.shortid === folderShortId)

        if (!found) {
          return
        }

        return found
      })
    } else {
      currentEntityPath = entityPath
    }

    return currentEntityPath
  }))

  return {
    entityPaths
  }
}
