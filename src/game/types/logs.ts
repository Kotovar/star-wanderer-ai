export interface LogEntry {
    message: string;
    type: "info" | "warning" | "error" | "combat";
    turn: number;
}
