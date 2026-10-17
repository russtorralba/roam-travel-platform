import { type ReactNode, useMemo, useState } from 'react'
import { keyFor, SavedContext, type SavedContextValue } from './saved-state'

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set())
  const value = useMemo<SavedContextValue>(() => ({ savedIds, isSaved: (kind, id) => savedIds.has(keyFor(kind, id)), toggleSaved: (kind, id) => setSavedIds(current => { const next = new Set(current); const key = keyFor(kind, id); if (next.has(key)) next.delete(key); else next.add(key); return next }) }), [savedIds])
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
}
