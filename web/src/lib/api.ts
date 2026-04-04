import { supabase } from './supabase'

// ============================================================================
// External API Configuration
// ============================================================================

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? ''
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
const OPENWEATHER_GEO_URL = 'https://api.openweathermap.org/geo/1.0'

// ============================================================================
// Types
// ============================================================================

export type AppRole = 'driver' | 'manager' | 'admin'

export type Profile = {
  id: string
  role: AppRole
  full_name: string
  company_id: string | null
  balance: number
}

export type Claim = {
  id: string
  claim_type: string
  disruption_date: string
  requested_amount: number
  status: 'pending_review' | 'approved' | 'rejected'
  details: string | null
  admin_notes: string | null
  driver_id: string
  company_id: string | null
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

export type LedgerEntry = {
  id: string
  profile_id: string
  entry_type: 'credit' | 'debit' | 'adjustment'
  amount: number
  note: string | null
  claim_id: string | null
  created_at: string
}

export type Company = {
  id: string
  name: string
  created_at?: string
}

export type ClaimInsert = {
  driver_id: string
  company_id: string | null
  claim_type: string
  disruption_date: string
  requested_amount: number
  details?: string
}

export type ClaimDecision = {
  claimId: string
  status: 'approved' | 'rejected'
  adminNotes: string
  decidedBy: string
}

export type ApiResult<T> = { data: T; error: null } | { data: null; error: string }

// ============================================================================
// Weather Types
// ============================================================================

export type WeatherCondition = {
  id: number
  main: string
  description: string
  icon: string
}

export type CurrentWeather = {
  location: string
  country: string
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  visibility: number
  conditions: WeatherCondition[]
  rain1h?: number
  rain3h?: number
  timestamp: number
  isDisruptive: boolean
  disruptionType: string | null
}

export type WeatherForecast = {
  date: string
  temperature: number
  conditions: WeatherCondition[]
  rain?: number
  isDisruptive: boolean
  disruptionType: string | null
}

export type GeoLocation = {
  lat: number
  lon: number
  name: string
  state?: string
  country: string
}

export type DisruptionVerification = {
  verified: boolean
  confidence: 'high' | 'medium' | 'low'
  weatherConditions: WeatherCondition[]
  details: string
  timestamp: number
}

// ============================================================================
// Auth API
// ============================================================================

export async function signIn(email: string, password: string): Promise<ApiResult<{ userId: string }>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: { userId: data.user.id }, error: null }
}

export async function signOut(): Promise<ApiResult<void>> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: undefined, error: null }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data.session, error: null }
}

export function onAuthStateChange(callback: () => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// ============================================================================
// Profile API
// ============================================================================

export async function fetchProfile(userId: string): Promise<ApiResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, balance')
    .eq('id', userId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Profile, error: null }
}

export async function fetchDriversByCompany(companyId: string): Promise<ApiResult<Profile[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, balance')
    .eq('company_id', companyId)
    .eq('role', 'driver')
    .order('full_name')

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Profile[], error: null }
}

export async function fetchAllDrivers(): Promise<ApiResult<Profile[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, balance')
    .eq('role', 'driver')
    .order('full_name')

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Profile[], error: null }
}

// ============================================================================
// Claims API
// ============================================================================

