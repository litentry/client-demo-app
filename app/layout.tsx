import {ReactQueryProvider} from "@/context/ReactQuery";

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body>
        <ReactQueryProvider>
            {children}
        </ReactQueryProvider>
        </body>
        </html>
    )
}
