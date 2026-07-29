import { Injectable } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type { FieldCategoryWithTypes } from '../interface/field.interface'

@Injectable()
export class FieldCatalogService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getFieldCategories(): Promise<FieldCategoryWithTypes[]> {
    return this.prisma.fieldCategory.findMany({
      select: {
        id: true,
        name: true,
        fieldTypes: { select: { id: true, name: true } },
      },
    })
  }
}
