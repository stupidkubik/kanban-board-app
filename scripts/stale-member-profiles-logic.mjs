export const MAX_BATCH_WRITES = 500

export const getProtectedMemberIds = (members, ownerId) => {
  const protectedIds = new Set(
    members && typeof members === "object" && !Array.isArray(members)
      ? Object.keys(members)
      : []
  )

  if (typeof ownerId === "string" && ownerId) {
    protectedIds.add(ownerId)
  }

  return protectedIds
}

export const findStaleProfileIds = ({ members, ownerId, profileIds }) => {
  const protectedIds = getProtectedMemberIds(members, ownerId)
  return [...new Set(profileIds)]
    .filter((profileId) => !protectedIds.has(profileId))
    .sort()
}

export const chunkValues = (values, size = MAX_BATCH_WRITES) => {
  if (!Number.isInteger(size) || size < 1 || size > MAX_BATCH_WRITES) {
    throw new Error(`Batch size must be between 1 and ${MAX_BATCH_WRITES}.`)
  }

  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}