export async function fetchClaimsByDriver(driverId: string): Promise<ApiResult<Claim[]>> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function fetchClaimsByCompany(companyId: string, limit?: number): Promise<ApiResult<Claim[]>> {
  let query = supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function fetchPendingClaims(): Promise<ApiResult<Claim[]>> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function fetchDecidedClaims(limit = 100): Promise<ApiResult<Claim[]>> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .neq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function createClaim(claim: ClaimInsert): Promise<ApiResult<Claim>> {
  const { data, error } = await supabase
    .from('claims')
    .insert({
      driver_id: claim.driver_id,
      company_id: claim.company_id,
      claim_type: claim.claim_type,
      disruption_date: claim.disruption_date,
      requested_amount: claim.requested_amount,
      details: claim.details ?? null,
      status: 'pending_review',
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Claim, error: null }
}

export async function decideClaim(decision: ClaimDecision): Promise<ApiResult<Claim>> {
  const { data, error } = await supabase
    .from('claims')
    .update({
      status: decision.status,
      admin_notes: decision.adminNotes,
      decided_by: decision.decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq('id', decision.claimId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Claim, error: null }
}

// ============================================================================
// Ledger API
// ============================================================================

export async function fetchLedgerByProfile(profileId: string): Promise<ApiResult<LedgerEntry[]>> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('id, profile_id, entry_type, amount, note, claim_id, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as LedgerEntry[], error: null }
}

// ============================================================================
// Companies API
// ============================================================================

export async function fetchAllCompanies(): Promise<ApiResult<Company[]>> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Company[], error: null }
}

export async function fetchCompanyById(companyId: string): Promise<ApiResult<Company>> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .eq('id', companyId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Company, error: null }
}

// ============================================================================
// Combined Fetches (for pages that need multiple data sources)
// ============================================================================

export async function fetchManagerDashboardData(companyId: string) {
  const [claimsResult, driversResult] = await Promise.all([
    fetchClaimsByCompany(companyId, 50),
    fetchDriversByCompany(companyId),
  ])

  return {
    claims: claimsResult.data ?? [],
    drivers: driversResult.data ?? [],
    error: claimsResult.error || driversResult.error || null,
  }
}

// ============================================================================
// Utility: Claim Statistics
// ============================================================================

export function computeClaimStats(claims: Claim[]) {
  const pending = claims.filter((c) => c.status === 'pending_review').length
  const approved = claims.filter((c) => c.status === 'approved').length
  const rejected = claims.filter((c) => c.status === 'rejected').length
  const totalRequested = claims.reduce((sum, c) => sum + c.requested_amount, 0)
  const avgClaim = claims.length ? Math.round(totalRequested / claims.length) : 0

  return { pending, approved, rejected, totalRequested, avgClaim, total: claims.length }
}

// ============================================================================
// Weather API
// ============================================================================

export function isWeatherApiConfigured(): boolean {
  return Boolean(OPENWEATHER_API_KEY)
}

// Weather condition IDs that indicate disruptive conditions
// https://openweathermap.org/weather-conditions
const DISRUPTIVE_WEATHER_IDS = {
  // Thunderstorm (200-232)
  thunderstorm: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232],
  // Heavy rain (502-504, 522, 531)
  heavyRain: [502, 503, 504, 522, 531],
  // Snow/Sleet (600-622)
  snow: [600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622],
  // Extreme conditions (781 tornado, 771 squall)
  extreme: [771, 781],
  // Dust/Sand storms (731, 751, 761, 762)
  dust: [731, 751, 761, 762],
}

