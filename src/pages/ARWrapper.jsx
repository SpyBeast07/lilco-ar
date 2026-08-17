import { useNavigate } from 'react-router-dom'
import AR from './AR.jsx'
import styles from './ARWrapper.module.css'

export default function ARWrapper() {
  const navigate = useNavigate()

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
