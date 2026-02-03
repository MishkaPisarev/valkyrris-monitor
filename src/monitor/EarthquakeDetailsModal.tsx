import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Map as MapIcon, Navigation, Layers, AlertTriangle, Clock, Globe } from 'lucide-react'
import { Earthquake } from './useEarthquakes'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'
import { useTranslatedEarthquakes } from './useTranslatedEarthquakes'
import { useEarthquakeDetails } from './useEarthquakeDetails'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface EarthquakeDetailsModalProps {
  earthquake: Earthquake | null
  onClose: () => void
}

export function EarthquakeDetailsModal({ earthquake, onClose }: EarthquakeDetailsModalProps) {
  const { language } = useLanguage()
  const t = translations[language]
  // Memoize earthquake array to prevent unnecessary re-renders
  const earthquakeArray = useMemo(() => earthquake ? [earthquake] : [], [earthquake?.id])
  const translatedQuakes = useTranslatedEarthquakes(earthquakeArray)
  const { details, loading: detailsLoading } = useEarthquakeDetails(earthquake?.id || null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (earthquake) {
      console.log('[EARTHQUAKE_DETAILS_MODAL] Modal opened for:', earthquake.id)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset'
    }
  }, [earthquake])

  if (!earthquake) {
    console.log('[EARTHQUAKE_DETAILS_MODAL] No earthquake provided, returning null')
    return null
  }

  // Safely get translated quake or fallback to original - memoized to prevent infinite loops
  const quake = useMemo(() => {
    if (translatedQuakes && Array.isArray(translatedQuakes) && translatedQuakes.length > 0 && translatedQuakes[0]) {
      return translatedQuakes[0]
    }
    return earthquake
  }, [translatedQuakes, earthquake])

  // Validate quake data before using
  if (!quake || !quake.latitude || !quake.longitude || !quake.magnitude) {
    return null
  }

  // Memoize urgency calculations to prevent re-renders
  const isUrgent = useMemo(() => quake.magnitude > 4.5, [quake.magnitude])
  const isHigh = useMemo(() => quake.magnitude > 4.0, [quake.magnitude])
  const isModerate = useMemo(() => quake.magnitude > 3.0, [quake.magnitude])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString(
      language === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }
    )
  }

  const formatUTC = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
  }

  // Initialize map - with delay to ensure container is visible
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !earthquake || !quake) return

    // Small delay to ensure container is rendered and visible
    const initTimer = setTimeout(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return

      try {
        // Clear any existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        if (!quake.latitude || !quake.longitude) {
          console.error('[EARTHQUAKE_DETAILS_MODAL] Invalid coordinates:', quake)
          return
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true
        }).setView([quake.latitude, quake.longitude], 8)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map)

        // Add earthquake marker - Hitech neon colors
        const markerColor = isUrgent ? '#ef4444' : isHigh ? '#f59e0b' : isModerate ? '#3b82f6' : '#06b6d4'
        const icon = L.divIcon({
          className: 'custom-earthquake-marker',
          html: `
            <div style="
              width: 30px;
              height: 30px;
              background: ${markerColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 20px ${markerColor}, 0 0 40px ${markerColor}80;
            "></div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })

        L.marker([quake.latitude, quake.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'Inter, Roboto, sans-serif'; color: #E6E9ED;">
              <strong>M ${quake.magnitude.toFixed(1)}</strong><br/>
              ${quake.translatedPlace || quake.place}
            </div>
          `)

        mapInstanceRef.current = map

        // Force size recalculation after modal is fully rendered
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize()
            // Ensure map tiles load
            mapInstanceRef.current.whenReady(() => {
              console.log('[EARTHQUAKE_DETAILS_MODAL] Map ready and tiles loaded')
            })
          }
        }, 200)
      } catch (error) {
        console.error('[EARTHQUAKE_DETAILS_MODAL] Map initialization error:', error)
      }
    }, 150)

    return () => {
      clearTimeout(initTimer)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [earthquake?.id, quake?.latitude, quake?.longitude, quake?.magnitude, isUrgent, isHigh, isModerate])

  // Removed console.log from render to prevent infinite loops

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ 
        zIndex: 9999, 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto'
      }}
    >
      {/* Backdrop with semi-transparent background */}
      <div 
        className="absolute inset-0 backdrop-blur-sm" 
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }} 
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-6xl border border-cyan-500/30 bg-slate-900 shadow-2xl my-8 rounded-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          zIndex: 2, 
          backgroundColor: '#0f172a',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="border-b border-cyan-500/30 bg-slate-900/50 p-4 flex items-center justify-between">
          <div className="text-xs text-cyan-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
            [EARTHQUAKE_DETAILS] // USGS_DATA // ID: {earthquake.id}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto" style={{ backgroundColor: '#0f172a', minHeight: 0 }}>
          {/* Title Section */}
          <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {details?.title || `M ${quake.magnitude.toFixed(1)} – ${quake.translatedPlace || quake.place}`}
            </h2>
            <div className="text-sm text-slate-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
              {formatUTC(quake.time)} | {quake.latitude.toFixed(3)}°N {quake.longitude.toFixed(3)}°E | {quake.depth.toFixed(1)} km
            </div>
          </div>
          
          {/* Loading State for Details */}
          {detailsLoading && (
            <div className="border border-cyan-500/30 bg-slate-800/50 p-4 text-center rounded-lg">
              <div className="text-xs text-slate-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                {'>'} LOADING_DETAILED_DATA_FROM_USGS...
              </div>
            </div>
          )}

          {/* Grid Layout for Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Interactive Map */}
            <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
              <div className="text-xs text-cyan-400 mb-2 uppercase flex items-center space-x-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                <MapIcon className="w-4 h-4" />
                <span>{t.interactiveMap}</span>
              </div>
              <div 
                ref={mapContainerRef}
                className="w-full h-48 rounded-lg overflow-hidden"
                style={{ minHeight: '200px', backgroundColor: '#0f172a', position: 'relative', zIndex: 10 }}
              />
              <div className="text-xs text-slate-500 mt-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                Contributed by US
              </div>
            </div>

            {/* Origin Section */}
            <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
              <div className="text-xs text-cyan-400 mb-3 uppercase flex items-center space-x-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                <Navigation className="w-4 h-4" />
                <span>{t.origin}</span>
              </div>
              <div className="space-y-2 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                <div>
                  <span className="text-slate-400">Review Status:</span>
                  <span className="text-white ml-2 font-bold">
                    {details?.status ? details.status.toUpperCase() : 'AUTOMATIC'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Magnitude:</span>
                  <span className={`ml-2 font-bold ${
                    isUrgent ? 'text-red-400' : 
                    isHigh ? 'text-amber-400' : 
                    isModerate ? 'text-blue-400' : 
                    'text-cyan-400'
                  }`}>
                    {quake.magnitude.toFixed(1)} {details?.magType || 'mb'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Depth:</span>
                  <span className="text-white ml-2 font-bold">{quake.depth.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-slate-400">Time:</span>
                  <span className="text-white ml-2 font-bold">{formatUTC(quake.time)}</span>
                </div>
                {details?.updated && (
                  <div>
                    <span className="text-slate-400">Updated:</span>
                    <span className="text-white ml-2">{formatUTC(details.updated)}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-3" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                Contributed by US
              </div>
            </div>

            {/* Location Details */}
            <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
              <div className="text-xs text-cyan-400 mb-3 uppercase flex items-center space-x-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                <Globe className="w-4 h-4" />
                <span>{t.location}</span>
              </div>
              <div className="space-y-2 text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                <div>
                  <span className="text-slate-400">Place:</span>
                  <div className="text-white mt-1">{quake.translatedPlace || quake.place}</div>
                </div>
                <div>
                  <span className="text-slate-400">Latitude:</span>
                  <span className="text-white ml-2">{quake.latitude.toFixed(4)}°</span>
                </div>
                <div>
                  <span className="text-slate-400">Longitude:</span>
                  <span className="text-white ml-2">{quake.longitude.toFixed(4)}°</span>
                </div>
                {details?.dmin && (
                  <div>
                    <span className="text-slate-400">Distance:</span>
                    <span className="text-white ml-2">{details.dmin.toFixed(1)}°</span>
                  </div>
                )}
              </div>
            </div>

            {/* Felt Reports */}
            {details?.felt !== undefined && (
              <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
                <div className="text-xs text-cyan-400 mb-3 uppercase flex items-center space-x-2" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t.feltReport}</span>
                </div>
                <div className="text-sm" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                  <div className="text-3xl font-bold text-white mb-2">{details.felt}</div>
                  <div className="text-slate-400">Responses</div>
                  <div className="text-xs text-slate-500 mt-3">
                    Contribute to citizen science. Please tell us about your experience.
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-3" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                  Citizen Scientist Contributions
                </div>
              </div>
            )}

            {/* Additional Data */}
            {details && (
              <>
                {details.mmi !== undefined && (
                  <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
                    <div className="text-xs text-cyan-400 mb-2 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      INTENSITY (MMI)
                    </div>
                    <div className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      {details.mmi.toFixed(1)}
                    </div>
                  </div>
                )}
                {details.cdi !== undefined && (
                  <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
                    <div className="text-xs text-cyan-400 mb-2 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      CDI
                    </div>
                    <div className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      {details.cdi.toFixed(1)}
                    </div>
                  </div>
                )}
                {details.tsunami !== undefined && details.tsunami > 0 && (
                  <div className="border border-red-500/50 bg-red-500/10 p-4 rounded-lg">
                    <div className="text-xs text-red-400 mb-2 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      TSUNAMI WARNING
                    </div>
                    <div className="text-lg font-bold text-red-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      {details.tsunami === 1 ? 'YES' : 'POSSIBLE'}
                    </div>
                  </div>
                )}
                {details.alert && (
                  <div className="border border-amber-500/50 bg-amber-500/10 p-4 rounded-lg">
                    <div className="text-xs text-amber-400 mb-2 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      ALERT
                    </div>
                    <div className="text-lg font-bold text-amber-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                      {details.alert}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Technical Details */}
            {details && (
              <div className="border border-cyan-500/30 bg-slate-800/50 p-4 rounded-lg">
                <div className="text-xs text-cyan-400 mb-3 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                  {t.technicalData}
                </div>
                <div className="space-y-1 text-xs" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
                  {details.net && (
                    <div>
                      <span className="text-slate-400">Network:</span>
                      <span className="text-white ml-2">{details.net}</span>
                    </div>
                  )}
                  {details.code && (
                    <div>
                      <span className="text-slate-400">Code:</span>
                      <span className="text-white ml-2">{details.code}</span>
                    </div>
                  )}
                  {details.nst && (
                    <div>
                      <span className="text-slate-400">Stations:</span>
                      <span className="text-white ml-2">{details.nst}</span>
                    </div>
                  )}
                  {details.rms && (
                    <div>
                      <span className="text-slate-400">RMS:</span>
                      <span className="text-white ml-2">{details.rms.toFixed(2)}</span>
                    </div>
                  )}
                  {details.gap && (
                    <div>
                      <span className="text-slate-400">Gap:</span>
                      <span className="text-white ml-2">{details.gap.toFixed(1)}°</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* USGS Link (Optional - can be removed if not needed) */}
          <div className="border border-cyan-500/30 bg-slate-800/50 p-4 text-center rounded-lg">
            <a
              href={quake.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 border border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 text-xs uppercase transition-all duration-300 rounded-lg"
              style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
            >
              {t.viewOnUSGS} →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
