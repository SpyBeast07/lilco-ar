import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import styles from './QRModal.module.css'

export default function QRModal({ url, onClose }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.successBadge}>
          <span className={styles.checkmark}>✓</span>
          <span>Published!</span>
        </div>

        <h2 className={styles.title}>Your AR experience is live</h2>
        <p className={styles.sub}>Scan this QR code with your phone to open the AR viewer</p>

        <div className={styles.qrWrap}>
          <div className={styles.qrCorner} data-pos="tl" />
          <div className={styles.qrCorner} data-pos="tr" />
          <div className={styles.qrCorner} data-pos="bl" />
          <div className={styles.qrCorner} data-pos="br" />
          <QRCodeSVG
            value={url}
            size={200}
            bgColor="transparent"
            fgColor="#0f172a"
            level="M"
          />
        </div>

        <div className={styles.urlRow}>
          <span className={styles.urlText}>{url}</span>
          <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div className={styles.actions}>
          <a className={styles.openBtn} href={url} target="_blank" rel="noopener noreferrer">
            Open on this device
          </a>
          <button className={styles.closeBtn} onClick={onClose}>
            Create another
          </button>
        </div>
      </div>
    </div>
  )
}