function classifyDisruption(conditions: WeatherCondition[]): { isDisruptive: boolean; type: string | null } {
  for (const condition of conditions) {
    if (DISRUPTIVE_WEATHER_IDS.thunderstorm.includes(condition.id)) {
      return { isDisruptive: true, type: 'Thunderstorm' }
    }
    if (DISRUPTIVE_WEATHER_IDS.heavyRain.includes(condition.id)) {
      return { isDisruptive: true, type: 'Heavy Rain / Flood' }
    }
    if (DISRUPTIVE_WEATHER_IDS.snow.includes(condition.id)) {
      return { isDisruptive: true, type: 'Snow / Ice' }
    }
    if (DISRUPTIVE_WEATHER_IDS.extreme.includes(condition.id)) {
      return { isDisruptive: true, type: 'Extreme Weather' }
    }
    if (DISRUPTIVE_WEATHER_IDS.dust.includes(condition.id)) {
      return { isDisruptive: true, type: 'Dust Storm' }
    }
  }
  return { isDisruptive: false, type: null }
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<ApiResult<CurrentWeather>> {
  if (!OPENWEATHER_API_KEY) {
    return { data: null, error: 'Weather API key not configured' }
  }

  try {
    const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { data: null, error: errorData.message || `Weather API error: ${response.status}` }
    }

    const data = await response.json()
    const disruption = classifyDisruption(data.weather)

    const weather: CurrentWeather = {
      location: data.name,
      country: data.sys?.country ?? '',
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed ?? 0,
      visibility: data.visibility ?? 10000,
      conditions: data.weather,
      rain1h: data.rain?.['1h'],
      rain3h: data.rain?.['3h'],
      timestamp: data.dt * 1000,
      isDisruptive: disruption.isDisruptive,
      disruptionType: disruption.type,
    }

    return { data: weather, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch weather' }
  }
}

export async function fetchWeatherForecast(lat: number, lon: number, days = 5): Promise<ApiResult<WeatherForecast[]>> {
  if (!OPENWEATHER_API_KEY) {
    return { data: null, error: 'Weather API key not configured' }
  }

  try {
    const url = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&cnt=${days * 8}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { data: null, error: errorData.message || `Weather API error: ${response.status}` }
    }

    const data = await response.json()
    
    // Group by day and pick midday forecast for each
    const dailyMap = new Map<string, WeatherForecast>()
    
    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0]
      const hour = new Date(item.dt * 1000).getHours()
      
      // Prefer midday readings (11-14)
      if (!dailyMap.has(date) || (hour >= 11 && hour <= 14)) {
        const disruption = classifyDisruption(item.weather)
        dailyMap.set(date, {
          date,
          temperature: item.main.temp,
          conditions: item.weather,
          rain: item.rain?.['3h'],
          isDisruptive: disruption.isDisruptive,
          disruptionType: disruption.type,
        })
      }
    }

    return { data: Array.from(dailyMap.values()).slice(0, days), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch forecast' }
  }
}

