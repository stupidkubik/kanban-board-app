import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

// Firestore ends a listener for good on permission-denied, failed-precondition
// and similar errors. The query keeps its (emptied) data, so the failure is
// recorded here for the UI to show it with a retry.
type ListenerStatusState = Record<string, { code: string }>

const listenerStatusSlice = createSlice({
  name: "listenerStatus",
  initialState: {} as ListenerStatusState,
  reducers: {
    listenerStarted(state, action: PayloadAction<string>) {
      delete state[action.payload]
    },
    listenerFailed(
      state,
      action: PayloadAction<{ key: string; code: string }>
    ) {
      state[action.payload.key] = { code: action.payload.code }
    },
  },
})

export const { listenerStarted, listenerFailed } = listenerStatusSlice.actions
export const listenerStatusReducer = listenerStatusSlice.reducer
