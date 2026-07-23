import * as QRCode from 'qrcode'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SecurityService } from './security.service'
import { verify, generateURI, generateSecret } from 'otplib'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { TotpServiceBackupCodesResult } from '../types/totp-service.type'

@Injectable()
export class TotpService {
  constructor(
    private readonly configService: ConfigService,
    private readonly securityService: SecurityService,
  ) {}

  generateSecret(): string {
    return generateSecret()
  }

  buildOtpAuthUrl(secret: string, email: string): string {
    const issuer = this.configService.get<string>('APP_NAME', 'Form System')
    return generateURI({ issuer, label: email, secret })
  }

  async buildQrCodeDataUri(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl)
  }

  async verifyToken(secret: string, token: string): Promise<boolean> {
    try {
      const result = await verify({ secret, token })
      return result.valid
    } catch {
      return false
    }
  }

  async generateBackupCodes(count = 8): Promise<TotpServiceBackupCodesResult> {
    const codes = Array.from({ length: count }, () => randomBytes(5).toString('hex'))
    const hashes = await Promise.all(codes.map(code => this.securityService.hash(code)))
    return { codes, hashes }
  }

  encrypt(secret: string): string {
    const key = this.getEncryptionKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  decrypt(payload: string): string {
    const key = this.getEncryptionKey()
    const buffer = Buffer.from(payload, 'base64')

    const iv = buffer.subarray(0, 12)
    const authTag = buffer.subarray(12, 28)
    const encrypted = buffer.subarray(28)

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }

  private getEncryptionKey(): Buffer {
    const key = this.configService.getOrThrow<string>('APP_ENCRYPTION_KEY')
    return Buffer.from(key, 'hex')
  }
}
