import { createContext } from 'react'
import type { Notification } from '../types/notification'

export type NotificationContextValue = { notifications: Notification[]; unreadCount: number; markRead: (id: string) => void; markAllRead: () => void }
export const NotificationContext = createContext<NotificationContextValue | null>(null)
