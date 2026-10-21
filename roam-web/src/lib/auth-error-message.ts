const usernameSetupMessage = 'That username is unavailable or setup could not be completed. Please choose another username.'

export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

  if (code === 'auth/email-already-in-use') return 'An account already uses this email address.'
  if (code === 'auth/invalid-credential') return 'Email or password is incorrect.'
  if (code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (code === 'auth/weak-password') return 'Choose a stronger password with at least 8 characters.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait and try again.'
  if (code === 'auth/network-request-failed') return 'A network error occurred. Check your connection and try again.'
  if (code === 'permission-denied' || code === 'already-exists') return usernameSetupMessage

  return 'We couldn’t complete that request. Please try again.'
}
