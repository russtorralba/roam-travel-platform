import { useContext } from 'react'
import { SavedContext } from './saved-state'

export function useSaved() { const context = useContext(SavedContext); if (!context) throw new Error('useSaved must be used within SavedProvider'); return context }
