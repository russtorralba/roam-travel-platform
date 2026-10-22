import { Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { DestinationCard } from '../components/content/DestinationCard'
import { PostCard } from '../components/content/PostCard'
import { PublicJourneyCard } from '../components/content/PublicJourneyCard'
import { destinations, posts } from '../data/mock-data'
import { firebaseServices } from '../lib/firebase'
import { listPublicJourneysPage, type PublicJourney } from '../lib/public-journeys'
import type { DestinationCategory } from '../types/content'

const categories: Array<'All' | DestinationCategory> = ['All', 'Coastlines', 'Culture', 'Mountains', 'Food & markets', 'Slow travel']
type CommunityState = 'loading' | 'ready' | 'error'

export function ExplorePage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<(typeof categories)[number]>('All')
  const [communityJourneys, setCommunityJourneys] = useState<PublicJourney[]>([])
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [communityState, setCommunityState] = useState<CommunityState>('loading')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const matches = useMemo(() => destinations.filter(d => (selected === 'All' || d.category === selected) && `${d.name} ${d.country} ${d.summary}`.toLowerCase().includes(query.toLowerCase())), [query, selected])

  const loadCommunityJourneys = useCallback(async (showLoading = true) => {
    if (!firebaseServices) {
      setCommunityState('error')
      return
    }
    if (showLoading) setCommunityState('loading')
    setLoadMoreError(false)
    try {
      const page = await listPublicJourneysPage(firebaseServices.db)
      setCommunityJourneys(page.journeys)
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
      setCommunityState('ready')
    } catch {
      setCommunityState('error')
    }
  }, [])

  useEffect(() => { void loadCommunityJourneys(false) }, [loadCommunityJourneys])

  async function loadMoreCommunityJourneys() {
    if (!firebaseServices || !nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    setLoadMoreError(false)
    try {
      const page = await listPublicJourneysPage(firebaseServices.db, nextCursor)
      setCommunityJourneys(current => [...current, ...page.journeys])
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      setLoadMoreError(true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return <div className="mx-auto max-w-[1320px] px-4 py-8 md:px-8 md:py-12">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-coast">Editorial coastal discovery</p>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="font-display text-4xl text-ocean md:text-6xl">Find a place that<br /><em className="font-normal">changes the pace.</em></h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted">A living atlas of destinations shaped by the people who move through them with care.</p></div><span className="rounded-full bg-mist px-4 py-2 text-xs font-bold text-ocean">{destinations.length} curated destinations</span></div>
    <section aria-label="Search destinations" className="mt-9 rounded-2xl border border-stone/70 bg-paper p-4 shadow-sm"><label className="relative block"><span className="sr-only">Search destinations</span><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-coast" /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-xl bg-mist py-3 pl-11 pr-4 text-sm text-ocean placeholder:text-muted focus:outline-none" placeholder="Search a destination, country, or feeling" /></label><div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1"><SlidersHorizontal className="size-4 shrink-0 text-muted" aria-hidden="true" />{categories.map(category => <button key={category} onClick={() => setSelected(category)} aria-pressed={selected === category} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${selected === category ? 'bg-ocean text-white' : 'bg-mist text-muted hover:bg-stone hover:text-ocean'}`}>{category}</button>)}</div></section>
    <section className="mt-10"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-3xl text-ocean">Destinations in focus</h2><span className="text-xs text-muted">{matches.length} result{matches.length === 1 ? '' : 's'}</span></div>{matches.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{matches.map(destination => <DestinationCard key={destination.name} destination={destination} />)}</div> : <div className="rounded-2xl border border-dashed border-stone bg-paper px-6 py-16 text-center"><h3 className="font-display text-2xl text-ocean">No places found</h3><p className="mt-2 text-sm text-muted">Try another name or clear a category filter.</p><button onClick={() => { setQuery(''); setSelected('All') }} className="mt-5 text-sm font-bold text-coast underline underline-offset-4">Clear filters</button></div>}</section>
    <section aria-labelledby="community-journeys" className="mt-14 border-t border-stone pt-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-coast">From the community</p><h2 id="community-journeys" className="mt-2 font-display text-3xl text-ocean">Community journeys</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Public journeys shared by verified ROAM travelers. Private drafts never appear here.</p>{communityState === 'loading' && <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading community journeys">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-mist" />)}</div>}{communityState === 'error' && <div className="mt-6 rounded-2xl border border-dashed border-stone bg-paper px-6 py-12 text-center"><h3 className="font-display text-2xl text-ocean">Community journeys are unavailable</h3><p className="mt-2 text-sm text-muted">Please check your connection and try again.</p><button onClick={() => void loadCommunityJourneys()} className="mt-5 rounded bg-ocean px-4 py-2 text-sm font-bold text-white hover:bg-[#064362] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast">Try again</button></div>}{communityState === 'ready' && <>{communityJourneys.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{communityJourneys.map(journey => <PublicJourneyCard key={journey.id} journey={journey} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-stone bg-paper px-6 py-12 text-center"><h3 className="font-display text-2xl text-ocean">No community journeys yet</h3><p className="mt-2 text-sm text-muted">Published journeys will appear here when travelers choose to share them.</p></div>}{loadMoreError && <p role="alert" className="mt-5 text-sm font-semibold text-[#b33a3a]">We could not load more journeys. Please try again.</p>}{hasMore && <button onClick={() => void loadMoreCommunityJourneys()} disabled={isLoadingMore} className="mt-6 rounded border border-ocean px-4 py-2 text-sm font-bold text-ocean hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast">{isLoadingMore ? 'Loading more…' : 'Load more journeys'}</button>}</>}</section>
    <section className="mt-14 border-t border-stone pt-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-coast">Dispatches from the atlas</p><h2 className="mt-2 font-display text-3xl text-ocean">Read before you go</h2><div className="mt-6 grid gap-6 md:grid-cols-2">{posts.map(post => <PostCard key={post.id} post={post} />)}</div></section>
  </div>
}
