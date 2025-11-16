import { useState } from 'react';
import { useSocket } from '../hooks/use-socket.ts';
import { InstancesPanel } from '../widgets/instances-panel.tsx';
import { LogsPanel } from '../widgets/logs-panel.tsx';
import { TaskQueuePanel } from '../widgets/task-queue-panel.tsx';
import { MetricsPanel } from '../widgets/metrics-panel.tsx';

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { connected } = useSocket();

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr] bg-slate-950">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold">MCP Control Dashboard</h1>
            <p className="text-sm text-slate-400">Live observability for agentic-tools MCP</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-slate-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="px-3 py-2 bg-slate-800 rounded text-sm border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          {collapsed ? 'Expand panels' : 'Collapse panels'}
        </button>
      </header>
      <main className="grid grid-rows-[auto,1fr] gap-4 p-4">
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-y-auto">
          <MetricsPanel />
        </section>
        <section className="grid lg:grid-cols-4 gap-4">
          <section className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-y-auto">
            <InstancesPanel />
          </section>
          <section className="lg:col-span-1 bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-y-auto">
            <TaskQueuePanel />
          </section>
          <section className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-y-auto">
            <LogsPanel />
          </section>
        </section>
      </main>
    </div>
  );
}
