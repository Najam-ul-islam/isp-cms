import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 500;

interface ClientData {
  name: string;
  username: string | null;
  phone: string;
  cnic: string;
  email: string | null;
  city: string;
  country: string;
  areaName: string | null;
  areaId: string | null;
  packageId: string;
  price: number;
  startDate: Date;
  expiryDate: Date;
  paymentStatus: "unpaid" | "paid" | "partial";
  status: "active" | "expired" | "suspended";
  createdBy: string;
  companyId: string;
}

export interface InsertResult {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function insertClientsBatch(
  clients: ClientData[],
  batchSize: number = BATCH_SIZE
): Promise<InsertResult> {
  if (!clients.length) {
    return { inserted: 0, skipped: 0, errors: [] };
  }

  const result: InsertResult = {
    inserted: 0,
    skipped: 0,
    errors: [],
  };

  const batches: ClientData[][] = [];
  for (let i = 0; i < clients.length; i += batchSize) {
    batches.push(clients.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    try {
      const insertResult = await prisma.client.createMany({
        data: batch,
        skipDuplicates: true,
      });

      result.inserted += insertResult.count;
      result.skipped += batch.length - insertResult.count;
    } catch (error: any) {
      for (let i = 0; i < batch.length; i++) {
        try {
          await prisma.client.create({
            data: batch[i],
          });
          result.inserted++;
        } catch (innerError: any) {
          result.skipped++;
          result.errors.push({
            row: i + 1,
            message: innerError.message || "Insert failed",
          });
        }
      }
    }
  }

  return result;
}

export async function updateClientPhoneCnic(
  clientId: string,
  phone: string,
  cnic: string
): Promise<boolean> {
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        phone,
        cnic,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getImportedClientsWithoutPhone(
  companyId: string
): Promise<{ id: string; name: string; username: string | null }[]> {
  return prisma.client.findMany({
    where: {
      companyId,
      phone: {
        startsWith: "TEMP_",
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
    },
  });
}