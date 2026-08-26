import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { compileTargetImages } from './AR.jsx'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  const [compilingStatus, setCompilingStatus] = useState('idle') // 'idle' | 'compiling' | 'ready' | 'error'
  const [compilingProgress, setCompilingProgress] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [contactExpanded, setContactExpanded] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Background targets compilation effect
  useEffect(() => {
    let active = true

    async function preload() {
      try {
        const response = await fetch('/demo-experience.json', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const experiences = Array.isArray(data) ? data : [data]
        const targetImageUrls = experiences.map((exp) => exp.targetImageUrl).filter(Boolean)
        if (targetImageUrls.length === 0) return

        const cacheKey = targetImageUrls.join('|')
        if (window.__arCompiledCache?.[cacheKey]) {
          setCompilingStatus('ready')
          return
        }

        setCompilingStatus('compiling')
        setCompilingProgress(0)

        const mindDataUrl = await compileTargetImages(targetImageUrls, (progress) => {
          if (active) setCompilingProgress(progress)
        })

        if (!active) return
        if (!window.__arCompiledCache) window.__arCompiledCache = {}
        window.__arCompiledCache[cacheKey] = mindDataUrl
        setCompilingStatus('ready')
      } catch (err) {
        console.error('Background compilation failed:', err)
        if (active) setCompilingStatus('error')
      }
    }

    preload()

    return () => {
      active = false
    }
  }, [])

  const handleLaunchDemo = () => {
    navigate('/ar')
  }

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGrid} />
      <div className={styles.radialGlow} />

      {/* Header / Navbar */}
      <header className={styles.header}>
        <Link to="/" className={styles.navLogo} aria-label="Lilco — Home">Lilco</Link>

        <nav className={styles.navLinks}>
          <Link to="/about" className={styles.navLink}>About the Product</Link>
          <Link to="/about#contact" className={styles.navLink}>Contact Us</Link>
        </nav>

        <button
          className={styles.hamburger}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Navigation Drawer */}
      {drawerOpen && <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`} aria-hidden={!drawerOpen}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Menu</span>
          <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu">✕</button>
        </div>

        <nav className={styles.drawerNav}>
          <Link to="/about" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>
            About the Product
          </Link>

          <button
            className={styles.drawerLink}
            onClick={() => setContactExpanded((v) => !v)}
            aria-expanded={contactExpanded}
          >
            Contact Us
            <span className={`${styles.drawerChevron} ${contactExpanded ? styles.chevronUp : ''}`}>▾</span>
          </button>

          <div className={`${styles.contactPanel} ${contactExpanded ? styles.contactPanelOpen : ''}`}>
            <div className={styles.contactPanelInner}>
              <a href="tel:+33749706796" className={styles.contactItem}>
                <span className={styles.contactItemLabel}>Phone</span>
                <span className={styles.contactItemValue}>(+33) 749 706 796</span>
              </a>
              <a href="mailto:mayukh2094@gmail.com" className={styles.emailBtn}>
                <span>Send Email</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </nav>
      </aside>

      <main className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadges}>
            {compilingStatus === 'compiling' && (
              <div className={`${styles.badge} ${styles.badgeCompiling}`}>
                <span className={styles.statusPulse} />
                ⚡ Pre-loading AR Engine ({compilingProgress}%)
              </div>
            )}
            {compilingStatus === 'ready' && (
              <div className={`${styles.badge} ${styles.badgeReady}`}>
                ✓ WebAR Engine Ready
              </div>
            )}
            {compilingStatus === 'error' && (
              <div className={`${styles.badge} ${styles.badgeError}`}>
                ⚠ Engine Idle
              </div>
            )}
          </div>
          <h1 className={styles.title}>
            We are <span className={styles.gradientText}>Lilco</span>,<br />
            Your Interactive Console for STEM Education and Edutainment
          </h1>
          <p className={styles.subtitle}>
            This is an AR-embed interactive app offered by Lilco. Any postcard with Lilco Logo on it can be scanned by the AR camera scanner below and each such postcard has some interesting Easter Eggs for your fun
          </p>

          <div className={styles.heroCtaGroup}>
            <button className={styles.ctaButton} onClick={handleLaunchDemo}>
              <span className={styles.ctaIcon}>📸</span>
              <span>Launch AR Scanner</span>
              <span className={styles.ctaArrow}>→</span>
            </button>
            <a href="https://lilco.eu" target="_blank" rel="noopener noreferrer" className={styles.secondaryCtaBtn}>
              <span>Visit Official Site</span>
              <span className={styles.btnIcon}>↗</span>
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
