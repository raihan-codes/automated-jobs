'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  interactive = false,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={interactive ? {
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" }
      } : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]",
        interactive && "hover:border-white/20 hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] transition-colors duration-300",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10 p-5">
        {children}
      </div>
    </motion.div>
  );
}
