import type { Traveler } from './content'

export type CurrentUserProfile = Traveler & { biography: string; interests: string[] }
