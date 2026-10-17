import { destinations, posts, travelers, vlogs } from './mock-data'
import type { Notification } from '../types/notification'

export const mockNotifications: Notification[] = [
  { id: 'like-lagoon', kind: 'like', traveler: travelers[1], message: `liked “${posts[0].title}”`, timestamp: '12m ago', href: `/posts/${posts[0].id}`, destinationLabel: destinations[0].name, read: false },
  { id: 'comment-lagoon', kind: 'comment', traveler: travelers[2], message: `commented on “${posts[0].title}”`, timestamp: '1h ago', href: `/posts/${posts[0].id}`, destinationLabel: destinations[0].name, read: false },
  { id: 'vlog-cave', kind: 'vlog', traveler: vlogs[0].traveler, message: `added a new vlog: “${vlogs[0].title}”`, timestamp: '3h ago', href: `/vlogs/${vlogs[0].id}`, destinationLabel: destinations[0].name, read: false },
  { id: 'destination-kyoto', kind: 'destination', message: `has a new field update in the mock archive`, timestamp: 'Yesterday', href: `/destinations/${destinations[1].id}`, destinationLabel: `${destinations[1].name}, ${destinations[1].country}`, read: true },
]
