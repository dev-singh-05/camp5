"use client";

import React from "react";
import { m } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface BentoCardProps {
    children?: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
    icon?: LucideIcon | React.ComponentType<any>;
    variant?: "purple" | "pink" | "cyan" | "blue" | "orange" | "default";
    onClick?: () => void;
    delay?: number;
}

export default function BentoCard({
    children,
    className = "",
    title,
    subtitle,
    icon: Icon,
    variant = "default",
    onClick,
    delay = 0,
}: BentoCardProps) {
    const variants = {
        purple: "border-purple-500/30 bg-purple-500/10 hover:border-purple-500/50 hover:bg-purple-500/20",
        pink: "border-pink-500/30 bg-pink-500/10 hover:border-pink-500/50 hover:bg-pink-500/20",
        cyan: "border-cyan-500/30 bg-cyan-500/10 hover:border-cyan-500/50 hover:bg-cyan-500/20",
        blue: "border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50 hover:bg-blue-500/20",
        orange: "border-orange-500/30 bg-orange-500/10 hover:border-orange-500/50 hover:bg-orange-500/20",
        default: "border-border bg-card hover:border-border/80",
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            whileHover={onClick ? { scale: 1.02 } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            onClick={onClick}
            className={`rounded-bento border p-6 shadow-sm transition-all cursor-pointer overflow-hidden relative group ${variants[variant]} ${className}`}
        >
            <div className="relative z-10">
                {(title || Icon) && (
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            {title && <h3 className="text-xl font-bold text-foreground">{title}</h3>}
                            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                        </div>
                        {Icon && (
                            <div className={`p-3 rounded-xl bg-background/20 backdrop-blur-sm`}>
                                <Icon className="w-6 h-6" />
                            </div>
                        )}
                    </div>
                )}
                {children}
            </div>

            {/* Background Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        </m.div>
    );
}
