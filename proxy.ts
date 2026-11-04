import { NextResponse, type NextRequest } from "next/server"

import { isCrossOriginMutation } from "@/lib/server/same-origin"

export function proxy(request: NextRequest) {
  if (isCrossOriginMutation(request)) {
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 }
    )
  }
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
