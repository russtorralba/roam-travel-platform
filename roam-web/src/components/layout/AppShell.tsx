import { Bell, Bookmark, Compass, Home, Plus, Search, UserRound, Video } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../../context/useCurrentProfile'
import { useNotifications } from '../../context/useNotifications'
import type { Notification } from '../../types/notification'
import { Button } from '../ui/Button'
import { NotificationPanel } from './NotificationPanel'

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/vlogs', label: 'Vlogs', icon: Video },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/profile/elenaroams', label: 'Profile', icon: UserRound },
]

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useCurrentProfile()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationArea = useRef<HTMLDivElement>(null)
  const notificationPanel = useRef<HTMLDivElement>(null)
  const notificationButton = useRef<HTMLButtonElement>(null)
  const item = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-mist hover:text-ocean'

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q')?.toString().trim() ?? ''
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  const closeNotifications = () => {
    setNotificationsOpen(false)
    requestAnimationFrame(() => notificationButton.current?.focus())
  }

  const navigateFromNotification = (notification: Notification) => {
    markRead(notification.id)
    setNotificationsOpen(false)
    navigate(notification.href)
    requestAnimationFrame(() => notificationButton.current?.focus())
  }

  useEffect(() => {
    if (!notificationsOpen) return
    requestAnimationFrame(() => notificationPanel.current?.focus())
    const outside = (event: MouseEvent) => {
      if (!notificationArea.current?.contains(event.target as Node)) closeNotifications()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNotifications()
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [notificationsOpen])

  return (
    <div className="min-h-screen bg-sand">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 rounded bg-paper p-3 text-ocean">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-stone/70 bg-[#f6f3ec] px-4 py-6 lg:flex">
        <NavLink to="/" className="mb-9 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-full bg-ocean font-display text-xl text-white">R</span>
          <span className="font-display text-2xl tracking-tight text-ocean">ROAM</span>
        </NavLink>
        <Button className="mb-7 w-full" onClick={() => navigate('/create')}><Plus className="size-4" /> Create journey</Button>
        <nav aria-label="Primary navigation" className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${item} ${isActive ? 'bg-paper text-ocean shadow-sm' : ''}`}><Icon className="size-[18px]" />{label}</NavLink>)}
        </nav>
        <div className="mt-auto border-t border-stone/80 pt-5">
          <NavLink to="/profile/elenaroams" className="flex items-center gap-3 rounded-xl p-2 hover:bg-paper">
            <img src={profile.avatar} alt="" className="size-9 rounded-full object-cover" />
            <span><span className="block text-sm font-bold text-ocean">{profile.name}</span><span className="text-xs text-muted">@{profile.username} · Lv. 4</span></span>
          </NavLink>
          <p className="mt-5 text-center text-[10px] uppercase tracking-[.1em] text-muted">Visual prototype · demo</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-stone/70 bg-sand/85 backdrop-blur lg:ml-64">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-8">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-full bg-ocean font-display text-lg text-white">R</span>
            <span className="font-display text-xl text-ocean">ROAM</span>
          </NavLink>
          <form onSubmit={submitSearch} className="relative ml-auto min-w-0 flex-1 max-w-xl">
            <label>
              <span className="sr-only">Search destinations, creators, posts, and vlogs</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-coast" />
              <input key={location.search} name="q" defaultValue={new URLSearchParams(location.search).get('q') ?? ''} type="search" className="w-full min-w-0 rounded-full border border-stone/80 bg-paper py-2 pl-10 pr-4 text-sm placeholder:text-muted focus:border-coast focus:outline-none" placeholder="Search destinations, creators, dispatches" />
            </label>
          </form>
          <div ref={notificationArea} className="relative shrink-0">
            <button ref={notificationButton} onClick={() => setNotificationsOpen(open => !open)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen} aria-controls="notification-panel" className="relative grid size-10 place-items-center rounded-full text-muted transition hover:bg-mist hover:text-ocean focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast">
              <Bell className="size-5" />
              {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[10px] font-bold leading-5 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notificationsOpen && <NotificationPanel notifications={notifications} onRead={markRead} onReadAll={markAllRead} onNavigate={navigateFromNotification} panelRef={notificationPanel} />}
          </div>
          <NavLink to={`/profile/${profile.username}`} aria-label="Open my profile" className={({ isActive }) => `grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coast lg:hidden ${isActive ? 'bg-mist' : ''}`}>
            <img src={profile.avatar} alt="" className="size-8 rounded-full object-cover ring-1 ring-stone/70" />
          </NavLink>
        </div>
      </header>

      <main id="content" className="pb-24 lg:ml-64 lg:pb-8">{children}</main>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-stone/70 bg-paper/95 px-2 backdrop-blur lg:hidden">
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${isActive ? 'text-ocean' : 'text-muted'}`}><Icon className="size-5" />{label}</NavLink>)}
        <NavLink to="/create" className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold text-coast"><Plus className="size-5" />Create</NavLink>
      </nav>
    </div>
  )
}
