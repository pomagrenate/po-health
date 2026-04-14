'use client';

import React from 'react';
import { Bell, Search, User } from 'lucide-react';

export function TopBar() {
    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8 text-card-foreground">
            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Global search (Drugs, Patients, Guidelines)..."
                        className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="rounded-full p-2 hover:bg-secondary text-muted-foreground transition-colors">
                    <Bell className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-border">
                    <div className="text-right">
                        <p className="text-sm font-semibold">Dr. Autocookie</p>
                        <p className="text-xs text-muted-foreground">Clinical Researcher</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-6 w-6" />
                    </div>
                </div>
            </div>
        </header>
    );
}
