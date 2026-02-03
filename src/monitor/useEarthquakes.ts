import { useState, useEffect } from 'react'

export interface Earthquake {
  id: string
  magnitude: number
  place: string
  time: number
  depth: number
  latitude: number
  longitude: number
  url: string
}

interface UseEarthquakesOptions {
  timeRange: '24h' | '7d' | '30d'
  minMagnitude?: number // Optional: override default min magnitude
  autoRefresh?: boolean // Optional: enable/disable auto refresh
}

// USGS Real-time GeoJSON Feeds - optimized for live data
const USGS_REALTIME_FEEDS = {
  '24h': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  '7d': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  '30d': 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
}

// Fallback to query API for custom filters
const USGS_API_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query'

export function useEarthquakes({ timeRange, minMagnitude = 2.5, autoRefresh = true }: UseEarthquakesOptions & { autoRefresh?: boolean }) {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEarthquakesFn = async () => {
      setLoading(true)
      setError(null)

      try {
        let url: string
        let data: any

        // Use real-time feed for faster updates (no minMagnitude filter)
        // For custom minMagnitude, use query API
        if (minMagnitude <= 0.1) {
          // Use real-time feed for all magnitudes
          url = USGS_REALTIME_FEEDS[timeRange]
          const response = await fetch(url)
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`)
          }
          
          data = await response.json()
        } else {
          // Use query API for custom magnitude filters
          const now = Date.now()
          let startTime: number
          switch (timeRange) {
            case '24h':
              startTime = now - 24 * 60 * 60 * 1000
              break
            case '7d':
              startTime = now - 7 * 24 * 60 * 60 * 1000
              break
            case '30d':
              startTime = now - 30 * 24 * 60 * 60 * 1000
              break
          }

          const startTimeISO = new Date(startTime).toISOString()
          const endTimeISO = new Date(now).toISOString()

          const queryUrl = new URL(USGS_API_BASE)
          queryUrl.searchParams.set('format', 'geojson')
          queryUrl.searchParams.set('latitude', '31.0')
          queryUrl.searchParams.set('longitude', '35.0')
          queryUrl.searchParams.set('maxradiuskm', '1500')
          queryUrl.searchParams.set('starttime', startTimeISO)
          queryUrl.searchParams.set('endtime', endTimeISO)
          queryUrl.searchParams.set('minmagnitude', minMagnitude.toString())

          url = queryUrl.toString()
          const response = await fetch(url)
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`)
          }
          
          data = await response.json()
        }

        // Check if data has features array (edge case: API returns empty or malformed data)
        if (!data.features || !Array.isArray(data.features)) {
          console.warn('[EARTHQUAKE_MONITOR] API returned invalid data structure:', data)
          setEarthquakes([])
          return
        }

        // Transform GeoJSON to our format
        let earthquakesData: Earthquake[] = data.features
          .filter((feature: any) => feature && feature.properties && feature.geometry && feature.geometry.coordinates)
          .map((feature: any) => ({
            id: feature.id || `quake-${feature.properties.time}-${feature.geometry.coordinates[0]}-${feature.geometry.coordinates[1]}`,
            magnitude: feature.properties.mag || 0,
            place: feature.properties.place || 'Unknown',
            time: feature.properties.time || Date.now(),
            depth: feature.geometry.coordinates[2] || 0, // Depth is the 3rd coordinate
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            url: feature.properties.url || ''
          }))

        // Filter by Middle East region (1500km radius from Israel) if using real-time feed
        if (minMagnitude <= 0.1) {
          const israelLat = 31.0
          const israelLon = 35.0
          const radiusKm = 1500

          earthquakesData = earthquakesData.filter((quake) => {
            // Calculate distance using Haversine formula
            const R = 6371 // Earth's radius in km
            const dLat = (quake.latitude - israelLat) * Math.PI / 180
            const dLon = (quake.longitude - israelLon) * Math.PI / 180
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(israelLat * Math.PI / 180) * Math.cos(quake.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const distance = R * c
            
            return distance <= radiusKm && quake.magnitude >= minMagnitude
          })
        }

        // Sort by time (most recent first)
        earthquakesData.sort((a, b) => b.time - a.time)

        console.log(`[EARTHQUAKE_MONITOR] Fetched ${earthquakesData.length} earthquakes (minMag: ${minMagnitude}, timeRange: ${timeRange})`)
        if (earthquakesData.length > 0) {
          console.log(`[EARTHQUAKE_MONITOR] Sample quake:`, earthquakesData[0])
        }

        setEarthquakes(earthquakesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch earthquakes')
        console.error('Earthquake fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    fetchEarthquakesFn()
    
    // Auto-refresh every 10 seconds for live real-time sensor data (if enabled)
    if (autoRefresh) {
      const interval = setInterval(fetchEarthquakesFn, 10 * 1000)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, minMagnitude, autoRefresh])

  return { 
    earthquakes, 
    loading, 
    error, 
    refetch: fetchEarthquakesFn
  }
}
