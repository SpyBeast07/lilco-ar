import styles from './StatusPage.module.css'

export default function StatusPage({
  code,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.backgroundGrid} />
      <div className={styles.radialGlow} />

      <header className={styles.header}>
        <nav className={styles.navLinks}>
          <a href="/#about" className={styles.navLink}>About</a>
          <a href="/#offerings" className={styles.navLink}>What We Offer</a>
          <a href="/#ar-gallery" className={styles.navLink}>AR Modules</a>
          <a href="/#team" className={styles.navLink}>Team</a>
          <a href="/#contact" className={styles.navLink}>Contact</a>
        </nav>
      </header>

      <main className={styles.container}>
        <div className={styles.statusCard}>
          <div className={styles.scanline} />
          <span className={styles.cornerTL} />
          <span className={styles.cornerTR} />
          <span className={styles.cornerBL} />
          <span className={styles.cornerBR} />

          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.code}>
            {code.split('').map((char, i) =>
              char === ' ' ? (
                <span key={i} className={styles.codeSpace} />
              ) : (
                <span key={i} className={`${styles.codeDigit}`} style={{ animationDelay: `${i * 0.08}s` }}>
                  {char}
                </span>
              )
            )}
          </h1>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>

          {(primaryAction || secondaryAction) && (
            <div className={styles.actions}>
              {primaryAction && (
                <a href={primaryAction.href || '/'} className={styles.primaryBtn}>
                  <span>{primaryAction.label}</span>
                  <span className={styles.btnArrow}>→</span>
                </a>
              )}
              {secondaryAction && (
                <a
                  href={secondaryAction.href || '/'}
                  target={secondaryAction.external ? '_blank' : undefined}
                  rel={secondaryAction.external ? 'noopener noreferrer' : undefined}
                  className={styles.secondaryBtn}
                >
                  <span>{secondaryAction.label}</span>
                  <span className={styles.btnIcon}>↗</span>
                </a>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© Copyright 2024–2026. All rights reserved. STEM Education & AR Platform.</p>
      </footer>
    </div>
  )
}
