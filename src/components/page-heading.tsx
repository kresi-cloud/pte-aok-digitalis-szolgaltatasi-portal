"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface PageHeadingProps {
  title: string;
  description: string | React.ReactNode;
  className?: string;
  titleClassName?: string;
  infoClassName?: string;
}

export function PageHeading({
  title,
  description,
  className,
  titleClassName,
  infoClassName,
}: PageHeadingProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <h1 className={cn("font-display text-2xl font-semibold", titleClassName)}>
              {title}
            </h1>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-sm">
            {description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="További információ"
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden",
              infoClassName,
            )}
          >
            <Info className="size-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          {description}
        </PopoverContent>
      </Popover>
    </div>
  );
}
