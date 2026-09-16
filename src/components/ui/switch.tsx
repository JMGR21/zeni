"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-ink-muted/25 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ki-awakening/40 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-ki-awakening",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-4 translate-x-0.5 rounded-full bg-void shadow-sm transition-transform data-checked:translate-x-[18px] data-checked:bg-surface"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
