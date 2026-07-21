import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.servicecrewai.mobile',
  appName: 'ServiceCrew AI',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    scheme: 'App',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
