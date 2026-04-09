import { NextRequest } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { addSSEClient, removeSSEClient, createSSESender, getSSEHeaders } from '@/lib/sse-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request as any);
    
    if (!admin) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create a TransformStream for SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Generate unique client ID
    const clientId = `${admin.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create send function
    const sendFn = createSSESender(writer);

    // Add client to SSE service
    addSSEClient(clientId, sendFn);

    // Send initial connection message
    const welcomeMsg = `id: welcome\ndata: ${JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to real-time updates',
      timestamp: new Date().toISOString(),
    })}\n\n`;
    
    writer.write(encoder.encode(welcomeMsg));

    // Send periodic heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        const heartbeat = `: heartbeat\n\n`;
        writer.write(encoder.encode(heartbeat));
      } catch (error) {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Handle client disconnection
    request.signal.addEventListener('abort', () => {
      clearInterval(heartbeatInterval);
      removeSSEClient(clientId);
      writer.close().catch(() => {});
    });

    // Return the SSE stream
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[SSE] Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
