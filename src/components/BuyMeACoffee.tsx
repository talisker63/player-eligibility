import { useEffect } from 'react'

const BMC_ID = import.meta.env.VITE_BMC_USERNAME || 'asleighty'

export default function BuyMeACoffee() {
  useEffect(() => {
    const script = document.createElement('script')
    script.setAttribute('data-name', 'BMC-Widget')
    script.setAttribute('data-cfasync', 'false')
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js'
    script.setAttribute('data-id', BMC_ID)
    script.setAttribute('data-description', 'Support me on Buy me a coffee!')
    script.setAttribute('data-message', 'Thanks for your support. This helps keep the app running.')
    script.setAttribute('data-color', '#5F7FFF')
    script.setAttribute('data-position', 'Right')
    script.setAttribute('data-x_margin', '18')
    script.setAttribute('data-y_margin', '18')
    script.async = true
    document.head.appendChild(script)
    script.onload = () => {
      const evt = document.createEvent('Event')
      evt.initEvent('DOMContentLoaded', false, false)
      window.dispatchEvent(evt)
    }
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script)
      const btn = document.getElementById('bmc-wbtn')
      if (btn?.parentNode) btn.parentNode.removeChild(btn)
    }
  }, [])
  return null
}
