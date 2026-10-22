import { ArrowLeft, CalendarDays, Globe2, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DestinationTag } from '../components/content/DestinationTag'
import { destinations } from '../data/mock-data'
import { firebaseConfigurationError, firebaseServices } from '../lib/firebase'
import { isDraftCover } from '../lib/journey-draft'
import { formatPublicJourneyDate, getPublicJourney, type PublicJourney } from '../lib/public-journeys'

type DetailState = 'loading' | 'ready' | 'missing' | 'error'

export function PublicJourneyDetailPage() {
  const { journeyId } = useParams()
  const [journey, setJourney] = useState<PublicJourney | null>(null)
  const [state, setState] = useState<DetailState>(firebaseServices && journeyId ? 'loading' : 'error')

  useEffect(() => {
    let active = true
    if (!firebaseServices || !journeyId) return () => { active = false }
    setState('loading')
    void getPublicJourney(firebaseServices.db, journeyId).then(result => {
      if (!active) return
      setJourney(result)
      setState(result ? 'ready' : 'missing')
    }).catch(() => {
      if (!active) return
      setJourney(null)
      setState('missing')
    })
    return () => { active = false }
  }, [journeyId])

  if (state === 'loading') return <JourneyNotice title="Loading journey…" description="Retrieving this public field note." />
  if (state === 'error') return <JourneyNotice title="Public journeys are unavailable" description={firebaseConfigurationError ?? 'This journey cannot be loaded right now.'} />
  if (state === 'missing' || !journey) return <JourneyNotice title="This journey is not available" description="It may have been unpublished, removed, or the link may be incorrect." />

  const destination = destinations.find(item => item.id === journey.destinationId)
  const cover = isDraftCover(journey.cover) ? journey.cover : destination?.image
  return <div className="mx-auto min-w-0 max-w-[1180px] px-4 py-7 md:px-8 md:py-10"><Link to="/explore" className="inline-flex items-center gap-2 rounded text-sm font-bold text-ocean hover:text-coast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast"><ArrowLeft className="size-4" />Back to Explore</Link><article className="mt-6 overflow-hidden rounded-2xl border border-stone/70 bg-paper shadow-[0_4px_20px_-4px_rgba(10,54,74,.08)]"><div className="relative aspect-[16/8] min-h-64 bg-ocean">{cover ? <img src={cover} alt="" className="size-full object-cover" /> : <div className="size-full bg-linear-to-br from-ocean to-coast" />}<div className="absolute inset-0 bg-linear-to-t from-[#041c29]/75 via-transparent to-transparent" />{destination && <div className="absolute bottom-5 left-5"><DestinationTag id={destination.id} name={destination.name} /></div>}</div><div className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-coast"><Globe2 className="size-4" />Community journey</p><h1 className="mt-4 font-display text-4xl leading-[1.03] text-ocean md:text-6xl">{journey.title}</h1><div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-stone py-4 text-sm text-muted"><span className="font-bold text-ocean">By {journey.authorDisplayName || `@${journey.authorUsername}`}</span>{destination && <span className="flex items-center gap-1"><MapPin className="size-4 text-coast" />{destination.name}, {destination.country}</span>}<span className="flex items-center gap-1"><CalendarDays className="size-4 text-coast" />{formatPublicJourneyDate(journey.publishedAt)}</span></div><p className="mt-8 whitespace-pre-wrap font-display text-xl leading-8 text-[#35434a] md:text-2xl md:leading-9">{journey.description}</p>{journey.travelDate && <p className="mt-8 border-t border-stone pt-5 text-sm font-bold text-ocean">Travel date · {journey.travelDate}</p>}<p className="mt-8 rounded-xl bg-mist p-4 text-xs leading-5 text-muted">This is a public journey shared by its verified owner. Likes, comments, saves, and public profiles are not part of this release.</p></div></article></div>
}

function JourneyNotice({ title, description }: { title: string; description: string }) {
  return <section className="mx-auto grid min-h-[65vh] max-w-[1320px] place-items-center px-4 py-12 text-center md:px-8"><div className="max-w-md"><p className="text-xs font-bold uppercase tracking-[.16em] text-coast">Community journeys</p><h1 className="mt-3 font-display text-4xl text-ocean">{title}</h1><p className="mt-4 text-sm leading-6 text-muted">{description}</p><Link to="/explore" className="mt-6 inline-flex rounded text-sm font-bold text-coast underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ocean">Return to Explore</Link></div></section>
}
