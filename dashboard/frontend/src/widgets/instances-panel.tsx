import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSocket } from '../hooks/use-socket.ts';
import { api, type InstanceSummary } from '../lib/api.ts';

export function InstancesPanel() {
  const { subscribe } = useSocket();
  const queryClient = useQueryClient();
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});

  const { data: instances = [], isLoading, error } = useQuery({
    queryKey: ['instances'],
    queryFn: api.getInstances,
  });

  const controlMutation = useMutation({
    mutationFn: ({ instanceId, action }: { instanceId: string; action: 'start' | 'stop' | 'restart' }) =>
      api.controlInstance(instanceId, action),
    onSuccess: (_, { instanceId, action }) => {
      setActionFeedback((prev) => ({
        ...prev,
        [instanceId]: `${action.charAt(0).toUpperCase() + action.slice(1)} signal sent`,
      }));
      setTimeout(() => {
        setActionFeedback((prev) => {
          const updated = { ...prev };
          delete updated[instanceId];
          return updated;
        });
      }, 3000);
    },
    onError: (err, { instanceId, action }) => {
      setActionFeedback((prev) => ({
        ...prev,
        [instanceId]: `Failed to ${action}`,
      }));
      setTimeout(() => {
        setActionFeedback((prev) => {
          const updated = { ...prev };
          delete updated[instanceId];
          return updated;
        });
      }, 3000);
    },
  });

  useEffect(() => {
    // Subscribe to real-time instance status updates
    const unsubscribe = subscribe('instances:status', (payload: any) => {
      queryClient.setQueryData(['instances'], (oldData: InstanceSummary[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((instance) =>
          instance.id === payload.instanceId
            ? { ...instance, status: payload.status }
            : instance
        );
      });
    });

    return unsubscribe;
  }, [subscribe, queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'starting':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      case 'error':
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const isActionDisabled = (instanceId: string, action: string, status: string) => {
    if (controlMutation.isPending) return true;
    if (action === 'start' && status === 'ready') return true;
    if ((action === 'stop' || action === 'restart') && status === 'offline') return true;
    return false;
  };

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Instances</h2>
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-200">
          Failed to load instances: {String(error)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Instances</h2>
      {isLoading ? (
        <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
          Loading instances...
        </div>
      ) : instances.length === 0 ? (
        <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
          No instances available.
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => (
            <div key={instance.id} className="rounded-lg border border-slate-700 p-3 bg-slate-800 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-100">{instance.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(instance.status)}`} />
                  <span className="text-xs text-slate-400">{instance.status}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 space-y-1 mb-3">
                <div>
                  <span className="text-slate-500">Uptime:</span> {formatUptime(instance.uptimeMs)}
                </div>
                {instance.version && (
                  <div>
                    <span className="text-slate-500">Version:</span> {instance.version}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => controlMutation.mutate({ instanceId: instance.id, action: 'start' })}
                  disabled={isActionDisabled(instance.id, 'start', instance.status)}
                  className="px-2 py-1 text-xs rounded bg-green-900 text-green-100 border border-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {controlMutation.isPending ? 'Loading...' : 'Start'}
                </button>
                <button
                  onClick={() => controlMutation.mutate({ instanceId: instance.id, action: 'stop' })}
                  disabled={isActionDisabled(instance.id, 'stop', instance.status)}
                  className="px-2 py-1 text-xs rounded bg-red-900 text-red-100 border border-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {controlMutation.isPending ? 'Loading...' : 'Stop'}
                </button>
                <button
                  onClick={() => controlMutation.mutate({ instanceId: instance.id, action: 'restart' })}
                  disabled={isActionDisabled(instance.id, 'restart', instance.status)}
                  className="px-2 py-1 text-xs rounded bg-blue-900 text-blue-100 border border-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {controlMutation.isPending ? 'Loading...' : 'Restart'}
                </button>
              </div>
              {actionFeedback[instance.id] && (
                <div className="mt-2 text-xs text-slate-300 bg-slate-700 rounded p-2">
                  {actionFeedback[instance.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
