'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { BookOpen, Search, Loader2, FileText, Quote, Plus, CheckCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GuidelinesPage() {
    const [activeTab, setActiveTab] = useState<'search' | 'ingest'>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Ingestion state
    const [ingestContent, setIngestContent] = useState('');
    const [ingestSource, setIngestSource] = useState('');
    const [ingesting, setIngesting] = useState(false);
    const [ingestedId, setIngestedId] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const hits = await api.guidelineSearch(query);
            setResults(hits);
        } catch (e) {
            alert('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleIngest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ingestContent.trim()) return;

        setIngesting(true);
        setIngestedId(null);
        try {
            const resp = await api.ingestGuideline(ingestContent, ingestSource || 'User Upload');
            setIngestedId(resp.protocol_id);
            setIngestContent('');
            setIngestSource('');
            setTimeout(() => setIngestedId(null), 5000);
        } catch (e) {
            alert('Ingestion failed');
        } finally {
            setIngesting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col items-center gap-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight">Clinical Guidelines RAG</h1>

                {/* Tab Switcher */}
                <div className="flex bg-secondary p-1 rounded-xl w-64 border border-border">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'search' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Search Guidelines
                    </button>
                    <button
                        onClick={() => setActiveTab('ingest')}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'ingest' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Ingest Protocol
                    </button>
                </div>
            </div>

            {activeTab === 'search' ? (
                <>
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Ask a clinical question (e.g. 'Warfarin dosing in elderly')..."
                                className="w-full h-14 pl-12 pr-32 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary shadow-lg text-lg"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ask RAG'}
                            </button>
                        </div>
                    </form>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <div className="relative h-16 w-16">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-lg font-medium text-muted-foreground">Scanning knowledge membranes...</p>
                        </div>
                    )}

                    <div className="space-y-6 pb-12">
                        {results.map((hit, idx) => (
                            <div key={idx} className="glass p-6 space-y-4 border-l-4 border-l-primary/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Quote className="h-16 w-16" />
                                </div>

                                <div className="flex items-center gap-2 text-primary">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Source: {hit.source || 'Institutional Guideline'}</span>
                                    <span className="ml-auto badge badge-info">Score: {hit.score?.toFixed(3)}</span>
                                </div>

                                <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 italic">
                                    "...{hit.text}..."
                                </p>

                                <div className="pt-2 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                    <span className="bg-secondary px-2 py-1 rounded">Protocol ID: {hit.protocol_id || 'PH-2024-REF'}</span>
                                    <span>Updated: {hit.last_updated || 'March 2024'}</span>
                                </div>
                            </div>
                        ))}

                        {!loading && query && results.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No specific matches found in the current knowledge base.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                    <div className="glass p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Ingest Medical Protocol</h2>
                                <p className="text-sm text-muted-foreground">Index new literature into the clinical research membrane.</p>
                            </div>
                        </div>

                        <form onSubmit={handleIngest} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Protocol Content</label>
                                <textarea
                                    className="w-full h-64 p-4 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="Paste institutional guidelines, drug protocols, or evidence-based literature here..."
                                    value={ingestContent}
                                    onChange={e => setIngestContent(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Reference Source (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. Mayo Clinic 2024, Hospital Protocol A-12"
                                    value={ingestSource}
                                    onChange={e => setIngestSource(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={ingesting || !ingestContent.trim()}
                                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 shadow-lg flex items-center justify-center gap-2 transition-all"
                            >
                                {ingesting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Processing & Indexing...
                                    </>
                                ) : (
                                    <>
                                        <Database className="h-5 w-5" />
                                        Commit to Knowledge Base
                                    </>
                                )}
                            </button>
                        </form>

                        {ingestedId && (
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400">
                                <CheckCircle className="h-5 w-5" />
                                <span className="text-sm font-semibold">Protocol indexed successfully! ID: {ingestedId}</span>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-secondary/50 rounded-2xl border border-dashed border-border text-center">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Ingested data is processed using localized clinical embedding models and stored in the
                            institutional RAG membrane. It will be immediately available for semantic search.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
