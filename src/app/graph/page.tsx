'use client';

import React from 'react';
import { Network, Share2, Info, Loader2 } from 'lucide-react';

export default function GraphPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in flex flex-col h-[calc(100vh-160px)]">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Network className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Clinical Knowledge Graph</h1>
                        <p className="text-muted-foreground font-medium">Navigating drug-disease-gene relationships.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 border border-border rounded-lg bg-card hover:bg-secondary text-muted-foreground"><Share2 className="h-5 w-5" /></button>
                    <button className="p-2 border border-border rounded-lg bg-card hover:bg-secondary text-muted-foreground"><Info className="h-5 w-5" /></button>
                </div>
            </div>

            <div className="flex-1 glass border-dashed relative overflow-hidden flex flex-col items-center justify-center bg-purple-50/5 dark:bg-purple-950/5">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    {/* Subtle grid pattern or SVG background */}
                    <div className="w-full h-full bg-[radial-gradient(circle,var(--primary) 1px,transparent 1px)] bg-[size:40px_40px]"></div>
                </div>

                <div className="relative z-10 text-center space-y-4">
                    <Network className="h-20 w-20 text-purple-500/30 mx-auto animate-pulse" />
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold opacity-60">Initializing Graph Membrane</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Porting the D3 knowledge graph engine to Next.js. Interactive topology visualization will be restored shortly.
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Hydrating Nodes...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
