/**
 * Migration Script: Fix Client-Area Relationship
 * 
 * This script safely migrates existing data:
 * 1. Maps existing Client.area (string) → Area.name
 * 2. Assigns corresponding areaId to each client
 * 3. Ensures all areas are linked to their company
 * 
 * Run: npx tsx scripts/migrate-area-relation.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Area Relation Migration...\n')

  // Since the old 'area' String field has been renamed to 'areaName',
  // and Prisma renamed the column in the database, we need to check
  // if there's existing data to migrate.
  
  // For now, we'll create areas from any existing areaName values
  const clientsWithAreaName = await prisma.client.findMany({
    where: {
      areaName: {
        not: null
      }
    },
    select: {
      id: true,
      areaName: true,
      companyId: true
    },
    take: 1000 // Limit to avoid memory issues
  })

  console.log(`📊 Found ${clientsWithAreaName.length} clients with areaName\n`)

  if (clientsWithAreaName.length === 0) {
    console.log('✅ No clients with areaName found. Migration complete.')
    return
  }

  // Create a map of unique areas per company
  const areaCompanyMap = new Map<string, string>()
  clientsWithAreaName.forEach(client => {
    if (client.areaName) {
      const key = `${client.companyId}::${client.areaName.toLowerCase().trim()}`
      areaCompanyMap.set(key, client.areaName.trim())
    }
  })

  console.log(`📊 Found ${areaCompanyMap.size} unique area-company combinations\n`)

  // Step 3: Create or find areas for each company
  const areaNameToIdMap = new Map<string, string>()

  for (const [key, areaName] of areaCompanyMap.entries()) {
    const [companyId] = key.split('::')
    const trimmedName = areaName.trim()

    // Try to find existing area
    let area = await prisma.area.findFirst({
      where: {
        companyId,
        name: {
          equals: trimmedName,
          mode: 'insensitive'
        }
      }
    })

    // Create area if it doesn't exist
    if (!area) {
      area = await prisma.area.create({
        data: {
          name: trimmedName,
          companyId,
          description: `Auto-created during migration from client area string: ${trimmedName}`
        }
      })
      console.log(`  ✅ Created area: "${trimmedName}" for company ${companyId}`)
    } else {
      console.log(`  ✓ Found area: "${trimmedName}" for company ${companyId}`)
    }

    areaNameToIdMap.set(key, area.id)
  }

  console.log(`\n📊 Mapped ${areaNameToIdMap.size} areas to IDs\n`)

  // Update clients with areaId
  let updatedCount = 0
  for (const client of clientsWithAreaName) {
    if (client.areaName) {
      const key = `${client.companyId}::${client.areaName.toLowerCase().trim()}`
      const areaId = areaNameToIdMap.get(key)

      if (areaId) {
        await prisma.client.update({
          where: { id: client.id },
          data: { areaId }
        })
        updatedCount++
      }
    }
  }

  console.log(`\n✅ Updated ${updatedCount} clients with areaId\n`)

  // Verification
  const clientsWithAreaId = await prisma.client.count({
    where: {
      areaId: {
        not: null
      }
    }
  })

  const areasCount = await prisma.area.count()

  console.log('📊 Migration Summary:')
  console.log(`   - Total clients with areaName: ${clientsWithAreaName.length}`)
  console.log(`   - Unique areas created/found: ${areasCount}`)
  console.log(`   - Clients updated with areaId: ${clientsWithAreaId}`)
  console.log('\n✅ Migration completed successfully!\n')
  console.log('⚠️  Next steps:')
  console.log('   1. Verify data in the database')
  console.log('   2. Test the Area Management UI at /dashboard/areas')
  console.log('   3. Test client creation with area dropdown\n')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
