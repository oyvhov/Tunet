import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { PageProvider } from './contexts/PageContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider>
      <PageProvider>
        <App />
      </PageProvider>
    </ConfigProvider>
  </StrictMode>,
)
