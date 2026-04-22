/**
 * Server-Sent Events (SSE) service for real-time dashboard updates
 * Manages client connections and broadcasts events
 */

type SSEClient = {
  id: string;
  companyId: string;
  send: (data: string) => void;
  lastEventId?: string;
  connectedAt: number;
};

// Use globalThis to ensure the same Map instance is shared across all
// Next.js route handlers (dev HMR and production bundling can create
// separate module instances otherwise, breaking SSE broadcasts).
const globalForSSE = globalThis as unknown as {
  __sseClients: Map<string, SSEClient> | undefined;
};

const clients: Map<string, SSEClient> =
  globalForSSE.__sseClients ??
  (globalForSSE.__sseClients = new Map<string, SSEClient>());

export type DashboardEventType =
  | 'payment_created'
  | 'client_created'
  | 'client_updated'
  | 'client_expired'
  | 'complaint_created'
  | 'complaint_updated'
  | 'stats_updated'
  | 'invoice_created'
  | 'expense_created'
  | 'arrears_roled_over'
  | 'arrears_update';

export interface DashboardEvent {
  id: string;
  type: DashboardEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export function addSSEClient(
  clientId: string,
  companyId: string,
  sendFn: (data: string) => void
) {
  clients.set(clientId, {
    id: clientId,
    companyId,
    send: sendFn,
    connectedAt: Date.now(),
  });

  console.log(
    `[SSE] Client connected: ${clientId} company=${companyId} (Total: ${clients.size})`
  );
}

export function removeSSEClient(clientId: string) {
  clients.delete(clientId);
  console.log(`[SSE] Client disconnected: ${clientId} (Total: ${clients.size})`);
}

export function broadcastEvent(
  event: DashboardEvent,
  targetCompanyId?: string
) {
  const eventData = JSON.stringify(event);
  const sseMessage = `id: ${event.id}\ndata: ${eventData}\n\n`;
  let sent = 0;
  let failed = 0;

  clients.forEach((client, id) => {
    if (targetCompanyId && client.companyId !== targetCompanyId) {
      return;
    }

    try {
      client.send(sseMessage);
      client.lastEventId = event.id;
      sent++;
    } catch (error) {
      console.warn(`[SSE] Send failed client ${id}:`, error);
      clients.delete(id);
      failed++;
    }
  });

  if (sent > 0) {
    console.log(
      `[SSE] Broadcast ${event.type} → ${sent} clients${failed > 0 ? `, ${failed} failed` : ''}`
    );
  }
}

export async function emitEvent(
  type: DashboardEventType,
  data: Record<string, unknown>,
  targetCompanyId?: string
) {
  const event: DashboardEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  broadcastEvent(event, targetCompanyId);
}

export function getActiveClientCount(): number {
  return clients.size;
}

export function getActiveClients(): string[] {
  return Array.from(clients.keys());
}

export function getSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

export function createSSESender(
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  return (data: string) => {
    const encoder = new TextEncoder();
    writer.write(encoder.encode(data));
  };
}

process.on('SIGTERM', () => {
  console.log(`[SSE] SIGTERM cleanup: ${clients.size} connections`);
  clients.clear();
});

process.on('SIGINT', () => {
  console.log(`[SSE] SIGINT cleanup: ${clients.size} connections`);
  clients.clear();
});