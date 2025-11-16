import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<Map<string, Set<EventCallback>>>(new Map());

  useEffect(() => {
    // Initialize socket connection
    const socket = io(window.location.origin, {
      path: '/ws',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Register all subscribed event listeners
    const handleEvent = (eventName: string, callback: EventCallback) => {
      socket.on(eventName, callback);
    };

    // Re-register callbacks on connection
    callbacksRef.current.forEach((callbacks, eventName) => {
      callbacks.forEach((callback) => {
        socket.on(eventName, callback);
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((eventName: string, callback: EventCallback) => {
    if (!callbacksRef.current.has(eventName)) {
      callbacksRef.current.set(eventName, new Set());
    }
    callbacksRef.current.get(eventName)!.add(callback);

    // If socket is already connected, register the listener immediately
    if (socketRef.current?.connected) {
      socketRef.current.on(eventName, callback);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = callbacksRef.current.get(eventName);
      if (callbacks) {
        callbacks.delete(callback);
      }
      if (socketRef.current?.connected) {
        socketRef.current.off(eventName, callback);
      }
    };
  }, []);

  return {
    connected,
    subscribe,
    socket: socketRef.current,
  };
}