import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SavedProvider } from './context/SavedContext'
import { NotificationProvider } from './context/NotificationContext'
import { CurrentProfileProvider } from './context/CurrentProfileContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><SavedProvider><NotificationProvider><CurrentProfileProvider><App /></CurrentProfileProvider></NotificationProvider></SavedProvider></BrowserRouter></StrictMode>)
