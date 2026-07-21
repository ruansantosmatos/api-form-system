import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IMAGE_URL_EXPIRES_IN } from '../consts/image'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { R2DeleteObjectInput, R2GetDownloadUrlInput, R2GetUploadUrlInput } from '../types/r2-service.type'

@Injectable()
export class R2Service {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID')
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID')

    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY')
    const bucket = this.configService.get<string>('R2_BUCKET')

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error('R2 storage configuration not defined.')

    this.bucket = bucket
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
  }

  async getUploadUrl({ key, contentType }: R2GetUploadUrlInput): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })
    return getSignedUrl(this.client, command, { expiresIn: IMAGE_URL_EXPIRES_IN.UPLOAD })
  }

  async getDownloadUrl({ key }: R2GetDownloadUrlInput): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.client, command, { expiresIn: IMAGE_URL_EXPIRES_IN.DOWNLOAD })
  }

  async deleteObject({ key }: R2DeleteObjectInput): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
