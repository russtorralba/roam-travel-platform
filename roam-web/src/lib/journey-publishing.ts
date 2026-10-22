export const publishJourneyConfirmation = 'Publish this journey publicly? Anyone on ROAM will be able to read it. You can unpublish it later.'
export const unpublishJourneyConfirmation = 'Unpublish this journey? It will return to your private drafts and no longer be publicly readable.'

type PublicJourneyActionOptions = {
  refreshVerifiedSession: () => Promise<boolean>
  run: () => Promise<void>
  reload: () => Promise<void>
  onPending: (pending: boolean) => void
  onSuccess: () => void
  onVerificationRequired: () => void
  onError: () => void
}

type ConfirmedPublicJourneyActionOptions = PublicJourneyActionOptions & {
  confirm: (message: string) => boolean
  confirmation: string
}

async function runPublicJourneyAction({ refreshVerifiedSession, run, reload, onPending, onSuccess, onVerificationRequired, onError }: PublicJourneyActionOptions) {
  onPending(true)
  try {
    if (!await refreshVerifiedSession()) {
      onVerificationRequired()
      return false
    }
    await run()
    await reload()
    onSuccess()
    return true
  } catch {
    onError()
    return false
  } finally {
    onPending(false)
  }
}

async function confirmAndRunPublicJourneyAction({ confirm, confirmation, ...options }: ConfirmedPublicJourneyActionOptions) {
  if (!confirm(confirmation)) return false
  return runPublicJourneyAction(options)
}

export function confirmAndPublishJourney(options: Omit<ConfirmedPublicJourneyActionOptions, 'confirmation'>) {
  return confirmAndRunPublicJourneyAction({ ...options, confirmation: publishJourneyConfirmation })
}

export function savePublishedJourney(options: PublicJourneyActionOptions) {
  return runPublicJourneyAction(options)
}

export function confirmAndUnpublishJourney(options: Omit<ConfirmedPublicJourneyActionOptions, 'confirmation'>) {
  return confirmAndRunPublicJourneyAction({ ...options, confirmation: unpublishJourneyConfirmation })
}
