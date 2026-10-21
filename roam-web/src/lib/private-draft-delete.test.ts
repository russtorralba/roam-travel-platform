import { describe, expect, it, vi } from 'vitest'
import { confirmAndDeletePrivateDraft, privateDraftDeleteConfirmation } from './private-draft-delete'

describe('private draft delete UI controller', () => {
  it('keeps the selected draft and list unchanged when deletion is cancelled', async () => {
    const confirm = vi.fn(() => false)
    const deleteDraft = vi.fn()
    const reloadDrafts = vi.fn()

    await expect(confirmAndDeletePrivateDraft({
      draftId: 'draft-a',
      confirm,
      deleteDraft,
      onPending: vi.fn(),
      onDeleted: vi.fn(),
      reloadDrafts,
      onError: vi.fn(),
    })).resolves.toBe(false)

    expect(confirm).toHaveBeenCalledWith(privateDraftDeleteConfirmation)
    expect(deleteDraft).not.toHaveBeenCalled()
    expect(reloadDrafts).not.toHaveBeenCalled()
  })

  it('shows pending state, deletes, clears the selection, and refreshes the list', async () => {
    const events: string[] = []

    await expect(confirmAndDeletePrivateDraft({
      draftId: 'draft-a',
      confirm: () => true,
      deleteDraft: async draftId => { events.push(`delete:${draftId}`) },
      onPending: pending => { events.push(`pending:${pending}`) },
      onDeleted: () => { events.push('clear-selection') },
      reloadDrafts: async () => { events.push('refresh-list') },
      onError: () => { events.push('error') },
    })).resolves.toBe(true)

    expect(events).toEqual(['pending:true', 'delete:draft-a', 'clear-selection', 'refresh-list', 'pending:false'])
  })

  it('restores the button state and shows an error when deletion fails', async () => {
    const onDeleted = vi.fn()
    const reloadDrafts = vi.fn()
    const onError = vi.fn()
    const onPending = vi.fn()

    await expect(confirmAndDeletePrivateDraft({
      draftId: 'draft-a',
      confirm: () => true,
      deleteDraft: async () => { throw new Error('permission-denied') },
      onPending,
      onDeleted,
      reloadDrafts,
      onError,
    })).resolves.toBe(false)

    expect(onDeleted).not.toHaveBeenCalled()
    expect(reloadDrafts).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledOnce()
    expect(onPending).toHaveBeenNthCalledWith(1, true)
    expect(onPending).toHaveBeenNthCalledWith(2, false)
  })
})
