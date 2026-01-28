import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.servicecrewai.mobile',
  appName: 'ServiceCrew AI',
  webDir: 'dist',
  server: {
    // For LOCAL TESTING - connect to your local dev server
    url: 'http://192.168.1.184:3000',
    cleartext: true,
    // Disable caching to always get fresh data
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'App',
    // Disable WebView caching
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
    // Disable HTTP caching
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
