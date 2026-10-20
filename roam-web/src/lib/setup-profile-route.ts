export type SetupProfileRoute = 'loading' | '/login' | '/me' | null

export function setupProfileRoute(isLoading: boolean, hasUser: boolean, hasProfile: boolean): SetupProfileRoute {
  if (isLoading) return 'loading'
  if (!hasUser) return '/login'
  if (hasProfile) return '/me'
  return null
}
