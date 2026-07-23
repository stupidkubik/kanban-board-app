const setUiLocale = (win: Window) => {
  win.localStorage.setItem("uiLocale", "en")
  win.localStorage.setItem("uiLocaleTouched", "1")
}

const signIn = () => {
  const email = Cypress.env("E2E_EMAIL")
  const password = Cypress.env("E2E_PASSWORD")
  if (!email || !password) {
    throw new Error("Set CYPRESS_E2E_EMAIL and CYPRESS_E2E_PASSWORD.")
  }

  cy.visit("/sign-in", { onBeforeLoad: setUiLocale })
  cy.get('input[placeholder="Email"]').type(email)
  cy.get('input[placeholder="Password"]').type(password, { log: false })
  cy.contains("button", "Sign in with Email").click()
  cy.get('[data-testid="create-board-trigger"]').should("be.visible")
}

const dragAndDrop = (source: Cypress.Chainable, target: Cypress.Chainable) => {
  source.trigger("pointerdown", { button: 0, clientX: 5, clientY: 5, force: true })
  target.trigger("pointermove", { clientX: 20, clientY: 20, force: true })
  target.trigger("pointerup", { force: true })
}

const createdBoardTitles: string[] = []

const rememberBoard = (title: string) => {
  createdBoardTitles.push(title)
}

const cleanupCreatedBoards = () => {
  if (!createdBoardTitles.length) {
    return
  }

  cy.visit("/", { onBeforeLoad: setUiLocale })
  createdBoardTitles.splice(0).forEach((title) => {
    cy.get("body").then(($body) => {
      const selector = `[data-board-title="${title}"]`
      if (!$body.find(selector).length) {
        return
      }

      cy.get(selector).within(() => {
        cy.get('[data-testid="delete-board-trigger"]').click()
      })
      cy.get('[data-testid="delete-board-confirm"]').click()
      cy.wait(4500)
      cy.get(selector).should("not.exist")
    })
  })
}

describe("kanban core flows", () => {
  before(() => {
    if (Cypress.env("E2E_ALLOW_WRITES") !== true) {
      throw new Error(
        "Set CYPRESS_E2E_ALLOW_WRITES=true and use a dedicated Firebase test project."
      )
    }
  })

  afterEach(cleanupCreatedBoards)

  it("creates a board, adds columns/cards, and drags a card", () => {
    const boardTitle = `E2E Core ${Date.now()}`
    const cardTitle = `Card ${Date.now()}`
    rememberBoard(boardTitle)

    signIn()

    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()

    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.url().should("match", /\/boards\/[^/]+$/)

    cy.get('[data-testid="new-column-title"]').type("Todo")
    cy.get('[data-testid="create-column-submit"]').click()
    cy.contains('[data-testid^="column-"]', "Todo").should("exist")

    cy.get('[data-testid="new-column-title"]').type("Done")
    cy.get('[data-testid="create-column-submit"]').click()
    cy.contains('[data-testid^="column-"]', "Done").should("exist")

    cy.contains('[data-testid^="column-"]', "Todo").within(() => {
      cy.get('[data-testid^="add-card-"]').click()
      cy.get('[data-testid^="new-card-title-"]').type(cardTitle)
      cy.get('[data-testid^="create-card-"]').click()
    })

    cy.contains('[data-testid^="column-"]', "Todo")
      .find(`[data-card-title="${cardTitle}"]`)
      .should("exist")

    const source = cy.get(`[data-card-title="${cardTitle}"]`)
    const target = cy
      .contains('[data-testid^="column-"]', "Done")
      .find('[data-testid^="column-drop-"]')
    dragAndDrop(source, target)

    cy.contains('[data-testid^="column-"]', "Done")
      .find(`[data-card-title="${cardTitle}"]`)
      .should("exist")
  })

  it("sends an invite from the board page", () => {
    const boardTitle = `E2E Invite ${Date.now()}`
    rememberBoard(boardTitle)

    signIn()

    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()

    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.get('[data-testid="invite-member-trigger"]').click()
    cy.get('[data-testid="invite-email"]').type("invitee@example.com")
    cy.get('[data-testid="invite-submit"]').click()
    cy.get('[data-testid="invite-email"]').should("have.value", "")
  })
})
