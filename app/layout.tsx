import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrisisRoleplay - Role Play Only",
  description: "AI-assisted crisis role-play platform for counselor training without feedback modules."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
