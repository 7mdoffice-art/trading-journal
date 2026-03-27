import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");

  const username = "7";
  const password = "566"; // 🔥 change this

  if (!auth) {
    return new Response("Auth required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area"',
      },
    });
  }

  const base64 = auth.split(" ")[1];
  const [user, pass] = atob(base64).split(":");

  if (user !== username || pass !== password) {
    return new Response("Access denied", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};