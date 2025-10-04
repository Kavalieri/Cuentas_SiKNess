import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { PrivacyProvider } from '@/components/shared/PrivacyProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CuentasSiK - Gestión de Gastos Compartidos',
  description: 'Aplicación minimalista para gestionar gastos e ingresos en pareja',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PrivacyProvider>
            {children}
            <Toaster />
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
