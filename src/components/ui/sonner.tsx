import { Toaster as Sonner, type ToasterProps } from "sonner";

export const Toaster = ({ ...props }: ToasterProps) => (
    <Sonner
        theme="dark"
        richColors
        position="top-center"
        toastOptions={{
            style: {
                boxShadow:
                    "0 0 0 1px rgba(0, 212, 255, 0.16), 0 14px 34px rgba(0, 0, 0, 0.72)",
            },
        }}
        style={
            {
                "--normal-bg": "#07111a",
                "--normal-text": "#effff4",
                "--normal-border": "rgba(0, 255, 65, 0.72)",
                "--error-bg": "#1a080e",
                "--error-text": "#fff3f4",
                "--error-border": "rgba(255, 92, 92, 0.9)",
            } as React.CSSProperties
        }
        {...props}
    />
);
