"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, AlertTriangle, RefreshCw, X } from "lucide-react"

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

  // Determine border color for guild icon based on state
  const getGuildIconBorder = () => {
    switch (state) {
      case "success":
        return "border-green-500"
      case "error":
        return "border-red-500"
      case "analyzing":
        return "border-blue-500 animate-pulse"
      case "validating":
        return "border-purple-500 animate-pulse"
      default:
        return "border-gray-300 dark:border-gray-600 animate-pulse"
    }
  }

  const getStatusIcon = () => {
    switch (state) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case "analyzing":
      case "validating":
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
    }
  }

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-4">
              {guildIcon && (
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                    <img
                      src={guildIcon || "/placeholder.svg"}
                      alt={`${guildName} icon`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{getTitle()}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Initializing verification system…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md transform transition-all duration-500 ease-out ${
          isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start space-x-4">
            {/* Guild Icon */}
            {guildIcon && (
              <div className="flex-shrink-0">
                <div
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 ${getGuildIconBorder()} transition-colors duration-300`}
                >
                  <img
                    src={guildIcon || "/placeholder.svg"}
                    alt={`${guildName} icon`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{getTitle()}</h1>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2 mb-4">
                {getStatusIcon()}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentMessage}
                  {state === "analyzing" && typewriterIndex < statusMessages.analyzing.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </p>
              </div>

              {/* Progress Bar */}
              {(state === "loading" || state === "analyzing" || state === "validating") && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: state === "loading" ? "33%" : state === "analyzing" ? "66%" : "100%",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Success Actions */}
              {state === "success" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This window will close automatically in {countdown} second{countdown !== 1 ? "s" : ""}.
                  </p>
                  <button
                    onClick={handleManualClose}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                    <span>Close Now</span>
                  </button>
                </div>
              )}

              {/* Error Actions */}
              {state === "error" && (
                <div className="space-y-3">
                  {errorDetails && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-400">{errorDetails}</p>
                    </div>
                  )}
                  <button
                    onClick={handleRetry}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                  </button>
                  {retryCount > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Attempt {retryCount + 1}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
