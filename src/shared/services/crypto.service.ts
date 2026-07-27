import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

@Injectable()
export class CryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string): string {
    const key = this.getEncryptionKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
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
