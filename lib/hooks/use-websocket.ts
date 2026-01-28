'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardDataStore } from '@/lib/stores/dashboard-store';
import { reservationKeys } from '@/lib/hooks/queries/use-reservations';
import { orderKeys } from '@/lib/hooks/queries/use-orders';
import { tableKeys } from '@/lib/hooks/queries/use-tables';

type WebSocketChannel = 'orders' | 'reservations' | 'tables' | 'kitchen' | 'all';

type WebSocketMessage = {
  type: string;
  channel?: string;
  data?: unknown;
  timestamp?: string;
};

interface UseWebSocketOptions {
  restaurantId: number | undefined;
  channels?: WebSocketChannel[];
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (message: object) => void;
  subscribe: (channel: WebSocketChannel) => void;
  unsubscribe: (channel: WebSocketChannel) => void;
  reconnect: () => void;
}

/**
 * WebSocket hook for real-time updates
 */
export function useWebSocket({
  restaurantId,
  channels = ['all'],
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  enabled = true,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const queryClient = useQueryClient();
  const updateReservation = useDashboardDataStore((s) => s.updateReservation);
  const addReservation = useDashboardDataStore((s) => s.addReservation);
  const removeReservation = useDashboardDataStore((s) => s.removeReservation);
  const updateOrder = useDashboardDataStore((s) => s.updateOrder);
  const addOrder = useDashboardDataStore((s) => s.addOrder);
  const updateTable = useDashboardDataStore((s) => s.updateTable);

  const getWsUrl = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token || !restaurantId) return null;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = apiUrl.replace(/^https?/, wsProtocol).replace('/api/v1', '');

    return `${baseUrl}/v1/ws/${restaurantId}?token=${token}`;
  }, [restaurantId]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle built-in message types
        switch (message.type) {
          case 'pong':
            // Heartbeat response, ignore
            break;

          case 'subscribed':
          case 'unsubscribed':
            console.log(`WebSocket: ${message.type} to channel ${message.channel}`);
            break;

          case 'order_created':
            if (message.data && restaurantId) {
              addOrder(message.data as any);
              queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            }
            break;

          case 'order_updated':
            if (message.data && restaurantId) {
              const orderData = message.data as { id: number };
              updateOrder(orderData.id, message.data as any);
              queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            }
            break;

          case 'order_deleted':
            if (message.data && restaurantId) {
              queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            }
            break;

          case 'reservation_created':
            if (message.data && restaurantId) {
              addReservation(message.data as any);
              queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
            }
            break;

          case 'reservation_updated':
            if (message.data && restaurantId) {
              const reservationData = message.data as { id: number };
              updateReservation(reservationData.id, message.data as any);
              queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
            }
            break;

          case 'reservation_deleted':
            if (message.data && restaurantId) {
              const reservationData = message.data as { id: number };
              removeReservation(reservationData.id);
              queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
            }
            break;

          case 'table_updated':
            if (message.data && restaurantId) {
              const tableData = message.data as { id: number };
              updateTable(tableData.id, message.data as any);
              queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
            }
            break;

          default:
            // Pass to custom handler
            break;
        }

        // Call custom message handler
        onMessage?.(message);
      } catch (error) {
        console.error('WebSocket: Failed to parse message', error);
      }
    },
    [
      restaurantId,
      queryClient,
      addOrder,
      updateOrder,
      addReservation,
      updateReservation,
      removeReservation,
      updateTable,
      onMessage,
    ]
  );

  const connect = useCallback(() => {
    const url = getWsUrl();
    if (!url || !enabled) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket: Connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;

        // Subscribe to channels
        channels.forEach((channel) => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });

        onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket: Disconnected', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnect
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(
            `WebSocket: Reconnecting (attempt ${reconnectCountRef.current}/${reconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket: Error', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket: Failed to connect', error);
    }
  }, [
    getWsUrl,
    enabled,
    channels,
    handleMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts,
    reconnectInterval,
  ]);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback(
    (channel: WebSocketChannel) => {
      send({ type: 'subscribe', channel });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (channel: WebSocketChannel) => {
      send({ type: 'unsubscribe', channel });
    },
    [send]
  );

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount / when dependencies change
  useEffect(() => {
    if (restaurantId && enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [restaurantId, enabled, connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      send({ type: 'ping' });
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected, send]);

  return {
    isConnected,
    send,
    subscribe,
    unsubscribe,
    reconnect,
  };
}

/**
 * Hook specifically for kitchen real-time updates
 */
export function useKitchenWebSocket(restaurantId: number | undefined) {
  return useWebSocket({
    restaurantId,
    channels: ['kitchen', 'orders'],
    enabled: !!restaurantId,
  });
}

/**
 * Hook specifically for dashboard real-time updates
 */
export function useDashboardWebSocket(restaurantId: number | undefined) {
  return useWebSocket({
    restaurantId,
    channels: ['all'],
    enabled: !!restaurantId,
  });
}
