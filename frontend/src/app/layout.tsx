import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Website — SMB Control Tower",
  description:
    "Scrape small businesses daily, review their details, and generate a website in minutes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm">
                LW
              </span>
              <span>Local Website</span>
              <span className="text-slate-400 text-sm font-normal">· Control Tower</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-600">
              <Link href="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              {session?.user ? (
                <>
                  <span className="text-slate-400 hidden sm:inline">{session.user.email}</span>
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/login" });
                    }}
                  >
                    <button type="submit" className="hover:text-slate-900">
                      Sign out
                    </button>
                  </form>
                </>
              ) : null}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
