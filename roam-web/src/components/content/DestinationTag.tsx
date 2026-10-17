import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
type Props = { id: string; name: string; country?: string }
const className = 'inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold tracking-wide text-ocean shadow-sm backdrop-blur hover:bg-white'
export function DestinationTag({ id, name, country }: Props) { const content = <><MapPin className="size-3.5 text-coast" />{name}{country && <span className="font-medium text-muted">· {country}</span>}</>; return country ? <Link to={`/destinations/${id}`} className={className}>{content}</Link> : <span className={className}>{content}</span> }
