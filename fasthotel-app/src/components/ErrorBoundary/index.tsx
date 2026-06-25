import React, { Component, ErrorInfo } from 'react';

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a2a42', color: '#fff', gap: '16px' }}>
          <h1>Algo deu errado</h1>
          <p style={{ color: '#aaa' }}>{this.state.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/'; }}
            style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#2c73d2', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
          >
            Voltar ao início
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
