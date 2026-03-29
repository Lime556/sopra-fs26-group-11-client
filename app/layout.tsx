import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Settlers of Catan",
  description: "sopra-fs26-template-client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              // general theme options are set in token, meaning all primary elements (button, menu, ...) will have this color
              colorPrimary: "#22426b", // selected input field boarder will have this color as well
              borderRadius: 10,
              //colorText: "#ffffff",
              fontSize: 16,

              // Alias Token
              //colorBgContainer: "#16181Dff",
            },
            // if a component type needs special styling, setting here will override default options set in token
            components: {
              Button: {
                colorPrimary: "#733E0A", // this will color all buttons in #75bd9d, overriding the default primaryColor #22426b set in token line 35
                //algorithm: true, // enable algorithm (redundant with line 33 but here for demo purposes)
                controlHeight: 48,
              },
              Input: {
                colorBgContainer: "#ffffff",
                colorText: "#000000",
                colorTextPlaceholder: "#A0A0A8",
                colorBorder: "#D08700",
              },
              //Input: {
              //  colorBorder: "gray", // color boarder selected is not overridden but instead is set by primary color in line 35
              //  colorTextPlaceholder: "#888888",
              //  algorithm: false, // disable algorithm (line 32)
              //},
              Form: {
                labelColor: "#ffffff",
                // algorithm: theme.defaultAlgorithm, // specify a specifc algorithm instead of true/false
              },
              Card: {},
            },
          }}
        >
          <AntdRegistry>
            <AntdApp>{children}</AntdApp>
          </AntdRegistry>
        </ConfigProvider>
      </body>
    </html>
  );
}
