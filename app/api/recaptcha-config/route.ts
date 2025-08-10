import { NextResponse } from "next/server"

export async function GET() {
  try {
    const siteKey = process.env.RECAPTCHA_SITE_KEY

    if (!siteKey) {
      return NextResponse.json({ error: "reCAPTCHA not configured" }, { status: 500 })
    }

    return NextResponse.json({ siteKey })
  } catch (error) {
    console.error("Error fetching reCAPTCHA config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
