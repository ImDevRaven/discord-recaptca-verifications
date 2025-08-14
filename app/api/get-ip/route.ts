import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Try to get IP from various headers
    const forwarded = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")
    const cfConnectingIP = request.headers.get("cf-connecting-ip")

    // Priority order: Cloudflare -> X-Forwarded-For -> X-Real-IP
    let ip = cfConnectingIP || (forwarded ? forwarded.split(",")[0].trim() : null) || realIP || "unknown"

    // Remove IPv6 prefix if present
    if (ip.startsWith("::ffff:")) {
      ip = ip.substring(7)
    }

    console.log("IP detected from headers:", ip)

    return NextResponse.json({
      ip,
      source: cfConnectingIP ? "cloudflare" : forwarded ? "forwarded" : realIP ? "real-ip" : "unknown",
    })
  } catch (error) {
    console.error("Error getting IP:", error)
    return NextResponse.json(
      {
        ip: "unknown",
        error: "Failed to detect IP",
      },
      { status: 500 },
    )
  }
}
