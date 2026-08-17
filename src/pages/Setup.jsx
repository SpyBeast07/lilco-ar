import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import QRModal from '../components/QRModal.jsx'
import styles from './Setup.module.css'

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const DEFAULTS = {
  videoUrl: 'https://www.w3schools.com/Html/mov_bbb.mp4',
  cardTitle: 'Check us out!',
  cardBody: 'Scan this image to explore our world.',
  buttonLabel: 'Visit Website',
  buttonUrl: 'https://www.eurobliz.eu',
}

const SESSION_KEY = 'ar_setup_draft'

export default function Setup() {
  const [step, setStep] = useState(0) // 0 = pick image, 1 = review & save

  // Step 0
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [compiling, setCompiling] = useState(false)
  const [compileProgress, setCompileProgress] = useState(0)
  const [mindDataUrl, setMindDataUrl] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // Step 1 — editable fields
  const [fields, setFields] = useState(DEFAULTS)
  const [editing, setEditing] = useState({}) // { fieldName: true }

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedUrl, setSavedUrl] = useState(null)

  const fileInputRef = useRef(null)

  // Restore compiled state after HMR / page refresh
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const { imagePreview: preview, mindDataUrl: mind } = JSON.parse(raw)
      if (preview && mind) {
        setImagePreview(preview)
        setMindDataUrl(mind)
        setStep(1)
      }
    } catch {}
  }, [])

  const handleImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setMindDataUrl(null)
    setCompileProgress(0)
    // Convert to base64 so the preview survives HMR (blob URLs don't)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleImageFile(e.dataTransfer.files[0])
  }, [handleImageFile])

  const compileMind = useCallback(async () => {
    if (!imageFile) return
    setCompiling(true)
    setCompileProgress(0)
    try {
      await import('mind-ar/dist/mindar-image.prod.js')
      const Compiler = window.MINDAR?.IMAGE?.Compiler
      if (typeof Compiler !== 'function') {
        throw new Error('MindAR compiler failed to load.')
      }
      const compiler = new Compiler()
      const img = new Image()
      img.src = imagePreview
      await img.decode()
      await compiler.compileImageTargets([img], (p) => setCompileProgress(Math.round(p * 100)))
      const buffer = await compiler.exportData()
      const mind = `data:application/octet-stream;base64,${arrayBufferToBase64(buffer)}`
      setMindDataUrl(mind)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ imagePreview, mindDataUrl: mind }))
      setStep(1)
    } catch (err) {
      console.error('Compile error', err)
    } finally {
      setCompiling(false)
    }
  }, [imageFile, imagePreview])

  const setField = (key, val) => setFields(f => ({ ...f, [key]: val }))
  const toggleEdit = (key) => setEditing(e => ({ ...e, [key]: !e[key] }))

  const saveAndGetUrl = useCallback(() => {
    setSaving(true)
    setSaveError(null)
    try {
      const id = uuidv4()
      localStorage.setItem(`ar_experience_${id}`, JSON.stringify({
        mindDataUrl,
        ...fields,
        createdAt: Date.now(),
      }))
      return `${window.location.origin}/ar/${id}`
    } catch (err) {
      setSaveError(err.name === 'QuotaExceededError'
        ? 'Storage limit exceeded. Try a simpler target image.'
        : err.message)
      return null
    } finally {
      setSaving(false)
    }
  }, [mindDataUrl, fields])

  const handleLaunch = useCallback(() => {
    const url = saveAndGetUrl()
    if (url) window.location.href = url
  }, [saveAndGetUrl])

  const handleQR = useCallback(() => {
    const url = saveAndGetUrl()
    if (url) setSavedUrl(url)
  }, [saveAndGetUrl])

  return (
    <div className={styles.page}>
      <div className={styles.noise} />

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoText}>AR Studio</span>
        </div>
        <div className={styles.badge}>Beta</div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>{step === 0 ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
          <h1 className={styles.heroTitle}>
            {step === 0 ? <>Pick your<br /><em>target image</em></> : <>Review &<br /><em>launch</em></>}
          </h1>
        </div>

        {/* Step 0: pick image */}
        {step === 0 && (
          <div className={styles.card}>
            <div
              className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''} ${imagePreview ? styles.dropzoneFilled : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="Target" />
                  <button className={styles.changeBtn} onClick={(e) => {
                    e.stopPropagation()
                    setImagePreview(null); setImageFile(null); setMindDataUrl(null)
                    sessionStorage.removeItem(SESSION_KEY)
                  }}>Change</button>
                </div>
              ) : (
                <div className={styles.dropContent}>
                  <div className={styles.dropIcon}>⊕</div>
                  <p className={styles.dropTitle}>Drop image here</p>
                  <p className={styles.dropSub}>JPG or PNG — or click to browse</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => handleImageFile(e.target.files[0])} />

            {imagePreview && (
              <div className={styles.compileArea}>
                {compiling ? (
                  <div className={styles.compileProgress}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${compileProgress}%` }} />
                    </div>
                    <span className={styles.progressLabel}>Analysing image… {compileProgress}%</span>
                  </div>
                ) : (
                  <button className={styles.primaryBtn} onClick={compileMind}>
                    <span>Next</span>
                    <span className={styles.btnArrow}>→</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 1: review fields */}
        {step === 1 && (
          <div className={styles.card}>
            <p className={styles.reviewHint}>Everything is pre-filled. Tap <strong>Edit</strong> on any field to change it.</p>

            <div className={styles.reviewList}>
              <ReviewField label="Video URL" fieldKey="videoUrl" value={fields.videoUrl} editing={editing.videoUrl}
                onEdit={() => toggleEdit('videoUrl')} onChange={(v) => setField('videoUrl', v)} />
              <ReviewField label="Card Title" fieldKey="cardTitle" value={fields.cardTitle} editing={editing.cardTitle}
                onEdit={() => toggleEdit('cardTitle')} onChange={(v) => setField('cardTitle', v)} />
              <ReviewField label="Card Body" fieldKey="cardBody" value={fields.cardBody} editing={editing.cardBody}
                onEdit={() => toggleEdit('cardBody')} onChange={(v) => setField('cardBody', v)} multiline />
              <ReviewField label="Button Label" fieldKey="buttonLabel" value={fields.buttonLabel} editing={editing.buttonLabel}
                onEdit={() => toggleEdit('buttonLabel')} onChange={(v) => setField('buttonLabel', v)} />
              <ReviewField label="Button URL" fieldKey="buttonUrl" value={fields.buttonUrl} editing={editing.buttonUrl}
                onEdit={() => toggleEdit('buttonUrl')} onChange={(v) => setField('buttonUrl', v)} />
            </div>

            {saveError && <div className={styles.errorBox}>{saveError}</div>}

            <div className={styles.launchRow}>
              <button className={styles.launchBtn} disabled={saving} onClick={handleLaunch}>
                <span className={styles.launchIcon}>▶</span>
                Launch on this device
              </button>
              <button className={styles.qrBtn} disabled={saving} onClick={handleQR}>
                <span className={styles.launchIcon}>⊞</span>
                Get QR code
              </button>
            </div>

            <button className={styles.backLink} onClick={() => { setStep(0); sessionStorage.removeItem(SESSION_KEY) }}>← Change image</button>
          </div>
        )}
      </main>

      {savedUrl && <QRModal url={savedUrl} onClose={() => setSavedUrl(null)} />}
    </div>
  )
}

function ReviewField({ label, value, editing, onEdit, onChange, multiline }) {
  return (
    <div className={styles.reviewField}>
      <div className={styles.reviewFieldTop}>
        <span className={styles.reviewLabel}>{label}</span>
        <button className={`${styles.editBtn} ${editing ? styles.editBtnActive : ''}`} onClick={onEdit}>
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing ? (
        multiline
          ? <textarea className={`${styles.input} ${styles.textarea}`} value={value} onChange={(e) => onChange(e.target.value)} rows={2} autoFocus />
          : <input className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      ) : (
        <p className={styles.reviewValue}>{value || <span className={styles.empty}>—</span>}</p>
      )}
    </div>
  )
}
