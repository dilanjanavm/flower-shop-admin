import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/lib/store";
import { Toaster } from "@/components/ui";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sithuliya Flora · Studio", template: "%s · Sithuliya Flora Studio" },
  robots: { index: false, follow: false },
};

// Applies the saved theme before paint to avoid a light/dark flash.
const themeScript = `try{var s=JSON.parse(localStorage.getItem('sf-admin-v1')||'{}');var t=s.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <AdminProvider>
          {children}
          <Toaster />
        </AdminProvider>
      </body>
    </html>
  );
}
