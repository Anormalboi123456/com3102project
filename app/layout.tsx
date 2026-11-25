import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../css/common.css";
import { cookies } from "next/headers";
import AuthProvider from "@/components/AuthProvider";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HSU application",
  description: "For students and tecacher of HSU, public are welcomed too.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  let session = null;
  try {
    session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  } catch (error) {
    console.error("Could not verify the login session:", error);
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body id="top" className="min-h-full flex flex-col">
        <AuthProvider
          key={session?.username ?? "guest"}
          username={session?.username ?? null}
          isHsuStaff={session?.isHsuStaff ?? false}
        >
          <main className="site-main">{children}</main>
        </AuthProvider>
        <footer className="bottomtable">
          <section aria-labelledby="contact-title">
            <h2 id="contact-title" className="bold">Contact Us</h2>
            <p>Email: <a href="mailto:contact@hsu.edu.hk">contact@hsu.edu.hk</a></p>
            <p>Call Us: <a href="tel:+85239635000">(852) 3963 5000</a></p>
            <p>Fax: (852) 3963 5332</p>
            <p>Campus: Hang Shin Link, Siu Lek Yuen, Shatin, N.T., Hong Kong.</p>
          </section>
          <a href="#top"><p className="bold">Return To Top</p></a>
        </footer>
      </body>
    </html>
  );
}
