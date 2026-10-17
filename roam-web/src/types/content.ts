export type Traveler = { id: string; name: string; username: string; role: string; avatar: string; verified?: boolean; location: string }
export type DestinationCategory = 'Coastlines' | 'Culture' | 'Mountains' | 'Food & markets' | 'Slow travel'
export type Destination = { id: string; name: string; country: string; image: string; storyCount: number; category: DestinationCategory; summary: string }
export type Post = { id: string; kind: 'photo' | 'story'; title: string; excerpt: string; body: string[]; image: string; destination: Pick<Destination, 'id' | 'name' | 'country'>; traveler: Traveler; publishedAt: string; readTime: string; likes: number; comments: number; tags: string[] }
export type VlogCategory = 'All Vlogs' | 'Hidden Lagoons & Diving' | 'Mountain Summits & Mist' | 'Night Markets & Food' | 'Cultural Rituals' | 'Travel Hacks & Packing'
export type Vlog = { id: string; title: string; image: string; duration: string; views: string; traveler: Traveler; destination: string; destinationId?: string; category: Exclude<VlogCategory, 'All Vlogs'>; audio: string; likes: string; comments: number }
