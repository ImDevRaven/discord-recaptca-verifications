// User data collection utilities
export interface UserData {
  username?: string
  userId?: string
  ipAddress?: string
  location?: {
    country?: string
    region?: string
    city?: string
    timezone?: string
    coordinates?: {
      latitude?: number
      longitude?: number
    }
  }
  browser?: {
    name?: string
    version?: string
    userAgent?: string
    language?: string
    languages?: string[]
    cookieEnabled?: boolean
    doNotTrack?: boolean
    onLine?: boolean
  }
  device?: {
    type?: string
    vendor?: string
    model?: string
    isMobile?: boolean
    isTablet?: boolean
    isDesktop?: boolean
    isTouchDevice?: boolean
  }
  os?: {
    name?: string
    version?: string
    platform?: string
    architecture?: string
  }
  screen?: {
    width?: number
    height?: number
    colorDepth?: number
    pixelRatio?: number
    orientation?: string
  }
  network?: {
    connectionType?: string
    effectiveType?: string
    downlink?: number
    rtt?: number
    saveData?: boolean
  }
  macAddress?: string // Note: This is very limited in browsers for privacy reasons
  fingerprint?: string
  timestamp?: string
}

// Browser detection utility
export function detectBrowser(): UserData["browser"] {
  if (typeof window === "undefined") return {}

  const userAgent = navigator.userAgent
  const browser: UserData["browser"] = {
    userAgent,
    language: navigator.language,
    languages: navigator.languages ? Array.from(navigator.languages) : [],
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === "1",
    onLine: navigator.onLine,
  }

  // Browser name and version detection
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser.name = "Chrome"
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/)
    browser.version = match ? match[1] : "Unknown"
  } else if (userAgent.includes("Firefox")) {
    browser.name = "Firefox"
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/)
    browser.version = match ? match[1] : "Unknown"
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser.name = "Safari"
    const match = userAgent.match(/Version\/(\d+\.\d+)/)
    browser.version = match ? match[1] : "Unknown"
  } else if (userAgent.includes("Edg")) {
    browser.name = "Edge"
    const match = userAgent.match(/Edg\/(\d+\.\d+)/)
    browser.version = match ? match[1] : "Unknown"
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser.name = "Opera"
    const match = userAgent.match(/(Opera|OPR)\/(\d+\.\d+)/)
    browser.version = match ? match[2] : "Unknown"
  } else {
    browser.name = "Unknown"
    browser.version = "Unknown"
  }

  return browser
}

// Operating System detection
export function detectOS(): UserData["os"] {
  if (typeof window === "undefined") return {}

  const userAgent = navigator.userAgent
  const platform = navigator.platform

  const os: UserData["os"] = {
    platform,
  }

  if (userAgent.includes("Windows NT 10.0")) {
    os.name = "Windows"
    os.version = "10/11"
  } else if (userAgent.includes("Windows NT 6.3")) {
    os.name = "Windows"
    os.version = "8.1"
  } else if (userAgent.includes("Windows NT 6.2")) {
    os.name = "Windows"
    os.version = "8"
  } else if (userAgent.includes("Windows NT 6.1")) {
    os.name = "Windows"
    os.version = "7"
  } else if (userAgent.includes("Mac OS X")) {
    os.name = "macOS"
    const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    os.version = match ? match[1].replace(/_/g, ".") : "Unknown"
  } else if (userAgent.includes("Linux")) {
    os.name = "Linux"
    if (userAgent.includes("Ubuntu")) os.version = "Ubuntu"
    else if (userAgent.includes("Fedora")) os.version = "Fedora"
    else if (userAgent.includes("SUSE")) os.version = "SUSE"
    else os.version = "Unknown Distribution"
  } else if (userAgent.includes("Android")) {
    os.name = "Android"
    const match = userAgent.match(/Android (\d+\.\d+)/)
    os.version = match ? match[1] : "Unknown"
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os.name = "iOS"
    const match = userAgent.match(/OS (\d+_\d+)/)
    os.version = match ? match[1].replace("_", ".") : "Unknown"
  } else {
    os.name = "Unknown"
    os.version = "Unknown"
  }

  // Architecture detection (limited)
  if (userAgent.includes("WOW64") || userAgent.includes("Win64") || userAgent.includes("x86_64")) {
    os.architecture = "64-bit"
  } else if (userAgent.includes("i386") || userAgent.includes("i686")) {
    os.architecture = "32-bit"
  } else {
    os.architecture = "Unknown"
  }

  return os
}

