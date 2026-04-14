'use client';

import React, { useState, useEffect } from 'react';
import { api, DrugSummary, SearchRequest } from '@/lib/api';
import { DrugCard } from '@/components/search/DrugCard';
import { Search, Loader2, Filter, Download } from 'lucide-react';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DrugSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const drugs = await api.search({
                query,
                top_k: 12,
            });
            setResults(drugs);
        } catch (err: any) {
            setError(err.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Drug Retrieval</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Semantic search across global pharmaceutical databases.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-secondary transition-colors">
                        <Filter className="h-4 w-4" /> Filters
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-secondary transition-colors">
                        <Download className="h-4 w-4" /> Export Results
                    </button>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by drug name, indication, or chemical molecule..."
                        className="w-full h-12 pl-11 pr-4 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-lg"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-8 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                </button>
            </form>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {loading && !results.length ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">Consulting clinical membranes...</p>
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                    {results.map((drug) => (
                        <DrugCard key={drug.id} drug={drug} onOpen={(id) => console.log('Open drug', id)} />
                    ))}
                </div>
            ) : !loading && query && (
                <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-xl font-semibold opacity-50">No drugs found</h3>
                    <p className="text-muted-foreground mt-2">Try adjusting your semantic query or filters.</p>
                </div>
            )}
        </div>
    );
}
