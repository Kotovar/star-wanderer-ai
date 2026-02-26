import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function typedKeys<T extends object>(obj: T) {
    return Object.keys(obj) as Array<keyof T>;
}
