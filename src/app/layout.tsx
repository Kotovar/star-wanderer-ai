import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Star Wanderer",
    description: `The project was created and implemented at approximately 99% completion as an experiment to evaluate the capabilities of
        generative AI models in game system development. Models used: Claude, GLM- 5, Qwen-Coder, DeepSeek`,
    keywords: [
        "AI development",
        "GLM- 5",
        "Claude",
        "Qwen-Coder",
        "DeepSeek",
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "React",
    ],
    authors: [{ name: "AI models" }, { name: "kotovar" }],
    openGraph: {
        title: "Star Wanderer",
        description: "AI-powered development with modern React stack",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <main>{children}</main>
                <Toaster />
            </body>
        </html>
    );
}
