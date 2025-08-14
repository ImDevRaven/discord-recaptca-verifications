"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { RefreshCw } from "lucide-react"

declare global {
  interface Window {
    grecaptcha: any
  }
}

type VerificationState = "loading" | "analyzing" | "validating" | "success" | "error"

const statusMessages = {
  loading: "Loading…",
  analyzing: "Analyzing activity…",
  validating: "Verifying…",
  success: "Verified Successfully!",
  error: "Verification failed. Please try again.",
}

const wallpapers = [
  "https://i.imgur.com/SZXvBGR.jpeg",
  "https://i.postimg.cc/hPXJrGKF/warframe-wallpapers-5-v0-vg3x6ui7s4j81.png",
  "https://i.postimg.cc/4KXWX7ZZ/img.jpg",
  "https://i.postimg.cc/W3s8FZLc/blue-eyes-warframe-portrait-hd-warframe-2560x1440.jpg",
]

export default function VerificationPage() {
  const [state, setState] = useState<VerificationState>("loading")
  const [isVisible, setIsVisible] = useState(false)
  const [currentMessage, setCurrentMessage] = useState("")
  const [typewriterIndex, setTypewriterIndex] = useState(0)
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [errorDetails, setErrorDetails] = useState<string>("")
  const [retryCount, setRetryCount] = useState(0)
  const [countdown, setCountdown] = useState(5)
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>("")
  const searchParams = useSearchParams()

  // Extract parameters from URL
  const userId = searchParams.get("id")
  const guildId = searchParams.get("guild")
  const guildName = searchParams.get("guild_name")
  const guildIcon = searchParams.get("guild_icon")

  // Development mode check
  const isDevelopment = process.env.NODE_ENV === "development"

  // Fade in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Random wallpaper selection on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * wallpapers.length)
    setSelectedWallpaper(wallpapers[randomIndex])
  }, [])

  // Countdown timer for success state
  useEffect(() => {
    if (state === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (state === "success" && countdown === 0) {
      // Auto-close when countdown reaches 0
      try {
        window.close()
      } catch (error) {
        console.log("Cannot close window automatically - user needs to close manually")
        setCurrentMessage("Please close this tab to return to Discord.")
      }
    }
  }, [state, countdown])

  // Fetch reCAPTCHA configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log("Fetching reCAPTCHA configuration...")
        const response = await fetch("/api/recaptcha-config")
        const data = await response.json()

        if (data.siteKey) {
          console.log("Site key received successfully")
          setSiteKey(data.siteKey)
        } else {
          console.error("No site key received from API:", data)
          if (isDevelopment) {
            console.warn("Running in development mode - simulating verification")
            setSiteKey("development-mode")
          } else {
            setErrorDetails("Configuration error: No site key available")
          }
        }
      } catch (error) {
        console.error("Failed to fetch reCAPTCHA config:", error)
        if (isDevelopment) {
          console.warn("Running in development mode - simulating verification")
          setSiteKey("development-mode")
        } else {
          setErrorDetails("Failed to load verification configuration")
        }
      } finally {
        setConfigLoaded(true)
      }
    }

    fetchConfig()
  }, [isDevelopment])

  // Typewriter effect for analyzing state
  useEffect(() => {
    if (state === "analyzing") {
      const message = statusMessages.analyzing
      if (typewriterIndex < message.length) {
        const timer = setTimeout(() => {
          setCurrentMessage(message.slice(0, typewriterIndex + 1))
          setTypewriterIndex(typewriterIndex + 1)
        }, 50)
        return () => clearTimeout(timer)
      }
    } else {
      setCurrentMessage(statusMessages[state])
      setTypewriterIndex(0)
    }
  }, [state, typewriterIndex])

  // reCAPTCHA verification flow
  useEffect(() => {
    if (!configLoaded || !siteKey) return

    let isComponentMounted = true

    const loadRecaptcha = () => {
      // Development mode simulation
      if (siteKey === "development-mode") {
        simulateVerification()
        return
      }

      // Remove any existing reCAPTCHA scripts
      const existingScripts = document.querySelectorAll('script[src*="recaptcha"]')
      existingScripts.forEach((script) => script.remove())

      // Check if reCAPTCHA is already loaded
      if (window.grecaptcha) {
        delete window.grecaptcha
      }

      console.log("Loading reCAPTCHA script with site key:", siteKey.substring(0, 10) + "...")

      const script = document.createElement("script")
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log("reCAPTCHA script loaded successfully")
        // Wait for reCAPTCHA to be fully ready
        if (window.grecaptcha && isComponentMounted) {
          window.grecaptcha.ready(() => {
            console.log("reCAPTCHA is ready")
            if (isComponentMounted) {
              // Add a small delay to ensure everything is initialized
              setTimeout(() => {
                if (isComponentMounted) {
                  executeRecaptcha()
                }
              }, 1000)
            }
          })
        }
      }

      script.onerror = (error) => {
        console.error("Failed to load reCAPTCHA script:", error)
        if (isComponentMounted) {
          setErrorDetails("Failed to load reCAPTCHA script")
          setState("error")
        }
      }

      document.head.appendChild(script)
    }

    const simulateVerification = () => {
      if (!isComponentMounted) return

      console.log("Simulating verification in development mode")
      setTimeout(() => {
        if (isComponentMounted) setState("analyzing")
      }, 1500)

      setTimeout(() => {
        if (isComponentMounted) setState("validating")
      }, 3000)

      setTimeout(() => {
        if (isComponentMounted) setState("success")
      }, 4500)
    }

    const executeRecaptcha = () => {
      if (!window.grecaptcha || !isComponentMounted) {
        console.error("reCAPTCHA not available for execution")
        return
      }

      try {
        console.log("Executing reCAPTCHA...")
        window.grecaptcha.ready(() => {
          if (!isComponentMounted) return

          window.grecaptcha
            .execute(siteKey, {
              action: "verify_user",
            })
            .then((token: string) => {
              console.log("reCAPTCHA token generated:", token ? "✓" : "✗")
              if (isComponentMounted && token) {
                verifyToken(token)
              } else if (isComponentMounted) {
                setErrorDetails("Failed to generate reCAPTCHA token")
                setState("error")
              }
            })
            .catch((error: any) => {
              console.error("reCAPTCHA execution error:", error)
              if (isComponentMounted) {
                setErrorDetails(`reCAPTCHA execution failed: ${error.message || "Unknown error"}`)
                setState("error")
              }
            })
        })
      } catch (error) {
        console.error("reCAPTCHA error:", error)
        if (isComponentMounted) {
          setErrorDetails(`reCAPTCHA error: ${error instanceof Error ? error.message : "Unknown error"}`)
          setState("error")
        }
      }
    }

    const verifyToken = async (token: string) => {
      if (!isComponentMounted) return

      try {
        console.log("Starting token verification...")

        // Transition through states
        setTimeout(() => {
          if (isComponentMounted) setState("analyzing")
        }, 1500)

        setTimeout(() => {
          if (isComponentMounted) setState("validating")
        }, 3500)

        const response = await fetch("/api/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DISCORD_API_KEY || ""}`,
          },
          body: JSON.stringify({
            id: userId,
            captcha: token,
            guild: guildId,
            guild_name: guildName,
            guild_icon: guildIcon,
          }),
        })

        const result = await response.json()
        console.log("Verification result:", result)

        setTimeout(() => {
          if (!isComponentMounted) return

          if (result.success) {
            setState("success")
            setCountdown(5) // Reset countdown when success state is reached
          } else {
            setErrorDetails(result.error || result.details || "Verification failed")
            setState("error")
          }
        }, 5000)
      } catch (error) {
        console.error("Verification error:", error)
        setTimeout(() => {
          if (isComponentMounted) {
            setErrorDetails(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`)
            setState("error")
          }
        }, 5000)
      }
    }

    // Start the process
    const timer = setTimeout(() => {
      if (isComponentMounted) {
        loadRecaptcha()
      }
    }, 500)

    return () => {
      isComponentMounted = false
      clearTimeout(timer)
    }
  }, [configLoaded, siteKey, userId, guildId, guildName, guildIcon, retryCount])

  const handleRetry = () => {
    console.log("Retrying verification...")
    setState("loading")
    setCurrentMessage("")
    setTypewriterIndex(0)
    setErrorDetails("")
    setRetryCount((prev) => prev + 1)

    // Clean up any existing reCAPTCHA
    if (window.grecaptcha) {
      delete window.grecaptcha
    }

    // Remove existing scripts
    const existingScripts = document.querySelectorAll('script[src*="recaptcha"]')
    existingScripts.forEach((script) => script.remove())
  }

  const handleManualClose = () => {
    try {
      window.close()
    } catch (error) {
      console.log("Cannot close window programmatically")
    }
  }

  // Get the display title
  const getTitle = () => {
    if (guildName) {
      return `${guildName} Verification`
    }
    return "Discord Verification"
  }

  // Show loading state while fetching config
  if (!configLoaded) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full animate-spin mx-auto mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-white border-4 border-transparent bg-clip-padding"
            style={{
              background: "conic-gradient(from 0deg, #fbbf24, #f59e0b, #ffffff, #fbbf24)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
            }}
          />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-full flex">
        {/* Left side - Verification form */}
        <div className="w-full lg:w-[35%] p-8 lg:p-12 flex flex-col justify-center bg-white">
          {/* All the existing verification UI content stays the same */}
          <div
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
            }`}
          >
            {/* Header with logo/icon */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                {guildIcon ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden">
                      <img
                        src={guildIcon || "/placeholder.svg"}
                        alt={`${guildName} icon`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                    <span className="text-xl font-bold text-gray-900">{guildName || "Discord"}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">D</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">Discord</span>
                  </div>
                )}
              </div>

              {/* Back arrow */}
              <button className="mb-6 p-2 rounded-full hover:bg-gray-100 transition-colors"></button>

              {/* Main heading */}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Verify yourself</h1>
              <p className="text-gray-600 mb-8">{"You can use our server channels if you\'re verified with our security system."}</p>
            </div>

            {/* Verification status card */}
            <div className="space-y-6">
              {/* Status display */}
              <div className="text-center py-8">
                {/* Status indicator */}
                <div className="flex justify-center mb-4">
                  {state === "loading" || state === "analyzing" || state === "validating" ? (
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : state === "success" ? (
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-2">{statusMessages[state]}</h2>
                <p className="text-gray-600 mb-6">
                  {currentMessage}
                  {state === "analyzing" && typewriterIndex < statusMessages.analyzing.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </p>

                {/* Progress bar */}
                {(state === "loading" || state === "analyzing" || state === "validating") && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: state === "loading" ? "33%" : state === "analyzing" ? "66%" : "100%",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action button */}
              {state === "success" && (
                <div className="space-y-4">
                  <button
                    onClick={handleManualClose}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-2xl transition-colors duration-200"
                  >
                    Continue
                  </button>
                  <p className="text-center text-sm text-gray-500">
                    This window will close automatically in {countdown} second{countdown !== 1 ? "s" : ""}.
                  </p>
                </div>
              )}

              {state === "error" && (
                <div className="space-y-4">
                  {errorDetails && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-600">{errorDetails}</p>
                    </div>
                  )}
                  <button
                    onClick={handleRetry}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-2xl transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                  {retryCount > 0 && <p className="text-center text-xs text-gray-500">Attempt {retryCount + 1}</p>}
                </div>
              )}

              {(state === "loading" || state === "analyzing" || state === "validating") && (
                <div className="w-full bg-gray-200 hover:bg-gray-300 text-gray-400 font-semibold py-4 px-6 rounded-2xl cursor-not-allowed">
                  Please wait...
                </div>
              )}

              {/* Footer help text */}
              <p className="text-center text-sm text-gray-500">
                If you encounter any issues, please contact our support team.
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Image from screenshot */}
        <div className="hidden lg:block lg:w-[65%] relative">
          {/* Background image with blur and overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('${selectedWallpaper}')`,
              filter: "blur(1px)",
            }}
          >
            {/* Dark overlay only on background */}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Content overlay - NOT affected by blur or dark overlay */}
          <div className="relative z-10 h-full flex flex-col justify-between p-12">
            {/* Quote content - positioned like in screenshot */}
            <div className="flex-1 flex items-center">
              <div className="max-w-lg">
                <h1 className="text-4xl font-bold text-white mb-8 leading-tight drop-shadow-lg">
                  Verification system created to protect {guildName || "Discord"} members from hackers and spammers
                </h1>
                <div className="text-white">
                  <p className="font-semibold text-lg drop-shadow-md">Server Admin</p>
                  <p className="text-white/80 drop-shadow-md">Dev.Raven</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
