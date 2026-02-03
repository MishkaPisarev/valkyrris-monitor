export type Language = 'en' | 'ru'

export const translations = {
  en: {
    title: 'MIDDLE EAST SEISMIC MONITOR',
    subtitle: '[LIVE_SENSOR_DATA] // REAL-TIME_FEED // MIDDLE_EAST_REGION // RADIUS: 1500KM // UPDATE: 10SEC',
    totalEvents: 'TOTAL_EVENTS',
    urgent: 'URGENT',
    maxMagnitude: 'MAX_MAGNITUDE',
    status: 'STATUS',
    loading: '[LOADING...]',
    live: '[LIVE]',
    list: 'LIST',
    map: 'MAP',
    hours24: '24H',
    days7: '7D',
    days30: '30D',
    noEarthquakes: '> NO_EARTHQUAKES_DETECTED_IN_TIME_RANGE',
    loadingData: '> LOADING_SEISMIC_DATA...',
    mapView: '[MAP_VIEW] // LIVE_SENSOR_DATA // MIDDLE_EAST // RADIUS: 1500KM',
    yourLocation: 'YOUR_LOCATION',
    moderate: 'MODERATE',
    small: 'SMALL',
    high: 'HIGH',
    depth: 'Depth',
    coordinates: 'Coordinates',
    viewDetails: 'View Details',
    distance: 'Distance',
    fromYou: 'km from you',
    eventLog: '[EVENT_LOG] // SORTED_BY_TIME_DESC',
    details: 'DETAILS',
    interactiveMap: 'INTERACTIVE_MAP',
    origin: 'ORIGIN',
    location: 'LOCATION',
    feltReport: 'FELT_REPORT',
    technicalData: 'TECHNICAL_DATA',
    viewOnUSGS: 'VIEW_ON_USGS',
    autoRefresh: 'AUTO_REFRESH',
    refresh: 'REFRESH',
    tectonicBoundary: 'TECTONIC_BOUNDARY',
    showPlates: 'SHOW_PLATES',
    hidePlates: 'HIDE_PLATES',
    centerToMe: 'CENTER'
  },
  ru: {
    title: 'СЕЙСМИЧЕСКИЙ МОНИТОР БЛИЖНЕГО ВОСТОКА',
    subtitle: '[ДАННЫЕ_СЕНСОРОВ_В_РЕАЛЬНОМ_ВРЕМЕНИ] // РЕАЛЬНОЕ_ВРЕМЯ // РЕГИОН_БЛИЖНЕГО_ВОСТОКА // РАДИУС: 1500КМ // ОБНОВЛЕНИЕ: 10СЕК',
    totalEvents: 'ВСЕГО_СОБЫТИЙ',
    urgent: 'СРОЧНО',
    maxMagnitude: 'МАКС_МАГНИТУДА',
    status: 'СТАТУС',
    loading: '[ЗАГРУЗКА...]',
    live: '[В_ЭФИРЕ]',
    list: 'СПИСОК',
    map: 'КАРТА',
    hours24: '24Ч',
    days7: '7Д',
    days30: '30Д',
    noEarthquakes: '> ЗЕМЛЕТРЯСЕНИЯ_НЕ_ОБНАРУЖЕНЫ_В_ДИАПАЗОНЕ_ВРЕМЕНИ',
    loadingData: '> ЗАГРУЗКА_СЕЙСМИЧЕСКИХ_ДАННЫХ...',
    mapView: '[ВИД_КАРТЫ] // ДАННЫЕ_СЕНСОРОВ_В_РЕАЛЬНОМ_ВРЕМЕНИ // БЛИЖНИЙ_ВОСТОК // РАДИУС: 1500КМ',
    yourLocation: 'ВАШЕ_МЕСТОПОЛОЖЕНИЕ',
    moderate: 'УМЕРЕННОЕ',
    small: 'МАЛОЕ',
    high: 'ВЫСОКОЕ',
    depth: 'Глубина',
    coordinates: 'Координаты',
    viewDetails: 'Просмотр деталей',
    distance: 'Расстояние',
    fromYou: 'км от вас',
    eventLog: '[ЖУРНАЛ_СОБЫТИЙ] // ОТСОРТИРОВАНО_ПО_ВРЕМЕНИ_УБЫВ',
    details: 'ДЕТАЛИ',
    interactiveMap: 'ИНТЕРАКТИВНАЯ_КАРТА',
    origin: 'ПРОИСХОЖДЕНИЕ',
    location: 'МЕСТОПОЛОЖЕНИЕ',
    feltReport: 'ОТЧЕТ_О_ОЩУЩЕНИИ',
    technicalData: 'ТЕХНИЧЕСКИЕ_ДАННЫЕ',
    viewOnUSGS: 'ПРОСМОТР_НА_USGS',
    autoRefresh: 'АВТО_ОБНОВЛЕНИЕ',
    refresh: 'ОБНОВИТЬ',
    tectonicBoundary: 'ТЕКТОНИЧЕСКАЯ_ГРАНИЦА',
    showPlates: 'ПОКАЗАТЬ_ПЛИТЫ',
    hidePlates: 'СКРЫТЬ_ПЛИТЫ',
    centerToMe: 'ЦЕНТР'
  }
}

// Translation API - using MyMemory (free, no API key needed)
export async function translateText(text: string, targetLang: Language): Promise<string> {
  if (targetLang === 'en') return text // No translation needed for English
  
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ru`
    )
    const data = await response.json()
    
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText
    }
    return text // Fallback to original if translation fails
  } catch (error) {
    console.warn('Translation error:', error)
    return text // Fallback to original on error
  }
}

// Cache for translations to avoid repeated API calls
const translationCache = new Map<string, string>()

export async function translateWithCache(text: string, targetLang: Language): Promise<string> {
  if (targetLang === 'en') return text
  
  const cacheKey = `${text}|${targetLang}`
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!
  }
  
  const translated = await translateText(text, targetLang)
  translationCache.set(cacheKey, translated)
  return translated
}
