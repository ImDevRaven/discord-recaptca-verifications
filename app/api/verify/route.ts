import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { id, captcha } = await request.json()

    console.log("Verification request received:", {
      id: id ? "present" : "missing",
      captcha: captcha ? "present" : "missing",
    })

    if (!captcha) {
      console.error("No captcha token provided")
      return NextResponse.json({ success: false, error: "No captcha token provided" }, { status: 400 })
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error("reCAPTCHA secret key not configured")
      return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 })
    }

    // Log token format for debugging
    console.log("Token format check:", {
      length: captcha.length,
      startsCorrectly: captcha.startsWith("03A"),
      type: typeof captcha,
    })

    // Verify reCAPTCHA with Google
    const recaptchaPayload = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: captcha,
    })

    console.log("Sending request to Google reCAPTCHA API...")

    const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Discord-Verification-Bot/1.0",
      },
      body: recaptchaPayload,
    })

    if (!recaptchaResponse.ok) {
      console.error(`reCAPTCHA API returned ${recaptchaResponse.status}: ${recaptchaResponse.statusText}`)
      throw new Error(`reCAPTCHA API returned ${recaptchaResponse.status}`)
    }

    const recaptchaData = await recaptchaResponse.json()
    console.log("reCAPTCHA API response:", {
      success: recaptchaData.success,
      score: recaptchaData.score,
      action: recaptchaData.action,
      hostname: recaptchaData.hostname,
      errorCodes: recaptchaData["error-codes"],
    })

    if (!recaptchaData.success) {
      console.error("reCAPTCHA verification failed:", recaptchaData["error-codes"])

      // Provide more specific error messages
      let errorMessage = "reCAPTCHA verification failed"
      const errorCodes = recaptchaData["error-codes"] || []

      if (errorCodes.includes("missing-input-secret")) {
        errorMessage = "Server configuration error: missing secret"
      } else if (errorCodes.includes("invalid-input-secret")) {
        errorMessage = "Server configuration error: invalid secret"
      } else if (errorCodes.includes("missing-input-response")) {
        errorMessage = "Missing reCAPTCHA response"
      } else if (errorCodes.includes("invalid-input-response")) {
        errorMessage = "Invalid reCAPTCHA response"
      } else if (errorCodes.includes("browser-error")) {
        errorMessage = "Browser compatibility issue - please try refreshing"
      } else if (errorCodes.includes("timeout-or-duplicate")) {
        errorMessage = "reCAPTCHA expired - please try again"
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          score: 0,
          errorCodes: errorCodes,
        },
        { status: 400 },
      )
    }

    // Check score threshold
    const score = recaptchaData.score || 0
    const threshold = 0.5

    console.log(`reCAPTCHA score: ${score}, threshold: ${threshold}`)

    // Optional: Send verification data to Discord webhook
    if (process.env.DISCORD_WEBHOOK_URL && id) {
      try {
        const webhookPayload = {
          embeds: [
            {
              title: score >= threshold ? "✅ User Verified" : "⚠️ Low Score Verification",
              description: `User ID: ${id}\nreCAPTCHA Score: ${score}\nAction: ${recaptchaData.action || "verify_user"}`,
              color: score >= threshold ? 0x00ff00 : 0xffaa00,
              timestamp: new Date().toISOString(),
            },
          ],
        }

        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        })
      } catch (webhookError) {
        console.error("Discord webhook error:", webhookError)
      }
    }

    return NextResponse.json({
      success: true,
      score: score,
      action: recaptchaData.action,
      hostname: recaptchaData.hostname,
    })
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
