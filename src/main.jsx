import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// נקודת הכניסה: React "משתלט" על ה-div#root שב-index.html
// ומרנדר לתוכו את קומפוננטת App.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
