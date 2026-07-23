export type AccountSettingsResult = {
  email: string
  recovery_email: string | null
  recovery_email_verified: boolean
  recovery_email_pending: string | null
  is_2fa_enabled: boolean
}

export type AccountServiceUpdateRecoveryEmail = {
  user_id: number
  recovery_email: string
}

export type AccountMessageResult = { message: string }

export type AccountServiceVerifyRecoveryEmail = {
  user_id: number
  code: string
}

export type AccountTwoFactorSetupResult = {
  secret: string
  otpauth_url: string
  qr_code_data_uri: string
}

export type AccountServiceConfirmTwoFactor = {
  user_id: number
  code: string
}

export type AccountTwoFactorConfirmResult = {
  message: string
  backup_codes: string[]
}

export type AccountServiceDisableTwoFactor = {
  user_id: number
  code: string
}
