import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"

import { authReducer } from "@/lib/store/auth-slice"
import { boardUiReducer } from "@/lib/store/board-ui-slice"
import { firestoreApi } from "@/lib/store/firestore-api"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    boardUi: boardUiReducer,
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(firestoreApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

setupListeners(store.dispatch)
