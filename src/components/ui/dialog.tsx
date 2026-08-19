"use client";

import type { ComponentProps } from "react";
import {
    Close,
    Content,
    Description,
    Overlay,
    Portal,
    Root,
    Title,
} from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({ ...props }: ComponentProps<typeof Root>) {
    return <Root data-slot="dialog" {...props} />;
}

function DialogPortal({ ...props }: ComponentProps<typeof Portal>) {
    return <Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({
    className,
    ...props
}: ComponentProps<typeof Overlay>) {
    return (
        <Overlay
            data-slot="dialog-overlay"
            className={cn(
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[rgba(1,7,12,0.68)] backdrop-blur-sm",
                className,
            )}
            {...props}
        />
    );
}

export function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: ComponentProps<typeof Content> & {
    showCloseButton?: boolean;
}) {
    return (
        <DialogPortal data-slot="dialog-portal">
            <DialogOverlay />
            <Content
                data-slot="dialog-content"
                className={cn(
                    "bg-[rgba(5,14,21,0.94)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-[rgba(0,212,255,0.34)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl duration-200 sm:max-w-lg",
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <Close
                        data-slot="dialog-close"
                        className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer"
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </Close>
                )}
            </Content>
        </DialogPortal>
    );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-header"
            className={cn(
                "flex flex-col gap-2 text-center sm:text-left",
                className,
            )}
            {...props}
        />
    );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className,
            )}
            {...props}
        />
    );
}

export function DialogTitle({
    className,
    ...props
}: ComponentProps<typeof Title>) {
    return (
        <Title
            data-slot="dialog-title"
            className={cn("text-lg leading-none font-semibold", className)}
            {...props}
        />
    );
}

export function DialogDescription({
    className,
    ...props
}: ComponentProps<typeof Description>) {
    return (
        <Description
            data-slot="dialog-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    );
}
