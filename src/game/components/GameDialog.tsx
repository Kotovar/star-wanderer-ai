"use client";

import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Цветовые варианты рамки игровых модалок. Значения — устоявшийся в игре
 * язык: зелёный по умолчанию, амбер — важное/апгрейд, красный — деструктивное
 * действие, accent — вторичные информационные окна (оружие, груз).
 */
const GAME_DIALOG_VARIANT_CHROME = {
    default: "border-[#00ff41] text-[#00ff41]",
    warning: "border-[#ffb000] text-[#00ff41]",
    danger: "border-[#ff4444] text-[#00ff41]",
    accent: "border-accent text-accent",
    /** Ксеноморф сращён с открытым модулем — фиолетовая тема сращивания */
    merge: "bg-[rgba(30,10,40,0.95)] border-[#aa55ff] text-[#00ff41]",
} as const;

export type GameDialogVariant = keyof typeof GAME_DIALOG_VARIANT_CHROME;

interface GameDialogContentProps extends ComponentProps<typeof DialogContent> {
    variant?: GameDialogVariant;
}

/**
 * Общая рамка для игровых модалок — единая точка контроля фона/рамки/ширины.
 * Раньше каждая модалка копировала `bg-[rgba(10,20,30,0.95)] border-2
 * border-[#00ff41]...` вручную; теперь только цвет варианта и то, чем
 * конкретное окно отличается (max-w, max-h, overflow), передаются явно.
 */
export function GameDialogContent({
    variant = "default",
    className,
    ...props
}: GameDialogContentProps) {
    return (
        <DialogContent
            className={cn(
                "bg-[rgba(10,20,30,0.95)] border-2 w-[calc(100%-2rem)] md:w-auto",
                GAME_DIALOG_VARIANT_CHROME[variant],
                className,
            )}
            {...props}
        />
    );
}
