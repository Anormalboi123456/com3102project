import Link from "next/link";
import '/css/common.css'

export default function HomePage() {
  return (
    <div className="login-page">
<table className='menutable'>
<tbody>
<tr>
    <td><img src='/resources/HSU_logo.jpg' className='menuimage slide-in' alt='HSU logo' /></td>
    <td><h1 className="slide-in">Welcome to Hang Sheng University!</h1></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/Login"><img src='/resources/HSU_logo.jpg' className='menuimage slide-in'></img>Log in</Link></td>
</tr>
</tbody>
</table>

<table className="buttontable">
<tbody>
<tr>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/">Home</Link></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/About">About Us</Link></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
    <td><Link className="slide-in block w-full rounded bg-blue-600 px-4 py-2 text-center text-white" href="/About">Test</Link></td>
</tr>
</tbody>
</table>
<table className='menutable'>
    <tbody>
        <tr>
            <td><p>Contact Us</p></td>
        </tr>
        <tr>
          <td></td>
        </tr>
        <tr>
          <td><a href="/">return to top</a></td>
          <td><a href="/About">About us</a></td>
        </tr>
    </tbody>
</table>
</div>
  );
}

