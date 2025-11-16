import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../hooks/use-socket.ts';
import { api, type Task } from '../lib/api.ts';

export function TaskQueuePanel() {
  const { subscribe } = useSocket();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
  });

  useEffect(() => {
    // Subscribe to real-time task updates
    const unsubscribe = subscribe('tasks:update', (payload: any) => {
      queryClient.setQueryData(['tasks'], (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        // Extract task from payload (payload = { instanceId, task })
        const task = payload.task || payload;
        // Update or add task based on ID
        const existingIndex = oldData.findIndex((t) => t.id === task.id);
        if (existingIndex >= 0) {
          const updated = [...oldData];
          updated[existingIndex] = { ...updated[existingIndex], ...task };
          return updated;
        }
        return [task, ...oldData];
      });
    });

    return unsubscribe;
  }, [subscribe, queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'queued':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-950';
      case 'running':
        return 'bg-blue-950';
      case 'queued':
        return 'bg-yellow-950';
      case 'failed':
        return 'bg-red-950';
      case 'cancelled':
        return 'bg-gray-950';
      default:
        return 'bg-slate-900';
    }
  };

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Task Queue</h2>
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-200">
          Failed to load tasks: {String(error)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Task Queue</h2>
      {isLoading ? (
        <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
          No tasks available.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task: Task) => (
            <div key={task.id} className={`rounded-lg border border-slate-700 p-3 ${getStatusBg(task.status)} text-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-100">{task.name}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                  <span className="text-xs text-slate-400">{task.status}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mb-2">
                <span className="text-slate-500">Instance:</span> {task.instanceId}
              </div>
              {task.progress !== undefined && (
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(task.status)} transition-all duration-300`}
                    style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}