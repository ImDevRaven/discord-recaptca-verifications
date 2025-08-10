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
          headers: { "Content-Type": "application/json" },
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
        return "from-green-400 via-green-500 to-green-600 animate-none";
      case "error":
        return "from-red-400 via-red-500 to-red-600 animate-none";
      case "analyzing":
        return "from-blue-400 via-purple-500 to-indigo-500 animate-spin";
      case "validating":
        return "from-blue-400 via-purple-500 to-indigo-500 animate-pulse";
      default:
        return "from-blue-400 via-purple-500 to-indigo-500 animate-spin";
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900">
        <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{getTitle()}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">Initializing verification system…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md transform transition-all duration-1000 ease-out ${
            isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
          }`}
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow duration-300 p-8 border border-white/20">
            {/* Guild icon with animated border (if available) */}
            {guildIcon && (
              <div className="flex justify-center mb-8">
                <div className="relative flex items-center justify-center" style={{ width: 104, height: 104 }}>
                  {/* Animated border ring with dynamic color, half the previous thickness, no gap */}
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${getGuildIconBorder()} p-1.5 transition-all duration-700`}></div>
                  {/* Guild icon container centered inside border, flush with border */}
                  <div className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full overflow-hidden border-2 border-transparent shadow-lg" style={{ transform: 'translate(-50%, -50%)' }}>
                    <img
                      src={guildIcon || "/placeholder.svg"}
                      alt={`${guildName} icon`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide the image container if the icon fails to load
                        e.currentTarget.parentElement?.parentElement?.classList.add("hidden")
                      }}
                    />
                  </div>
                </div>
              </div>
            )}



            {/* Status message */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{getTitle()}</h1>
              <p
                className={`text-lg text-gray-600 dark:text-gray-300 min-h-[1.75rem] transition-all duration-300 ${
                  state === "validating" ? "animate-pulse" : ""
                }`}
              >
                {currentMessage}
                {state === "analyzing" && typewriterIndex < statusMessages.analyzing.length && (
                  <span className="animate-pulse">|</span>
                )}
              </p>

              {state === "success" && (
                <div className="text-center mt-4 animate-fade-in">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    This window will close automatically in {countdown} second{countdown !== 1 ? "s" : ""}.
                  </p>
                  <button
                    onClick={handleManualClose}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                  >
                    <X className="w-4 h-4" />
                    Close Now
                  </button>
                </div>
              )}

              {state === "error" && (
                <div className="mt-4">
                  {errorDetails && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                      {errorDetails}
                    </p>
                  )}
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  {retryCount > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Attempt {retryCount + 1}</p>
                  )}
                </div>
              )}
            </div>

            {/* Progress indicator */}
            {(state === "loading" || state === "analyzing" || state === "validating") && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: state === "loading" ? "33%" : state === "analyzing" ? "66%" : "100%",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
