import { validateDisplayName, validatePassword, validateUsername } from './profile-validation'

export type AuthFormField = 'displayName' | 'username' | 'email' | 'password'
export type AuthFormErrors = Partial<Record<AuthFormField, string>>

export function authFieldError(field: AuthFormField, value: string) {
  if (field === 'displayName') return validateDisplayName(value)
  if (field === 'username') return validateUsername(value)
  if (field === 'email') return /^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'Enter a valid email address.'
  return validatePassword(value)
}

export function clearFieldErrorWhenValid(errors: AuthFormErrors, field: AuthFormField, value: string): AuthFormErrors {
  if (authFieldError(field, value) || !errors[field]) return errors
  const { [field]: _clearedError, ...remainingErrors } = errors
  return remainingErrors
}
