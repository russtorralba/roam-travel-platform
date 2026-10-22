export type RegistrationResult = {
  verificationEmailSent: boolean
}

export async function completeRegistration<User>({
  createAccount,
  completeProfile,
  sendVerification,
}: {
  createAccount: () => Promise<User>
  completeProfile: () => Promise<void>
  sendVerification: (user: User) => Promise<void>
}): Promise<RegistrationResult> {
  const user = await createAccount()
  await completeProfile()

  try {
    await sendVerification(user)
    return { verificationEmailSent: true }
  } catch {
    return { verificationEmailSent: false }
  }
}
