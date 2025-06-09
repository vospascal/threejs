import { VRApp } from './components/VRApp';

// Initialize the VR application
const app = new VRApp();

// Export for debugging purposes
(window as any).vrApp = app;