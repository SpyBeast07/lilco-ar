import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { compileTargetImages } from './AR.jsx'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  const [demoExperiences, setDemoExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [compilingStatus, setCompilingStatus] = useState('idle') // 'idle' | 'compiling' | 'ready' | 'error'
  const [compilingProgress, setCompilingProgress] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [contactExpanded, setContactExpanded] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Fetch demo experiences
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/demo-experience.json', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setDemoExperiences(Array.isArray(data) ? data : [data])
        }
      } catch (err) {
        console.error('Failed to load demo experiences:', err)
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

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGrid} />
      <div className={styles.radialGlow} />

      {/* Header / Navbar */}
      <header className={styles.header}>
        <nav className={styles.navLinks}>
          <a href="#about" className={styles.navLink}>About the Product</a>
          <a href="#contact" className={styles.navLink}>Contact Us</a>
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
          <a href="#about" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>
            About the Product
          </a>

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

        {/* About Section */}
        <section id="about" className={styles.infoSection}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>📚</div>
              <h3 className={styles.infoCardTitle}>Streaming STEM Platform</h3>
              <p className={styles.infoCardBody}>
                A streaming-style platform for your STEM Education resources. Find key resources for Middle School, High School, and University levels.
              </p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>🎮</div>
              <h3 className={styles.infoCardTitle}>Interactive Media & WebAR</h3>
              <p className={styles.infoCardBody}>
                Access low-graphics interactive games, Webtoons, interactive media, and 3D visual models embedded directly into target image scans.
              </p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoIcon}>🇪🇺</div>
              <h3 className={styles.infoCardTitle}>Curriculum Classified</h3>
              <p className={styles.infoCardBody}>
                We classify and categorize content based on the framework of the French National Education and European Commission for Education.
              </p>
            </div>
          </div>
        </section>

        {/* Offerings Section */}
        <section id="offerings" className={styles.offeringsSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>WHAT WE OFFER</span>
              <h2 className={styles.sectionTitle}>Cloud Based Console for STEM</h2>
            </div>
          </div>

          <div className={styles.offeringsGrid}>
            <div className={styles.offeringPill}>
              <span className={styles.offeringBadge}>Gaming</span>
              <h4>Low-Graphics Interactive Media</h4>
              <p>Limited level interactive games catering directly to subject material for STEM.</p>
            </div>
            <div className={styles.offeringPill}>
              <span className={styles.offeringBadge}>Webtoons</span>
              <h4>Theoretical Concepts & History</h4>
              <p>Historical accounts and theoretical concepts crafted into captivating webtoons that make science interesting.</p>
            </div>
            <div className={styles.offeringPill}>
              <span className={styles.offeringBadge}>Interactive Media & Series</span>
              <h4>Films & Visual Series</h4>
              <p>Published stories and series on STEM designed for instant relevance in physics, chemistry, and mathematics.</p>
            </div>
          </div>
        </section>

        {/* AR Gallery Section */}
        <section id="ar-gallery" className={styles.gallerySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.galleryTitle}>Trackable STEM Targets</h2>
            <div className={styles.targetCount}>{demoExperiences.length} Active Modules</div>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner} />
              <p>Loading STEM tracking data...</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {demoExperiences.map((exp, idx) => (
                <div key={idx} className={styles.card}>
                  <div className={styles.cardImageWrap}>
                    {exp.targetImageUrl ? (
                      <img
                        src={exp.targetImageUrl}
                        alt={exp.cardTitle || 'STEM Target'}
                        className={styles.cardImage}
                      />
                    ) : (
                      <div className={styles.cardImageFallback}>◈</div>
                    )}
                  </div>

                  <div className={styles.cardInfo}>
                    <h4 className={styles.cardTitle}>{exp.cardTitle || 'STEM Module'}</h4>

                    <div className={styles.expDetails}>
                      <div className={styles.expDetailItem}>
                        <span className={styles.expDetailLabel}>Resource</span>
                        <span className={styles.expDetailValue}>
                          {exp.glbModelUrl ? '3D Model + Video' : (exp.youtubeUrl ? 'Educational Stream' : 'Video Overlay')}
                        </span>
                      </div>
                      <div className={styles.expDetailItem}>
                        <span className={styles.expDetailLabel}>Action Button</span>
                        <span className={styles.expDetailValue}>{exp.buttonLabel || 'Learn More'}</span>
                      </div>
                    </div>

                    <button className={styles.cardScanBtn} onClick={handleLaunchDemo}>
                      <span>Launch AR Scanner</span>
                      <span className={styles.cardBtnArrow}>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact Section */}
        <section id="contact" className={styles.contactSection}>
          <div className={styles.contactCard}>
            <h2 className={styles.contactTitle}>Reach out to us</h2>
            <p className={styles.contactSub}>If you have any questions regarding our STEM Education or WebAR modules</p>
            
            <div className={styles.contactGrid}>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Phone</span>
                <a href="tel:+33749706796" className={styles.contactValue}>(+33) 749 706 796</a>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Email</span>
                <a href="mailto:mayukh2094@gmail.com" className={styles.contactValue}>mayukh2094@gmail.com</a>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactLabel}>Location</span>
                <span className={styles.contactValue}>France / European Union</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© Copyright 2024–2026. All rights reserved. STEM Education & AR Platform.</p>
      </footer>
    </div>
  )
}

