import { useState, useEffect } from 'react'
import { Earthquake } from './useEarthquakes'

export interface EarthquakeDetails {
  id: string
  magnitude: number
  magnitudeType?: string
  place: string
  time: number
  updated?: number
  depth: number
  latitude: number
  longitude: number
  url: string
  status?: string // 'reviewed', 'automatic', etc.
  tsunami?: number
  alert?: string
  felt?: number
  cdi?: number
  mmi?: number
  types?: string[]
  net?: string
  code?: string
  sources?: string
  nst?: number
  dmin?: number
  rms?: number
  gap?: number
  magType?: string
  title?: string
}

const USGS_DETAIL_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query'

export function useEarthquakeDetails(eventId: string | null) {
  const [details, setDetails] = useState<EarthquakeDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setDetails(null)
      return
    }

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const url = new URL(USGS_DETAIL_API)
        url.searchParams.set('eventid', eventId)
        url.searchParams.set('format', 'geojson')
        url.searchParams.set('includeallorigins', 'true')
        url.searchParams.set('includeallmagnitudes', 'true')

        const response = await fetch(url.toString())
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Edge case: Check if data structure is valid
        if (!data || !data.features || !Array.isArray(data.features) || data.features.length === 0) {
          throw new Error('No earthquake details found in API response')
        }

        const feature = data.features[0]
        
        // Edge case: Validate feature structure
        if (!feature || !feature.properties || !feature.geometry || !feature.geometry.coordinates) {
          throw new Error('Invalid earthquake data structure')
        }

        const props = feature.properties
        const coords = feature.geometry.coordinates

        const detailsData: EarthquakeDetails = {
          id: feature.id || eventId || 'unknown',
          magnitude: props.mag || 0,
          magnitudeType: props.magType,
          place: props.place || 'Unknown',
          time: props.time || Date.now(),
          updated: props.updated,
          depth: coords[2] || 0,
          latitude: coords[1] || 0,
          longitude: coords[0] || 0,
          url: props.url || props.detail || '',
          status: props.status,
          tsunami: props.tsunami,
          alert: props.alert,
          felt: props.felt,
          cdi: props.cdi,
          mmi: props.mmi,
          types: props.types,
          net: props.net,
          code: props.code,
          sources: props.sources,
          nst: props.nst,
          dmin: props.dmin,
          rms: props.rms,
          gap: props.gap,
          magType: props.magType,
          title: props.title
        }

        setDetails(detailsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch earthquake details')
        console.error('Earthquake details fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [eventId])

  return { details, loading, error }
}
