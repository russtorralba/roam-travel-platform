import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/useAuth'
import { authErrorMessage } from '../lib/auth-error-message'
import { authFieldError, clearFieldErrorWhenValid, type AuthFormField, type AuthFormErrors } from '../lib/auth-form-validation'
import { setupProfileRoute } from '../lib/setup-profile-route'

type Mode = 'login' | 'signup' | 'forgot' | 'setup'
type FormErrors = AuthFormErrors

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { user, profile, isLoading, isConfigured, configurationError, signIn, signUp, sendPasswordReset, completeProfile, resendVerification } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const setupRoute = mode === 'setup' ? setupProfileRoute(isLoading, Boolean(user), Boolean(profile)) : null
  if (setupRoute === 'loading') return <section className="mx-auto grid min-h-[60vh] max-w-[1320px] place-items-center px-4 text-center"><p className="text-sm font-semibold text-muted">Loading your ROAM account…</p></section>
  if (setupRoute) return <Navigate to={setupRoute} replace />

  const heading = mode === 'signup' ? 'Join the field notes.' : mode === 'forgot' ? 'Reset your password.' : mode === 'setup' ? 'Complete your field identity.' : 'Welcome back.'
  const description = mode === 'signup' ? 'Create a private ROAM account. Your email stays with Firebase Authentication and is not stored in your public profile.' : mode === 'forgot' ? 'We will send password-reset instructions to your account email.' : mode === 'setup' ? 'Your account exists, but its profile setup was not completed. Choose your display name and username to finish.' : 'Sign in to access your own ROAM account profile.'

  const validate = () => {
    const next: FormErrors = {}
    if (mode === 'signup' || mode === 'setup') {
      const displayNameError = authFieldError('displayName', displayName)
      const usernameError = authFieldError('username', username)
      if (displayNameError) next.displayName = displayNameError
      if (usernameError) next.username = usernameError
    }
    if (mode !== 'setup') {
      const emailError = authFieldError('email', email)
      if (emailError) next.email = emailError
    }
    if (mode === 'signup' || mode === 'login') {
      const passwordError = authFieldError('password', password)
      if (passwordError) next.password = passwordError
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const updateField = (field: AuthFormField, value: string, setValue: (nextValue: string) => void) => {
    setValue(value)
    setErrors(current => clearFieldErrorWhenValid(current, field, value))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const result = await signUp({ displayName, username, email, password })
        navigate('/me', {
          state: result.verificationEmailSent
            ? undefined
            : { registrationNotice: 'Your account is ready, but we could not send the verification email. You can resend it below.' },
        })
      } else if (mode === 'login') {
        await signIn(email, password)
        navigate('/me')
      } else if (mode === 'forgot') {
        await sendPasswordReset(email)
        setNotice('If this address has a ROAM account, reset instructions are on their way.')
      } else {
        if (!user) throw new Error('Sign in before completing your ROAM profile.')
        await completeProfile({ displayName, username })
        await resendVerification()
        navigate('/me')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ProfileSetupError') {
        setNotice('Your email account was created. Finish the profile details below to continue.')
        navigate('/setup-profile')
      } else {
        setNotice(authErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="mx-auto grid w-full min-w-0 min-h-[calc(100vh-10rem)] max-w-[1320px] place-items-center px-4 py-10 md:px-8"><section className="w-full min-w-0 max-w-lg rounded-2xl border border-stone/70 bg-paper p-4 shadow-sm sm:p-8"><Link to="/" className="inline-flex items-center gap-2 rounded text-sm font-bold text-ocean hover:text-coast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coast"><ArrowLeft className="size-4" />Return to the archive</Link><div className="mt-7 min-w-0"><p className="text-xs font-bold uppercase tracking-[.16em] text-coast">ROAM account</p><h1 className="mt-3 break-words font-display text-4xl text-ocean">{heading}</h1><p className="mt-3 break-words text-sm leading-6 text-muted">{description}</p></div>{!isConfigured ? <p role="alert" className="mt-6 break-words rounded-xl bg-[#fff0ec] px-4 py-3 text-sm leading-6 text-terracotta">{configurationError}</p> : <form onSubmit={submit} className="mt-7 grid min-w-0 gap-5">{(mode === 'signup' || mode === 'setup') && <><Field label="Display name" value={displayName} onChange={value => updateField('displayName', value, setDisplayName)} error={errors.displayName} autoComplete="name" maxLength={60} /><Field label="Username" value={username} onChange={value => updateField('username', value, setUsername)} error={errors.username} autoComplete="username" maxLength={20} hint="3–20 lowercase letters, numbers, or underscores" /></>}{mode !== 'setup' && <Field label="Email" value={email} onChange={value => updateField('email', value, setEmail)} error={errors.email} autoComplete="email" type="email" icon={<Mail className="size-4" />} />}{(mode === 'signup' || mode === 'login') && <Field label="Password" value={password} onChange={value => updateField('password', value, setPassword)} error={errors.password} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type="password" icon={<KeyRound className="size-4" />} />}{notice && <p role="status" className="break-words rounded-xl bg-mist px-4 py-3 text-sm leading-6 text-ocean">{notice}</p>}<Button type="submit" disabled={submitting}>{submitting ? 'Working…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset instructions' : mode === 'setup' ? 'Complete profile' : 'Log in'}</Button></form>}<div className="mt-6 min-w-0 border-t border-stone pt-5 text-sm text-muted">{mode === 'login' && <p>New to ROAM? <Link to="/signup" className="font-bold text-coast underline underline-offset-4">Create an account</Link></p>}{mode === 'signup' && <p>Already have an account? <Link to="/login" className="font-bold text-coast underline underline-offset-4">Log in</Link></p>}{mode === 'login' && <p className="mt-3"><Link to="/forgot-password" className="font-bold text-coast underline underline-offset-4">Forgot password?</Link></p>}{mode === 'forgot' && <p><Link to="/login" className="font-bold text-coast underline underline-offset-4">Back to log in</Link></p>}{mode === 'setup' && <p>Your account setup remains private until you finish it.</p>}</div></section></div>
}

function Field({ label, value, onChange, error, autoComplete, type = 'text', maxLength, hint, icon }: { label: string; value: string; onChange: (value: string) => void; error?: string; autoComplete: string; type?: string; maxLength?: number; hint?: string; icon?: React.ReactNode }) {
  const id = label.toLowerCase().replace(' ', '-')
  return <label className="block min-w-0 text-sm font-bold text-ocean">{label}<span className="relative mt-2 block min-w-0">{icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-coast">{icon}</span>}<input id={id} value={value} onChange={event => onChange(event.target.value)} type={type} autoComplete={autoComplete} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={`w-full min-w-0 rounded-xl border border-stone bg-sand py-3 text-sm text-ocean focus:border-coast focus:outline-none ${icon ? 'pl-10 pr-4' : 'px-4'}`} /></span>{hint && <span id={`${id}-hint`} className="mt-1 block break-words text-xs font-normal text-muted">{hint}</span>}{error && <span id={`${id}-error`} className="mt-1 block break-words text-xs font-semibold text-terracotta">{error}</span>}</label>
}
