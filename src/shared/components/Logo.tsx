import React from "react";
import { cn } from "@shared/lib/utils";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className, size = "md", ...props }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-11 w-auto",
    xl: "h-16 w-auto",
  };

  return (
    <img
      src="/NUMA.png"
      alt="NUMA Logo"
      className={cn(
        "object-contain transition-transform duration-300 hover:scale-105 select-none",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
