import { getDownloadURL, ref, uploadString } from 'firebase/storage'
import { storage } from './firebase'

const CSV_STORAGE_PATH = 'matches-data/matches-played-count-per-member.csv'

export function getCsvStorageRef() {
  return ref(storage, CSV_STORAGE_PATH)
}

export async function uploadCsvToStorage(csvText: string): Promise<void> {
  const storageRef = getCsvStorageRef()
  await uploadString(storageRef, csvText, 'raw')
}

export async function downloadCsvFromStorage(): Promise<string | null> {
  const storageRef = getCsvStorageRef()
  try {
    const url = await getDownloadURL(storageRef)
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
