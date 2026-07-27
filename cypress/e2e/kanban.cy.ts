const setUiLocale = (win: Window) => {
  win.localStorage.setItem("uiLocale", "en")
  win.localStorage.setItem("uiLocaleTouched", "1")
}

const signIn = () => {
  cy.intercept("POST", "/api/auth/session").as("createSession")
  cy.visit("/sign-in", { onBeforeLoad: setUiLocale })
  cy.get("body", { timeout: 15_000 })
    .should(($body) => {
      const pathname = $body[0].ownerDocument.location.pathname
      const hasEmailForm = $body.find("#auth-email").length > 0
      expect(pathname === "/" || hasEmailForm).to.equal(true)
    })
    .then(($body) => {
      if ($body[0].ownerDocument.location.pathname === "/") {
        return
      }

      return cy.env(["E2E_EMAIL", "E2E_PASSWORD"], { log: false }).then(
        ({ E2E_EMAIL: email, E2E_PASSWORD: password }) => {
          if (typeof email !== "string" || typeof password !== "string") {
            throw new Error("The local E2E launcher did not provide Auth credentials.")
          }

          cy.get("#auth-email").type(email, { log: false })
          cy.get("#auth-password").type(password, { log: false })
          cy.contains("button", "Sign in with Email").click()
          return cy
            .wait("@createSession", { timeout: 15_000 })
            .its("response.statusCode")
            .should("eq", 200)
        }
      )
    })

  cy.location("pathname", { timeout: 15_000 }).should("eq", "/")
  cy.get('[data-testid="create-board-trigger"]', { timeout: 15_000 }).should(
    "be.visible"
  )
}

const dragAndDrop = (source: Cypress.Chainable, target: Cypress.Chainable) => {
  source.then(($source) => {
    const sourceRect = $source[0].getBoundingClientRect()
    const sourceX = sourceRect.left + sourceRect.width / 2
    const sourceY = sourceRect.top + sourceRect.height / 2

    target.then(($target) => {
      const targetRect = $target[0].getBoundingClientRect()
      const targetX = targetRect.left + targetRect.width / 2
      const targetY = targetRect.top + Math.min(targetRect.height / 2, 80)
      const pointerOptions = {
        eventConstructor: "PointerEvent",
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        force: true,
      }

      cy.wrap($source).trigger("pointerdown", {
        ...pointerOptions,
        button: 0,
        buttons: 1,
        clientX: sourceX,
        clientY: sourceY,
      })
      cy.wrap($source).trigger("pointermove", {
        ...pointerOptions,
        buttons: 1,
        clientX: sourceX + 10,
        clientY: sourceY,
      })
      cy.get('[data-testid="card-drag-overlay"]').should("be.visible")
      cy.wait(50)
      cy.wrap($target).trigger("pointermove", {
        ...pointerOptions,
        buttons: 1,
        clientX: targetX,
        clientY: targetY,
      })
      cy.wait(50)
      cy.get("body").trigger("pointerup", {
        ...pointerOptions,
        button: 0,
        buttons: 0,
        clientX: targetX,
        clientY: targetY,
      })
    })
  })
}

const createdBoardTitles: string[] = []

const rememberBoard = (title: string) => {
  createdBoardTitles.push(title)
}

const cleanupCreatedBoards = () => {
  if (!createdBoardTitles.length) {
    return
  }

  cy.intercept("DELETE", "/api/boards/*").as("deleteBoard")
  cy.visit("/", { onBeforeLoad: setUiLocale })
  createdBoardTitles.splice(0).forEach((title) => {
    const selector = `[data-board-title="${title}"]`
    cy.get(selector, { timeout: 15_000 }).within(() => {
      cy.get('[data-testid="delete-board-trigger"]').click()
    })
    cy.get('[data-testid="delete-board-confirm"]').click()
    cy.wait("@deleteBoard", { timeout: 20_000 })
      .its("response.statusCode")
      .should("eq", 200)
    cy.get(selector).should("not.exist")
  })
}

describe("kanban core flows", () => {
  before(() => {
    cy.env(["E2E_ALLOW_WRITES"], { log: false }).then(({ E2E_ALLOW_WRITES }) => {
      if (E2E_ALLOW_WRITES !== true) {
        throw new Error(
          "Run Cypress through the local Firebase emulator launcher."
        )
      }
    })
  })

  afterEach(cleanupCreatedBoards)

  it("creates a board, adds columns/cards, and drags a card", () => {
    const boardTitle = `E2E Core ${Date.now()}`
    const cardTitle = `Card ${Date.now()}`

    signIn()

    cy.intercept("POST", "/api/boards").as("createBoard")
    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()
    cy.wait("@createBoard", { timeout: 20_000 })
      .its("response.statusCode")
      .should("eq", 200)
    rememberBoard(boardTitle)

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

    signIn()

    cy.intercept("POST", "/api/boards").as("createBoard")
    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()
    cy.wait("@createBoard", { timeout: 20_000 })
      .its("response.statusCode")
      .should("eq", 200)
    rememberBoard(boardTitle)

    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.get('[data-testid="invite-member-trigger"]').click()
    cy.get('[data-testid="invite-email"]').type("invitee@example.com")
    cy.get('[data-testid="invite-submit"]').click()
    cy.get('[data-testid="invite-email"]').should("have.value", "")
  })
})
