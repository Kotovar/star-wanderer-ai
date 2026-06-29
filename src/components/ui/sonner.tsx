import { Toaster as Sonner, type ToasterProps } from "sonner";

// ponytail: app is always dark-themed; next-themes had no ThemeProvider, so the
// toaster resolved to an undefined "system" theme. Tokens are now defined in
// globals.css (@theme), so --popover/--border resolve directly.
export const Toaster = ({ ...props }: ToasterProps) => (
    <Sonner
        theme="dark"
        className="toaster group"
        style={
            {
                "--normal-bg": "var(--popover)",
                "--normal-text": "var(--popover-foreground)",
                "--normal-border": "var(--border)",
            } as React.CSSProperties
        }
        {...props}
    />
);
