import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

performance.mark('app-bootstrap')

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
