'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface VitalsChartProps {
    data: any[];
}

export function VitalsChart({ data }: VitalsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-xl bg-secondary/20 border-2 border-dashed border-border italic text-muted-foreground">
                No clinical telemetry data available for this range.
            </div>
        );
    }

    // Format data for chart
    const chartData = data.map(v => ({
        name: new Date(v.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hr: v.hr,
        bp: parseInt(v.bp.split('/')[0]), // Use systolic for chart
        temp: v.temp,
    }));

    return (
        <div className="h-96 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line
                        type="monotone"
                        dataKey="hr"
                        name="Heart Rate (bpm)"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#ef4444' }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="bp"
                        name="Systolic BP (mmHg)"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3b82f6' }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="temp"
                        name="Temp (°C)"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b' }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
