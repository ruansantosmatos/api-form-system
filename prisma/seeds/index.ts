import { prismaClient } from './config/prisma-client'
import { categoriesAndTypes } from './seed/categories-and-types'
import { aiProvidersAndModels } from './seed/ai-providers-and-models'

async function main() {
  try {
    await categoriesAndTypes()
    await aiProvidersAndModels()
    await prismaClient.$disconnect()
  } catch (error) {
    console.error('Seed failed:', error)
    await prismaClient.$disconnect()
    process.exit(1)
  }
}

main()
