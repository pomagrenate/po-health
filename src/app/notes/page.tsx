'use client';

import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Search, Filter, User, Activity, FileText, CheckCircle2, AlertCircle, Save, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { AssistantSidebar } from '@/components/AssistantSidebar';

export default function NotesPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [activeTab, setActiveTab] = useState('SOAP');

    // SOAP Note State
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);

    useEffect(() => {
        api.listPatients().then(setPatients).catch(console.error);
    }, []);

    const handleApplyAIPlan = (aiPlan: string) => {
        setPlan(prev => prev + '\n\nAI Suggested Plan:\n' + aiPlan);
        setAssessment(prev => prev + '\n\nAI clinical impression incorporated.');
    };

    const handleAutoDraft = async () => {
        if (!selectedPatientId || !subjective.trim() || !objective.trim()) {
            alert("Subjective and Objective required for Auto-Draft.");
            return;
        }
        setIsDrafting(true);
        try {
            const res = await api.generateSOAPDraft(selectedPatientId, subjective, objective);
            setAssessment(res.assessment);
            setPlan(res.plan);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDrafting(false);
        }
    };

    const selectedPatient = patients.find(p => p.patient_id === selectedPatientId);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex items-center justify-between glass p-6 rounded-2xl border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 dark:shadow-none shadow-xl">
                        <Activity className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Clinical Workspace</h1>
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-wide uppercase">Multi-Source Clinical Reasoning</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-medium text-sm focus:border-indigo-500 outline-none transition-all"
                    >
                        <option value="">Select Target Patient...</option>
                        {patients.map(p => (
                            <option key={p.patient_id} value={p.patient_id}>
                                {p.name} ({p.patient_id})
                            </option>
                        ))}
                    </select>
                    <button className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95">
                        <Save className="w-4 h-4" /> Save Encounter
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Patient Snapshot */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="glass p-5 rounded-2xl border-slate-100 dark:border-slate-800">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">Case Context</h3>

                        {selectedPatient ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                                    <div className="flex items-center gap-3 mb-2">
                                        <User className="w-5 h-5 text-indigo-600" />
                                        <p className="font-bold text-slate-900 dark:text-slate-100">{selectedPatient.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                                        <div>DOB: {selectedPatient.dob}</div>
                                        <div>GENDER: {selectedPatient.gender}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Status</p>
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Telemetry Active</span>
                                        <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[9px]">LIVE</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs text-slate-400 italic">Select a patient to populate clinical context.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Structured Note Editor */}
                <div className="lg:col-span-9 space-y-6">
                    <div className="glass rounded-2xl overflow-hidden border-slate-100 dark:border-slate-800">
                        {/* Tab Header */}
                        <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                            {['SOAP', 'EHR History', 'Guidelines Connect'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-8">
                            {selectedPatientId ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        {/* Subjective */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Subjective (Symptoms)</label>
                                            <textarea
                                                value={subjective}
                                                onChange={(e) => setSubjective(e.target.value)}
                                                placeholder="Patient reports... chief complaint..."
                                                className="w-full h-40 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 outline-none resize-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed"
                                            />
                                        </div>
                                        {/* Objective */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Objective (Measurements)</label>
                                            <textarea
                                                value={objective}
                                                onChange={(e) => setObjective(e.target.value)}
                                                placeholder="Vitals observed... physical exam findings..."
                                                className="w-full h-40 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 outline-none resize-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">Intelligent Synthesis</h4>
                                        <button
                                            onClick={handleAutoDraft}
                                            disabled={isDrafting}
                                            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100 dark:shadow-none"
                                        >
                                            {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                            {isDrafting ? 'Drafting...' : 'AI Auto-Draft'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        {/* Assessment */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Assessment (Impression)</label>
                                            <textarea
                                                value={assessment}
                                                onChange={(e) => setAssessment(e.target.value)}
                                                placeholder="Clinical impression... working diagnosis..."
                                                className="w-full h-48 p-5 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/10 border-2 border-indigo-100/50 dark:border-indigo-900/30 focus:border-indigo-500 outline-none resize-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed"
                                            />
                                        </div>
                                        {/* Plan */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">Plan (Orders & Next Steps)</label>
                                            <textarea
                                                value={plan}
                                                onChange={(e) => setPlan(e.target.value)}
                                                placeholder="Follow-up instructions... medications prescribed..."
                                                className="w-full h-48 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 outline-none resize-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <AlertCircle className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Workspace Inactive</h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Select a patient from the registry above to begin a structured SOAP note session.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Assistant Sidebar Hook */}
            {selectedPatientId && (
                <AssistantSidebar
                    patientId={selectedPatientId}
                    onApplyPlan={handleApplyAIPlan}
                />
            )}
        </div>
    );
}
