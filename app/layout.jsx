import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import './globals.css';
import PortalSessionGuard from '@/components/PortalSessionGuard';

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <PortalSessionGuard />
        {children}
      </body>
    </html>
  );
}
