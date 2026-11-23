import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../css/common.css";
import Link from "next/link";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
          <div className="login-page">
<table className='menutable'>
<tbody>
{/*Top line for login and welcome text*/}
<tr> 
    <td><img src='/resources/HSU_logo_2.png' className='menuimage slide-in' alt='HSU logo' /></td>
    <td colSpan={2}><h1 className="slide-in">Welcome to Hang Sheng University App!</h1></td>
    {/*After there's a database, change the Log in text to the auth name (something called {$Username}?)(default Log in)*/}
    <td className="login-cell"><Link className="home-login-link slide-in" href="/Login"><img src='/resources/user_icon.png' className='home-login-icon' alt='' />Log in</Link></td>
</tr>
</tbody>
</table>

{/*Buttons to different pages, Test are temporary, change as you need, to change, change the text and the href='(location)'*/}
<table className="buttontable">
<tbody>
<tr>
    <td><Link className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white" href="/">Home</Link></td>
    <td><Link className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white" href="/About">About Us</Link></td>
    <td><Link className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
    <td><Link className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
    <td><Link className="slide-in block w-full rounded bg-green-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
</tr>
</tbody>
</table>

<div className="page-spacer" aria-hidden="true" />
</div>
{/*Bottom lines, now I set the contact informations*/}
      <body id="top" className="min-h-full flex flex-col">
        <main className="site-main">{children}</main>
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
