'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSocket } from '../hooks/use-socket.ts';
import { api, type MetricsSnapshot } from '../lib/api.ts';

interface MetricsData {
  timestamp: number;
  [key: string]: number | string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function MetricsPanel() {
  const { subscribe } = useSocket();
  const [cpuData, setCpuData] = useState<MetricsData[]>([]);
  const [memoryData, setMemoryData] = useState<MetricsData[]>([]);
  const [instanceIds, setInstanceIds] = useState<Set<string>>(new Set());

  const { data: historicalMetrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetrics(),
    refetchInterval: 30000,
  });

  // Initialize with historical data
  useEffect(() => {
    if (historicalMetrics && historicalMetrics.length > 0) {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      
      // Build CPU data
      const cpuMap = new Map<number, MetricsData>();
      const memoryMap = new Map<number, MetricsData>();
      const instances = new Set<string>();

      historicalMetrics.forEach((metric) => {
        const timestamp = new Date(metric.timestamp).getTime();
        if (timestamp < thirtyMinutesAgo) return;

        instances.add(metric.instanceId);
        
        // CPU data
        if (!cpuMap.has(timestamp)) {
          cpuMap.set(timestamp, { timestamp });
        }
        cpuMap.get(timestamp)![metric.instanceId] = metric.cpu;

        // Memory data
        if (!memoryMap.has(timestamp)) {
          memoryMap.set(timestamp, { timestamp });
        }
        memoryMap.get(timestamp)![metric.instanceId] = metric.memoryMb;
      });

      setInstanceIds(instances);
      setCpuData(Array.from(cpuMap.values()).sort((a, b) => a.timestamp - b.timestamp));
      setMemoryData(Array.from(memoryMap.values()).sort((a, b) => a.timestamp - b.timestamp));
    }
  }, [historicalMetrics]);

  // Subscribe to real-time metrics
  useEffect(() => {
    const unsubscribe = subscribe('metrics:update', (metric: MetricsSnapshot) => {
      const timestamp = new Date(metric.timestamp).getTime();
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

      if (timestamp < thirtyMinutesAgo) return;

      setInstanceIds((prev) => new Set([...prev, metric.instanceId]));

      // Update CPU data
      setCpuData((prev) => {
        const copy = [...prev];
        const existing = copy.find((d) => d.timestamp === timestamp);
        if (existing) {
          existing[metric.instanceId] = metric.cpu;
        } else {
          copy.push({ timestamp, [metric.instanceId]: metric.cpu });
        }
        // Keep only last 30 minutes of data
        return copy.filter((d) => d.timestamp >= thirtyMinutesAgo).sort((a, b) => a.timestamp - b.timestamp);
      });

      // Update memory data
      setMemoryData((prev) => {
        const copy = [...prev];
        const existing = copy.find((d) => d.timestamp === timestamp);
        if (existing) {
          existing[metric.instanceId] = metric.memoryMb;
        } else {
          copy.push({ timestamp, [metric.instanceId]: metric.memoryMb });
        }
        // Keep only last 30 minutes of data
        return copy.filter((d) => d.timestamp >= thirtyMinutesAgo).sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    return () => unsubscribe();
  }, [subscribe]);

  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  }, []);

  const instanceArray = Array.from(instanceIds);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">CPU Usage (%)</h3>
        {cpuData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cpuData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
                labelFormatter={(label) => formatTime(label)}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              {instanceArray.map((instanceId, index) => (
                <Line
                  key={instanceId}
                  type="monotone"
                  dataKey={instanceId}
                  stroke={COLORS[index % COLORS.length]}
                  dot={false}
                  isAnimationActive={false}
                  name={instanceId}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-sm">Waiting for metrics data...</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Memory Usage (MB)</h3>
        {memoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={memoryData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
                labelFormatter={(label) => formatTime(label)}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              {instanceArray.map((instanceId, index) => (
                <Line
                  key={instanceId}
                  type="monotone"
                  dataKey={instanceId}
                  stroke={COLORS[index % COLORS.length]}
                  dot={false}
                  isAnimationActive={false}
                  name={instanceId}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-sm">Waiting for metrics data...</p>
        )}
      </div>
    </div>
  );
}