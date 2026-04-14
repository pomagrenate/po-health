'use client';

import React, { useState, useEffect } from 'react';
import {
    Zap,
    Search,
    AlertTriangle,
    RefreshCw,
    ChevronRight,
    X,
    Mic,
    History,
    Save,
    Bot,
    Sparkles,
    Loader2,
    Activity,
    Thermometer,
    Baby,
    Globe,
    LineChart,
    Calculator,
    Calendar,
    Stars,
    BrainCircuit,
    Scale,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Image as ImageIcon,
    FileSearch,
    Stethoscope,
    FlaskConical,
    Droplet
} from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
    patientId: string;
    onApplyPlan?: (plan: string) => void;
}

export function AssistantSidebar({ patientId, onApplyPlan }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [proactiveInsights, setProactiveInsights] = useState<any[]>([]);
    const [vitals, setVitals] = useState<any[]>([]);

    // Diversity Suite state
    const [language, setLanguage] = useState('english');
    const [labInput, setLabInput] = useState('');
    const [labInsightResult, setLabInsightResult] = useState<string | null>(null);
    const [isLabLoading, setIsLabLoading] = useState(false);

    const [psychResult, setPsychResult] = useState<string | null>(null);
    const [ddxResult, setDdxResult] = useState<string | null>(null);
    const [isDdxLoading, setIsDdxLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'assistant' | 'imaging' | 'guidelines' | 'toolbox' | 'analytics' | 'labs'>('assistant');

    const [safetyResult, setSafetyResult] = useState<{ risks: string[], is_safe: boolean, mitigations: string[] } | null>(null);
    const [isSafetyLoading, setIsSafetyLoading] = useState(false);

    const [imagingInput, setImagingInput] = useState('');
    const [imagingResult, setImagingResult] = useState<any>(null);
    const [isImagingLoading, setIsImagingLoading] = useState(false);

    const [guidelineQuery, setGuidelineQuery] = useState('');
    const [guidelineResults, setGuidelineResults] = useState<any[]>([]);
    const [isGuidelineLoading, setIsGuidelineLoading] = useState(false);

    useEffect(() => {
        if (!patientId) return;

        // Poll for proactive insights and vitals
        const fetchData = async () => {
            try {
                const insights = await api.getProactiveInsights(patientId);
                setProactiveInsights(insights);

                const patientVitals = await api.getPatientVitals(patientId);
                setVitals(patientVitals);
            } catch (e) {
                console.error(e);
            }
        };

        fetchData();
        const timer = setInterval(fetchData, 15000);
        return () => clearInterval(timer);
    }, [patientId]);

    const runReasoning = async () => {
        setIsLoading(true);
        try {
            const result = await api.reasonPatientCase(patientId, undefined, language);
            setAnalysis(result);
        } catch (error) {
            console.error('Reasoning failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const runLabInsight = async () => {
        if (!labInput.trim()) return;
        setIsLabLoading(true);
        try {
            const result = await api.labInsight(labInput);
            setLabInsightResult(result.insight);
        } catch (error) {
            console.error('Lab insight failed:', error);
        } finally {
            setIsLabLoading(false);
        }
    };

    const runDdx = async () => {
        setIsDdxLoading(true);
        try {
            const result = await api.generateDDx(patientId);
            setDdxResult(result.ddx);
        } catch (error) {
            console.error('DDx failed:', error);
        } finally {
            setIsDdxLoading(false);
        }
    };

    const runSafetyAudit = async () => {
        setIsSafetyLoading(true);
        try {
            // Context-driven audit
            const result = await api.runSafetyAudit(patientId, "Contextual Audit", "Contextual Audit", "Draft Assessment", "Draft Plan", language);
            setSafetyResult(result);
        } catch (error) {
            console.error('Safety Audit failed:', error);
        } finally {
            setIsSafetyLoading(false);
        }
    };

    const runImagingInsight = async () => {
        if (!imagingInput.trim()) return;
        setIsImagingLoading(true);
        try {
            const result = await api.analyzeImagingReport(patientId, imagingInput, language);
            setImagingResult(result);
        } catch (error) {
            console.error('Imaging insight failed:', error);
        } finally {
            setIsImagingLoading(false);
        }
    };

    const runGuidelineSearch = async () => {
        if (!guidelineQuery.trim()) return;
        setIsGuidelineLoading(true);
        try {
            const results = await api.searchClinicalGuidelines(guidelineQuery);
            setGuidelineResults(results);
        } catch (error) {
            console.error('Guideline search failed:', error);
        } finally {
            setIsGuidelineLoading(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                {proactiveInsights.length > 0 && !isOpen && (
                    <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg uppercase tracking-wider">
                        {proactiveInsights.length} Anomaly detected
                    </div>
                )}
                <button
                    onClick={() => { setIsOpen(!isOpen) }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-xl transition-all active:scale-95 ${isOpen ? 'bg-slate-900 border-2 border-white/20' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                    <span className="font-bold text-sm">Clinical Assistant</span>
                </button>
            </div>

            {/* Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Premium Tabbed Sidebar */}
            <div className={`fixed top-0 right-0 z-[70] h-full w-[480px] bg-slate-50 dark:bg-slate-950 shadow-2xl transform transition-all duration-500 ease-out border-l border-slate-200 dark:border-slate-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">

                    {/* Header with Navigation */}
                    <div className="p-6 pb-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none animate-pulse">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Clinical Intelligence</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Greater Features • v4.2</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Forceful Language Selector */}
                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl">
                            <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider outline-none text-slate-600 dark:text-slate-300 w-full"
                            >
                                <option value="english">English</option>
                                <option value="spanish">Español</option>
                                <option value="french">Français</option>
                                <option value="german">Deutsch</option>
                            </select>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'assistant', icon: Stars, label: 'Assistant' },
                                { id: 'imaging', icon: ImageIcon, label: 'Imaging' },
                                { id: 'guidelines', icon: FileSearch, label: 'Guidelines' },
                                { id: 'toolbox', icon: Calculator, label: 'Toolbox' },
                                { id: 'analytics', icon: LineChart, label: 'Trends' },
                                { id: 'labs', icon: Thermometer, label: 'Labs' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-none flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 scale-105 z-10'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:scale-105'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                        {activeTab === 'assistant' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* 1. Active Guard Alerts */}
                                {proactiveInsights.length > 0 && (
                                    <section className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Active Guard Alerts
                                        </h3>
                                        <div className="space-y-3">
                                            {proactiveInsights.map((insight, i) => (
                                                <div key={i} className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/10 border-2 border-red-100/50 dark:border-red-900/30 animate-in fade-in slide-in-from-right-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold py-0.5 px-2 bg-red-600 text-white rounded-full uppercase">Anomaly</span>
                                                        <span className="text-[10px] font-medium text-slate-400">{new Date(insight.ts * 1000).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{insight.vital} is {insight.value}</p>
                                                    <p className="text-sm text-red-700 dark:text-red-400 font-medium italic">"{insight.nudge}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* DDx Generator */}
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        Differential Diagnosis
                                    </h3>
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-3 shadow-inner">
                                        <button
                                            onClick={runDdx}
                                            disabled={isDdxLoading}
                                            className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                                        >
                                            {isDdxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                            Synthesize DDx
                                        </button>
                                        {ddxResult && (
                                            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-b-4 border-indigo-500 shadow-xl overflow-hidden relative">
                                                <div className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-bold leading-relaxed italic relative z-10">
                                                    {ddxResult}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Clinical Safety Audit [NEW] */}
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Clinical Safety Audit
                                    </h3>
                                    <div className="p-4 rounded-3xl bg-emerald-50/30 dark:bg-emerald-950/10 border-2 border-emerald-100 dark:border-emerald-900/30 space-y-4 shadow-inner">
                                        <button
                                            onClick={runSafetyAudit}
                                            disabled={isSafetyLoading}
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                                        >
                                            {isSafetyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                            Run Safety Check
                                        </button>

                                        {safetyResult && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div className={`p-3 rounded-xl flex items-center gap-3 border ${safetyResult.is_safe ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    {safetyResult.is_safe ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{safetyResult.is_safe ? 'No Acute Conflicts' : 'Safety Warning'}</span>
                                                </div>

                                                {safetyResult.risks.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Risks Detectados</p>
                                                        {safetyResult.risks.map((risk, i) => (
                                                            <div key={i} className="text-[10px] font-bold text-slate-700 dark:text-slate-300 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">• {risk}</div>
                                                        ))}
                                                    </div>
                                                )}

                                                {safetyResult.mitigations.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Mitigations Recommended</p>
                                                        {safetyResult.mitigations.map((mit, i) => (
                                                            <div key={i} className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">✓ {mit}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Standard Reasoning */}
                                <section className="space-y-4">
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <Search className="w-4 h-4" />
                                            Case Synthesis
                                        </h3>
                                        <div className="flex flex-col gap-4">
                                            <button
                                                onClick={runReasoning}
                                                disabled={isLoading}
                                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 dark:shadow-none"
                                            >
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Zap className="w-5 h-5 fill-white" />
                                                )}
                                                {isLoading ? "Analyzing..." : "Reason Patient Case"}
                                            </button>

                                            {analysis && (
                                                <button
                                                    onClick={async () => {
                                                        if (!patientId) return;
                                                        try {
                                                            await api.saveClinicalSummary(patientId, analysis.summary);
                                                            alert("Summary saved to EHR!");
                                                        } catch (e) {
                                                            console.error(e);
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    Commit to EHR
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {analysis && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-inner">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{analysis.summary}</p>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Acute Risks</p>
                                                {analysis.risks.map((risk: string, i: number) => (
                                                    <div key={i} className="flex gap-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-400 font-bold border-l-4 border-red-500">
                                                        <Activity className="w-4 h-4 shrink-0" />
                                                        {risk}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Plan of Care</p>
                                                <div className="p-5 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 text-xs text-slate-700 dark:text-slate-300 font-black italic whitespace-pre-wrap leading-relaxed">
                                                    {analysis.suggested_plan}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}

                        {activeTab === 'imaging' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Radiographic Synthesis
                                    </h3>
                                    <div className="p-4 rounded-3xl bg-blue-50/30 dark:bg-blue-950/10 border-2 border-blue-100 dark:border-blue-900/30 space-y-4 shadow-inner">
                                        <textarea
                                            value={imagingInput}
                                            onChange={(e) => setImagingInput(e.target.value)}
                                            placeholder="Paste radiology report body here..."
                                            className="w-full h-32 bg-white dark:bg-slate-900 border-none rounded-2xl p-4 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                        />
                                        <button
                                            onClick={runImagingInsight}
                                            disabled={isImagingLoading}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                                        >
                                            {isImagingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                            Synthesize Report
                                        </button>

                                        {imagingResult && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                {imagingResult.critical_findings && (
                                                    <div className="p-3 rounded-xl bg-red-600 text-white flex items-center gap-3 shadow-lg animate-pulse">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Critical Finding Detected</span>
                                                    </div>
                                                )}

                                                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-b-4 border-blue-500 shadow-xl">
                                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Impression</p>
                                                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{imagingResult.impression}</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Key Findings</p>
                                                    {imagingResult.key_findings.map((f: string, i: number) => (
                                                        <div key={i} className="text-[10px] font-bold text-slate-700 dark:text-slate-300 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">• {f}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'guidelines' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                                        <FileSearch className="w-4 h-4" />
                                        Protocol Search (RAG)
                                    </h3>
                                    <div className="flex gap-2">
                                        <input
                                            value={guidelineQuery}
                                            onChange={(e) => setGuidelineQuery(e.target.value)}
                                            placeholder="Query guidelines (e.g. Sepsis protocol)"
                                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            onClick={runGuidelineSearch}
                                            disabled={isGuidelineLoading}
                                            className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            {isGuidelineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {guidelineResults.map((result: any, i: number) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{result.source || 'Guideline'}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">Score: {(result.score * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">"{result.content}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'toolbox' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-1 gap-4">
                                    {/* BMI */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> BMI Calculator</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" placeholder="W (kg)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="bmi-w" />
                                            <input type="number" placeholder="H (cm)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="bmi-h" />
                                        </div>
                                        <button onClick={() => {
                                            const w = (document.getElementById('bmi-w') as HTMLInputElement).valueAsNumber;
                                            const h = (document.getElementById('bmi-h') as HTMLInputElement).valueAsNumber / 100;
                                            if (w > 0 && h > 0) alert(`BMI: ${(w / (h * h)).toFixed(1)}`);
                                        }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">Calculate</button>
                                    </div>

                                    {/* eGFR */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-2">eGFR (MDRD)</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" placeholder="Cr (mg/dL)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="egfr-cr" />
                                            <input type="number" placeholder="Age" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="egfr-age" />
                                        </div>
                                        <button onClick={() => {
                                            const cr = (document.getElementById('egfr-cr') as HTMLInputElement).valueAsNumber;
                                            const age = (document.getElementById('egfr-age') as HTMLInputElement).valueAsNumber;
                                            if (cr > 0 && age > 0) alert(`eGFR: ${(175 * Math.pow(cr, -1.154) * Math.pow(age, -0.203)).toFixed(1)}`);
                                        }} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none">Calculate</button>
                                    </div>

                                    {/* Psych Metrics */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-pink-600 flex items-center gap-2">Psych Screening</p>
                                        <div className="space-y-2">
                                            <select id="psych-type" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm">
                                                <option value="phq9">PHQ-9 (Depression)</option>
                                                <option value="gad7">GAD-7 (Anxiety)</option>
                                            </select>
                                            <input type="number" placeholder="Total Score" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="psych-score" />
                                            <button onClick={() => {
                                                const score = (document.getElementById('psych-score') as HTMLInputElement).valueAsNumber;
                                                const type = (document.getElementById('psych-type') as HTMLSelectElement).value;
                                                if (!isNaN(score)) {
                                                    let sev = "";
                                                    if (type === 'phq9') sev = score >= 20 ? "Severe" : score >= 15 ? "Mod. Severe" : score >= 10 ? "Moderate" : score >= 5 ? "Mild" : "Minimal";
                                                    else sev = score >= 15 ? "Severe" : score >= 10 ? "Moderate" : score >= 5 ? "Mild" : "Minimal";
                                                    setPsychResult(`${type.toUpperCase()} Severity: ${sev}`);
                                                }
                                            }} className="w-full py-3 bg-pink-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-pink-100 dark:shadow-none">Interpret</button>
                                            {psychResult && <p className="text-[10px] font-black text-center text-pink-700 bg-pink-50 dark:bg-pink-900/20 p-2 rounded-xl border border-pink-200 dark:border-pink-900/30">{psychResult}</p>}
                                        </div>
                                    </div>

                                    {/* Wells Criteria */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-2">Wells DVT Score</p>
                                        <input type="number" placeholder="Wells Score" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="wells-score" />
                                        <button onClick={() => {
                                            const score = (document.getElementById('wells-score') as HTMLInputElement).valueAsNumber;
                                            if (!isNaN(score)) {
                                                const risk = score >= 3 ? "High (75%)" : score >= 1 ? "Moderate (17%)" : "Low (3%)";
                                                alert(`DVT Risk: ${risk}`);
                                            }
                                        }} className="w-full py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-100 dark:shadow-none">Risk Scorer</button>
                                    </div>

                                    {/* GCS */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-red-600 flex items-center gap-2">Glasgow Coma Scale (GCS)</p>
                                        <input type="number" placeholder="GCS (3-15)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="gcs-score" />
                                        <button onClick={() => {
                                            const score = (document.getElementById('gcs-score') as HTMLInputElement).valueAsNumber;
                                            if (score >= 3 && score <= 15) {
                                                const cat = score <= 8 ? "Severe (Coma)" : score <= 12 ? "Moderate" : "Mild";
                                                alert(`Neuro Status: ${cat}`);
                                            }
                                        }} className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 dark:shadow-none">Evaluate</button>
                                    </div>

                                    {/* CHADS2-VASc */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2">CHADS2-VASc (A-Fib Stroke)</p>
                                        <input type="number" placeholder="Score (0-9)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="chads-score" />
                                        <button onClick={() => {
                                            const score = (document.getElementById('chads-score') as HTMLInputElement).valueAsNumber;
                                            if (!isNaN(score)) {
                                                const risk = score >= 2 ? "High Risk (Warfarin/DOAC Req)" : score === 1 ? "Low-Moderate (Anti-platelet/AC)" : "Low Risk";
                                                alert(`Stroke Risk: ${risk}`);
                                            }
                                        }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">Scorer</button>
                                    </div>

                                    {/* Peds Dosing */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-2"><Baby className="w-3.5 h-3.5" /> Peds Dosing</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="number" placeholder="Weight (kg)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="peds-w" />
                                            <input type="number" placeholder="Dose (mg/kg)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="peds-dose" />
                                        </div>
                                        <button onClick={() => {
                                            const w = (document.getElementById('peds-w') as HTMLInputElement).valueAsNumber;
                                            const d = (document.getElementById('peds-dose') as HTMLInputElement).valueAsNumber;
                                            if (w > 0 && d > 0) alert(`Calculated Dose: ${(w * d).toFixed(1)} mg`);
                                        }} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none">Calculate</button>
                                    </div>

                                    {/* CURB-65 [NEW] */}
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">CURB-65 (Pneumonia Severity)</p>
                                        <input type="number" placeholder="Score (0-5)" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm" id="curb-score" />
                                        <button onClick={() => {
                                            const score = (document.getElementById('curb-score') as HTMLInputElement).valueAsNumber;
                                            if (!isNaN(score)) {
                                                const risk = score >= 3 ? "Severe (Inpatient/ICU)" : score >= 2 ? "Moderate (Inpatient)" : "Mild (Outpatient)";
                                                alert(`Severity: ${risk}`);
                                            }
                                        }} className="w-full py-3 bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-100 dark:shadow-none">Evaluate</button>
                                    </div>

                                    {/* Antibiotic Stewardship [NEW] */}
                                    <div className="p-4 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/10 border-2 border-indigo-100 dark:border-indigo-900/30 space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-2"><FlaskConical className="w-3.5 h-3.5" /> Empiric Abx Guide</p>
                                        <select id="abx-type" className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm outline-none">
                                            <option value="cap">Community Acquired Pneumonia</option>
                                            <option value="uti">UTI / Pyelonephritis</option>
                                            <option value="ssti">Skin/Soft Tissue (SSTI)</option>
                                            <option value="sepsis">Undifferentiated Sepsis</option>
                                        </select>
                                        <button onClick={() => {
                                            const type = (document.getElementById('abx-type') as HTMLSelectElement).value;
                                            const guides: any = {
                                                cap: "Ceftriaxone + Azithromycin (or Levofloxacin)",
                                                uti: "Ceftriaxone (Inpatient) vs Nitrofurantoin/TMP-SMX (Outpatient)",
                                                ssti: "Vancomycin (MRSA) + Cefazolin/Nafcillin",
                                                sepsis: "Vancomycin + Piperacillin/Tazobactam"
                                            };
                                            alert(`Suggested Empiric Abx: ${guides[type]}`);
                                        }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">View Recommendations</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'analytics' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                                <section className="space-y-6">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <LineChart className="w-4 h-4" />
                                        Longitudinal Trends
                                    </h3>
                                    <div className="space-y-6">
                                        {['heart_rate', 'spo2', 'systolic_bp'].map((vital) => (
                                            <div key={vital} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3 shadow-inner">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-bold">{vital.replace('_', ' ')}</p>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {vitals.filter(v => v.vital === vital).slice(-1)[0]?.value ?? '--'}
                                                    </span>
                                                </div>
                                                <div className="h-16 flex items-end gap-1 px-1">
                                                    {vitals.filter(v => v.vital === vital).slice(-10).map((v, i) => (
                                                        <div
                                                            key={i}
                                                            className={`flex-1 rounded-full transition-all duration-500 ${vital === 'spo2' ? 'bg-indigo-400' : vital === 'heart_rate' ? 'bg-red-400' : 'bg-emerald-400'}`}
                                                            style={{ height: `${(v.value / (vital === 'spo2' ? 100 : vital === 'heart_rate' ? 150 : 200)) * 100}%` }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Rounding Checklist
                                    </h3>
                                    <div className="space-y-2">
                                        {['Review Labs', 'Consult Specialist', 'Update Plan', 'Assess Discharge'].map((task, i) => (
                                            <label key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 transition-colors">
                                                <input type="checkbox" className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 shadow-sm" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight">{task}</span>
                                            </label>
                                        ))}
                                    </div>
                                </section>

                                {/* Hemodynamics [NEW] */}
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        Hemodynamics (Advanced)
                                    </h3>
                                    <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4 shadow-inner">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Est. MAP (mmHg)</p>
                                                <div className="text-xl font-black text-slate-900 dark:text-white">
                                                    {(() => {
                                                        const sbp = vitals.filter(v => v.vital === 'systolic_bp').slice(-1)[0]?.value;
                                                        const dbp = 80; // Placeholder DBP
                                                        return sbp ? ((sbp + 2 * dbp) / 3).toFixed(1) : '--';
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shock Index</p>
                                                <div className="text-xl font-black text-red-600">
                                                    {(() => {
                                                        const hr = vitals.filter(v => v.vital === 'heart_rate').slice(-1)[0]?.value;
                                                        const sbp = vitals.filter(v => v.vital === 'systolic_bp').slice(-1)[0]?.value;
                                                        return (hr && sbp) ? (hr / sbp).toFixed(2) : '--';
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold italic tracking-tight">Shock Index {'>'} 0.7 suggests early hemodynamic instability.</p>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'labs' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <Thermometer className="w-4 h-4" />
                                        Lab Insight Parser
                                    </h3>
                                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4 shadow-inner">
                                        <textarea
                                            value={labInput}
                                            onChange={(e) => setLabInput(e.target.value)}
                                            placeholder="Paste lab results here (e.g. CBC, Chem7)..."
                                            className="w-full h-48 bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                                        />
                                        <button
                                            onClick={runLabInsight}
                                            disabled={isLabLoading}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none"
                                        >
                                            {isLabLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            Analyze Findings
                                        </button>
                                        {labInsightResult && (
                                            <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                                                <p className="text-[10px] font-black text-indigo-600 uppercase mb-3 tracking-widest">Autonomous Synthesis</p>
                                                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-bold leading-relaxed italic">
                                                    {labInsightResult}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>

                    {/* Footer Status */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest tracking-tighter">Clinical Intelligence Active</span>
                        </div>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest tracking-tighter">v4.2.0 • 0.5B Core</span>
                    </div>
                </div>
            </div>
        </>
    );
}
