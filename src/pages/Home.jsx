import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { compileTargetImages } from './AR.jsx'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  const [demoExperiences, setDemoExperiences] = useState([])
  const [customExperiences, setCustomExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [compilingStatus, setCompilingStatus] = useState('idle') // 'idle' | 'compiling' | 'ready' | 'error'
  const [compilingProgress, setCompilingProgress] = useState(0)

  // Fetch demo experiences and load custom experiences from localStorage
  useEffect(() => {
    async function loadData() {
      try {
        // Load default/demo experiences
        const response = await fetch('/demo-experience.json', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setDemoExperiences(Array.isArray(data) ? data : [data])
        }
      } catch (err) {
        console.error('Failed to load demo experiences:', err)
      }

      try {
        // Load custom experiences created via /setup
        const customs = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('ar_experience_')) {
            try {
              const id = key.replace('ar_experience_', '')
              const exp = JSON.parse(localStorage.getItem(key))
              customs.push({ id, ...exp })
            } catch (e) {
              console.error('Error parsing stored experience:', e)
            }
          }
        }
        // Sort by newest first
        customs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setCustomExperiences(customs)
      } catch (err) {
        console.error('Failed to load custom experiences:', err)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  // Background targets compilation effect
  useEffect(() => {
    if (demoExperiences.length === 0) return

    const targetImageUrls = demoExperiences.map((exp) => exp.targetImageUrl).filter(Boolean)
    if (targetImageUrls.length === 0) return

    const cacheKey = targetImageUrls.join('|')
    if (window.__arCompiledCache?.[cacheKey]) {
      setCompilingStatus('ready')
      return
    }

    let active = true
    setCompilingStatus('compiling')
    setCompilingProgress(0)

    compileTargetImages(targetImageUrls, (progress) => {
      if (active) setCompilingProgress(progress)
    })
      .then((mindDataUrl) => {
        if (!active) return
        if (!window.__arCompiledCache) window.__arCompiledCache = {}
        window.__arCompiledCache[cacheKey] = mindDataUrl
        setCompilingStatus('ready')
      })
      .catch((err) => {
        console.error('Background compilation failed:', err)
        if (active) setCompilingStatus('error')
      })

    return () => {
      active = false
    }
  }, [demoExperiences])

  const handleLaunchDemo = () => {
    navigate('/ar')
  }

  const handleLaunchCustom = (id) => {
    navigate(`/ar/${id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGrid} />
      <div className={styles.radialGlow} />

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>AR Studio</span>
        </div>
        <button className={styles.setupBtn} onClick={() => navigate('/setup')}>
          <span>Create Experience</span>
          <span className={styles.plusIcon}>+</span>
        </button>
      </header>

      <main className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadges}>
            <div className={styles.badge}>Web AR Ready</div>
            {compilingStatus === 'compiling' && (
              <div className={`${styles.badge} ${styles.badgeCompiling}`}>
                <span className={styles.statusPulse} />
                ⚡ Pre-loading AR Targets ({compilingProgress}%)
              </div>
            )}
            {compilingStatus === 'ready' && (
              <div className={`${styles.badge} ${styles.badgeReady}`}>
                ✓ AR Engine Ready
              </div>
            )}
            {compilingStatus === 'error' && (
              <div className={`${styles.badge} ${styles.badgeError}`}>
                ⚠ Engine Idle
              </div>
            )}
          </div>
          <h1 className={styles.title}>
            Next-Gen Image <br />
            <span className={styles.gradientText}>Augmented Reality</span>
          </h1>
          <p className={styles.subtitle}>
            Explore and track interactive digital overlays. Select a target image below to inspect its features, then open the camera to bring them to life.
          </p>

          <button className={styles.ctaButton} onClick={handleLaunchDemo}>
            <span className={styles.ctaIcon}>📸</span>
            <span>Launch AR Scanner</span>
            <span className={styles.ctaArrow}>→</span>
          </button>
        </section>

        {/* Gallery Section */}
        <section className={styles.gallerySection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Trackable Targets</h2>
              <p className={styles.sectionSubtitle}>Scan these physical target images to trigger specific video and button overlays</p>
            </div>
            <div className={styles.targetCount}>
              {demoExperiences.length + customExperiences.length} Active
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner} />
              <p>Loading tracking data...</p>
            </div>
          ) : (
            <>
              {/* Demo Targets Grid */}
              <div className={styles.gridHeader}>
                <h3>Default Experiences</h3>
                <span className={styles.badgeDemo}>Built-in</span>
              </div>
              <div className={styles.grid}>
                {demoExperiences.map((exp, idx) => (
                  <div key={idx} className={styles.card} onClick={handleLaunchDemo}>
                    <div className={styles.cardPreviewContainer}>
                      {exp.targetImageUrl ? (
                        <img 
                          src={exp.targetImageUrl} 
                          alt={exp.cardTitle || 'Target Image'} 
                          className={styles.cardImage} 
                        />
                      ) : (
                        <div className={styles.abstractPlaceholder}>
                          <span className={styles.placeholderIcon}>◈</span>
                        </div>
                      )}
                      <div className={styles.scanline} />
                      <div className={styles.cardOverlay}>
                        <span className={styles.overlayScanText}>Scan target</span>
                      </div>
                    </div>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardTitleRow}>
                        <h4 className={styles.cardTitle}>{exp.cardTitle || 'AR Experience'}</h4>
                        <span className={styles.statusDot} />
                      </div>
                      <p className={styles.cardBody}>{exp.cardBody || 'Scan target image to unlock the overlay.'}</p>
                      
                      <div className={styles.expDetails}>
                        <div className={styles.expDetailItem}>
                          <span className={styles.expDetailLabel}>Video Source:</span>
                          <span className={styles.expDetailValue}>
                            {exp.youtubeUrl ? 'YouTube Stream' : 'Direct MP4 Video'}
                          </span>
                        </div>
                        <div className={styles.expDetailItem}>
                          <span className={styles.expDetailLabel}>Action Button:</span>
                          <span className={styles.expDetailValue}>{exp.buttonLabel || 'None'}</span>
                        </div>
                      </div>

                      <button className={styles.cardScanBtn}>
                        <span>Scan Target</span>
                        <span className={styles.cardBtnArrow}>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Targets Grid */}
              {customExperiences.length > 0 && (
                <>
                  <div className={styles.gridHeader} style={{ marginTop: '48px' }}>
                    <h3>Custom Experiences</h3>
                    <span className={styles.badgeCustom}>Setup Drafts</span>
                  </div>
                  <div className={styles.grid}>
                    {customExperiences.map((exp) => (
                      <div key={exp.id} className={styles.card} onClick={() => handleLaunchCustom(exp.id)}>
                        <div className={styles.cardPreviewContainer}>
                          {/* Setup experiences use base64 in localSession or mind files,
                              we render a stunning abstract high-tech scanner design for custom uploads. */}
                          <div className={styles.abstractPlaceholder}>
                            <div className={styles.wireframeGrid} />
                            <span className={styles.placeholderIcon}>◈</span>
                            <span className={styles.customTargetLabel}>Custom Target</span>
                          </div>
                          <div className={styles.scanline} />
                          <div className={styles.cardOverlay}>
                            <span className={styles.overlayScanText}>Scan target</span>
                          </div>
                        </div>
                        <div className={styles.cardInfo}>
                          <div className={styles.cardTitleRow}>
                            <h4 className={styles.cardTitle}>{exp.cardTitle || 'Custom Setup Experience'}</h4>
                            <span className={styles.statusDotCustom} />
                          </div>
                          <p className={styles.cardBody}>{exp.cardBody || 'A custom target compiled in AR Studio Setup.'}</p>
                          
                          <div className={styles.expDetails}>
                            <div className={styles.expDetailItem}>
                              <span className={styles.expDetailLabel}>Video Source:</span>
                              <span className={styles.expDetailValue}>
                                {exp.youtubeUrl ? 'YouTube Stream' : 'Direct MP4 Video'}
                              </span>
                            </div>
                            <div className={styles.expDetailItem}>
                              <span className={styles.expDetailLabel}>Action Button:</span>
                              <span className={styles.expDetailValue}>{exp.buttonLabel || 'None'}</span>
                            </div>
                          </div>

                          <button className={styles.cardScanBtn} style={{ background: 'rgba(167, 139, 250, 0.1)', borderColor: 'rgba(167, 139, 250, 0.3)' }}>
                            <span>Scan Custom Target</span>
                            <span className={styles.cardBtnArrow}>→</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 AR Studio. Designed with absolute visual excellence.</p>
      </footer>
    </div>
  )
}
