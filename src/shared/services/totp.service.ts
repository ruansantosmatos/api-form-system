import { randomBytes } from 'crypto'
import * as QRCode from 'qrcode'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CryptoService } from './crypto.service'
import { SecurityService } from './security.service'
import { verify, generateURI, generateSecret } from 'otplib'
import { TotpServiceBackupCodesResult } from '../types/totp-service.type'

@Injectable()
export class TotpService {
  constructor(
    private readonly configService: ConfigService,
    private readonly securityService: SecurityService,
    private readonly cryptoService: CryptoService,
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
    return this.cryptoService.encrypt(secret)
  }

  decrypt(payload: string): string {
    return this.cryptoService.decrypt(payload)
  }
}
