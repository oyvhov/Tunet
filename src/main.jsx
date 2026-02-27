import { StrictMode, Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App.jsx';
import { ConfigProvider } from './contexts/ConfigContext';
import { PageProvider } from './contexts/PageContext';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk')
  );
}

function reloadForChunkErrorOnce() {
  if (globalThis.window === undefined) return;
  const key = 'tunet_chunk_reload_once';
  if (globalThis.sessionStorage.getItem(key) === '1') return;
  globalThis.sessionStorage.setItem(key, '1');
  globalThis.window.history.go(0);
}

if (globalThis.window !== undefined) {
  globalThis.window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event?.reason)) return;
    reloadForChunkErrorOnce();
  });
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    if (isChunkLoadError(error)) {
      reloadForChunkErrorOnce();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '20px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '300' }}>
              Oops! Something went wrong
            </h1>
            <p style={{ marginBottom: '2rem', color: '#94a3b8', fontSize: '1.1rem' }}>
              The application encountered an unexpected error.
            </p>
            <button
              onClick={() => globalThis.window.history.go(0)}
              style={{
                padding: '12px 32px',
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              }}
              onMouseOver={(e) => (e.target.style.background = '#2563eb')}
              onMouseOut={(e) => (e.target.style.background = '#3b82f6')}
              onFocus={(e) => (e.target.style.background = '#2563eb')}
              onBlur={(e) => (e.target.style.background = '#3b82f6')}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ConfigProvider>
        <PageProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </PageProvider>
      </ConfigProvider>
    </ErrorBoundary>
  </StrictMode>
);
