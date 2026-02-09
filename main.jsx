import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("FATAL: Could not find root element to mount to");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("FATAL: Error mounting React app:", err);
  }
}