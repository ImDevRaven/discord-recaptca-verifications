import { type NextRequest, NextResponse } from "next/server"
import { AbortSignal } from "abort-controller"

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

    if (!id) {
      console.error("No user ID provided")
      return NextResponse.json({ success: false, error: "No user ID provided" }, { status: 400 })
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

    if (score < threshold) {
      console.log(`Score ${score} below threshold ${threshold}`)
      return NextResponse.json(
        {
          success: false,
          error: "Verification score too low",
          score: score,
        },
        { status: 400 },
      )
    }

    // Send verification to your Express server
    try {
      console.log(`Sending verification to Express server for user ID: ${id}`)

      const expressResponse = await fetch("http://node.waifly.com:27482/verified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Vercel-Verification-Service/1.0",
        },
        body: JSON.stringify({ id }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!expressResponse.ok) {
        const errorText = await expressResponse.text()
        console.error(`Express server returned ${expressResponse.status}: ${errorText}`)
        throw new Error(`Express server error: ${expressResponse.status}`)
      }

      const expressResult = await expressResponse.json()
      console.log("Express server response:", expressResult)

      if (!expressResult.success) {
        throw new Error(expressResult.message || "Express server rejected verification")
      }

      console.log(`Successfully verified user ${id} with Express server`)
    } catch (expressError) {
      console.error("Failed to notify Express server:", expressError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to complete verification with Discord server",
          details: expressError instanceof Error ? expressError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Optional: Send verification data to Discord webhook (if you still want this)
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        const webhookPayload = {
          embeds: [
            {
              title: "✅ User Verified via Vercel",
              description: `User ID: ${id}\nreCAPTCHA Score: ${score}\nAction: ${recaptchaData.action || "verify_user"}`,
              color: 0x00ff00,
              timestamp: new Date().toISOString(),
              footer: {
                text: "Verification completed successfully",
              },
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
        // Don't fail the verification if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      score: score,
      action: recaptchaData.action,
      hostname: recaptchaData.hostname,
      message: "Verification completed successfully",
    })
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
