import { CalendarDays, Check, Globe2, Image, MapPin, RefreshCw, Save, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/useAuth'
import { destinations } from '../data/mock-data'
import { firebaseServices } from '../lib/firebase'
import { coverOptions, draftCategories, emptyJourneyDraft, normalizeJourneyDraft, type JourneyDraft, type JourneyDraftErrors, validateJourneyDraft } from '../lib/journey-draft'
import { createPrivateJourneyDraft, deletePrivateJourneyDraft, listPrivateJourneyDrafts, listPublishedJourneysForOwner, publishPrivateJourney, type PrivateJourneyDraft, type PublishedJourney, unpublishJourney, updatePrivateJourneyDraft, updatePublishedJourney } from '../lib/journey-drafts'
import { confirmAndDeletePrivateDraft } from '../lib/private-draft-delete'
import { confirmAndPublishJourney, confirmAndUnpublishJourney, savePublishedJourney } from '../lib/journey-publishing'

const storageKey = 'roam-journey-draft-v1'
type SelectedCloudJourney = { id: string; status: 'draft' | 'published' }

function readLocalDraft() {
  try {
    const saved = sessionStorage.getItem(storageKey)
    return saved ? { draft: { ...emptyJourneyDraft, ...JSON.parse(saved) as JourneyDraft }, restored: true } : { draft: emptyJourneyDraft, restored: false }
  } catch {
    return { draft: emptyJourneyDraft, restored: false }
  }
}

export function CreatePostPage() {
  const { user, profile, isLoading, isEmailVerified, refreshVerification } = useAuth()
  const [{ draft: initialDraft, restored: initiallyRestored }] = useState(readLocalDraft)
  const [draft, setDraft] = useState<JourneyDraft>(initialDraft)
  const [errors, setErrors] = useState<JourneyDraftErrors>({})
  const [status, setStatus] = useState(initiallyRestored ? 'A temporary browser-session draft has been restored.' : '')
  const [wasLocalDraftRestored, setWasLocalDraftRestored] = useState(initiallyRestored)
  const [cloudDrafts, setCloudDrafts] = useState<PrivateJourneyDraft[]>([])
  const [publishedJourneys, setPublishedJourneys] = useState<PublishedJourney[]>([])
  const [selectedCloudJourney, setSelectedCloudJourney] = useState<SelectedCloudJourney | null>(null)
  const [isCloudLoading, setIsCloudLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false)
  const cloudReady = Boolean(user && profile && firebaseServices)
  const isDraftSelected = selectedCloudJourney?.status === 'draft'
  const isPublishedSelected = selectedCloudJourney?.status === 'published'
  const isPending = isSaving || isPublishing || isUnpublishing || isDeleting || isRefreshingVerification

  const loadCloudDrafts = useCallback(async () => {
    if (!firebaseServices || !user || !profile) {
      setCloudDrafts([])
      setPublishedJourneys([])
      return
    }
    setIsCloudLoading(true)
    try {
      const [drafts, published] = await Promise.all([
        listPrivateJourneyDrafts(firebaseServices.db, user.uid),
        listPublishedJourneysForOwner(firebaseServices.db, user.uid),
      ])
      setCloudDrafts(drafts)
      setPublishedJourneys(published)
    } catch {
      setStatus('We could not load your private drafts. Check your connection and try again.')
    } finally {
      setIsCloudLoading(false)
    }
  }, [profile, user])

  useEffect(() => {
    if (cloudReady) void Promise.resolve().then(loadCloudDrafts)
  }, [cloudReady, loadCloudDrafts])

  if (!isLoading && user && !profile) return <Navigate to="/setup-profile" replace />

  const selectedDestination = destinations.find(item => item.id === draft.destinationId)
  const update = <Key extends keyof JourneyDraft>(key: Key, value: JourneyDraft[Key]) => {
    setDraft(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
    setStatus('')
  }

  const startNewDraft = () => {
    if (!window.confirm('Start a new journey draft? Any unsaved changes in the editor will be discarded.')) return
    setDraft(emptyJourneyDraft)
    setSelectedCloudJourney(null)
    setErrors({})
    setStatus('New journey draft ready.')
  }

  const openCloudDraft = (cloudDraft: PrivateJourneyDraft) => {
    setDraft({
      title: cloudDraft.title,
      destinationId: cloudDraft.destinationId,
      category: cloudDraft.category,
      description: cloudDraft.description,
      cover: cloudDraft.cover,
      travelDate: cloudDraft.travelDate,
    })
    setSelectedCloudJourney({ id: cloudDraft.id, status: 'draft' })
    setErrors({})
    setStatus('Private draft loaded. Changes are saved only when you choose Save draft.')
  }

  const openPublishedJourney = (journey: PublishedJourney) => {
    setDraft({
      title: journey.title,
      destinationId: journey.destinationId,
      category: journey.category,
      description: journey.description,
      cover: journey.cover,
      travelDate: journey.travelDate,
    })
    setSelectedCloudJourney({ id: journey.id, status: 'published' })
    setErrors({})
    setStatus('Published journey loaded. Any saved changes remain public.')
  }

  const refreshEmailVerification = async () => {
    setIsRefreshingVerification(true)
    try {
      if (await refreshVerification()) setStatus('Email verification confirmed. You can now publish or manage public journeys.')
      else setStatus('Your email is not verified yet. Complete verification, then refresh this status.')
    } catch {
      setStatus('We could not refresh email verification. Check your connection and try again.')
    } finally {
      setIsRefreshingVerification(false)
    }
  }

  const saveDraft = async () => {
    const normalizedDraft = normalizeJourneyDraft(draft)
    const nextErrors = validateJourneyDraft(normalizedDraft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setDraft(normalizedDraft)

    if (!cloudReady || !firebaseServices || !user) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(normalizedDraft))
        setWasLocalDraftRestored(true)
        setStatus('Temporary draft saved in this browser tab. Log in to save a private cloud draft.')
      } catch {
        setStatus('This browser could not save the temporary local draft.')
      }
      return
    }
    const services = firebaseServices

    if (isPublishedSelected && selectedCloudJourney) {
      await savePublishedJourney({
        refreshVerifiedSession: refreshVerification,
        run: () => updatePublishedJourney(services.db, selectedCloudJourney.id, normalizedDraft),
        reload: loadCloudDrafts,
        onPending: setIsSaving,
        onSuccess: () => { setStatus('Published journey updated. Your changes remain publicly readable.') },
        onVerificationRequired: () => { setStatus('Email verification is required to edit a published journey. Verify your email, then refresh verification status.') },
        onError: () => { setStatus('We could not save this published journey. Your editor contents have not been cleared.') },
      })
      return
    }

    setIsSaving(true)
    try {
      if (isDraftSelected && selectedCloudJourney) {
        await updatePrivateJourneyDraft(services.db, selectedCloudJourney.id, normalizedDraft)
        setStatus('Private draft updated. It remains visible only to you.')
      } else {
        const draftId = await createPrivateJourneyDraft(services.db, user.uid, normalizedDraft)
        setSelectedCloudJourney({ id: draftId, status: 'draft' })
        setStatus('Private draft saved to your ROAM account.')
      }
      sessionStorage.removeItem(storageKey)
      setWasLocalDraftRestored(false)
      await loadCloudDrafts()
    } catch {
      setStatus('We could not save this private draft. Your editor contents have not been cleared.')
    } finally {
      setIsSaving(false)
    }
  }

  const publishJourney = async () => {
    const normalizedDraft = normalizeJourneyDraft(draft)
    const nextErrors = validateJourneyDraft(normalizedDraft)
    setErrors(nextErrors)
    const services = firebaseServices
    if (Object.keys(nextErrors).length || !services || !profile || !isDraftSelected || !selectedCloudJourney) return
    setDraft(normalizedDraft)
    await confirmAndPublishJourney({
      confirm: message => window.confirm(message),
      refreshVerifiedSession: refreshVerification,
      run: () => publishPrivateJourney(services.db, selectedCloudJourney.id, profile),
      reload: loadCloudDrafts,
      onPending: setIsPublishing,
      onSuccess: () => {
        setSelectedCloudJourney({ id: selectedCloudJourney.id, status: 'published' })
        setStatus('Journey published. It is publicly readable, while the public Explore feed is not part of this release yet.')
      },
      onVerificationRequired: () => { setStatus('Email verification is required before publishing. Complete verification, then refresh verification status.') },
      onError: () => { setStatus('We could not publish this journey. Your private draft is still saved.') },
    })
  }

  const unpublishSelectedJourney = async () => {
    const services = firebaseServices
    if (!services || !isPublishedSelected || !selectedCloudJourney) return
    await confirmAndUnpublishJourney({
      confirm: message => window.confirm(message),
      refreshVerifiedSession: refreshVerification,
      run: () => unpublishJourney(services.db, selectedCloudJourney.id),
      reload: loadCloudDrafts,
      onPending: setIsUnpublishing,
      onSuccess: () => {
        setSelectedCloudJourney({ id: selectedCloudJourney.id, status: 'draft' })
        setStatus('Journey unpublished. It has returned to your private drafts.')
      },
      onVerificationRequired: () => { setStatus('Email verification is required to unpublish a journey. Refresh verification status and try again.') },
      onError: () => { setStatus('We could not unpublish this journey. It may still be publicly readable.') },
    })
  }

  const discard = async () => {
    if (isDraftSelected && cloudReady && firebaseServices && selectedCloudJourney) {
      const db = firebaseServices.db
      await confirmAndDeletePrivateDraft({
        draftId: selectedCloudJourney.id,
        confirm: message => window.confirm(message),
        deleteDraft: draftId => deletePrivateJourneyDraft(db, draftId),
        onPending: setIsDeleting,
        onDeleted: () => {
          setDraft(emptyJourneyDraft)
          setSelectedCloudJourney(null)
          setErrors({})
          setStatus('Private draft deleted.')
        },
        reloadDrafts: loadCloudDrafts,
        onError: () => { setStatus('We could not delete this private draft. Try again.') },
      })
      return
    }

    if (isPublishedSelected) return
    if (!window.confirm('Discard this temporary local journey draft? This cannot be undone.')) return
    sessionStorage.removeItem(storageKey)
    setDraft(emptyJourneyDraft)
    setErrors({})
    setWasLocalDraftRestored(false)
    setStatus('Temporary local draft discarded.')
  }

  return <div className="mx-auto min-w-0 max-w-[1180px] px-4 py-8 md:px-8 md:py-12">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-coast">Field studio · journey draft</p>
        <h1 className="mt-2 font-display text-4xl text-ocean md:text-5xl">Plan the path ahead.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{cloudReady ? 'Create and revisit private travel-story drafts in your ROAM account. Publish only when your journey is ready to be publicly readable.' : 'Shape a temporary travel journey in this browser tab. Log in to save private drafts to your ROAM account.'}</p>
      </div>
      <span className="rounded-full bg-mist px-4 py-2 text-xs font-bold text-ocean">{cloudReady ? isPublishedSelected ? 'Published journey' : 'Private cloud drafts' : 'Temporary local draft'}</span>
    </div>

    {wasLocalDraftRestored && <div className="mt-6 flex items-center gap-2 rounded-xl border border-coast/20 bg-[#e9f6f2] px-4 py-3 text-sm text-ocean"><Check className="size-4 text-coast" />{cloudReady ? 'Your temporary browser-session draft has not been uploaded. Choose Save private draft to store it in your account.' : 'Your temporary browser-session draft is ready to continue.'}</div>}
    {!user && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coast/20 bg-[#e9f6f2] px-4 py-3 text-sm text-ocean"><span>Temporary drafts stay in this browser tab and are not uploaded.</span><Link to="/login" className="font-bold text-coast underline underline-offset-4">Log in for private cloud saving</Link></div>}

    <div className="mt-9 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={event => { event.preventDefault(); void saveDraft() }} className="min-w-0 space-y-6" noValidate>
        {cloudReady && <section className="space-y-5 rounded-2xl border border-stone/70 bg-paper p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-coast">Private drafts</p><h2 className="mt-1 font-display text-2xl text-ocean">Your field notes</h2></div><Button type="button" variant="ghost" disabled={isPending} onClick={startNewDraft}>New draft</Button></div>
          {isCloudLoading ? <p className="text-sm text-muted">Loading your journeys…</p> : cloudDrafts.length ? <div className="grid gap-2">{cloudDrafts.map(cloudDraft => <button key={cloudDraft.id} type="button" disabled={isPending} onClick={() => openCloudDraft(cloudDraft)} className={`rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast ${selectedCloudJourney?.id === cloudDraft.id ? 'border-coast bg-mist' : 'border-stone hover:border-coast/50'}`}><span className="block truncate text-sm font-bold text-ocean">{cloudDraft.title}</span><span className="mt-1 block text-xs text-muted">{destinations.find(item => item.id === cloudDraft.destinationId)?.name ?? 'Journey draft'} · private</span></button>)}</div> : <p className="text-sm leading-6 text-muted">No private drafts yet. Save this journey when you are ready.</p>}
          <div className="border-t border-stone pt-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-coast">Your published journeys</p><p className="mt-1 text-sm leading-6 text-muted">Published journeys are publicly readable. The public Explore feed is not included in this release yet.</p>{isCloudLoading ? null : publishedJourneys.length ? <div className="mt-4 grid gap-2">{publishedJourneys.map(journey => <button key={journey.id} type="button" disabled={isPending} onClick={() => openPublishedJourney(journey)} className={`rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast ${selectedCloudJourney?.id === journey.id ? 'border-coast bg-mist' : 'border-stone hover:border-coast/50'}`}><span className="flex items-center gap-2 truncate text-sm font-bold text-ocean"><Globe2 className="size-4 shrink-0 text-coast" />{journey.title}</span><span className="mt-1 block text-xs text-muted">{destinations.find(item => item.id === journey.destinationId)?.name ?? 'Journey'} · public</span></button>)}</div> : <p className="mt-3 text-sm leading-6 text-muted">No published journeys yet.</p>}</div>
        </section>}

        {cloudReady && (isDraftSelected || isPublishedSelected) && !isEmailVerified && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-terracotta/25 bg-[#fff0ec] px-4 py-3 text-sm text-ocean"><span>Email verification is required to publish, edit public journeys, or unpublish.</span><Button type="button" variant="ghost" disabled={isPending} onClick={() => { void refreshEmailVerification() }}><RefreshCw className={`size-4 ${isRefreshingVerification ? 'animate-spin' : ''}`} />Refresh verification status</Button></div>}

        <section className="rounded-2xl border border-stone/70 bg-paper p-5 md:p-6"><div className="grid gap-5">
          <label className="block text-sm font-bold text-ocean">Journey title <span className="text-terracotta">*</span><input value={draft.title} onChange={event => update('title', event.target.value)} maxLength={100} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'journey-title-error' : undefined} className="mt-2 w-full rounded-xl border border-stone bg-sand px-4 py-3 font-display text-xl text-ocean placeholder:text-muted focus:border-coast focus:outline-none" placeholder="Name a path worth remembering" /><span className="mt-1 block text-right text-xs font-normal text-muted">{draft.title.length}/100</span>{errors.title && <span id="journey-title-error" className="block text-xs font-semibold text-terracotta">{errors.title}</span>}</label>
          <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-ocean">Destination <span className="text-terracotta">*</span><select value={draft.destinationId} onChange={event => { const destination = destinations.find(item => item.id === event.target.value); update('destinationId', event.target.value); if (destination && !draft.category) update('category', destination.category) }} aria-invalid={Boolean(errors.destinationId)} aria-describedby={errors.destinationId ? 'journey-destination-error' : undefined} className="mt-2 w-full rounded-xl border border-stone bg-sand px-4 py-3 text-sm text-ocean focus:border-coast focus:outline-none"><option value="">Select an existing destination</option>{destinations.map(item => <option key={item.id} value={item.id}>{item.name}, {item.country}</option>)}</select>{errors.destinationId && <span id="journey-destination-error" className="mt-1 block text-xs font-semibold text-terracotta">{errors.destinationId}</span>}</label><label className="block text-sm font-bold text-ocean">Travel category<select value={draft.category} onChange={event => update('category', event.target.value as JourneyDraft['category'])} aria-invalid={Boolean(errors.category)} className="mt-2 w-full rounded-xl border border-stone bg-sand px-4 py-3 text-sm text-ocean focus:border-coast focus:outline-none"><option value="">Select a category</option>{draftCategories.map(category => <option key={category} value={category}>{category}</option>)}</select>{errors.category && <span className="mt-1 block text-xs font-semibold text-terracotta">{errors.category}</span>}</label></div>
          <label className="block text-sm font-bold text-ocean">Journey description <span className="text-terracotta">*</span><textarea value={draft.description} onChange={event => update('description', event.target.value)} maxLength={1000} rows={6} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'journey-description-error' : undefined} className="mt-2 w-full resize-y rounded-xl border border-stone bg-sand px-4 py-3 text-sm leading-6 text-ocean placeholder:text-muted focus:border-coast focus:outline-none" placeholder="Describe the atmosphere, pace, and field notes you want this journey to hold." /><span className="mt-1 block text-right text-xs font-normal text-muted">{draft.description.length}/1000</span>{errors.description && <span id="journey-description-error" className="block text-xs font-semibold text-terracotta">{errors.description}</span>}</label>
          <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-ocean">Cover image<select value={draft.cover} onChange={event => update('cover', event.target.value)} aria-invalid={Boolean(errors.cover)} className="mt-2 w-full rounded-xl border border-stone bg-sand px-4 py-3 text-sm text-ocean focus:border-coast focus:outline-none">{coverOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted">Choose from existing project imagery. Uploads are not supported.</span>{errors.cover && <span className="mt-1 block text-xs font-semibold text-terracotta">{errors.cover}</span>}</label><label className="block text-sm font-bold text-ocean">Optional travel date<input value={draft.travelDate} onChange={event => update('travelDate', event.target.value)} type="date" aria-invalid={Boolean(errors.travelDate)} className="mt-2 w-full rounded-xl border border-stone bg-sand px-4 py-3 text-sm text-ocean focus:border-coast focus:outline-none" />{errors.travelDate && <span className="mt-1 block text-xs font-semibold text-terracotta">{errors.travelDate}</span>}</label></div>
        </div></section>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={isPending || (isPublishedSelected && !isEmailVerified)}><Save className="size-4" />{isSaving ? 'Saving…' : isPublishedSelected ? 'Save published changes' : isDraftSelected ? 'Save changes' : cloudReady ? 'Save private draft' : 'Save temporary draft'}</Button>{isDraftSelected && <Button type="button" disabled={isPending || !isEmailVerified} onClick={() => { void publishJourney() }}><Upload className="size-4" />{isPublishing ? 'Publishing…' : isEmailVerified ? 'Publish journey' : 'Verify email to publish'}</Button>}{isPublishedSelected && <Button type="button" variant="ghost" disabled={isPending || !isEmailVerified} onClick={() => { void unpublishSelectedJourney() }}><Globe2 className="size-4" />{isUnpublishing ? 'Unpublishing…' : isEmailVerified ? 'Unpublish journey' : 'Verify email to unpublish'}</Button>}<Button type="button" variant="ghost" disabled={isPending || isPublishedSelected} onClick={() => { void discard() }}><Trash2 className="size-4" />{isDeleting ? 'Deleting…' : isDraftSelected ? 'Delete draft' : 'Discard draft'}</Button></div>
        {status && <p role="status" className="rounded-xl bg-[#e9f6f2] px-4 py-3 text-sm font-semibold text-ocean">{status}</p>}
      </form>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start"><section className="overflow-hidden rounded-2xl border border-stone/70 bg-paper shadow-sm"><div className="relative aspect-[4/3] bg-ocean"><img src={draft.cover} alt="Selected journey cover" className="size-full object-cover" /><div className="absolute inset-0 bg-linear-to-t from-ocean/75 to-transparent" /><div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-paper/95 px-3 py-1 text-xs font-bold text-ocean"><Image className="size-3" />Live preview</div><div className="absolute bottom-4 left-4 right-4 text-white">{selectedDestination && <p className="flex items-center gap-1 text-xs font-bold text-[#d7f4ef]"><MapPin className="size-3" />{selectedDestination.name}, {selectedDestination.country}</p>}<h2 className="mt-2 break-words font-display text-3xl leading-tight">{draft.title || 'Your journey title'}</h2></div></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-coast">{draft.category || 'Travel category'}</p><p className="mt-3 text-sm leading-6 text-muted">{draft.description || 'Your private journey description will appear here as you write.'}</p>{draft.travelDate && <p className="mt-4 flex items-center gap-2 border-t border-stone pt-4 text-xs font-bold text-ocean"><CalendarDays className="size-4 text-coast" />{draft.travelDate}</p>}<p className="mt-5 border-t border-stone pt-4 text-xs leading-5 text-muted">{isPublishedSelected ? 'Published journey preview. This journey is publicly readable; the public Explore feed is not included in this release yet.' : cloudReady ? 'Private draft preview. Saving stores it only in your ROAM account; it is not published or shared.' : 'Temporary preview only. Saving stores this data in the current browser tab; it is not uploaded or shared.'}</p></div></section></aside>
    </div>
  </div>
}
