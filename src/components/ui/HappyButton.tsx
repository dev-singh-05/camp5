"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface HappyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "coral" | "yellow" | "mint" | "periwinkle" | "primary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg" | "icon";
    icon?: LucideIcon | React.ComponentType<any>;
}

export default function HappyButton({
    children,
    className = "",
    variant = "primary",
    size = "md",
    icon: Icon,
    ...props
}: HappyButtonProps) {
    const baseStyles =
        "rounded-full font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

    const variants = {
        coral: "bg-happy-coral text-white hover:bg-happy-coral/90 shadow-lg shadow-happy-coral/30",
        yellow: "bg-happy-yellow text-black hover:bg-happy-yellow/90 shadow-lg shadow-happy-yellow/30",
        mint: "bg-happy-mint text-white hover:bg-happy-mint/90 shadow-lg shadow-happy-mint/30",
        periwinkle: "bg-happy-periwinkle text-white hover:bg-happy-periwinkle/90 shadow-lg shadow-happy-periwinkle/30",
        primary: "bg-foreground text-background hover:opacity-90",
        outline: "border-2 border-current text-foreground hover:bg-foreground/5",
        ghost: "text-foreground hover:bg-foreground/10",
    };

    const sizes = {
        sm: "px-4 py-1.5 text-sm",
        md: "px-6 py-2.5 text-base",
        lg: "px-8 py-3.5 text-lg",
        icon: "w-10 h-10 p-0",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {Icon && <Icon className={size === 'icon' ? "w-5 h-5" : "w-4 h-4"} />}
            {children}
        </button>
    );
}
