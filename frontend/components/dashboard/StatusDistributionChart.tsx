'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { DashboardOverview, TaskStatus } from '@/types/api';

export const StatusDistributionChart: React.FC<{ overview?: DashboardOverview }> = ({
  overview,
}) => {
  const statusCounts = overview?.tasksByStatus || {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };

  const pieData = [
    { name: 'TODO', value: statusCounts.todo || 0, color: '#F4F0E6', stroke: '#0A0A0A' },
    { name: 'IN PROGRESS', value: statusCounts.in_progress || 0, color: '#2B4BFF', stroke: '#0A0A0A' },
    { name: 'IN REVIEW', value: statusCounts.in_review || 0, color: '#8B5CF6', stroke: '#0A0A0A' },
    { name: 'DONE', value: statusCounts.done || 0, color: '#19E36B', stroke: '#0A0A0A' },
  ].filter((d) => d.value > 0);

  const priorityCounts = overview?.tasksByPriority || {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  const barData = [
    { name: 'LOW', count: priorityCounts.low || 0, fill: '#00E5FF' },
    { name: 'MED', count: priorityCounts.medium || 0, fill: '#FFE600' },
    { name: 'HIGH', count: priorityCounts.high || 0, fill: '#FF8A00' },
    { name: 'URGENT', count: priorityCounts.urgent || 0, fill: '#FF2E2E' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Donut Chart */}
      <BrutalCard
        headerTitle="STATUS DISTRIBUTION"
        headerGlyph="square"
        headerBg="blue"
      >
        <div className="h-64 flex items-center justify-center font-mono">
          {pieData.length === 0 ? (
            <div className="text-zinc-500 font-bold">NO TASKS LOGGED</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="#0A0A0A"
                  strokeWidth={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-ink text-paper border-2 border-acid-yellow px-2.5 py-1 text-xs font-mono font-bold uppercase shadow-brutal-sm">
                          {data.name}: {data.value} TASKS
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t-2 border-ink/10 font-mono text-[11px] font-bold text-ink dark:text-paper">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 border-2 border-ink bg-paper" />
            <span>TODO ({statusCounts.todo})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 border-2 border-ink bg-electric-blue" />
            <span>IN PROG ({statusCounts.in_progress})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 border-2 border-ink bg-hyper-violet" />
            <span>REVIEW ({statusCounts.in_review})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 border-2 border-ink bg-toxic-green" />
            <span>DONE ({statusCounts.done})</span>
          </div>
        </div>
      </BrutalCard>

      {/* Priority Bar Chart */}
      <BrutalCard
        headerTitle="PRIORITY BREAKDOWN"
        headerGlyph="triangle"
        headerBg="yellow"
      >
        <div className="h-64 font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#0A0A0A"
                tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                tickLine={{ stroke: '#0A0A0A', strokeWidth: 2 }}
              />
              <YAxis
                allowDecimals={false}
                stroke="#0A0A0A"
                tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                tickLine={{ stroke: '#0A0A0A', strokeWidth: 2 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-ink text-paper border-2 border-acid-yellow px-2.5 py-1 text-xs font-mono font-bold uppercase shadow-brutal-sm">
                        {data.name} PRIORITY: {data.count}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                stroke="#0A0A0A"
                strokeWidth={3}
              >
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="pt-2 border-t-2 border-ink/10 font-mono text-xs font-bold text-center text-zinc-500">
          DISTRIBUTION BY WORKLOAD URGENCY
        </div>
      </BrutalCard>
    </div>
  );
};
