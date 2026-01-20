"use client"

import * as React from "react"
import type { User } from "firebase/auth"
import { onAuthStateChanged } from "firebase/auth"

import { clientAuth } from "@/lib/firebase/client"
import {
  authError,
  authLoading,
  authSignedIn,
  authSignedOut,
} from "@/lib/store/auth-slice"
import { firestoreApi } from "@/lib/store/firestore-api"
import { useAppDispatch } from "@/lib/store/hooks"

type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    dispatch(authLoading())
    const unsubscribe = onAuthStateChanged(
      clientAuth,
      (currentUser) => {
        setUser(currentUser)
        setLoading(false)

        if (currentUser) {
          dispatch(
            authSignedIn({
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              email: currentUser.email,
            })
          )
        } else {
          dispatch(authSignedOut())
          dispatch(firestoreApi.util.resetApiState())
        }
      },
      (error) => {
        setUser(null)
        setLoading(false)
        dispatch(authError(error.message))
      }
    )

    return () => unsubscribe()
  }, [dispatch])

  const value = React.useMemo(() => ({ user, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
