import { FormFieldOption, Prisma } from 'src/generated/prisma/client'

export async function cloneOptionsForField(tx: Prisma.TransactionClient, options: FormFieldOption[], field_id: number): Promise<void> {
  if (options.length === 0) return

  await tx.formFieldOption.createMany({
    data: options.map(({ id: _id, field_id: _fid, created_at: _ca, updated_at: _ua, ...opt }) => ({ ...opt, field_id })),
  })
}
