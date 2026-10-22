import { CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { destinations } from '../../data/mock-data'
import { isDraftCover } from '../../lib/journey-draft'
import { formatPublicJourneyDate, type PublicJourney } from '../../lib/public-journeys'
import { DestinationTag } from './DestinationTag'

export function PublicJourneyCard({ journey }: { journey: PublicJourney }) {
  const destination = destinations.find(item => item.id === journey.destinationId)
  const cover = isDraftCover(journey.cover) ? journey.cover : destination?.image
  return <article className="overflow-hidden rounded-2xl border border-stone/70 bg-paper shadow-[0_4px_20px_-4px_rgba(10,54,74,.08)]"><div className="relative aspect-[4/3] overflow-hidden bg-ocean">{cover ? <img src={cover} alt="" className="size-full object-cover" /> : <div className="size-full bg-linear-to-br from-ocean to-coast" />}{destination && <div className="absolute left-4 top-4"><DestinationTag id={destination.id} name={destination.name} /></div>}</div><div className="p-5"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-coast">{journey.category || 'Journey'}</p><h3 className="mt-2 font-display text-3xl leading-[1.06] text-ocean"><Link to={`/journeys/${journey.id}`} className="rounded hover:text-coast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast">{journey.title}</Link></h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{journey.description}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone/70 pt-4 text-xs text-muted"><span className="flex items-center gap-1"><MapPin className="size-3 text-coast" />{destination ? `${destination.name}, ${destination.country}` : 'ROAM journey'}</span><span className="flex items-center gap-1"><CalendarDays className="size-3 text-coast" />{formatPublicJourneyDate(journey.publishedAt)}</span></div><p className="mt-3 text-xs font-bold text-ocean">By {journey.authorDisplayName || `@${journey.authorUsername}`}</p></div></article>
}
