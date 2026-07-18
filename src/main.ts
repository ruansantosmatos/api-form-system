import { join } from 'path'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import * as swaggerUi from 'swagger-ui-express'
import type { OpenAPIV3 } from 'openapi-types'
import SwaggerParser from '@apidevtools/swagger-parser'
import { docsBasicAuth } from './shared/utils/docsBasicAuth'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || []
  const isProduction = process.env.NODE_ENV === 'production'

  const openapiPath = join(process.cwd(), 'docs/openapi.yaml')
  const openapiDocument = (await SwaggerParser.bundle(openapiPath)) as OpenAPIV3.Document

  if (process.env.API_URL) openapiDocument.servers = [{ url: process.env.API_URL, description: 'Production' }, ...(openapiDocument.servers ?? [])]
  
  app.enableCors({ origin: allowedOrigins, credentials: true })
  app.use(cookieParser())

  isProduction ?
  app.use('/docs', docsBasicAuth, swaggerUi.serve, swaggerUi.setup(openapiDocument))
  :
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))

  await app.listen(process.env.PORT as string)
}

bootstrap()
