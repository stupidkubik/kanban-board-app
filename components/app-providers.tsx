"use client"

import * as React from "react"
import { Provider } from "react-redux"

import { AuthProvider } from "@/components/auth-provider"
import { store } from "@/lib/store"
import { NotificationsProvider } from "@/features/notifications/ui/notifications-provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </AuthProvider>
    </Provider>
  )
}
