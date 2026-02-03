import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Layers, Navigation } from 'lucide-react'
import { Earthquake } from './useEarthquakes'
import { useLanguage } from './LanguageContext'
import { translations } from './i18n'
import { useTranslatedEarthquakes } from './useTranslatedEarthquakes'

interface MapViewProps {
  earthquakes: Earthquake[]
  onEarthquakeClick?: (earthquake: Earthquake) => void
}

export function MapView({ earthquakes, onEarthquakeClick }: MapViewProps) {
  const { language } = useLanguage()
  const t = translations[language]
  const translatedEarthquakes = useTranslatedEarthquakes(earthquakes)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const clusterGroupRef = useRef<L.LayerGroup | null>(null)
  const tectonicPlatesRef = useRef<L.GeoJSON | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [showTectonicPlates, setShowTectonicPlates] = useState(true)

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocation error:', error)
          // Default to Israel center if geolocation fails
          setUserLocation({ lat: 31.0, lon: 35.0 })
        }
      )
    } else {
      setUserLocation({ lat: 31.0, lon: 35.0 })
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !userLocation) return

    // Small delay to ensure container is rendered (longer delay for mobile)
    const initTimer = setTimeout(() => {
      if (!mapRef.current) return

      try {
        // Initialize map centered on user location or Israel with macro zoom (shows entire Middle East)
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
          // iOS Safari fixes
          preferCanvas: false, // Use DOM renderer for better mobile compatibility
          tap: true, // Enable tap events
          touchZoom: true, // Enable touch zoom
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          scrollWheelZoom: true,
          dragging: true
        }).setView([userLocation.lat, userLocation.lon], 6) // Zoom level 6 for macro view of Middle East

      // Use dark theme tiles (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map)

      // Add user location marker
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
      
      L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<div style="font-family: 'Inter, Roboto, sans-serif'; color: #E6E9ED;"><strong>${t.yourLocation}</strong></div>`)

      // Initialize marker layer group (without clustering for now due to Vite compatibility issues)
      // We'll add markers directly to a layer group for easier management
      const markerLayer = L.layerGroup()
      clusterGroupRef.current = markerLayer as any // Store as layerGroup for compatibility
      map.addLayer(markerLayer)

      // Load and add tectonic plate boundaries
      fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
        .then(response => response.json())
        .then(data => {
          if (tectonicPlatesRef.current) {
            map.removeLayer(tectonicPlatesRef.current)
          }
          
          const tectonicLayer = L.geoJSON(data, {
            style: {
              color: '#A30000', // Signal Red - matches site theme
              weight: 2,
              opacity: 0.7,
              fillOpacity: 0,
              dashArray: '5, 5'
            },
            onEachFeature: (feature, layer) => {
              // Optional: Add popup with plate boundary info
              if (feature.properties && feature.properties.Name) {
                layer.bindPopup(`<div style="font-family: 'Inter, Roboto, sans-serif'; color: #E6E9ED;">
                  <strong>${t.tectonicBoundary || 'Tectonic Boundary'}</strong><br/>
                  ${feature.properties.Name || 'Unknown'}
                </div>`)
              }
            }
          })
          
          tectonicPlatesRef.current = tectonicLayer
          if (showTectonicPlates) {
            tectonicLayer.addTo(map)
          }
        })
        .catch(error => {
          console.warn('[MAP_VIEW] Could not load tectonic plate boundaries:', error)
        })

        mapInstanceRef.current = map
        
        // Force size recalculation and set ready state (longer delay for mobile)
        setTimeout(() => {
          if (mapInstanceRef.current && clusterGroupRef.current) {
            try {
              mapInstanceRef.current.invalidateSize()
              setMapReady(true)
              console.log('[MAP_VIEW] Map initialized and ready')
            } catch (sizeError) {
              console.warn('[MAP_VIEW] Error invalidating size:', sizeError)
              setMapReady(true) // Set ready anyway
            }
          }
        }, 200) // Longer delay for mobile devices
      } catch (mapError) {
        console.error('[MAP_VIEW] Error initializing map:', mapError)
        // Set ready state anyway to prevent black screen
        setMapReady(true)
      }
    }, 100) // Longer initial delay for mobile

    return () => {
      clearTimeout(initTimer)
      if (tectonicPlatesRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(tectonicPlatesRef.current)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMapReady(false)
      }
      tectonicPlatesRef.current = null
    }
  }, [userLocation, showTectonicPlates])

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !clusterGroupRef.current) {
      console.log(`[MAP_VIEW] Not ready - mapInstance: ${!!mapInstanceRef.current}, mapReady: ${mapReady}, clusterGroup: ${!!clusterGroupRef.current}`)
      return
    }

    console.log(`[MAP_VIEW] Starting to render ${earthquakes.length} earthquakes`)

    // Clear existing markers
    if (clusterGroupRef.current) {
      (clusterGroupRef.current as L.LayerGroup).clearLayers()
    }
    markersRef.current = []

    // Ensure map size is correct
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    }, 50)

    // Calculate distances and sort by proximity
    const earthquakesWithDistance = translatedEarthquakes.map(quake => {
      if (!userLocation) return { ...quake, distance: 0 }
      const distance = L.latLng(userLocation.lat, userLocation.lon)
        .distanceTo(L.latLng(quake.latitude, quake.longitude)) / 1000 // Convert to km
      return { ...quake, distance }
    }).sort((a, b) => a.distance - b.distance)

    console.log(`[MAP_VIEW] Rendering ${earthquakesWithDistance.length} earthquakes on map`)

    // Edge case: No earthquakes to display
    if (earthquakesWithDistance.length === 0) {
      console.log(`[MAP_VIEW] No earthquakes to display`)
      // Clear existing markers
      if (clusterGroupRef.current) {
        (clusterGroupRef.current as L.LayerGroup).clearLayers()
      }
      markersRef.current = []
      return
    }

    // Add markers for each earthquake
    earthquakesWithDistance.forEach((quake, index) => {
      // Edge case: Validate quake data
      if (!quake || typeof quake.latitude !== 'number' || typeof quake.longitude !== 'number' || isNaN(quake.latitude) || isNaN(quake.longitude)) {
        console.warn(`[MAP_VIEW] Skipping invalid quake data:`, quake)
        return
      }

      const isUrgent = quake.magnitude > 4.5
      const isHigh = quake.magnitude > 4.0
      const isModerate = quake.magnitude > 3.0
      
      // Determine marker color and size based on magnitude - Hitech neon colors
      let markerColor = '#06b6d4' // cyan for small
      let borderColor = '#0891b2'
      let size = 'w-4 h-4 text-[10px]'
      
      if (isUrgent) {
        markerColor = '#ef4444' // red
        borderColor = '#dc2626'
        size = 'w-8 h-8 text-sm'
      } else if (isHigh) {
        markerColor = '#f59e0b' // amber
        borderColor = '#d97706'
        size = 'w-6 h-6 text-xs'
      } else if (isModerate) {
        markerColor = '#3b82f6' // electric blue
        borderColor = '#2563eb'
        size = 'w-5 h-5 text-xs'
      }

      // Format magnitude display (2 decimals for < 1.0, 1 decimal for >= 1.0)
      const magDisplay = quake.magnitude < 1.0 ? quake.magnitude.toFixed(2) : quake.magnitude.toFixed(1)

      // Create custom icon with magnitude and pulsing rings
      const icon = L.divIcon({
        className: 'custom-earthquake-marker',
        html: `
          <div class="earthquake-marker-container" style="position: relative; width: 100%; height: 100%;">
            <div class="earthquake-pulse-ring" style="border-color: ${markerColor};"></div>
            <div class="earthquake-pulse-ring-delay" style="border-color: ${markerColor};"></div>
            <div class="earthquake-marker ${size}" style="
              background: ${markerColor};
              border: 2px solid ${borderColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-family: 'JetBrains Mono', monospace;
              box-shadow: 0 0 15px ${markerColor}, 0 0 30px ${markerColor}80, 0 0 45px ${markerColor}40;
              position: relative;
              z-index: 10;
            ">
              ${magDisplay}
            </div>
          </div>
        `,
        iconSize: isUrgent ? [32, 32] : isHigh ? [24, 24] : isModerate ? [20, 20] : [16, 16],
        iconAnchor: isUrgent ? [16, 16] : isHigh ? [12, 12] : isModerate ? [10, 10] : [8, 8]
      })

      const marker = L.marker([quake.latitude, quake.longitude], { icon })
      
      // Create popup with detailed info including distance - Hitech style
      const popupContent = `
        <div style="font-family: 'Inter, Roboto, sans-serif'; font-size: 12px; color: #E6E9ED; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            ${isUrgent ? '<span style="color: #ef4444; font-size: 16px;">⚠️</span>' : ''}
            <strong style="color: ${isUrgent ? '#ef4444' : isHigh ? '#f59e0b' : isModerate ? '#3b82f6' : '#06b6d4'}; font-size: 18px;">
              M ${quake.magnitude < 1.0 ? quake.magnitude.toFixed(2) : quake.magnitude.toFixed(1)}
            </strong>
            ${isUrgent ? `<span style="color: #ef4444; font-size: 10px;">[${t.urgent}]</span>` : ''}
          </div>
          <div style="margin-bottom: 4px; color: #E6E9ED;">
            📍 ${quake.translatedPlace || quake.place}
          </div>
          <div style="margin-bottom: 4px; color: #06b6d4; font-weight: bold;">
            📏 ${t.distance}: ${quake.distance.toFixed(1)} ${t.fromYou}
          </div>
          <div style="margin-bottom: 4px; color: #94a3b8;">
            ${t.depth}: ${quake.depth.toFixed(1)} km
          </div>
          <div style="margin-bottom: 4px; color: #94a3b8;">
            ${t.coordinates}: ${quake.latitude.toFixed(3)}°, ${quake.longitude.toFixed(3)}°
          </div>
          <div style="margin-bottom: 8px; color: #64748b; font-size: 10px;">
            ${new Date(quake.time).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
          </div>
          <button class="earthquake-details-btn" data-quake-id="${quake.id}" style="
            color: #06b6d4;
            text-decoration: none;
            border: 1px solid #06b6d4;
            padding: 4px 8px;
            display: inline-block;
            margin-top: 4px;
            background: rgba(6, 182, 212, 0.1);
            cursor: pointer;
            font-family: 'Inter, Roboto, sans-serif';
            border-radius: 4px;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(6, 182, 212, 0.2)'; this.style.boxShadow='0 0 10px rgba(6, 182, 212, 0.5)'" onmouseout="this.style.background='rgba(6, 182, 212, 0.1)'; this.style.boxShadow='none'">${t.viewDetails} →</button>
        </div>
      `
      
      const popup = L.popup({
        className: 'custom-popup',
        maxWidth: 280
      }).setContent(popupContent)
      
      marker.bindPopup(popup)
      
      // Add click handler for details button
      marker.on('popupopen', () => {
        setTimeout(() => {
          const popupElement = marker.getPopup()?.getElement()
          if (popupElement && onEarthquakeClick) {
            const button = popupElement.querySelector('button')
            if (button) {
              console.log('[MAP_VIEW] Setting up details button for quake:', quake.id)
              button.onclick = (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[MAP_VIEW] Details button clicked for:', quake.id)
                onEarthquakeClick(quake)
                marker.closePopup()
              }
            } else {
              console.warn('[MAP_VIEW] Details button not found in popup')
            }
          }
        }, 100)
      })

      markersRef.current.push(marker)
      if (clusterGroupRef.current) {
        // clusterGroupRef is actually a LayerGroup
        (clusterGroupRef.current as L.LayerGroup).addLayer(marker)
      } else {
        // Fallback: add directly to map
        marker.addTo(mapInstanceRef.current!)
      }
      
      if (index === 0) {
        console.log(`[MAP_VIEW] Added first marker at [${quake.latitude}, ${quake.longitude}], mag: ${quake.magnitude}`)
      }
    })
    
    console.log(`[MAP_VIEW] Added ${markersRef.current.length} markers to cluster group`)
    
    // Force map to refresh and center on latest earthquake with macro zoom
    if (mapInstanceRef.current && markersRef.current.length > 0) {
      mapInstanceRef.current.invalidateSize()
      
      // Center on the most recent earthquake (first in array) with macro zoom
      setTimeout(() => {
        if (markersRef.current.length > 0 && translatedEarthquakes.length > 0) {
          try {
            // Get the most recent earthquake (first in sorted array)
            const latestQuake = translatedEarthquakes[0]
            if (latestQuake && latestQuake.latitude && latestQuake.longitude) {
              // Macro zoom: Zoom level 6 shows entire Middle East region
              const macroZoom = 6
              
              // Center map on latest earthquake with macro zoom (no zoom change, just center)
              mapInstanceRef.current.setView([latestQuake.latitude, latestQuake.longitude], macroZoom, { animate: true })
              console.log(`[MAP_VIEW] Centered map on latest earthquake at [${latestQuake.latitude}, ${latestQuake.longitude}] with macro zoom`)
            }
          } catch (e) {
            console.warn(`[MAP_VIEW] Error centering on earthquake:`, e)
          }
        }
      }, 200)
    }
  }, [translatedEarthquakes, mapReady, userLocation, language, t, onEarthquakeClick])

  return (
    <div className="h-full w-full flex flex-col border border-cyan-500/30 bg-slate-800/30 overflow-hidden" style={{ minHeight: '400px', position: 'relative' }}>
      <div className="p-2 md:p-4 border-b border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900/50 flex-shrink-0 gap-2">
        <div className="text-xs text-cyan-400 uppercase" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
          {t.mapView}
        </div>
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            <span>{t.yourLocation}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700"></div>
            <span>{t.urgent} ({'>'}4.5)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-700"></div>
            <span>{t.high} (4.0-4.5)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-700"></div>
            <span>{t.moderate} (3.0-4.0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-cyan-700"></div>
            <span>{t.small} ({'<'}3.0)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-red-500" style={{ borderStyle: 'dashed' }}></div>
            <span>{t.tectonicBoundary}</span>
          </div>
        </div>
      </div>
      <div className="relative w-full flex-1" style={{ minHeight: '400px', position: 'relative' }}>
        {/* Center to User Location Button */}
        <button
          onClick={() => {
            if (!mapInstanceRef.current || !userLocation) return
            // Center on user location without changing zoom
            const currentZoom = mapInstanceRef.current.getZoom()
            mapInstanceRef.current.setView([userLocation.lat, userLocation.lon], currentZoom, { animate: true })
            console.log('[MAP_VIEW] Centered map on user location')
          }}
          className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-2 md:px-3 py-1 md:py-2 border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs uppercase transition-all duration-300 flex items-center space-x-2 rounded-lg backdrop-blur-sm touch-manipulation"
          style={{ fontFamily: 'Inter, Roboto, sans-serif', WebkitTapHighlightColor: 'transparent' }}
          title={t.centerToMe || 'Center to my location'}
        >
          <Navigation className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">{t.centerToMe || 'CENTER'}</span>
        </button>

        {/* Tectonic Plates Toggle Button */}
        <button
          onClick={() => {
            if (!mapInstanceRef.current || !tectonicPlatesRef.current) return
            if (showTectonicPlates) {
              mapInstanceRef.current.removeLayer(tectonicPlatesRef.current)
              setShowTectonicPlates(false)
            } else {
              mapInstanceRef.current.addLayer(tectonicPlatesRef.current)
              setShowTectonicPlates(true)
            }
          }}
          className="absolute top-2 md:top-4 right-2 md:right-4 z-[1000] px-2 md:px-3 py-1 md:py-2 border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-xs uppercase transition-all duration-300 flex items-center space-x-2 rounded-lg backdrop-blur-sm touch-manipulation"
          style={{ fontFamily: 'Inter, Roboto, sans-serif', WebkitTapHighlightColor: 'transparent' }}
          title={showTectonicPlates ? t.hidePlates : t.showPlates}
        >
          <Layers className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">{showTectonicPlates ? t.hidePlates : t.showPlates}</span>
        </button>
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ 
            zIndex: 1, 
            backgroundColor: '#0f172a',
            minHeight: '400px',
            position: 'relative',
            WebkitOverflowScrolling: 'touch'
          }}
        />
      </div>
      <style>{`
        .custom-earthquake-marker {
          background: transparent !important;
          border: none !important;
        }
        .earthquake-marker-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .earthquake-marker {
          transition: transform 0.2s;
          position: relative;
          z-index: 10;
        }
        .earthquake-marker:hover {
          transform: scale(1.3);
        }
        .earthquake-pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border: 2px solid;
          border-radius: 50%;
          opacity: 0.6;
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          z-index: 1;
        }
        .earthquake-pulse-ring-delay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border: 2px solid;
          border-radius: 50%;
          opacity: 0.6;
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          animation-delay: 1s;
          z-index: 1;
        }
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          color: #E6E9ED !important;
          border: 1px solid #06b6d4 !important;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.3) !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: #0f172a !important;
          border: 1px solid #06b6d4 !important;
        }
        .custom-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .custom-popup .leaflet-popup-close-button:hover {
          color: #06b6d4 !important;
        }
        .leaflet-container {
          background: #0f172a !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 400px !important;
        }
        /* iOS Safari fixes */
        @supports (-webkit-touch-callout: none) {
          .leaflet-container {
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-x pan-y !important;
          }
        }
        .cluster-marker {
          background: #A30000 !important;
          border: 2px solid #8A0000 !important;
          border-radius: 50% !important;
          color: white !important;
          font-weight: bold !important;
          font-family: 'JetBrains Mono', monospace !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 0 15px rgba(163, 0, 0, 0.5) !important;
        }
        .cluster-small {
          width: 30px !important;
          height: 30px !important;
          font-size: 10px !important;
        }
        .cluster-medium {
          width: 40px !important;
          height: 40px !important;
          font-size: 12px !important;
        }
        .cluster-large {
          width: 50px !important;
          height: 50px !important;
          font-size: 14px !important;
        }
        .leaflet-control-zoom {
          border: 1px solid #06b6d4 !important;
        }
        .leaflet-control-zoom a {
          background: #0f172a !important;
          color: #E6E9ED !important;
          border: 1px solid #06b6d4 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #06b6d4 !important;
          color: white !important;
        }
      `}</style>
    </div>
  )
}
