'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { VitalsChart } from '@/components/patients/VitalsChart';
import { Users, Heart, Clipboard, Plus, Loader2, User, Activity } from 'lucide-react';

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [vitals, setVitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [logValue, setLogValue] = useState({ hr: 80, bp: '120/80', temp: 37.0 });

    useEffect(() => {
        api.listPatients().then(data => {
            setPatients(data);
            if (data.length > 0) setSelectedId(data[0].id);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (selectedId) {
            api.getVitals(selectedId).then(setVitals);
        }
    }, [selectedId]);

    const handleLogVital = async () => {
        if (!selectedId) return;
        try {
            await api.logVitals(selectedId, { ...logValue, ts: Math.floor(Date.now() / 1000) });
            const updated = await api.getVitals(selectedId);
            setVitals(updated);
        } catch (e) {
            alert('Failed to log vitals');
        }
    };

    const selectedPatient = patients.find(p => p.id === selectedId);

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in">
            {/* Patient List */}
            <div className="lg:col-span-1 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Patient Registry
                </h2>
                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                    {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                    ) : patients.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === p.id
                                ? 'bg-primary border-primary text-primary-foreground shadow-md'
                                : 'bg-card border-border hover:border-primary/50 text-card-foreground'
                                }`}
                        >
                            <p className="font-bold">{p.name}</p>
                            <p className="text-xs opacity-70 mt-1 uppercase tracking-wider">{p.id} • {p.age}y/o • {p.gender}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Vitals Summary & Chart */}
            <div className="lg:col-span-3 space-y-6">
                {selectedPatient ? (
                    <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">{selectedPatient.name}</h1>
                                    <p className="text-muted-foreground">Primary Diagnosis: {selectedPatient.diagnosis || 'General Observation'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 flex items-center gap-2">
                                    <Clipboard className="h-4 w-4" /> View Records
                                </button>
                                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> New Encounter
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass p-6 border-l-4 border-l-red-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase">Heart Rate</span>
                                    <Heart className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{vitals[vitals.length - 1]?.hr || '--'}</span>
                                    <span className="text-sm text-muted-foreground">bpm</span>
                                </div>
                            </div>
                            <div className="glass p-6 border-l-4 border-l-blue-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase">Blood Pressure</span>
                                    <Activity className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{vitals[vitals.length - 1]?.bp || '--'}</span>
                                    <span className="text-sm text-muted-foreground">mmHg</span>
                                </div>
                            </div>
                            <div className="glass p-6 border-l-4 border-l-orange-500">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-muted-foreground uppercase">Temperature</span>
                                    <div className="h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                                        <span className="text-orange-500 font-bold text-xs">°</span>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">{vitals[vitals.length - 1]?.temp || '--'}</span>
                                    <span className="text-sm text-muted-foreground">°C</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8">
                            <h3 className="text-lg font-bold mb-6">Patient Telemetry Trend</h3>
                            <VitalsChart data={vitals} />
                        </div>

                        <div className="glass p-6 flex flex-wrap items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h4 className="font-bold">Rapid Vitals Logging</h4>
                                <p className="text-xs text-muted-foreground">Simulate real-time telemetry ingestion for testing.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    className="w-20 p-2 border border-border bg-secondary rounded-lg text-sm"
                                    value={logValue.hr}
                                    onChange={e => setLogValue({ ...logValue, hr: parseInt(e.target.value) })}
                                />
                                <input
                                    type="text"
                                    className="w-24 p-2 border border-border bg-secondary rounded-lg text-sm"
                                    value={logValue.bp}
                                    onChange={e => setLogValue({ ...logValue, bp: e.target.value })}
                                />
                                <button
                                    onClick={handleLogVital}
                                    className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 shadow-sm"
                                >
                                    Log Vitals
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-64 items-center justify-center text-muted-foreground italic">
                        Select a patient from the registry to view clinical telemetry.
                    </div>
                )}
            </div>
        </div>
    );
}
