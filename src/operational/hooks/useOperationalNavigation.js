import { useCallback, useEffect, useMemo, useState } from 'react'

function readSection(validSections, fallbackSection) {
  if (typeof window === 'undefined') return fallbackSection

  const section = window.location.hash.replace(/^#\/?/, '')
  return validSections.includes(section) ? section : fallbackSection
}

export function useOperationalNavigation(pageOptions, fallbackSection = 'home') {
  const validSections = useMemo(() => pageOptions.map((page) => page.id), [pageOptions])
  const [activePage, setActivePage] = useState(() => readSection(validSections, fallbackSection))

  useEffect(() => {
    function handleHashChange() {
      setActivePage(readSection(validSections, fallbackSection))
    }

    window.addEventListener('hashchange', handleHashChange)

    if (!window.location.hash) {
      window.history.replaceState(null, '', `#${fallbackSection}`)
    }

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [fallbackSection, validSections])

  const navigate = useCallback((section) => {
    if (!validSections.includes(section)) return

    window.location.hash = section
    setActivePage(section)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [validSections])

  return { activePage, navigate }
}
