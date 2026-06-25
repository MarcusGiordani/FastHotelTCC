import React from 'react';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { GlobalStyle } from './styles/global';
import 'react-datepicker/dist/react-datepicker.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GlobalStyle />
        <AppRoutes />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;