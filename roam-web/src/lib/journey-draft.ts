import { destinations } from '../data/mock-data'
import type { DestinationCategory } from '../types/content'

export type JourneyDraft = {
  title: string
  destinationId: string
  category: DestinationCategory | ''
  description: string
  cover: string
  travelDate: string
}

export type JourneyDraftErrors = Partial<Record<'title' | 'destinationId' | 'category' | 'description' | 'cover' | 'travelDate', string>>

export const draftCategories: DestinationCategory[] = ['Coastlines', 'Culture', 'Mountains', 'Food & markets', 'Slow travel']

export const coverOptions = [
  ...destinations.map(item => ({ value: item.image, label: `${item.name} cover` })),
  { value: '/images/cathedral-cave-clean.png', label: 'Cathedral Cave cover' },
]

export const emptyJourneyDraft: JourneyDraft = {
  title: '',
  destinationId: '',
  category: '',
  description: '',
  cover: coverOptions[0].value,
  travelDate: '',
}

export function normalizeJourneyDraft(draft: JourneyDraft): JourneyDraft {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
  }
}

export function isDraftCategory(value: string): value is DestinationCategory {
  return draftCategories.includes(value as DestinationCategory)
}

export function isDraftDestination(value: string) {
  return destinations.some(destination => destination.id === value)
}

export function isDraftCover(value: string) {
  return coverOptions.some(option => option.value === value)
}

export function validateJourneyDraft(input: JourneyDraft): JourneyDraftErrors {
  const draft = normalizeJourneyDraft(input)
  const errors: JourneyDraftErrors = {}

  if (!draft.title || draft.title.length > 100) errors.title = 'Give this journey a title of up to 100 characters.'
  if (!isDraftDestination(draft.destinationId)) errors.destinationId = 'Choose a destination from the current archive.'
  if (draft.category && !isDraftCategory(draft.category)) errors.category = 'Choose a travel category from the current archive.'
  if (!draft.description || draft.description.length > 1000) errors.description = 'Add a journey description of up to 1,000 characters.'
  if (!isDraftCover(draft.cover)) errors.cover = 'Choose one of the available project cover images.'
  if (draft.travelDate && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(draft.travelDate)) errors.travelDate = 'Use a valid travel date.'

  return errors
}
