import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

// Declaración global para OpenCV
declare global {
  interface Window {
    cv: any;
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

// Si quieres que tu app funcione offline y cargue más rápido, puedes cambiar
// unregister() a register() abajo. Ten en cuenta que esto viene con algunas trampas.
// Aprende más sobre service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// Si quieres empezar a medir el rendimiento en tu app, pasa una función
// para registrar resultados (por ejemplo: reportWebVitals(console.log))
// o envía a un punto de análisis. Aprende más: https://bit.ly/CRA-vitals
reportWebVitals();
