import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const playfair = localFont({
  src: "../fonts/PlayfairDisplay-Variable.ttf",
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
});
const poppins = localFont({
  src: [
    { path: "../fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Poppins-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Elite Fashions, Erode · Festive & Party Wear for Girls",
    template: "%s · Elite Fashions, Erode",
  },
  description:
    "Lehenga cholis, sharara sets, jacket palazzo sets and party skirt sets for girls. Shop online and order on WhatsApp from Elite Fashions, Mettur Road, Erode.",
  openGraph: {
    type: "website",
    siteName: "Elite Fashions",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b0a36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${playfair.variable} ${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
