import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  currentUser: null as null | { getIdToken: ReturnType<typeof vi.fn> },
}))

vi.mock("@/lib/firebase/client", () => ({
  clientAuth: {
    get currentUser() {
      return mocks.currentUser
    },
  },
}))

import {
  isTransientFirebaseError,
  retryFirebaseWrite,
} from "@/lib/firebase/retry-write"

describe("retryFirebaseWrite", () => {
  beforeEach(() => {
    mocks.currentUser = null
  })

  it("refreshes auth and retries one transient write failure", async () => {
    const getIdToken = vi.fn().mockResolvedValue("fresh-token")
    mocks.currentUser = { getIdToken }
    const write = vi
      .fn()
      .mockRejectedValueOnce({
        code: "auth/internal-error",
        message: "The user aborted a request",
      })
      .mockResolvedValueOnce("ok")

    await expect(retryFirebaseWrite(write)).resolves.toBe("ok")
    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(write).toHaveBeenCalledTimes(2)
  })

  it("does not retry permission or validation failures", async () => {
    const failure = { code: "permission-denied" }
    const write = vi.fn().mockRejectedValue(failure)

    await expect(retryFirebaseWrite(write)).rejects.toBe(failure)
    expect(write).toHaveBeenCalledOnce()
  })

  it("recognizes the browser AbortError form", () => {
    expect(
      isTransientFirebaseError(
        new DOMException("The user aborted a request", "AbortError")
      )
    ).toBe(true)
  })
})
