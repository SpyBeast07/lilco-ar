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

      {/* Header / Navbar */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoBadge}>LILCO</span>
          <span className={styles.logoText}>STEM AR Studio</span>
        </div>

        <nav className={styles.navLinks}>
          <a href="#about" className={styles.navLink}>About</a>
          <a href="#offerings" className={styles.navLink}>What We Offer</a>
          <a href="#ar-gallery" className={styles.navLink}>AR Modules</a>
          <a href="#team" className={styles.navLink}>Team</a>
          <a href="#contact" className={styles.navLink}>Contact</a>
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.setupBtn} onClick={() => navigate('/setup')}>
            <span>Create Experience</span>
            <span className={styles.plusIcon}>+</span>
          </button>
        </div>
      </header>

      <main className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBadges}>
            <div className={styles.badge}>European Commission & French Curriculum Compliant</div>
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
            Hello, We are <span className={styles.brandTitle}>LilCo</span>!<br />
            Your Repository for <span className={styles.gradientText}>STEM Education</span>
          </h1>
          <p className={styles.subtitle}>
            LilCo brings a new paradigm to STEM Education. Like a streaming platform for your STEM resources, explore interactive WebAR target modules across Middle School, High School, and University curricula.
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
                LilCo is like a streaming service for your STEM Education resources. Find key resources for Middle School, High School, and University levels.
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
            <div>
              <span className={styles.sectionEyebrow}>WEBAR REPOSITORY</span>
              <h2 className={styles.sectionTitle}>Trackable STEM Targets</h2>
              <p className={styles.sectionSubtitle}>Scan these physical STEM diagram cards to trigger interactive video and 3D visualization overlays</p>
            </div>
            <div className={styles.targetCount}>
              {demoExperiences.length + customExperiences.length} Active Modules
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner} />
              <p>Loading STEM tracking data...</p>
            </div>
          ) : (
            <>
              {/* Demo Targets Grid */}
              <div className={styles.gridHeader}>
                <h3>Official LilCo STEM Modules</h3>
                <span className={styles.badgeDemo}>French & EC Standards</span>
              </div>
              <div className={styles.grid}>
                {demoExperiences.map((exp, idx) => (
                  <div key={idx} className={styles.card} onClick={handleLaunchDemo}>
                    <div className={styles.cardPreviewContainer}>
                      {exp.targetImageUrl ? (
                        <img 
                          src={exp.targetImageUrl} 
                          alt={exp.cardTitle || 'STEM Target Image'} 
                          className={styles.cardImage} 
                        />
                      ) : (
                        <div className={styles.abstractPlaceholder}>
                          <span className={styles.placeholderIcon}>◈</span>
                        </div>
                      )}
                      <div className={styles.scanline} />
                      <div className={styles.cardOverlay}>
                        <span className={styles.overlayScanText}>Scan STEM Target</span>
                      </div>
                    </div>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardTitleRow}>
                        <h4 className={styles.cardTitle}>{exp.cardTitle || 'LilCo STEM Module'}</h4>
                        <span className={styles.statusDot} />
                      </div>
                      <p className={styles.cardBody}>{exp.cardBody || 'Scan target image to unlock the STEM overlay.'}</p>
                      
                      <div className={styles.expDetails}>
                        <div className={styles.expDetailItem}>
                          <span className={styles.expDetailLabel}>Resource:</span>
                          <span className={styles.expDetailValue}>
                            {exp.glbModelUrl ? '3D Model + Video' : (exp.youtubeUrl ? 'Educational Stream' : 'Video Overlay')}
                          </span>
                        </div>
                        <div className={styles.expDetailItem}>
                          <span className={styles.expDetailLabel}>Action Button:</span>
                          <span className={styles.expDetailValue}>{exp.buttonLabel || 'Learn More'}</span>
                        </div>
                      </div>

                      <button className={styles.cardScanBtn}>
                        <span>Launch AR Scanner</span>
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
                    <h3>Custom STEM Modules</h3>
                    <span className={styles.badgeCustom}>Setup Drafts</span>
                  </div>
                  <div className={styles.grid}>
                    {customExperiences.map((exp) => (
                      <div key={exp.id} className={styles.card} onClick={() => handleLaunchCustom(exp.id)}>
                        <div className={styles.cardPreviewContainer}>
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
                            <h4 className={styles.cardTitle}>{exp.cardTitle || 'Custom STEM Experience'}</h4>
                            <span className={styles.statusDotCustom} />
                          </div>
                          <p className={styles.cardBody}>{exp.cardBody || 'A custom target compiled in LilCo AR Setup.'}</p>
                          
                          <div className={styles.expDetails}>
                            <div className={styles.expDetailItem}>
                              <span className={styles.expDetailLabel}>Video Source:</span>
                              <span className={styles.expDetailValue}>
                                {exp.youtubeUrl ? 'YouTube Stream' : 'Direct Video'}
                              </span>
                            </div>
                            <div className={styles.expDetailItem}>
                              <span className={styles.expDetailLabel}>Action Button:</span>
                              <span className={styles.expDetailValue}>{exp.buttonLabel || 'None'}</span>
                            </div>
                          </div>

                          <button className={styles.cardScanBtn} style={{ background: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.35)', color: 'var(--accent-2)' }}>
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

        {/* Team Section */}
        <section id="team" className={styles.teamSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>LEADERSHIP</span>
              <h2 className={styles.sectionTitle}>Our Team</h2>
              <p className={styles.sectionSubtitle}>Pioneering the next era of STEM Education and Interactive WebAR</p>
            </div>
          </div>

          <div className={styles.teamGrid}>
            <div className={styles.teamCard}>
              <div className={styles.teamAvatar}>MC</div>
              <h3 className={styles.teamName}>Mayukh Chakraborty</h3>
              <p className={styles.teamRole}>Founder & Chief Executive Officer</p>
            </div>
            <div className={styles.teamCard}>
              <div className={styles.teamAvatar}>VG</div>
              <h3 className={styles.teamName}>Valera Evgeniya Gerasimova</h3>
              <p className={styles.teamRole}>Founder & Chief Pedagogy Officer</p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className={styles.contactSection}>
          <div className={styles.contactCard}>
            <h2 className={styles.contactTitle}>Reach out to us</h2>
            <p className={styles.contactSub}>If you have any questions regarding LilCo STEM Education or WebAR modules</p>
            
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
        <p>© Copyright 2024–2026 LILCO. All rights reserved. STEM Education & AR Platform.</p>
      </footer>
    </div>
  )
}

