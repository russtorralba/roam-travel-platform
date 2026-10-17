import type { Traveler } from './content'

export type NotificationKind = 'like' | 'comment' | 'vlog' | 'destination'
export type Notification = { id: string; kind: NotificationKind; message: string; timestamp: string; href: string; read: boolean; traveler?: Traveler; destinationLabel: string }
