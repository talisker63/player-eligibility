import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

function useShowRotateOverlay(): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const mobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const portrait = window.matchMedia('(orientation: portrait)')

    const update = () => setShow(mobile.matches && portrait.matches)

    update()
    mobile.addEventListener('change', update)
    portrait.addEventListener('change', update)
    window.addEventListener('resize', update)

    return () => {
      mobile.removeEventListener('change', update)
      portrait.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return show
}

export default function RotateOverlay() {
  const show = useShowRotateOverlay()

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-slate-900 p-6"
      role="alert"
    >
      <svg
        className="h-16 w-16 animate-spin text-emerald-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <p className="text-center text-lg font-medium text-white">
        Please rotate your device to landscape mode for the best experience.
      </p>
    </div>
  )
}
