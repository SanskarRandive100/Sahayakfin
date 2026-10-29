import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function PhoneFrame() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false,
  )
  const location = useLocation()

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener?.('change', h)
    return () => mql.removeEventListener?.('change', h)
  }, [])

  if (!isDesktop) {
    return (
      <div key={location.pathname} className="min-h-full fade-in">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-full flex items-center justify-center py-8">
      <div className="flex flex-col items-center">
        <div
          className="relative bg-black p-[14px] shadow-xl"
          style={{ width: 390 + 28, height: 844 + 28, borderRadius: 48 }}
        >
          <div
            className="bg-bg overflow-y-auto overflow-x-hidden relative"
            style={{ width: 390, height: 844, borderRadius: 36 }}
          >
            <div key={location.pathname} className="fade-in">
              <Outlet />
            </div>
          </div>
        </div>
        <div className="text-xs text-muted mt-3">SahayakFin · demo</div>
      </div>
    </div>
  )
}
