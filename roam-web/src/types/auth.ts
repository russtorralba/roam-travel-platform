export type AuthProfile = {
  uid: string
  username: string
  displayName: string
}

export type SignUpInput = {
  displayName: string
  username: string
  email: string
  password: string
}

export type ProfileSetupInput = Pick<SignUpInput, 'displayName' | 'username'>
