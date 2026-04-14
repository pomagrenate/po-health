'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  BookOpen,
  Users,
  Microscope,
  ShieldCheck,
  Database,
  TrendingUp
} from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    { name: 'Drugs Cataloged', value: '14,204', icon: Database, color: 'text-blue-500' },
    { name: 'Active Patients', value: '1,042', icon: Users, color: 'text-green-500' },
    { name: 'RAG Guidelines', value: '52', icon: BookOpen, color: 'text-purple-500' },
    { name: 'System Status', value: 'Production', icon: ShieldCheck, color: 'text-emerald-500' },
  ];

  const quickActions = [
    { name: 'Drug Search', href: '/search', icon: Search, desc: 'Semantic retrieval across FDA labels.' },
    { name: 'Patient Vitals', href: '/patients', icon: Users, desc: 'Monitor telemetry and log interactions.' },
    { name: 'Clinical RAG', href: '/guidelines', icon: BookOpen, desc: 'Institutional guidelines and literature.' },
    { name: 'Molecular Docking', href: '/docking', icon: Microscope, desc: '3D similarity and structural analysis.' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Clinical Command Center</h1>
          <p className="text-muted-foreground text-lg mt-2 font-medium">
            Po-Health Industrial Drug Retrieval & Research Platform
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Membrane Connectivity: Stable</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass p-6 group hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500 opacity-50" />
            </div>
            <p className="text-3xl font-black">{stat.value}</p>
            <p className="text-sm font-semibold text-muted-foreground mt-1 uppercase tracking-tight">{stat.name}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Active Research Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="glass p-6 group hover:bg-primary transition-all overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                    <action.icon className="h-6 w-6 text-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-white">{action.name}</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-white/80 mt-1">{action.desc}</p>
                </div>
                {/* Decorative element */}
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-primary/5 rounded-full group-hover:bg-white/10 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-bold">Recent Activity</h2>
          <div className="glass p-6 space-y-6">
            {[
              { type: 'Search', msg: 'Warfarin interactions analyzed', time: '2m ago' },
              { type: 'RAG', msg: 'Guidelines ingested (PH-2024)', time: '15m ago' },
              { type: 'Vitals', msg: 'Alert: Patient P-001 HR high', time: '1h ago' },
              { type: 'Docking', msg: 'Aspirin USRCAT match computed', time: '3h ago' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.msg}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] uppercase font-bold text-primary">{item.type}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
            <button className="w-full py-2 text-xs font-bold text-primary hover:underline uppercase tracking-widest pt-4">
              View Audit Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
