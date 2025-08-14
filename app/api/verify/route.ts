import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Authorization check
  const authHeader = request.headers.get("authorization") || ""
  const expectedToken = process.env.DISCORD_API_KEY
  if (!expectedToken) {
    console.error("DISCORD_API_KEY not set in environment")
    return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 })
  }
  if (!authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const {
      id,
      captcha,
      guild,
      guild_name,
      guild_icon,
      userData, // New field for collected user data
    } = await request.json()

    console.log("Verification request received:", {
      id: id ? "present" : "missing",
      captcha: captcha ? "present" : "missing",
      guild: guild ? "present" : "missing",
      guild_name: guild_name || "not provided",
      userData: userData ? "present" : "missing",
    })

    // Extract IP address from request
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown"

    // Extract additional request headers for analysis
    const userAgent = request.headers.get("user-agent") || "unknown"
    const acceptLanguage = request.headers.get("accept-language") || "unknown"
    const referer = request.headers.get("referer") || "unknown"

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

    // Send verification to your Express server with the EXACT structure it expects
    try {
      console.log(`Sending verification to Express server for user ID: ${id} in guild: ${guild_name || guild}`)

      // Create payload that matches EXACTLY what your Express server expects
      const verificationPayload = {
        // Root level properties that your Express server checks for
        id,
        guild,
        guild_name,
        guild_icon,

        // userData object - this is what your Express server is looking for
        userData: userData || {
          userId: id,
          guildId: guild,
          timestamp: new Date().toISOString(),
          macAddress: "Not accessible in browser",
        },

        // serverData object with server-side collected information
        serverData: {
          ip_address: clientIp,
          user_agent: userAgent,
          accept_language: acceptLanguage,
          referer: referer,
          timestamp: new Date().toISOString(),
          recaptcha_score: score,
        },
      }

      console.log("📤 Sending payload to Express server:", {
        hasId: !!verificationPayload.id,
        hasGuild: !!verificationPayload.guild,
        hasUserData: !!verificationPayload.userData,
        hasServerData: !!verificationPayload.serverData,
        userDataKeys: verificationPayload.userData ? Object.keys(verificationPayload.userData) : [],
        payloadStructure: {
          id: typeof verificationPayload.id,
          guild: typeof verificationPayload.guild,
          userData: typeof verificationPayload.userData,
          serverData: typeof verificationPayload.serverData,
        },
      })

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 10000) // 10 second timeout
      })

      // Create the fetch promise - send data in the exact format your Express server expects
      const fetchPromise = fetch("http://node.waifly.com:27482/verified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Vercel-Verification-Service/1.0",
          Authorization: `Bearer ${process.env.DISCORD_API_KEY}`,
        },
        body: JSON.stringify(verificationPayload),
      })

      // Race between fetch and timeout
      const expressResponse = await Promise.race([fetchPromise, timeoutPromise])

      if (!expressResponse.ok) {
        const errorText = await expressResponse.text()
        console.error(`Express server returned ${expressResponse.status}: ${errorText}`)
        throw new Error(`Express server error: ${expressResponse.status} - ${errorText}`)
      }

      const expressResult = await expressResponse.json()
      console.log("📥 Express server response:", expressResult)

      if (!expressResult.success) {
        throw new Error(expressResult.message || "Express server rejected verification")
      }

      console.log(`✅ Successfully verified user ${id} with Express server for guild ${guild_name || guild}`)
    } catch (expressError) {
      console.error("❌ Failed to notify Express server:", expressError)

      // Provide more specific error messages
      let errorMessage = "Failed to complete verification with Discord server"
      if (expressError instanceof Error) {
        if (expressError.message.includes("timeout") || expressError.message.includes("Request timeout")) {
          errorMessage = "Discord server is taking too long to respond. Please try again."
        } else if (expressError.message.includes("ECONNREFUSED") || expressError.message.includes("fetch failed")) {
          errorMessage = "Cannot connect to Discord server. Please try again later."
        } else if (expressError.message.includes("500")) {
          errorMessage = "Discord server encountered an error. Please try again."
        } else if (expressError.message.includes("400")) {
          errorMessage = "Invalid verification request. Please try again."
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
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
              description: `User ID: ${id}\nGuild: ${guild_name || guild}\nIP: ${clientIp}\nreCAPTCHA Score: ${score}\nAction: ${recaptchaData.action || "verify_user"}`,
              color: 0x00ff00,
              timestamp: new Date().toISOString(),
              footer: {
                text: "Verification completed successfully",
              },
              thumbnail: guild_icon ? { url: guild_icon } : undefined,
              fields: userData
                ? [
                    {
                      name: "Browser Info",
                      value: `${userData.browser?.name || "Unknown"} on ${userData.os?.name || "Unknown"}`,
                      inline: true,
                    },
                    {
                      name: "Location",
                      value: userData.location ? `${userData.location.city}, ${userData.location.country}` : "Unknown",
                      inline: true,
                    },
                  ]
                : [],
            },
          ],
        }

        // Don't await this to avoid blocking the response
        fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        }).catch((webhookError) => {
          console.error("Discord webhook error:", webhookError)
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
      guild_name: guild_name,
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
