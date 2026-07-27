import { createHash } from "node:crypto"

export const LEGACY_LABEL_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
]

export const normalizeLegacyLabelName = (value) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : ""

export const legacyLabelId = (normalizedName) =>
  `legacy_${createHash("sha256").update(normalizedName).digest("hex").slice(0, 20)}`

export const catalogMapsEqual = (currentIds, currentNames, nextIds, nextNames) => {
  const normalizeMap = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {}
  const firstIds = normalizeMap(currentIds)
  const firstNames = normalizeMap(currentNames)
  return (
    JSON.stringify(Object.entries(firstIds).sort()) ===
      JSON.stringify(Object.entries(nextIds).sort()) &&
    JSON.stringify(Object.entries(firstNames).sort()) ===
      JSON.stringify(Object.entries(nextNames).sort())
  )
}

const legacyLabelColor = (normalizedName) => {
  const byte = Number.parseInt(
    createHash("sha256").update(normalizedName).digest("hex").slice(0, 2),
    16
  )
  return LEGACY_LABEL_COLORS[byte % LEGACY_LABEL_COLORS.length]
}

export const buildCardLabelsMigrationPlan = ({
  existingLabels,
  cards,
  maxBoardLabels = 50,
}) => {
  const labelsByName = new Map()
  const labelIds = {}
  const labelNames = {}
  existingLabels.forEach((label) => {
    const normalizedName =
      normalizeLegacyLabelName(label.normalizedName) ||
      normalizeLegacyLabelName(label.name)
    if (!normalizedName || labelsByName.has(normalizedName)) return
    labelsByName.set(normalizedName, label.id)
    labelIds[label.id] = true
    labelNames[normalizedName] = label.id
  })

  const createdLabels = []
  const cardUpdates = []
  cards.forEach((card) => {
    if (!Array.isArray(card.labels)) return
    const nextIds = new Set(
      Array.isArray(card.labelIds)
        ? card.labelIds.filter((id) => typeof id === "string" && labelIds[id])
        : []
    )
    card.labels.forEach((rawName) => {
      const name = typeof rawName === "string"
        ? rawName.trim().replace(/\s+/g, " ")
        : ""
      const normalizedName = normalizeLegacyLabelName(name)
      if (!normalizedName || name.length > 50) return
      let id = labelsByName.get(normalizedName)
      if (!id && Object.keys(labelIds).length < maxBoardLabels) {
        id = legacyLabelId(normalizedName)
        labelsByName.set(normalizedName, id)
        labelIds[id] = true
        labelNames[normalizedName] = id
        createdLabels.push({
          id,
          name,
          normalizedName,
          color: legacyLabelColor(normalizedName),
        })
      }
      if (id && nextIds.size < 10) nextIds.add(id)
    })
    cardUpdates.push({ id: card.id, labelIds: [...nextIds] })
  })

  return { createdLabels, cardUpdates, labelIds, labelNames }
}
