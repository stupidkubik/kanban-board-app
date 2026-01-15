import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type AuthUser = {
  uid: string
  displayName: string | null
  photoURL: string | null
  email: string | null
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated"

type AuthState = {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
}

const initialState: AuthState = {
  user: null,
  status: "loading",
  error: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authLoading(state) {
      state.status = "loading"
      state.error = null
    },
    authSignedIn(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      state.status = "authenticated"
      state.error = null
    },
    authSignedOut(state) {
      state.user = null
      state.status = "unauthenticated"
      state.error = null
    },
    authError(state, action: PayloadAction<string>) {
      state.error = action.payload
      state.status = "unauthenticated"
      state.user = null
    },
  },
})

export const { authLoading, authSignedIn, authSignedOut, authError } = authSlice.actions
export const authReducer = authSlice.reducer
