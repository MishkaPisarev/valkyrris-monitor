import { useState, useEffect } from 'react'
import { Earthquake } from './useEarthquakes'
import { useLanguage } from './LanguageContext'
import { translateWithCache, Language } from './i18n'

export interface TranslatedEarthquake extends Earthquake {
  translatedPlace?: string
}

export function useTranslatedEarthquakes(earthquakes: Earthquake[]) {
  const { language } = useLanguage()
  const [translatedEarthquakes, setTranslatedEarthquakes] = useState<TranslatedEarthquake[]>([])

  useEffect(() => {
    if (language === 'en') {
      // No translation needed for English
      setTranslatedEarthquakes(earthquakes.map(q => ({ ...q, translatedPlace: q.place })))
      return
    }

    // Translate all place names
    const translateAll = async () => {
      const translated = await Promise.all(
        earthquakes.map(async (quake) => {
          const translatedPlace = await translateWithCache(quake.place, language)
          return { ...quake, translatedPlace }
        })
      )
      setTranslatedEarthquakes(translated)
    }

    translateAll()
  }, [earthquakes, language])

  return translatedEarthquakes
}
