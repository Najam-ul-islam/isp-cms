// modules/payments/types/index.ts
import type { Payment, Client, Prisma } from '@prisma/client';

// ✅ Define the EXACT include configuration (must match repository)
export const paymentWithClientInclude = {
  client: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
} as const satisfies Prisma.PaymentInclude;

// ✅ Generate the correct return type using Prisma's helper
// This tells TypeScript: "When include has client with these fields, this is the result"
export type PaymentWithClient = Prisma.PaymentGetPayload<{
  include: typeof paymentWithClientInclude;
}>;

// Input types
export interface CreatePaymentInput {
  clientId: string;
  amount: number;
  method?: string;
  notes?: string;
  companyId: string;
}

export interface UpdatePaymentInput {
  amount?: number;
  method?: string;
  notes?: string;
}

export interface PaymentFilters {
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  method?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}




// // modules/payments/types/index.ts
// import type { Payment, Client, Prisma } from '@prisma/client';

// // ✅ Define the EXACT include configuration used in your repository
// export const paymentWithClientInclude = {
//   client: {
//     select: {
//       id: true,
//       name: true,
//       phone: true,
//     },
//   },
// } as const satisfies Prisma.PaymentInclude;

// // ✅ Use Prisma's type helper to generate the correct return type
// // This tells TypeScript: "When you include client with these fields, this is the result"
// export type PaymentWithClient = Prisma.PaymentGetPayload<{
//   include: typeof paymentWithClientInclude;
// }>;

// // Input types
// export interface CreatePaymentInput {
//   clientId: string;
//   amount: number;
//   method?: string;
//   notes?: string;
// }

// export interface UpdatePaymentInput {
//   amount?: number;
//   method?: string;
//   notes?: string;
// }

// export interface PaymentFilters {
//   clientId?: string;
//   startDate?: Date;
//   endDate?: Date;
//   method?: string;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
//   limit?: number;
// }





// // modules/payments/types/index.ts
// import type { Payment, Client, Prisma } from '@prisma/client';

// // ✅ Define the include object that matches your repository queries
// export const paymentWithClientInclude = {
//   client: {
//     select: {
//       id: true,
//       name: true,
//       phone: true,
//     },
//   },
// } satisfies Prisma.PaymentInclude;

// // ✅ Use Prisma's type helper to generate the correct return type
// export type PaymentWithClient = Prisma.PaymentGetPayload<{
//   include: typeof paymentWithClientInclude;
// }>;

// // Input types
// export interface CreatePaymentInput {
//   clientId: string;
//   amount: number;
//   method?: string;
//   notes?: string;
// }

// export interface UpdatePaymentInput {
//   amount?: number;
//   method?: string;
//   notes?: string;
// }

// export interface PaymentFilters {
//   clientId?: string;
//   startDate?: Date;
//   endDate?: Date;
//   method?: string;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
//   limit?: number;
// }





// import { Payment } from '@prisma/client';

// export type CreatePaymentInput = {
//   clientId: string;
//   amount: number;
//   method?: string;
//   notes?: string;
// };

// export type UpdatePaymentInput = {
//   id: string;
//   amount?: number;
//   method?: string;
//   notes?: string;
// };

// export type PaymentFilters = {
//   clientId?: string;
//   startDate?: Date;
//   endDate?: Date;
//   method?: string;
//   limit?: number;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
// };

// export type PaymentWithClient = Payment & {
//   client: {
//     id: string;
//     name: string;
//     phone: string;
//   };
// };