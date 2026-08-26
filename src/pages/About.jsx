import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './About.module.css'

export default function About() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [contactExpanded, setContactExpanded] = useState(false)

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGrid} />
      <div className={styles.radialGlow} />

      {/* Header / Navbar */}
      <header className={styles.header}>
        <Link to="/" className={styles.navLogo} aria-label="Lilco — Home">Lilco</Link>

        <nav className={styles.navLinks}>
          <Link to="/" className={styles.navLink}>Home</Link>
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
          <Link to="/" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>
            Home
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
              <a href="tel:+33749706796" className={styles.drawerContactItem}>
                <span className={styles.drawerContactItemLabel}>Phone</span>
                <span className={styles.drawerContactItemValue}>(+33) 749 706 796</span>
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
        {/* About the Product Section */}
        <section id="about" className={styles.infoSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1 className={styles.sectionTitle}>About the Product</h1>
            </div>
          </div>

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
                Access low-graphics interactive games, Webtoons, interactive media, and 3D visual models delivered through WebAR experiences.
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

          {/* Offerings */}
          <div className={styles.offeringsSection}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionEyebrow}>WHAT WE OFFER</span>
                <h2 className={styles.sectionSubtitle}>Cloud Based Console for STEM</h2>
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
          </div>

          {/* Contact */}
          <div id="contact" className={styles.contactSection}>
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
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© Copyright 2024–2026. All rights reserved. STEM Education & AR Platform.</p>
      </footer>
    </div>
  )
}
