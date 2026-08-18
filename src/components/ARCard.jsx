import { useState, useEffect, useRef } from 'react'
import styles from './ARCard.module.css'

export default function ARCard({ config, visible, mode = '2d', onToggleMode }) {
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)
  const hasModel = Boolean(config?.glbModelUrl)

  useEffect(() => {
    if (visible) {
      mountedRef.current = true
      setMounted(true)
    } else {
      if (!mountedRef.current) return
      const t = setTimeout(() => {
        mountedRef.current = false
        setMounted(false)
      }, 350)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!config || !mounted) return null

  return (
    <div className={`${styles.cardWrap} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.card}>
        <div className={styles.pill} />

        <div className={styles.scanIndicator}>
          <span className={styles.dot} />
          <span className={styles.scanLabel}>Image tracked</span>
        </div>

        <h3 className={styles.title}>{config.cardTitle}</h3>
        {config.cardBody && <p className={styles.body}>{config.cardBody}</p>}

        {hasModel && (
          <div className={styles.modeToggle} role="group" aria-label="Display mode">
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === '2d' ? styles.modeBtnActive : ''}`}
              onClick={() => onToggleMode && onToggleMode('2d')}
            >
              2D Video
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === '3d' ? styles.modeBtnActive : ''}`}
              onClick={() => onToggleMode && onToggleMode('3d')}
            >
              3D Diagram
            </button>
          </div>
        )}

        {config.buttonUrl && (
          <a
            className={styles.btn}
            href={config.buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {config.buttonLabel || 'Learn More'}
            <span className={styles.btnIcon}>↗</span>
          </a>
        )}
      </div>
    </div>
  )
}
