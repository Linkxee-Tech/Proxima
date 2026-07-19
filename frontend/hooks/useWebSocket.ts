'use client';
import { useEffect, useState } from 'react';

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retry: number | undefined;
    let heartbeat: number | undefined;
    let stopped = false;
    let attempt = 0;

    const connect = () => {
      setStatus('connecting');
      const token = localStorage.getItem('proxima_token');
      if (!token) {
        setStatus('offline');
        return;
      }
      socket = new WebSocket(`${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempt = 0;
        setStatus('connected');
        heartbeat = window.setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send('ping'), 25000);
      };
      socket.onmessage = (event) => {
        try { setEvents((current) => [...current.slice(-199), JSON.parse(event.data)]); } catch { /* non-JSON heartbeat */ }
      };
      socket.onerror = () => setStatus('offline');
      socket.onclose = () => {
        setStatus('offline');
        if (!stopped) retry = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry) window.clearTimeout(retry);
      if (heartbeat) window.clearInterval(heartbeat);
      socket?.close();
    };
  }, [url]);

  return { events, status, isConnected: status === 'connected' };
}
