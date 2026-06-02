import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import AppLayout from "@/components/AppLayout";

export const metadata = {
  title: "STACK SOCIAL | Premium Curation",
  description: "An editorial-driven curation and social media ecosystem.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-brand-ivory text-on-surface">
        <AuthProvider>
          <CallProvider>
            <AppLayout>{children}</AppLayout>
          </CallProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
