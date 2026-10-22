import { describe, expect, it, vi } from 'vitest'
import { confirmAndPublishJourney, confirmAndUnpublishJourney, publishJourneyConfirmation, savePublishedJourney, unpublishJourneyConfirmation } from './journey-publishing'

function actionOptions(overrides: Partial<Parameters<typeof savePublishedJourney>[0]> = {}) {
  return {
    refreshVerifiedSession: vi.fn(async () => true),
    run: vi.fn(async () => undefined),
    reload: vi.fn(async () => undefined),
    onPending: vi.fn(),
    onSuccess: vi.fn(),
    onVerificationRequired: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  }
}

describe('journey publishing controls', () => {
  it('publishes only after confirmation, a verified token refresh, and a successful reload', async () => {
    const options = actionOptions()
    const confirm = vi.fn(() => true)

    await expect(confirmAndPublishJourney({ ...options, confirm })).resolves.toBe(true)

    expect(confirm).toHaveBeenCalledWith(publishJourneyConfirmation)
    expect(options.refreshVerifiedSession).toHaveBeenCalledOnce()
    expect(options.run).toHaveBeenCalledOnce()
    expect(options.reload).toHaveBeenCalledOnce()
    expect(options.onSuccess).toHaveBeenCalledOnce()
    expect(options.onPending).toHaveBeenNthCalledWith(1, true)
    expect(options.onPending).toHaveBeenNthCalledWith(2, false)
  })

  it('does nothing when publishing confirmation is cancelled', async () => {
    const options = actionOptions()
    const confirm = vi.fn(() => false)

    await expect(confirmAndPublishJourney({ ...options, confirm })).resolves.toBe(false)

    expect(options.refreshVerifiedSession).not.toHaveBeenCalled()
    expect(options.run).not.toHaveBeenCalled()
    expect(options.onPending).not.toHaveBeenCalled()
  })

  it('keeps an unverified journey private and restores pending state', async () => {
    const options = actionOptions({ refreshVerifiedSession: vi.fn(async () => false) })

    await expect(confirmAndPublishJourney({ ...options, confirm: () => true })).resolves.toBe(false)

    expect(options.run).not.toHaveBeenCalled()
    expect(options.reload).not.toHaveBeenCalled()
    expect(options.onVerificationRequired).toHaveBeenCalledOnce()
    expect(options.onPending).toHaveBeenNthCalledWith(1, true)
    expect(options.onPending).toHaveBeenNthCalledWith(2, false)
  })

  it('saves published edits only after refreshing a verified session', async () => {
    const options = actionOptions()

    await expect(savePublishedJourney(options)).resolves.toBe(true)

    expect(options.refreshVerifiedSession).toHaveBeenCalledOnce()
    expect(options.run).toHaveBeenCalledOnce()
    expect(options.reload).toHaveBeenCalledOnce()
  })

  it('requires confirmation before unpublishing and returns a journey to private state on success', async () => {
    const options = actionOptions()
    const confirm = vi.fn(() => true)

    await expect(confirmAndUnpublishJourney({ ...options, confirm })).resolves.toBe(true)

    expect(confirm).toHaveBeenCalledWith(unpublishJourneyConfirmation)
    expect(options.run).toHaveBeenCalledOnce()
    expect(options.onSuccess).toHaveBeenCalledOnce()
  })

  it('reports permission or network failures without leaving the action pending', async () => {
    const options = actionOptions({ run: vi.fn(async () => { throw new Error('permission-denied') }) })

    await expect(confirmAndUnpublishJourney({ ...options, confirm: () => true })).resolves.toBe(false)

    expect(options.reload).not.toHaveBeenCalled()
    expect(options.onError).toHaveBeenCalledOnce()
    expect(options.onPending).toHaveBeenNthCalledWith(1, true)
    expect(options.onPending).toHaveBeenNthCalledWith(2, false)
  })
})
