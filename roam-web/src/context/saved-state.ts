import { createContext } from 'react'

export type SavedKind = 'post' | 'vlog'
export type SavedContextValue = { savedIds: Set<string>; isSaved: (kind: SavedKind, id: string) => boolean; toggleSaved: (kind: SavedKind, id: string) => void }
export const keyFor = (kind: SavedKind, id: string) => `${kind}:${id}`
export const SavedContext = createContext<SavedContextValue | null>(null)
