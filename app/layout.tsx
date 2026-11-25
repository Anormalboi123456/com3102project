import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../css/common.css";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import AuthProvider from "@/components/AuthProvider";
import LogoutButton from "@/components/LogoutButton";
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
          <div className="login-page">
            <table className="menutable">
              <tbody>
                <tr>
                  <td>
                    <Image
                      src="/resources/HSU_logo_2.png"
                      className="menuimage slide-in"
                      alt="HSU logo"
                      width={3244}
                      height={816}
                    />
                  </td>
                  <td colSpan={2}>
                    <h1 className="slide-in">Welcome to Hang Sheng University App!</h1>
                  </td>
                  <td className="login-cell">
                    {session ? (
                      <span className="home-login-link slide-in">
                        <Image
                          src="/resources/user_icon.png"
                          className="home-login-icon"
                          alt=""
                          width={512}
                          height={512}
                        />
                        {session.username}
                        <LogoutButton />
                      </span>
                    ) : (
                      <Link className="home-login-link slide-in" href="/Login">
                        <Image
                          src="/resources/user_icon.png"
                          className="home-login-icon"
                          alt=""
                          width={512}
                          height={512}
                        />
                        Log in
                      </Link>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="buttontable">
              <tbody>
                <tr>
                  <td>
                    <Link
                      className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                      href="/Homepage"
                    >
                      Home
                    </Link>
                  </td>
                  <td>
                    <Link
                      className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                      href="/About"
                    >
                      About Us
                    </Link>
                  </td>
                  <td>
                    <Link
                      className="slide-in block w-full rounded bg-green-600 px-2 py-1 text-center text-sm text-white"
                      href="/Students"
                    >
                      Database
                    </Link>
                  </td>
                  <td>
                    <Link
                      className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                      href="/About"
                    >
                      Test
                    </Link>
                  </td>
                  <td>
                    <Link
                      className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white"
                      href="/About"
                    >
                      Test
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="page-spacer" aria-hidden="true" />
          </div>
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
