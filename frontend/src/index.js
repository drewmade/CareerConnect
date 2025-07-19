import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FirebaseProvider } from './contexts/FireBaseContext'; // Import FirebaseProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FirebaseProvider> {/* Wrap App with FirebaseProvider */}
      <App />
    </FirebaseProvider>
  </React.StrictMode>
);
