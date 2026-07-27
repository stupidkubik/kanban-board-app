import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react"

export const firestoreBaseApi = createApi({
  reducerPath: "firestoreApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Board", "Invite", "Column", "Member", "Card"],
  endpoints: () => ({}),
})