// Device detection
export function detectDevice(): UserData["device"] {
  if (typeof window === "undefined") return {}

  const userAgent = navigator.userAgent
  const device: UserData["device"] = {
    isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
  }

  // Device type detection
  if (/Mobi|Android/i.test(userAgent)) {
    device.type = "mobile"
    device.isMobile = true
    device.isTablet = false
    device.isDesktop = false
  } else if (/Tablet|iPad/i.test(userAgent)) {
    device.type = "tablet"
    device.isMobile = false
    device.isTablet = true
    device.isDesktop = false
  } else {
    device.type = "desktop"
    device.isMobile = false
    device.isTablet = false
    device.isDesktop = true
  }

  // Vendor detection
  if (userAgent.includes("iPhone") || userAgent.includes("iPad") || userAgent.includes("Mac")) {
    device.vendor = "Apple"
  } else if (userAgent.includes("Samsung")) {
    device.vendor = "Samsung"
  } else if (userAgent.includes("Huawei")) {
    device.vendor = "Huawei"
  } else if (userAgent.includes("Xiaomi")) {
    device.vendor = "Xiaomi"
  } else if (userAgent.includes("OnePlus")) {
    device.vendor = "OnePlus"
  } else {
    device.vendor = "Unknown"
  }

  return device
}

// Screen information
export function getScreenInfo(): UserData["screen"] {
  if (typeof window === "undefined") return {}

  return {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    orientation: screen.orientation?.type || "unknown",
  }
}

// Network information (if available)
export function getNetworkInfo(): UserData["network"] {
  if (typeof window === "undefined" || !("connection" in navigator)) return {}

  const connection =
    (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (!connection) return {}

  return {
    connectionType: connection.type || "unknown",
    effectiveType: connection.effectiveType || "unknown",
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false,
  }
}

// IP-based location (automatic, no user permission required)
export async function getIPLocation(): Promise<UserData["location"]> {
  try {
    console.log("Fetching IP-based location...")

    // Try multiple IP geolocation services for better reliability
    const services = [
      {
        url: "https://ipapi.co/json/",
        parser: (data: any) => ({
          country: data.country_name,
          region: data.region,
          city: data.city,
          timezone: data.timezone,
          coordinates: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        }),
      },
      {
        url: "https://api.ipgeolocation.io/ipgeo?apiKey=free",
        parser: (data: any) => ({
          country: data.country_name,
          region: data.state_prov,
          city: data.city,
          timezone: data.time_zone?.name,
          coordinates: {
            latitude: Number.parseFloat(data.latitude),
            longitude: Number.parseFloat(data.longitude),
          },
        }),
      },
      {
        url: "https://freeipapi.com/api/json",
        parser: (data: any) => ({
          country: data.countryName,
          region: data.regionName,
          city: data.cityName,
          timezone: data.timeZone,
          coordinates: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        }),
      },
    ]

    // Try services in order until one works
    for (const service of services) {
      try {
        console.log(`Trying location service: ${service.url}`)
        const response = await fetch(service.url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          // Add timeout
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const data = await response.json()
          const location = service.parser(data)

          console.log("Location detected:", {
            country: location.country,
            city: location.city,
            service: service.url,
          })

          return {
            ...location,
            timezone: location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        }
      } catch (error) {
        console.log(`Location service ${service.url} failed:`, error)
        continue
      }
    }

    console.log("All location services failed, using fallback")
  } catch (error) {
    console.log("IP location lookup failed:", error)
  }

  // Fallback to browser timezone only
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    country: "Unknown",
    region: "Unknown",
    city: "Unknown",
  }
}

// Generate browser fingerprint
export function generateFingerprint(): string {
  if (typeof window === "undefined") return "server-side"

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillText("Browser fingerprint", 2, 2)
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled,
    canvas.toDataURL(),
  ].join("|")

  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16)
}

// Main data collection function - automatic, no user prompts
export async function collectUserData(userId?: string, username?: string): Promise<UserData> {
  console.log("Starting automatic user data collection...")

  const userData: UserData = {
    userId,
    username,
    browser: detectBrowser(),
    os: detectOS(),
    device: detectDevice(),
    screen: getScreenInfo(),
    network: getNetworkInfo(),
    fingerprint: generateFingerprint(),
    timestamp: new Date().toISOString(),
  }

  // Automatically get IP-based location (no user permission required)
  try {
    userData.location = await getIPLocation()
  } catch (error) {
    console.error("Failed to get IP location:", error)
    userData.location = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
    }
  }

  // Note: MAC address is not accessible in browsers for privacy reasons
  userData.macAddress = "Not accessible in browser"

  console.log("User data collection completed:", {
    browser: userData.browser?.name,
    os: userData.os?.name,
    device: userData.device?.type,
    location: userData.location?.city,
    fingerprint: userData.fingerprint,
  })

  return userData
}
