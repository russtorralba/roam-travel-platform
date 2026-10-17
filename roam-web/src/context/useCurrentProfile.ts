import { useContext } from 'react'
import { CurrentProfileContext } from './current-profile-state'

export function useCurrentProfile() { const context = useContext(CurrentProfileContext); if (!context) throw new Error('useCurrentProfile must be used within CurrentProfileProvider'); return context }
