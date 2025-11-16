import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../hooks/use-socket.ts';
import { api, type LogEntry } from '../lib/api.ts';

export function LogsPanel() {
  const { subscribe } = useSocket();
  const queryClient = useQueryClient();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['logs'],
    queryFn: api.getLogs,
  });

  useEffect(() => {
    // Subscribe to new log entries
    const unsubscribe = subscribe('logs:append', (payload: any) => {
      queryClient.setQueryData(['logs'], (oldData: LogEntry[] | undefined) => {
        if (!oldData) return oldData;
        // Prepend new log entry (most recent first)
        return [payload, ...oldData];
      });
    });

    return unsubscribe;
  }, [subscribe, queryClient]);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-slate-400';
    }
  };

  const getLevelBackground = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-950';
      case 'warn':
        return 'bg-yellow-950';
      case 'info':
        return 'bg-blue-950';
      case 'debug':
        return 'bg-gray-950';
      default:
        return 'bg-slate-900';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Logs</h2>
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-200 h-[60vh]">
          Failed to load logs: {String(error)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Logs</h2>
      <div className="rounded-lg border border-slate-800 p-0 bg-slate-900 h-[60vh] overflow-y-auto flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            No logs available.
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`border-b border-slate-800 p-3 text-xs font-mono ${getLevelBackground(log.level)} hover:bg-slate-800 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-fit text-slate-500">{formatTime(log.timestamp)}</div>
                    <div className={`min-w-fit font-semibold ${getLevelColor(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </div>
                    <div className="flex-1 text-slate-300">
                      <div className="break-words">{log.message}</div>
                      {log.details && (
                        <div className="mt-1 text-slate-400">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs min-w-fit">{log.instanceId}</div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={logsEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
