"use client"

import * as React from "react"
import { Provider } from "react-redux"

import { AuthProvider } from "@/components/auth-provider"
import { store } from "@/lib/store"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  )
}
