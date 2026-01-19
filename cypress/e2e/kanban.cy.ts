const setUiLocale = (win: Window) => {
  win.localStorage.setItem("uiLocale", "en")
  win.localStorage.setItem("uiLocaleTouched", "1")
}

const signIn = () => {
  const email = Cypress.env("E2E_EMAIL")
  const password = Cypress.env("E2E_PASSWORD")
  if (!email || !password) {
    throw new Error("Set CYPRESS_E2E_EMAIL and CYPRESS_E2E_PASSWORD to run e2e tests.")
  }

  cy.visit("/sign-in", { onBeforeLoad: setUiLocale })
  cy.get('input[placeholder="Email"]').type(email)
  cy.get('input[placeholder="Password"]').type(password)
  cy.contains("button", "Sign in with Email").click()
}

const dragAndDrop = (source: Cypress.Chainable, target: Cypress.Chainable) => {
  source.trigger("pointerdown", { button: 0, clientX: 5, clientY: 5, force: true })
  target.trigger("pointermove", { clientX: 20, clientY: 20, force: true })
  target.trigger("pointerup", { force: true })
}

describe("kanban core flows", () => {
  it("creates a board, adds columns/cards, and drags a card", () => {
    const boardTitle = `E2E Board ${Date.now()}`
    const cardTitle = `Card ${Date.now()}`

    signIn()

    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()

    cy.contains('[data-testid="board-card"]', boardTitle).should("exist")
    cy.contains('[data-testid="board-card"]', boardTitle).within(() => {
      cy.get('[data-testid="open-board"]').click()
    })

    cy.get('[data-testid="add-column-trigger"]').click()
    cy.get('[data-testid="new-column-title"]').type("Todo")
    cy.get('[data-testid="create-column-submit"]').click()

    cy.get('[data-testid="add-column-trigger"]').click()
    cy.get('[data-testid="new-column-title"]').type("Done")
    cy.get('[data-testid="create-column-submit"]').click()

    cy.contains('[data-testid^="column-"]', "Todo").within(() => {
      cy.contains("button", "Add card").click()
      cy.get('input[placeholder="Card title"]').type(cardTitle)
      cy.contains("button", "Create card").click()
    })

    cy.contains('[data-testid^="column-"]', "Todo")
      .find(`[data-card-title="${cardTitle}"]`)
      .should("exist")

    const source = cy.get(`[data-card-title="${cardTitle}"]`)
    const target = cy.contains('[data-testid^="column-"]', "Done").find(
      '[data-testid^="column-drop-"]'
    )
    dragAndDrop(source, target)

    cy.contains('[data-testid^="column-"]', "Done")
      .find(`[data-card-title="${cardTitle}"]`)
      .should("exist")
  })

  it("sends an invite from the board card", () => {
    const boardTitle = `Invite Board ${Date.now()}`

    signIn()

    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()

    cy.contains('[data-testid="board-card"]', boardTitle).within(() => {
      cy.get('[data-testid="invite-email"]').type("invitee@example.com")
      cy.get('[data-testid="invite-submit"]').click()
      cy.get('[data-testid="invite-email"]').should("have.value", "")
    })
  })
})
