import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'Mi Colacteos',
  description: 'Registro de Beneficios Colácteos',
  icons: {
    icon: '/favicon-vaca-colacteos.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
