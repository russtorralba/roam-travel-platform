import { describe, expect, it } from 'vitest'
import { latestDispatchesHref, latestDispatchesId } from './home-feed-navigation'

describe('Home feed navigation', () => {
  it('links the Latest dispatches control to the dispatch feed section', () => {
    expect(latestDispatchesId).toBe('latest-dispatches')
    expect(latestDispatchesHref).toBe('#latest-dispatches')
  })
})
