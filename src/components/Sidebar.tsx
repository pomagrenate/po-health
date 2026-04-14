'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Search,
    LayoutDashboard,
    BookOpen,
    Users,
    Network,
    StickyNote,
    Microscope,
    Settings,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Drug Search', href: '/search', icon: Search },
    { name: 'Clinical Guidelines', href: '/guidelines', icon: BookOpen },
    { name: 'Patient Vitals', href: '/patients', icon: Users },
    { name: 'Knowledge Graph', href: '/graph', icon: Network },
    { name: 'Clinical Notes', href: '/notes', icon: StickyNote },
    { name: 'Molecular Search', href: '/docking', icon: Microscope },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col border-r border-border bg-card text-card-foreground">
            <div className="flex h-16 items-center px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Activity className="h-6 w-6" />
                    <span>Po-Health</span>
                </Link>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "" : "group-hover:text-primary")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border p-4">
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors">
                    <Settings className="h-5 w-5" />
                    Settings
                </button>
            </div>
        </div>
    );
}
