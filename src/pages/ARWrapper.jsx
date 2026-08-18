import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import AR from './AR.jsx'
import styles from './ARWrapper.module.css'

export default function ARWrapper() {
  const navigate = useNavigate()

  useEffect(() => {
    let backListener = null

    async function setupBackListener() {
      try {
        backListener = await App.addListener('backButton', () => {
          navigate('/')
        })
      } catch (e) {
        console.warn('Capacitor App listener not available in this environment:', e)
      }
    }

    setupBackListener()

    return () => {
      if (backListener) {
        backListener.remove()
      }
    }
  }, [navigate])

  return (
    <div className={styles.wrapper}>
      <button 
        className={styles.backButton} 
        onClick={() => navigate('/')}
        aria-label="Back to Home"
      >
        <span className={styles.backIcon}>←</span>
        <span>Home</span>
      </button>
      <AR />
    </div>
  )
}
