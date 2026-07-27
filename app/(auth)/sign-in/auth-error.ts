import { FirebaseError } from "firebase/app"

import { getErrorMessage } from "@/lib/errors"
import type { getCopy } from "@/lib/i18n"

type AuthErrors = ReturnType<typeof getCopy>["auth"]["errors"]

export const getFriendlyAuthError = (error: unknown, errors: AuthErrors) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return errors.invalidEmail
      case "auth/missing-password":
        return errors.missingPassword
      case "auth/weak-password":
        return errors.weakPassword
      case "auth/user-not-found":
        return errors.userNotFound
      case "auth/wrong-password":
        return errors.wrongPassword
      case "auth/invalid-credential":
        return errors.invalidCredential
      case "auth/email-already-in-use":
        return errors.emailAlreadyInUse
      case "auth/account-exists-with-different-credential":
        return errors.accountExists
      case "auth/popup-closed-by-user":
        return errors.popupClosed
      case "auth/popup-blocked":
        return errors.popupBlocked
      case "auth/too-many-requests":
        return errors.tooManyRequests
      default:
        return error.message || errors.generic
    }
  }

  return getErrorMessage(error, errors.generic)
}
