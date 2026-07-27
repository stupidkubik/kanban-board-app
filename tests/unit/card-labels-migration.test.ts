import { describe, expect, it } from "vitest"

// @ts-expect-error The migration helpers are an executable JavaScript module.
import {
  buildCardLabelsMigrationPlan,
  catalogMapsEqual,
  legacyLabelId,
} from "../../scripts/migrate-card-labels-logic.mjs"

describe("card labels migration", () => {
  it("creates case-insensitive catalog entries and rewrites cards to ids", () => {
    const plan = buildCardLabelsMigrationPlan({
      existingLabels: [],
      cards: [
        { id: "card-1", labels: ["Bug", " backend "] },
        { id: "card-2", labels: ["BUG", "Backend"] },
      ],
    })

    expect(plan.createdLabels).toHaveLength(2)
    expect(plan.cardUpdates).toEqual([
      {
        id: "card-1",
        labelIds: [legacyLabelId("bug"), legacyLabelId("backend")],
      },
      {
        id: "card-2",
        labelIds: [legacyLabelId("bug"), legacyLabelId("backend")],
      },
    ])
  })

  it("reuses existing labels and is a no-op after legacy fields are removed", () => {
    const existingLabels = [
      {
        id: "existing",
        name: "Bug",
        normalizedName: "bug",
        color: "red",
      },
    ]
    const first = buildCardLabelsMigrationPlan({
      existingLabels,
      cards: [{ id: "card-1", labels: ["BUG"] }],
    })
    const rerun = buildCardLabelsMigrationPlan({
      existingLabels,
      cards: [{ id: "card-1", labelIds: ["existing"] }],
    })

    expect(first.createdLabels).toEqual([])
    expect(first.cardUpdates).toEqual([
      { id: "card-1", labelIds: ["existing"] },
    ])
    expect(rerun.createdLabels).toEqual([])
    expect(rerun.cardUpdates).toEqual([])
  })

  it("respects board and card caps", () => {
    const existingLabels = Array.from({ length: 49 }, (_, index) => ({
      id: `existing-${index}`,
      name: `Existing ${index}`,
      normalizedName: `existing ${index}`,
      color: "gray",
    }))
    const plan = buildCardLabelsMigrationPlan({
      existingLabels,
      cards: [
        {
          id: "card-1",
          labels: Array.from({ length: 12 }, (_, index) => `New ${index}`),
        },
      ],
    })

    expect(plan.createdLabels).toHaveLength(1)
    expect(plan.cardUpdates[0].labelIds).toHaveLength(1)
    expect(Object.keys(plan.labelIds)).toHaveLength(50)
  })

  it("treats absent and empty catalog indexes as the same no-op state", () => {
    expect(catalogMapsEqual(undefined, undefined, {}, {})).toBe(true)
    expect(
      catalogMapsEqual(
        { "label-1": true },
        { bug: "label-1" },
        { "label-1": true },
        { bug: "label-1" }
      )
    ).toBe(true)
    expect(catalogMapsEqual({}, {}, { "label-1": true }, {})).toBe(false)
  })
})
