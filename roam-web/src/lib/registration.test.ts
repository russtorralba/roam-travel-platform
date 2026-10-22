import { describe, expect, it, vi } from 'vitest'
import { completeRegistration } from './registration'

describe('completeRegistration', () => {
  it('completes registration when verification email delivery fails', async () => {
    const user = { uid: 'user-a' }
    const createAccount = vi.fn().mockResolvedValue(user)
    const completeProfile = vi.fn().mockResolvedValue(undefined)
    const sendVerification = vi.fn().mockRejectedValue(new Error('Email action unavailable'))

    await expect(completeRegistration({ createAccount, completeProfile, sendVerification })).resolves.toEqual({ verificationEmailSent: false })
    expect(createAccount).toHaveBeenCalledOnce()
    expect(completeProfile).toHaveBeenCalledOnce()
    expect(sendVerification).toHaveBeenCalledWith(user)
  })

  it('propagates account creation failure without creating a profile', async () => {
    const createAccount = vi.fn().mockRejectedValue(new Error('Account creation failed'))
    const completeProfile = vi.fn().mockResolvedValue(undefined)
    const sendVerification = vi.fn().mockResolvedValue(undefined)

    await expect(completeRegistration({ createAccount, completeProfile, sendVerification })).rejects.toThrow('Account creation failed')
    expect(completeProfile).not.toHaveBeenCalled()
    expect(sendVerification).not.toHaveBeenCalled()
  })

  it('propagates profile creation failure without attempting verification', async () => {
    const createAccount = vi.fn().mockResolvedValue({ uid: 'user-a' })
    const completeProfile = vi.fn().mockRejectedValue(new Error('Profile creation failed'))
    const sendVerification = vi.fn().mockResolvedValue(undefined)

    await expect(completeRegistration({ createAccount, completeProfile, sendVerification })).rejects.toThrow('Profile creation failed')
    expect(sendVerification).not.toHaveBeenCalled()
  })
})