export async function fetchHistoricalWeather(lat: number, lon: number, date: string): Promise<ApiResult<CurrentWeather>> {
  if (!OPENWEATHER_API_KEY) {
    return { data: null, error: 'Weather API key not configured' }
  }

  // OpenWeather One Call API 3.0 timemachine endpoint
  const timestamp = Math.floor(new Date(date).getTime() / 1000)
  
  try {
    const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${OPENWEATHER_API_KEY}&units=metric`
    const response = await fetch(url)
    
    if (!response.ok) {
      // Fall back to current weather if historical not available (requires paid plan)
      if (response.status === 401 || response.status === 403) {
        return { data: null, error: 'Historical weather requires OpenWeather One Call API 3.0 subscription' }
      }
      const errorData = await response.json().catch(() => ({}))
      return { data: null, error: errorData.message || `Weather API error: ${response.status}` }
    }

    const data = await response.json()
    const hourlyData = data.data?.[0] ?? data.current
    
    if (!hourlyData) {
      return { data: null, error: 'No historical data available for this date' }
    }

    const disruption = classifyDisruption(hourlyData.weather ?? [])

    const weather: CurrentWeather = {
      location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      country: '',
      temperature: hourlyData.temp,
      feelsLike: hourlyData.feels_like,
      humidity: hourlyData.humidity,
      windSpeed: hourlyData.wind_speed ?? 0,
      visibility: hourlyData.visibility ?? 10000,
      conditions: hourlyData.weather ?? [],
      rain1h: hourlyData.rain?.['1h'],
      timestamp: (hourlyData.dt ?? timestamp) * 1000,
      isDisruptive: disruption.isDisruptive,
      disruptionType: disruption.type,
    }

    return { data: weather, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch historical weather' }
  }
}

// ============================================================================
// Geocoding API
// ============================================================================

export async function geocodeLocation(query: string, limit = 5): Promise<ApiResult<GeoLocation[]>> {
  if (!OPENWEATHER_API_KEY) {
    return { data: null, error: 'Weather API key not configured' }
  }

  try {
    const url = `${OPENWEATHER_GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${OPENWEATHER_API_KEY}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { data: null, error: errorData.message || `Geocoding API error: ${response.status}` }
    }

    const data = await response.json()
    
    const locations: GeoLocation[] = data.map((item: { lat: number; lon: number; name: string; state?: string; country: string }) => ({
      lat: item.lat,
      lon: item.lon,
      name: item.name,
      state: item.state,
      country: item.country,
    }))

    return { data: locations, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to geocode location' }
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<ApiResult<GeoLocation>> {
  if (!OPENWEATHER_API_KEY) {
    return { data: null, error: 'Weather API key not configured' }
  }

  try {
    const url = `${OPENWEATHER_GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { data: null, error: errorData.message || `Reverse geocoding error: ${response.status}` }
    }

    const data = await response.json()
    
    if (!data.length) {
      return { data: null, error: 'No location found for these coordinates' }
    }

    const item = data[0]
    const location: GeoLocation = {
      lat: item.lat,
      lon: item.lon,
      name: item.name,
      state: item.state,
      country: item.country,
    }

    return { data: location, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to reverse geocode' }
  }
}

// ============================================================================
// Claim Verification (combines weather + location)
// ============================================================================

export async function verifyDisruptionClaim(
  claimType: string,
  disruptionDate: string,
  lat: number,
  lon: number
): Promise<ApiResult<DisruptionVerification>> {
  // Check if claim date is today or in the past
  const claimDateObj = new Date(disruptionDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  claimDateObj.setHours(0, 0, 0, 0)
  
  const isToday = claimDateObj.getTime() === today.getTime()
  const isPast = claimDateObj < today

  let weatherResult: ApiResult<CurrentWeather>
  
  if (isToday) {
    weatherResult = await fetchCurrentWeather(lat, lon)
  } else if (isPast) {
    weatherResult = await fetchHistoricalWeather(lat, lon, disruptionDate)
  } else {
    return {
      data: null,
      error: 'Cannot verify claims for future dates',
    }
  }

  if (weatherResult.error) {
    // Return low confidence if we can't verify
    return {
      data: {
        verified: false,
        confidence: 'low',
        weatherConditions: [],
        details: `Could not fetch weather data: ${weatherResult.error}`,
        timestamp: Date.now(),
      },
      error: null,
    }
  }

  const weather = weatherResult.data!
  
  // Match claim type to weather conditions
  const weatherBased = ['Heavy Rain / Flood', 'Thunderstorm', 'Snow / Ice', 'Extreme Weather']
  const isWeatherClaim = weatherBased.some((t) => claimType.toLowerCase().includes(t.toLowerCase()))
  
  if (isWeatherClaim) {
    if (weather.isDisruptive) {
      return {
        data: {
          verified: true,
          confidence: 'high',
          weatherConditions: weather.conditions,
          details: `Weather data confirms ${weather.disruptionType} conditions at ${weather.location}`,
          timestamp: weather.timestamp,
        },
        error: null,
      }
    } else {
      return {
        data: {
          verified: false,
          confidence: 'high',
          weatherConditions: weather.conditions,
          details: `Weather data shows normal conditions (${weather.conditions.map((c) => c.description).join(', ')}) - no disruption detected`,
          timestamp: weather.timestamp,
        },
        error: null,
      }
    }
  }

  // For non-weather claims (Strike, Curfew, Other), we can't auto-verify
  return {
    data: {
      verified: false,
      confidence: 'low',
      weatherConditions: weather.conditions,
      details: `Claim type "${claimType}" requires manual verification - weather conditions were: ${weather.conditions.map((c) => c.description).join(', ')}`,
      timestamp: weather.timestamp,
    },
    error: null,
  }
}

// ============================================================================
// Browser Geolocation Helper
// ============================================================================

export function getCurrentPosition(): Promise<ApiResult<{ lat: number; lon: number }>> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ data: null, error: 'Geolocation is not supported by this browser' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          data: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          error: null,
        })
      },
      (error) => {
        let message = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        resolve({ data: null, error: message })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  })
}
