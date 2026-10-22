export const privateDraftDeleteConfirmation = 'Delete this private journey draft? This cannot be undone.'

type DeletePrivateDraftOptions = {
  draftId: string
  confirm: (message: string) => boolean
  deleteDraft: (draftId: string) => Promise<void>
  onPending: (pending: boolean) => void
  onDeleted: () => void
  reloadDrafts: () => Promise<void>
  onError: () => void
}

export async function confirmAndDeletePrivateDraft({
  draftId,
  confirm,
  deleteDraft,
  onPending,
  onDeleted,
  reloadDrafts,
  onError,
}: DeletePrivateDraftOptions) {
  if (!confirm(privateDraftDeleteConfirmation)) return false

  onPending(true)
  try {
    await deleteDraft(draftId)
    onDeleted()
    await reloadDrafts()
    return true
  } catch {
    onError()
    return false
  } finally {
    onPending(false)
  }
}
