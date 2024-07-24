import { ChakraProvider } from "@chakra-ui/react";
import { Container } from "@chakra-ui/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#f8f8f8" }}>
        <ChakraProvider>
          <Container maxW="container.md" marginY={10}>
            {children}
          </Container>
        </ChakraProvider>
      </body>
    </html>
  );
}
