import cookieParser from 'cookie-parser'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || []
  app.enableCors({ origin: allowedOrigins, credentials: true })

  app.use(cookieParser())
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
