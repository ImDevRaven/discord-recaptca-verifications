"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, AlertTriangle, Bot, Hash, RefreshCw } from "lucide-react"

declare global {
  interface Window {
    grecaptcha: any
  }
}

type VerificationState = "loading" | "analyzing" | "validating" | "success" | "error"

const statusMessages = {
  loading: "Contacting verification server…",
  analyzing: "Analyzing activity…",
  validating: "Validating session…",
  success: "Verified! You may proceed.",
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
  const searchParams = useSearchParams()
  const userId = searchParams.get("id")

  // Development mode check
  const isDevelopment = process.env.NODE_ENV === "development"

  // Fade in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

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
          body: JSON.stringify({ id: userId, captcha: token }),
        })

        const result = await response.json()
        console.log("Verification result:", result)

        setTimeout(() => {
          if (!isComponentMounted) return

          if (result.success && result.score > 0.5) {
            setState("success")
            // Auto-close window after 3 seconds
            setTimeout(() => {
              if (isComponentMounted) {
                // Try to close the window/tab
                try {
                  window.close()
                } catch (error) {
                  console.log("Cannot close window automatically - user needs to close manually")
                  // Fallback: show a message to close manually
                  setCurrentMessage("Please close this tab to return to Discord.")
                }
              }
            }, 3000)
          } else {
            setErrorDetails(result.error || `Low verification score: ${result.score}`)
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
  }, [configLoaded, siteKey, userId, retryCount])

  const getIcon = () => {
    switch (state) {
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-400 animate-bounce" />
      case "error":
        return <AlertTriangle className="w-12 h-12 text-red-400 animate-pulse" />
      default:
        return <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Discord Verification</h1>
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
            {/* Discord icons */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Hash className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            {/* Status icon */}
            <div className="flex justify-center mb-6">{getIcon()}</div>

            {/* Status message */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Discord Verification</h1>
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
                <div className="text-center mt-2 animate-fade-in">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                    Verification complete! This window will close automatically.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If the window doesn't close, you can close it manually.
                  </p>
                </div>
              )}

              {state === "error" && (
                <div className="mt-4">
                  {errorDetails && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 p-2 rounded">
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
