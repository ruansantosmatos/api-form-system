import { join } from 'path'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import * as swaggerUi from 'swagger-ui-express'
import SwaggerParser from '@apidevtools/swagger-parser'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || []

  const openapiPath = join(process.cwd(), 'docs/openapi.yaml')
  const openapiDocument = await SwaggerParser.bundle(openapiPath)

  app.enableCors({ origin: allowedOrigins, credentials: true })
  app.use(cookieParser())

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
