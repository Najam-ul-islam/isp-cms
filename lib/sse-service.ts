/**
 * Server-Sent Events (SSE) service for real-time dashboard updates
 * Manages client connections and broadcasts events
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Store active SSE connections
const clients = new Map<string, {
  id: string;
  send: (data: string) => void;
  lastEventId?: string;
}>();

// Event types
export type DashboardEventType = 
  | 'payment_created'
  | 'client_created'
  | 'client_updated'
  | 'client_expired'
  | 'complaint_created'
  | 'complaint_updated'
  | 'stats_updated'
  | 'invoice_created'
  | 'expense_created';

export interface DashboardEvent {
  id: string;
  type: DashboardEventType;
  data: Record<string, any>;
  timestamp: string;
}

/**
 * Add a new SSE client connection
 */
export function addSSEClient(clientId: string, sendFn: (data: string) => void) {
  clients.set(clientId, {
    id: clientId,
    send: sendFn,
  });
  
  console.log(`[SSE] Client connected: ${clientId} (Total: ${clients.size})`);
}

/**
 * Remove an SSE client connection
 */
export function removeSSEClient(clientId: string) {
  clients.delete(clientId);
  console.log(`[SSE] Client disconnected: ${clientId} (Total: ${clients.size})`);
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcastEvent(event: DashboardEvent) {
  const eventData = JSON.stringify(event);
  const sseMessage = `id: ${event.id}\ndata: ${eventData}\n\n`;
  
  console.log(`[SSE] Broadcasting: ${event.type}`);
  
  // Send to all clients
  clients.forEach((client, id) => {
    try {
      client.send(sseMessage);
    } catch (error) {
      console.error(`[SSE] Failed to send to client ${id}:`, error);
      // Remove failed client
      clients.delete(id);
    }
  });
}

/**
 * Send a specific event type with data
 */
export async function emitEvent(
  type: DashboardEventType,
  data: Record<string, any>
) {
  const event: DashboardEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  broadcastEvent(event);
}

/**
 * Get current active client count
 */
export function getActiveClientCount(): number {
  return clients.size;
}

/**
 * Get all active clients
 */
export function getActiveClients(): string[] {
  return Array.from(clients.keys());
}

/**
 * Helper to format SSE response headers
 */
export function getSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  };
}

/**
 * Create SSE message formatter for a client
 */
export function createSSESender(writer: WritableStreamDefaultWriter<Uint8Array>) {
  return (data: string) => {
    const encoder = new TextEncoder();
    writer.write(encoder.encode(data));
  };
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  console.log('[SSE] Cleaning up connections on SIGTERM');
  clients.clear();
});

process.on('SIGINT', () => {
  console.log('[SSE] Cleaning up connections on SIGINT');
  clients.clear();
});
