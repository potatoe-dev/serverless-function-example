
import Wallet from '@/utils/WalletContextProvider'
import './globals.css'

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#000" />
      </head>
      <body>
          <Wallet>
            {children}
          </Wallet>
      </body>
    </html>
  )
}
