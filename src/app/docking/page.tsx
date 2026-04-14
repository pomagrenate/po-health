'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Microscope, Search, Loader2, Database, Zap, FlaskConical } from 'lucide-react';

export default function DockingPage() {
    const [smiles, setSmiles] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!smiles.trim()) return;

        setLoading(true);
        try {
            const data = await api.dockingSearch(smiles);
            setResults(data.hits || []);
        } catch (e) {
            alert('Molecular search failed. Ensure the docking service is initialized.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Microscope className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">3D Molecular Search</h1>
                    <p className="text-muted-foreground">USRCAT Fingerprinting & PomaiDB Mesh Similarity</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-6 space-y-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-primary" /> Structure Input
                        </h3>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">SMILES String</label>
                                <textarea
                                    className="w-full h-32 p-3 bg-secondary border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="e.g. CC(=O)OC1=CC=CC=C1C(=O)O"
                                    value={smiles}
                                    onChange={e => setSmiles(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !smiles.trim()}
                                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                                Compute Similarity
                            </button>
                        </form>
                    </div>

                    <div className="glass p-6 bg-primary/5 border-primary/20">
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" /> PDB-Bind Integrated
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Using PomaiDB Mesh membrane for high-dimensional USRCAT spatial moments comparison.
                            Search is filtered by clinical viability.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-lg">Similarity Results</h3>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4 glass">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="font-medium text-muted-foreground">Calculating USRCAT moments & traversing Mesh...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.map((hit, idx) => (
                                <div key={idx} className="glass p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-blue-600 dark:text-blue-400">#{idx + 1} {hit.id || 'Unknown'}</span>
                                        <span className="badge badge-info">{hit.score?.toFixed(4)}</span>
                                    </div>
                                    <div className="text-xs font-mono bg-secondary/50 p-2 rounded break-all text-muted-foreground">
                                        {hit.smiles || '-- SMILES data unavailable --'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 glass border-dashed">
                            <Microscope className="h-12 w-12 text-muted-foreground opacity-10 mb-4" />
                            <p className="text-muted-foreground italic">Enter a SMILES string to begin 3D similarity analysis.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
