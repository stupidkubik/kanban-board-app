const setUiLocale = (win: Window) => {
  win.localStorage.setItem("uiLocale", "en")
  win.localStorage.setItem("uiLocaleTouched", "1")
}

const signIn = (
  emailEnv = "E2E_EMAIL",
  passwordEnv = "E2E_PASSWORD"
) => {
  cy.intercept("POST", "/api/auth/session").as("createSession")
  cy.visit("/sign-in", { onBeforeLoad: setUiLocale })
  cy.get("body", { timeout: 30_000 })
    .should(($body) => {
      const pathname = $body[0].ownerDocument.location.pathname
      const hasEmailForm = $body.find("#auth-email").length > 0
      expect(pathname === "/" || hasEmailForm).to.equal(true)
    })
    .then(($body) => {
      if ($body[0].ownerDocument.location.pathname === "/") {
        return
      }

      return cy.env([emailEnv, passwordEnv], { log: false }).then(
        (credentials) => {
          const email = credentials[emailEnv]
          const password = credentials[passwordEnv]
          if (typeof email !== "string" || typeof password !== "string") {
            throw new Error("The local E2E launcher did not provide Auth credentials.")
          }

          cy.get("#auth-email").type(email, { log: false })
          cy.get("#auth-password").type(password, { log: false })
          cy.contains("button", "Sign in with Email").click()
          return cy
            .wait("@createSession", { timeout: 30_000 })
            .its("response.statusCode")
            .should("eq", 200)
        }
      )
    })

  cy.get('[data-testid="create-board-trigger"]', { timeout: 30_000 }).should(
    "be.visible"
  )
  cy.location("pathname").should("eq", "/")
}

const signOut = () => {
  cy.visit("/", { onBeforeLoad: setUiLocale })
  cy.contains("button", "Sign out").click()
  cy.location("pathname", { timeout: 30_000 }).should("eq", "/sign-in")
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
      const moveProgress = [0.25, 0.5, 0.75, 1]
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
      moveProgress.forEach((progress) => {
        cy.wrap($source).trigger("pointermove", {
          ...pointerOptions,
          buttons: 1,
          clientX: sourceX + (targetX - sourceX) * progress,
          clientY: sourceY + (targetY - sourceY) * progress,
        })
      })
      cy.wrap($target).should("have.attr", "data-drop-active", "true")
      cy.wait(100)
      cy.wrap($source).trigger("pointerup", {
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
    cy.get(selector, { timeout: 30_000 }).within(() => {
      cy.get('[data-testid="delete-board-trigger"]').click()
    })
    cy.get('[data-testid="delete-board-confirm"]').click()
    cy.wait("@deleteBoard", { timeout: 40_000 })
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

  it("creates a board and exercises card CRUD, Undo, and drag-and-drop", () => {
    const boardTitle = `E2E Core ${Date.now()}`
    const cardTitle = `Card ${Date.now()}`
    const editedCardTitle = `${cardTitle} edited`

    signIn()

    cy.intercept("POST", "/api/boards").as("createBoard")
    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()
    cy.wait("@createBoard", { timeout: 20_000 })
      .its("response.statusCode")
      .should("eq", 200)
      .then(() => rememberBoard(boardTitle))

    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.url({ timeout: 45_000 }).should("match", /\/boards\/[^/]+$/)

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

    cy.get(`[data-card-title="${cardTitle}"]`).click()
    cy.get("#edit-card-title").clear().type(editedCardTitle)
    cy.contains("button", "Save").click()
    cy.get(`[data-card-title="${editedCardTitle}"]`).should("exist")

    cy.get(`[data-card-title="${editedCardTitle}"]`)
      .find('button[aria-label="Delete card"]')
      .click()
    cy.get('[role="alertdialog"]')
      .contains("button", "Delete card")
      .click()
    cy.get(`[data-card-title="${editedCardTitle}"]`).should("not.exist")
    cy.contains('[role="status"]', "Card deleted.").within(() => {
      cy.contains("button", "Undo").click()
    })
    cy.get(`[data-card-title="${editedCardTitle}"]`).should("exist")
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
      .then(() => rememberBoard(boardTitle))

    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.get('[data-testid="invite-member-trigger"]').click()
    cy.get('[data-testid="invite-email"]').type("invitee@example.com")
    cy.get('[data-testid="invite-submit"]').click()
    cy.get('[data-testid="invite-email"]').should("have.value", "")
  })

  it("changes an accepted member from editor to viewer in realtime", () => {
    const boardTitle = `E2E Roles ${Date.now()}`

    signIn()

    cy.intercept("POST", "/api/boards").as("createBoard")
    cy.get('[data-testid="create-board-trigger"]').click()
    cy.get('[data-testid="create-board-title"]').type(boardTitle)
    cy.get('[data-testid="create-board-submit"]').click()
    cy.wait("@createBoard", { timeout: 20_000 })
      .its("response.statusCode")
      .should("eq", 200)
      .then(() => rememberBoard(boardTitle))

    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.get('[data-testid="invite-member-trigger"]').click()
    cy.env(["E2E_MEMBER_EMAIL"], { log: false }).then((credentials) => {
      const email = credentials.E2E_MEMBER_EMAIL
      if (typeof email !== "string") {
        throw new Error("Missing local member email.")
      }
      cy.get('[data-testid="invite-email"]').type(email, { log: false })
    })
    cy.get('[data-testid="invite-submit"]').click()
    cy.get('[data-testid="invite-email"]').should("have.value", "")

    signOut()
    signIn("E2E_MEMBER_EMAIL", "E2E_MEMBER_PASSWORD")

    cy.get(`[data-testid="invite-card"][data-board-title="${boardTitle}"]`)
      .find('[data-testid="accept-invite"]')
      .click()
    cy.contains('[data-testid="board-card"]', boardTitle, {
      timeout: 30_000,
    }).click()
    cy.get('[data-testid="new-column-title"]').should("be.visible")

    signOut()
    signIn()
    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.get('[data-testid="invite-member-trigger"]').click()
    cy.intercept("PATCH", "/api/boards/*/members/*").as("updateMemberRole")
    cy.get('[data-testid^="participant-role-"]').click()
    cy.contains('[role="option"]', "Viewer").click()
    cy.wait("@updateMemberRole")
      .its("response.statusCode")
      .should("eq", 200)
    cy.contains('[role="status"]', "Member role updated.").should("be.visible")

    signOut()
    signIn("E2E_MEMBER_EMAIL", "E2E_MEMBER_PASSWORD")
    cy.contains('[data-testid="board-card"]', boardTitle).click()
    cy.contains("Read-only mode: editing is disabled.").should("be.visible")
    cy.get('[data-testid="new-column-title"]').should("not.exist")

    signOut()
    signIn()
  })
})
