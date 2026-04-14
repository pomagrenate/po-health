'use client';

import React from 'react';
import { DrugSummary } from '@/lib/api';
import { Activity, Beaker, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrugCardProps {
    drug: DrugSummary;
    onOpen: (id: number) => void;
}

export function DrugCard({ drug, onOpen }: DrugCardProps) {
    return (
        <div
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
            onClick={() => onOpen(drug.id)}
        >
            <div className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                            {drug.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{drug.dose_form}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="badge badge-info">
                            {Math.round(drug.similarity * 100)}% Match
                        </span>
                        {drug.is_high_risk && (
                            <span className="badge badge-risk gap-1">
                                <AlertTriangle className="h-3 w-3" /> Risk
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-4 space-y-3 font-medium text-xs">
                    <div className="flex items-start gap-2">
                        <Beaker className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-slate-600 dark:text-slate-400">
                            {drug.ingredients.slice(0, 2).join(', ')}
                            {drug.ingredients.length > 2 && '...'}
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="line-clamp-2 italic text-slate-500">
                            {drug.indications.slice(0, 1).join(', ')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto border-t border-border bg-secondary/30 p-3 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">ID: {drug.id}</span>
                <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Details
                </button>
            </div>
        </div>
    );
}
