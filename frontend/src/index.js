import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind CSS
import App from './App'; // Import the main App component
import { FirebaseProvider } from './contexts/FirebaseContext'; // Import FirebaseProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FirebaseProvider> {/* Wrap App with FirebaseProvider */}
      <App />
    </FirebaseProvider>
  </React.StrictMode>
);
