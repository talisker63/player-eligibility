import { logEvent as firebaseLogEvent } from 'firebase/analytics'
import { analytics } from './firebase'

export function logEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (analytics) {
    firebaseLogEvent(analytics, name, params)
  }
}

export function logPageView(pagePath: string, pageTitle?: string) {
  if (analytics) {
    firebaseLogEvent(analytics, 'page_view', {
      page_path: pagePath,
      page_title: pageTitle ?? document.title,
    })
  }
}
