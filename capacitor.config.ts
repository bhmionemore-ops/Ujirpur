import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barnia.digitalhub',
  appName: 'Barnia Digital Hub',
  webDir: 'dist',
  server: {
    // This allows the app to load the live website, 
    // ensuring "automatic updates" without re-installing the APK.
    url: 'https://barnia.in',
    cleartext: true,
    allowNavigation: [
      'barnia.in',
      '*.barnia.in',
      'ais-dev-fgwboxbxglty7rbzy5y3mq-601145018823.europe-west2.run.app',
      'ais-pre-fgwboxbxglty7rbzy5y3mq-601145018823.europe-west2.run.app'
    ]
  }
};

export default config;
