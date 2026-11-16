import type { CapacitorConfig } from '@capacitor/cli';

// Configuración de la app Android. Usa el mismo build web (carpeta dist) que se publica en Vercel.
const config: CapacitorConfig = {
  appId: 'com.futdata.app',
  appName: 'FutData',
  webDir: 'dist',
  backgroundColor: '#0A0C10',
  android: {
    // Evita que el contenido quede debajo de la barra de estado y de navegación de Android.
    adjustMarginsForEdgeToEdge: 'force',
  },
  plugins: {
    FirebaseAuthentication: {
      // El inicio de sesión nativo solo obtiene el token de Google; la sesión de Firebase la abre
      // el SDK web con ese token, así la cuenta y el UID son los mismos que en la web.
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
