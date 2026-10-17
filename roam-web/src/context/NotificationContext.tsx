import { type ReactNode, useMemo, useState } from 'react'
import { mockNotifications } from '../data/mock-notifications'
import type { Notification } from '../types/notification'
import { NotificationContext, type NotificationContextValue } from './notification-state'
const storageKey = 'roam-notification-state-v1'

function readNotifications() { try { const stored = sessionStorage.getItem(storageKey); if (!stored) return mockNotifications; const readIds = new Set(JSON.parse(stored) as string[]); return mockNotifications.map(item => ({ ...item, read: item.read || readIds.has(item.id) })) } catch { return mockNotifications } }

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(readNotifications)
  const persist = (items: Notification[]) => { try { sessionStorage.setItem(storageKey, JSON.stringify(items.filter(item => item.read).map(item => item.id))) } catch { /* browser storage unavailable */ } }
  const value = useMemo<NotificationContextValue>(() => ({ notifications, unreadCount: notifications.filter(item => !item.read).length, markRead: id => setNotifications(current => { const next = current.map(item => item.id === id ? { ...item, read: true } : item); persist(next); return next }), markAllRead: () => setNotifications(current => { const next = current.map(item => ({ ...item, read: true })); persist(next); return next }) }), [notifications])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
