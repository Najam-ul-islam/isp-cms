// lib/prisma-helpers.ts
import prisma  from './prisma'

// Type-safe way to check if a field exists (runtime check)
export function hasClientField(field: string): boolean {
  const dmmf = (prisma as any)._dmmf
  const clientFields = dmmf.datamodel.models
    .find((m: any) => m.name === 'Client')
    ?.fields.map((f: any) => f.name) || []
  
  return clientFields.includes(field)
}