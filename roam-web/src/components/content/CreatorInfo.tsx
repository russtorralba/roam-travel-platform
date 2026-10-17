import { BadgeCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Traveler } from '../../types/content'

export function CreatorInfo({ traveler, compact = false, inverse = false }: { traveler: Traveler; compact?: boolean; inverse?: boolean }) {
  return <Link to={`/profile/${traveler.username}`} className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-offset-2"><img src={traveler.avatar} alt="" className={`${compact ? 'size-9' : 'size-11'} shrink-0 rounded-full object-cover ring-2 ring-white`} /><span className="min-w-0"><span className={`flex items-center gap-1 font-semibold group-hover:underline ${inverse ? 'text-white' : 'text-ocean'}`}>{traveler.name}{traveler.verified && <BadgeCheck className="size-4 fill-coast text-white" aria-label="Verified traveler" />}</span><span className={`block truncate text-xs ${inverse ? 'text-[#d6e9f4]' : 'text-muted'}`}>{compact ? `@${traveler.username}` : traveler.role}</span></span></Link>
}
