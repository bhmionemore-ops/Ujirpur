import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barnia.digitalhub',
  appName: 'Barnia Digital Hub',
  webDir: 'dist',
  server: {
    // This allows the app to load the live website, 
    // ensuring "automatic updates" without re-installing the APK.
    url: 'https://ais-dev-fgwboxbxglty7rbzy5y3mq-601145018823.europe-west2.run.app',
    cleartext: true
  }
};

export default config;
