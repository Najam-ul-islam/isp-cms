import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface TenantContext {
  companyId: string;
  userId: string;
  role: string;
}

const TENANT_MISSING_ERROR = '🚫 TENANT ISOLATION FAILURE: companyId is required for all database operations';

function assertCompanyId(companyId: string | undefined): asserts companyId is string {
  if (!companyId) {
    throw new Error(TENANT_MISSING_ERROR);
  }
}

export function createTenantPrisma(basePrisma: PrismaClient, companyId: string) {
  assertCompanyId(companyId);

  // Removed redundant `query.$allOperations` hook.
  // Explicit model overrides are safer, more performant, and prevent double-execution conflicts.
  return basePrisma.$extends({
    name: 'tenantIsolation',
    model: {
      client: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findFirst(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.findFirst({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findUnique(args: any) {
          assertCompanyId(companyId);
          const where = args.where as any;
          if (!where?.companyId || where.companyId !== companyId) {
            throw new Error(
              `🚫 SECURITY VIOLATION: findUnique on Client without valid companyId in composite key. ` +
              `Expected companyId=${companyId}, got ${where?.companyId || 'undefined'}`
            );
          }
          return basePrisma.client.findUnique(args);
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.client.createMany({ ...args, data });
        },
        async update(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.update({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async updateMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.updateMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async delete(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.delete({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async deleteMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.deleteMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async upsert(args: any) {
          assertCompanyId(companyId);
          return basePrisma.client.upsert({
            ...args,
            where: { ...(args.where || {}), companyId },
            create: { ...args.create, companyId },
            update: args.update,
          });
        },
      },

      package: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.package.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findFirst(args: any) {
          assertCompanyId(companyId);
          return basePrisma.package.findFirst({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findUnique(args: any) {
          assertCompanyId(companyId);
          const where = args.where as any;
          if (!where?.companyId || where.companyId !== companyId) {
            throw new Error(`🚫 SECURITY VIOLATION: findUnique on Package without valid companyId. Expected companyId=${companyId}, got ${where?.companyId || 'undefined'}`);
          }
          return basePrisma.package.findUnique(args);
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.package.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.package.createMany({ ...args, data });
        },
        async update(args: any) {
          assertCompanyId(companyId);
          return basePrisma.package.update({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async delete(args: any) {
          assertCompanyId(companyId);
          return basePrisma.package.delete({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async upsert(args: any) {
          assertCompanyId(companyId);
          return basePrisma.package.upsert({
            ...args,
            where: { ...(args.where || {}), companyId },
            create: { ...args.create, companyId },
            update: args.update,
          });
        },
      },

      area: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.area.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findFirst(args: any) {
          assertCompanyId(companyId);
          return basePrisma.area.findFirst({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.area.create({ ...args, data: { ...args.data, companyId } });
        },
      },

      admin: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.admin.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
      },

      invoice: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.invoice.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
      },

      payment: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.payment.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
      },

      expense: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.expense.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
      },

      complaint: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.complaint.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
      },

      auditLog: {
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.auditLog.create({ ...args, data: { ...args.data, companyId } });
        },
      },

      serviceProvider: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.serviceProvider.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findFirst(args: any) {
          assertCompanyId(companyId);
          return basePrisma.serviceProvider.findFirst({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async findUnique(args: any) {
          assertCompanyId(companyId);
          const where = args.where as any;
          if (!where?.companyId || where.companyId !== companyId) {
            throw new Error(`🚫 SECURITY VIOLATION: findUnique on ServiceProvider without valid companyId. Expected companyId=${companyId}, got ${where?.companyId || 'undefined'}`);
          }
          return basePrisma.serviceProvider.findUnique(args);
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.serviceProvider.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.serviceProvider.createMany({ ...args, data });
        },
        async update(args: any) {
          assertCompanyId(companyId);
          return basePrisma.serviceProvider.update({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async delete(args: any) {
          assertCompanyId(companyId);
          return basePrisma.serviceProvider.delete({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async upsert(args: any) {
          assertCompanyId(companyId);
          return basePrisma.serviceProvider.upsert({
            ...args,
            where: { ...(args.where || {}), companyId },
            create: { ...args.create, companyId },
            update: args.update,
          });
        },
      },

      productSale: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.productSale.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.productSale.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.productSale.createMany({ ...args, data });
        },
      },

      accountLedger: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.accountLedger.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.accountLedger.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.accountLedger.createMany({ ...args, data });
        },
      },

      accountTransaction: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.accountTransaction.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.accountTransaction.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.accountTransaction.createMany({ ...args, data });
        },
      },

      inventoryItem: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.inventoryItem.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.inventoryItem.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.inventoryItem.createMany({ ...args, data });
        },
      },

      inventoryTransaction: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.inventoryTransaction.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.inventoryTransaction.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.inventoryTransaction.createMany({ ...args, data });
        },
      },

      quotation: {
        async findMany(args: any) {
          assertCompanyId(companyId);
          return basePrisma.quotation.findMany({ ...args, where: { ...(args.where || {}), companyId } });
        },
        async create(args: any) {
          assertCompanyId(companyId);
          return basePrisma.quotation.create({ ...args, data: { ...args.data, companyId } });
        },
        async createMany(args: any) {
          assertCompanyId(companyId);
          const data = Array.isArray(args.data)
            ? args.data.map((d: any) => ({ ...d, companyId }))
            : { ...args.data, companyId };
          return basePrisma.quotation.createMany({ ...args, data });
        },
      },
    },
  }) as any;
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

export function getTenantPrisma(companyId: string): TenantPrismaClient {
  return createTenantPrisma(prisma, companyId);
}



// import { Prisma, PrismaClient } from '@prisma/client';
// import { prisma } from '../lib/prisma';

// export interface TenantContext {
//   companyId: string;
//   userId: string;
//   role: string;
// }

// const TENANT_MISSING_ERROR = '🚫 TENANT ISOLATION FAILURE: companyId is required for all database operations';

// function assertCompanyId(companyId: string | undefined): asserts companyId is string {
//   if (!companyId) {
//     throw new Error(TENANT_MISSING_ERROR);
//   }
// }

// export function createTenantPrisma(basePrisma: PrismaClient, companyId: string) {
//   assertCompanyId(companyId);

//   const tenantPrisma: any = basePrisma.$extends({
//     name: 'tenantIsolation',
//     query: {
//       async $allOperations({ operation, model, args, query }: any) {
//         if (!companyId) {
//           throw new Error(TENANT_MISSING_ERROR);
//         }
//         return query(args);
//       },
//     },

// model: {
//        client: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async findFirst(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).findFirst({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async findUnique(args: any) {
//           assertCompanyId(companyId);
//           const where = args.where as any;
//           if (!where.companyId || where.companyId !== companyId) {
//             throw new Error(
//               `🚫 SECURITY VIOLATION: findUnique on Client without valid companyId in composite key. ` +
//               `Expected companyId=${companyId}, got ${where.companyId || 'undefined'}`
//             );
//           }
//           return (basePrisma.client as any).findUnique(args);
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           });
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.client as any).createMany({
//             ...args,
//             data,
//           });
//         },

//         async update(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).update({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async updateMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).updateMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },
//       },
//     },

//     model: {
//       client: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async findFirst(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).findFirst({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async findUnique(args: any) {
//           assertCompanyId(companyId);
//           const where = args.where as any;
//           if (!where.companyId || where.companyId !== companyId) {
//             throw new Error(
//               `🚫 SECURITY VIOLATION: findUnique on Client without valid companyId in composite key. ` +
//               `Expected companyId=${companyId}, got ${where.companyId || 'undefined'}`
//             );
//           }
//           return (basePrisma.client as any).findUnique(args);
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           });
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.client as any).createMany({
//             ...args,
//             data,
//           });
//         },

//         async update(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).update({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async updateMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).updateMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async delete(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).delete({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async deleteMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).deleteMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           });
//         },

//         async upsert(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.client as any).upsert({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//             create: {
//               ...args.create,
//               companyId,
//             },
//             update: args.update,
//           });
//         },
//       },

//       package: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.package as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async findFirst(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.package as any).findFirst({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async findUnique(args: any) {
//           assertCompanyId(companyId);
//           const where = args.where as any;
//           if (!where.companyId || where.companyId !== companyId) {
//             throw new Error(
//               `🚫 SECURITY VIOLATION: findUnique on Package without valid companyId in composite key. ` +
//               `Expected companyId=${companyId}, got ${where.companyId || 'undefined'}`
//             );
//           }
//           return (basePrisma.package as any).findUnique(args) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.package as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.package as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },

//         async update(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.package as any).update({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async delete(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.package as any).delete({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async upsert(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.package as any).upsert({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//             create: {
//               ...args.create,
//               companyId,
//             },
//             update: args.update,
//           }) as any;
//         },
//       },

//       area: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.area as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async findFirst(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.area as any).findFirst({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.area as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       admin: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.admin as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       invoice: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.invoice as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       payment: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.payment as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       expense: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.expense as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       complaint: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.complaint as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       auditLog: {
//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.auditLog as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },
//       },

//       serviceProvider: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.serviceProvider as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async findFirst(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.serviceProvider as any).findFirst({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async findUnique(args: any) {
//           assertCompanyId(companyId);
//           const where = args.where as any;
//           if (!where.companyId || where.companyId !== companyId) {
//             throw new Error(
//               `🚫 SECURITY VIOLATION: findUnique on ServiceProvider without valid companyId in composite key. ` +
//               `Expected companyId=${companyId}, got ${where.companyId || 'undefined'}`
//             );
//           }
//           return (basePrisma.serviceProvider as any).findUnique(args) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.serviceProvider as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.serviceProvider as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },

//         async update(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.serviceProvider as any).update({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async delete(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.serviceProvider as any).delete({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async upsert(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.serviceProvider as any).upsert({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//             create: {
//               ...args.create,
//               companyId,
//             },
//             update: args.update,
//           }) as any;
//         },
//       },

//       productSale: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.productSale as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.productSale as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.productSale as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },
//       },

//       accountLedger: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.accountLedger as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.accountLedger as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.accountLedger as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },
//       },

//       accountTransaction: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.accountTransaction as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.accountTransaction as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.accountTransaction as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },
//       },

//       inventoryItem: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.inventoryItem as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.inventoryItem as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.inventoryItem as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },
//       },

//       inventoryTransaction: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.inventoryTransaction as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.inventoryTransaction as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.inventoryTransaction as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },
//       },

//       quotation: {
//         async findMany(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.quotation as any).findMany({
//             ...args,
//             where: {
//               ...args.where,
//               companyId,
//             },
//           }) as any;
//         },

//         async create(args: any) {
//           assertCompanyId(companyId);
//           return (basePrisma.quotation as any).create({
//             ...args,
//             data: {
//               ...args.data,
//               companyId,
//             },
//           }) as any;
//         },

//         async createMany(args: any) {
//           assertCompanyId(companyId);
//           const data = Array.isArray(args.data)
//             ? args.data.map((d: any) => ({ ...d, companyId }))
//             : { ...args.data, companyId };
//           return (basePrisma.quotation as any).createMany({
//             ...args,
//             data,
//           }) as any;
//         },
//       },
//       },
//       },
//     } as any);

//     return tenantPrisma;
//   }

// export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

// export function getTenantPrisma(companyId: string): TenantPrismaClient {
//   return createTenantPrisma(prisma, companyId);
// }


