import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
import ARCard from '../components/ARCard.jsx'
import styles from './AR.module.css'

const DEFAULT_CONFIG_URL = '/demo-experience.json'
const KNOWN_MINDAR_WARNING_PARTS = [
  'already registered',
  'Multiple instances of Three.js',
  'Platform browser has already been set',
]

if (!window.__mindarWarningFilterInstalled) {
  window.__mindarWarningFilterInstalled = true
  const originalConsoleWarn = console.warn.bind(console)
  console.warn = (...args) => {
    const message = String(args[0] || '')
    const isKnownMindARWarning = KNOWN_MINDAR_WARNING_PARTS.some((part) => message.includes(part))
    if (!isKnownMindARWarning) originalConsoleWarn(...args)
  }
}

function base64ToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(b64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const COMPILE_MAX_IMAGE_SIZE = 1024

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Target image could not be loaded. Check the backend image URL and CORS settings.'))
    img.src = src
  })
}

async function resizeImageForCompile(img) {
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const longest = Math.max(width, height)
  if (longest <= COMPILE_MAX_IMAGE_SIZE) return img

  const scale = COMPILE_MAX_IMAGE_SIZE / longest
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    const resized = new Image()
    resized.onload = () => resolve(resized)
    resized.onerror = () => reject(new Error('Failed to resize AR target image.'))
    resized.src = canvas.toDataURL('image/png')
  })
}

async function importMindARBundle(loader) {
  await loader()
}

function getYoutubeVideoId(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || null
    }
    if (parsed.hostname.includes('youtube.com')) {
      const fromQuery = parsed.searchParams.get('v')
      if (fromQuery) return fromQuery
      const fromPath = parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)
      if (fromPath) return fromPath[1]
    }
  } catch (_) {
    return null
  }
  return null
}

function isYoutubeUrl(url) {
  return Boolean(getYoutubeVideoId(url))
}

function normalizeExperiences(data) {
  const experiences = Array.isArray(data) ? data : [data]
  if (!experiences.length) {
    throw new Error('Experience config is empty.')
  }
  return experiences
}

function validateExperience(exp, index) {
  const label = exp.targetImageUrl || `entry ${index + 1}`
  if (!exp.videoUrl && !exp.youtubeUrl) {
    throw new Error(`Experience "${label}" must include videoUrl or youtubeUrl.`)
  }
  if (!exp.mindDataUrl && !exp.targetImageUrl) {
    throw new Error(`Experience "${label}" must include targetImageUrl or mindDataUrl.`)
  }
  if (exp.youtubeUrl && !getYoutubeVideoId(exp.youtubeUrl)) {
    throw new Error(`Experience "${label}" has an invalid youtubeUrl.`)
  }
  if (exp.videoUrl && isYoutubeUrl(exp.videoUrl)) {
    throw new Error(`Experience "${label}" uses a YouTube link in videoUrl; use youtubeUrl instead.`)
  }
}

function buildYoutubeEmbedSrc(videoId, { autoplay = false, mute = true } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: mute ? '1' : '0',
    controls: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
    origin: window.location.origin,
  })
  return `https://www.youtube.com/embed/${videoId}?${params}`
}

function createYoutubeEmbed(videoId) {
  const iframe = document.createElement('iframe')
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share'
  iframe.setAttribute('allowfullscreen', '')
  iframe.title = 'YouTube video'
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = '0'
  iframe.style.display = 'block'
  iframe.src = buildYoutubeEmbedSrc(videoId, { autoplay: false, mute: true })

  let ready = false
  let hasStartedPlayback = false
  let playOnReady = false
  let pauseOnReady = false
  let kickPlaybackOnReady = false
  let isPlaying = false

  const postCommand = (func, args = []) => {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    )
  }

  const runPendingReadyAction = () => {
    if (pauseOnReady) {
      pauseOnReady = false
      playOnReady = false
      kickPlaybackOnReady = false
      postCommand('pauseVideo')
      return
    }

    if (kickPlaybackOnReady || playOnReady) {
      kickPlaybackOnReady = false
      playOnReady = false
      postCommand('playVideo')
      postCommand('unMute')
    }
  }

  const markReady = () => {
    if (ready) {
      runPendingReadyAction()
      return
    }
    ready = true
    runPendingReadyAction()
  }

  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow) return

    let data = event.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        return
      }
    }
    if (!data || typeof data !== 'object') return
    if (data.event !== 'onReady') return

    markReady()
  }

  window.addEventListener('message', onMessage)

  iframe.addEventListener('load', () => {
    if (kickPlaybackOnReady) {
      window.setTimeout(() => {
        if (!ready) markReady()
        else runPendingReadyAction()
      }, 300)
    }
  })

  return {
    element: iframe,
    get isPlaying() { return isPlaying },
    play() {
      isPlaying = true
      if (!hasStartedPlayback) {
        hasStartedPlayback = true
        ready = false
        kickPlaybackOnReady = true
        pauseOnReady = false
        playOnReady = false
        iframe.src = buildYoutubeEmbedSrc(videoId, { autoplay: true, mute: true })
        return
      }

      if (ready) {
        postCommand('playVideo')
        postCommand('unMute')
        return
      }

      playOnReady = true
      pauseOnReady = false
    },
    pause() {
      isPlaying = false
      playOnReady = false
      kickPlaybackOnReady = false

      if (ready) {
        postCommand('pauseVideo')
        return
      }

      pauseOnReady = true
    },
    toggle() {
      if (isPlaying) {
        this.pause()
      } else {
        this.play()
      }
    },
    destroy() {
      window.removeEventListener('message', onMessage)
      iframe.src = 'about:blank'
    },
  }
}

async function createMp4Player(videoUrl) {
  const container = document.createElement('div')
  container.style.position = 'relative'
  container.style.width = '100%'
  container.style.height = '100%'

  const video = document.createElement('video')
  video.src = videoUrl
  video.loop = true
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'cover'
  video.style.display = 'block'
  container.appendChild(video)

  // Play button overlay — visible when paused, hidden when playing
  const playButton = document.createElement('div')
  playButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="36" height="36" fill="white" style="margin-left: 3px;">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `
  playButton.style.position = 'absolute'
  playButton.style.top = '50%'
  playButton.style.left = '50%'
  playButton.style.transform = 'translate(-50%, -50%) scale(1)'
  playButton.style.width = '64px'
  playButton.style.height = '64px'
  playButton.style.borderRadius = '50%'
  playButton.style.background = 'rgba(0, 0, 0, 0.5)'
  playButton.style.backdropFilter = 'blur(4px)'
  playButton.style.webkitBackdropFilter = 'blur(4px)'
  playButton.style.border = '1px solid rgba(255, 255, 255, 0.2)'
  playButton.style.display = 'flex'
  playButton.style.alignItems = 'center'
  playButton.style.justifyContent = 'center'
  playButton.style.opacity = '1'
  playButton.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
  playButton.style.pointerEvents = 'none'
  playButton.style.zIndex = '15'
  container.appendChild(playButton)

  const showPlayButton = () => {
    playButton.style.opacity = '1'
    playButton.style.transform = 'translate(-50%, -50%) scale(1)'
  }

  const hidePlayButton = () => {
    playButton.style.opacity = '0'
    playButton.style.transform = 'translate(-50%, -50%) scale(0.8)'
  }

  video.addEventListener('play', hidePlayButton)
  video.addEventListener('pause', showPlayButton)

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Video failed to load. Check the URL is a direct MP4 link.')),
      10000
    )
    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      resolve()
    }
    video.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Video URL could not be loaded.'))
    }
    video.load()
  })

  return {
    element: container,
    get isPlaying() { return !video.paused },
    play() {
      video.muted = false
      const playback = video.play()
      if (playback) playback.catch(() => { video.muted = true })
    },
    pause() {
      video.pause()
    },
    toggle() {
      if (video.paused) {
        this.play()
      } else {
        this.pause()
      }
    },
    destroy() {
      video.removeEventListener('play', hidePlayButton)
      video.removeEventListener('pause', showPlayButton)
      video.pause()
      video.removeAttribute('src')
      video.load()
      container.remove()
    },
  }
}

async function createTargetMedia(exp) {
  const youtubeId = getYoutubeVideoId(exp.youtubeUrl)
  if (youtubeId) return createYoutubeEmbed(youtubeId)
  if (!exp.videoUrl) {
    throw new Error(`Experience "${exp.targetImageUrl || 'unknown'}" is missing videoUrl.`)
  }
  return createMp4Player(exp.videoUrl)
}

export async function compileTargetImages(targetImageUrls, onProgress) {
  await importMindARBundle(() => import('mind-ar/dist/mindar-image.prod.js'))
  const Compiler = window.MINDAR?.IMAGE?.Compiler
  if (typeof Compiler !== 'function') {
    throw new Error('MindAR compiler failed to load.')
  }

  const loadedImages = await Promise.all(
    targetImageUrls.map((targetImageUrl) =>
      loadImage(new URL(targetImageUrl, window.location.href).toString())
    )
  )
  const images = await Promise.all(loadedImages.map((img) => resizeImageForCompile(img)))
  const compiler = new Compiler()
  await compiler.compileImageTargets(images, (progress) => {
    // MindAR's multi-image compiler reports progress up to (images.length * 5) steps,
    // whereas single-image compilation reports a float from 0 to 1.0.
    // We dynamically normalize both cases to ensure 0-100% bounds.
    const maxSteps = images.length * 5
    const normalized = progress > 1.0 ? (progress / maxSteps) : progress
    onProgress(Math.min(100, Math.round(normalized * 100)))
  })
  const buffer = await compiler.exportData()
  return `data:application/octet-stream;base64,${arrayBufferToBase64(buffer)}`
}

// ---------------------------------------------------------------------------
// IndexedDB persistent cache for compiled AR mind targets.
//
// Cache key: the sorted, path-only filenames of target images joined by '|'.
// Using only the pathname (not the full origin) makes the key stable across
// environments (e.g., localhost vs production HTTPS).
// ---------------------------------------------------------------------------

const DB_NAME = 'AR_TARGETS_CACHE_DB'
const DB_VERSION = 1
const STORE_NAME = 'compiled_targets'

function getDB() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB not supported'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Build a stable, environment-independent cache key from a list of target image URLs.
 * We strip the origin and query-string and sort so the key is identical regardless
 * of protocol or host variations.
 */
function buildStableCacheKey(targetImageUrls) {
  const paths = targetImageUrls.map((url) => {
    try {
      const parsed = new URL(url, window.location.href)
      // Use only the pathname + filename — strip origin & query params
      return parsed.pathname
    } catch (_) {
      return url
    }
  })
  // Sort so reordering targets in config doesn't bust the cache unnecessarily
  return [...paths].sort().join('|')
}

async function getCachedTarget(key) {
  try {
    const db = await getDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[AR Cache] IndexedDB read failed — will recompile:', err)
    return null
  }
}

async function setCachedTarget(key, val) {
  try {
    const db = await getDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(val, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      tx.onerror = () => reject(tx.error)
    })
    console.log('[AR Cache] Saved compiled targets to IndexedDB ✓')
  } catch (err) {
    console.warn('[AR Cache] IndexedDB write failed — cache not saved:', err)
  }
}

function getConfigUrl(id) {
  if (import.meta.env.VITE_AR_CONFIG_URL) return import.meta.env.VITE_AR_CONFIG_URL
  if (id) return `/experiences/${id}.json`
  return DEFAULT_CONFIG_URL
}

export default function AR() {
  const { id } = useParams()
  const containerRef = useRef(null)
  const mindarRef = useRef(null)
  const mediaPlayersRef = useRef([])
  const resizeObserverRef = useRef(null)
  // Ref to the active media player for the currently-tracked target, so the
  // React-layer tap overlay can call toggle() without needing closure captures.
  const activeMediaRef = useRef(null)

  const [config, setConfig] = useState(null)
  const [activeExperience, setActiveExperience] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadingText, setLoadingText] = useState('Loading experience...')
  const [compileProgress, setCompileProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [tracked, setTracked] = useState(false)

  // Effect 1: load config from backend endpoint and compile target image if needed.
  useEffect(() => {
    let cancelled = false

    const loadConfig = async () => {
      try {
        setStatus('loading')
        setLoadingText('Loading experience...')
        setCompileProgress(0)

        const response = await fetch(getConfigUrl(id), { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Experience config could not be loaded (${response.status}).`)
        }

        const experiences = normalizeExperiences(await response.json())
        experiences.forEach(validateExperience)

        let mindDataUrl = experiences[0].mindDataUrl
        if (!mindDataUrl) {
          const targetImageUrls = experiences.map((exp) => exp.targetImageUrl).filter(Boolean)
          if (!targetImageUrls.length) {
            throw new Error('At least one experience must include targetImageUrl or mindDataUrl.')
          }

          // Build a stable key that is identical across web environments
          const cacheKey = buildStableCacheKey(targetImageUrls)

          // 1. In-memory cache (fastest — same JS session)
          if (window.__arCompiledCache && window.__arCompiledCache[cacheKey]) {
            console.log('[AR Cache] In-memory hit ✓')
            mindDataUrl = window.__arCompiledCache[cacheKey]
          } else {
            // 2. IndexedDB persistent cache (survives app restarts)
            const cached = await getCachedTarget(cacheKey)
            if (cached) {
              console.log('[AR Cache] IndexedDB hit ✓')
              mindDataUrl = cached
              if (!window.__arCompiledCache) window.__arCompiledCache = {}
              window.__arCompiledCache[cacheKey] = cached
            } else {
              // 3. Cache miss — compile and store
              console.log('[AR Cache] Cache miss — compiling targets…')
              setLoadingText('Preparing AR targets...')
              mindDataUrl = await compileTargetImages(targetImageUrls, (progress) => {
                if (!cancelled) setCompileProgress(progress)
              })
              if (!window.__arCompiledCache) window.__arCompiledCache = {}
              window.__arCompiledCache[cacheKey] = mindDataUrl
              // Persist to IndexedDB asynchronously — don't block startup
              setCachedTarget(cacheKey, mindDataUrl)
            }
          }
        }

        if (!cancelled) {
          setLoadingText('Initialising camera...')
          setConfig({ experiences, mindDataUrl })
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg(err?.message || 'Unable to load the AR experience.')
        }
      }
    }

    loadConfig()

    return () => {
      cancelled = true
    }
  }, [id])

  // Effect 2: start MindAR — only re-runs if config object changes (once)
  useEffect(() => {
    if (!config || !containerRef.current) return

    let cancelled = false
    let mindBlobUrl = null

    const init = async () => {
      try {
        await importMindARBundle(() => import('mind-ar/dist/mindar-image-three.prod.js'))
        const MindARThree = window.MINDAR?.IMAGE?.MindARThree
        if (typeof MindARThree !== 'function') {
          throw new Error('MindAR viewer failed to load.')
        }
        if (cancelled) return

        mindBlobUrl = URL.createObjectURL(base64ToBlob(config.mindDataUrl))

        const targetCount = config.experiences.length

        mindarRef.current = new MindARThree({
          container: containerRef.current,
          imageTargetSrc: mindBlobUrl,
          maxTrack: targetCount,
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no',
        })

        const { renderer, scene, camera, cssRenderer } = mindarRef.current

        // Keep CSS3D layer non-interactive — tap handling is done via the React
        // DOM overlay (tapOverlay) which lives outside the transformed 3D tree.
        // This is the only approach that works reliably on Android WebViews.
        cssRenderer.domElement.style.pointerEvents = 'none'

        mediaPlayersRef.current = []
        const anchorSetups = []
        const pxScale = 1000

        const ensureMedia = async (setup) => {
          if (setup.media) return setup.media
          if (!setup.mediaPromise) {
            setup.mediaPromise = createTargetMedia(setup.experience)
              .then((media) => {
                setup.media = media
                setup.wrapper.appendChild(media.element)
                mediaPlayersRef.current.push(media)
                return media
              })
              .catch((err) => {
                setup.mediaPromise = null
                throw err
              })
          }
          return setup.mediaPromise
        }

        for (let index = 0; index < config.experiences.length; index += 1) {
          const experience = config.experiences[index]

          let targetAspect = 1
          if (experience.targetImageUrl) {
            try {
              const targetImg = await loadImage(
                new URL(experience.targetImageUrl, window.location.href).toString()
              )
              targetAspect = targetImg.naturalWidth / targetImg.naturalHeight
            } catch (_) {
              // fallback to 1:1
            }
          }

          const targetW = targetAspect >= 1 ? 1 : targetAspect
          const targetH = targetAspect >= 1 ? 1 / targetAspect : 1
          const PX_W = Math.round(pxScale * targetW)
          const PX_H = Math.round(pxScale * targetH)

          const wrapper = document.createElement('div')
          wrapper.style.position = 'relative'
          wrapper.style.width = `${PX_W}px`
          wrapper.style.height = `${PX_H}px`
          wrapper.style.overflow = 'hidden'
          // No pointer events needed on the CSS3D wrapper — taps go through the React overlay
          wrapper.style.pointerEvents = 'none'

          let media = null
          if (experience.youtubeUrl || experience.videoUrl) {
            media = await createTargetMedia(experience)
            if (cancelled) {
              media.destroy()
              mindarRef.current.stop()
              return
            }
            wrapper.appendChild(media.element)
            mediaPlayersRef.current.push(media)
          }

          const cssObj = new CSS3DObject(wrapper)
          cssObj.scale.set(1 / pxScale, 1 / pxScale, 1 / pxScale)
          cssObj.position.set(0, 0, 0)
          cssObj.visible = false

          const anchor = mindarRef.current.addAnchor(index)
          anchor.group.add(cssObj)

          const setup = {
            experience,
            wrapper,
            cssObj,
            media,
            mediaPromise: null,
          }
          anchorSetups.push(setup)

          anchor.onTargetFound = () => {
            if (cancelled) return
            setup.cssObj.visible = true
            setActiveExperience(setup.experience)
            setTracked(true)
            activeMediaRef.current = setup.media
            if (setup.media) {
              setup.media.play()
              return
            }
            ensureMedia(setup)
              .then((media) => {
                if (!cancelled) {
                  setup.cssObj.visible = true
                  activeMediaRef.current = media
                  media.play()
                }
              })
              .catch((err) => {
                console.warn('Media failed to load for target', setup.experience.targetImageUrl, err)
              })
          }
          anchor.onTargetLost = () => {
            setup.cssObj.visible = false
            setup.media?.pause()
            activeMediaRef.current = null
            setActiveExperience(null)
            setTracked(false)
          }
        }

        await mindarRef.current.start()
        if (cancelled) { mindarRef.current.stop(); return }

        setStatus('ready')

        // Preload all media after the camera is running.
        anchorSetups.forEach((setup) => {
          ensureMedia(setup).catch(() => {})
        })

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera)
          cssRenderer.render(scene, camera)
        })

        // Force MindAR to re-layout when the container resizes (orientation,
        // keyboard, split-screen, etc.)
        const containerEl = containerRef.current
        let resizeTimer
        resizeObserverRef.current = new ResizeObserver(() => {
          clearTimeout(resizeTimer)
          resizeTimer = setTimeout(() => {
            if (mindarRef.current) mindarRef.current.resize()
          }, 150)
        })
        if (containerEl) resizeObserverRef.current.observe(containerEl)
      } catch (err) {
        if (!cancelled) {
          if (err) console.warn('MindAR startup issue', err)
          setStatus('error')
          setErrorMsg(err?.message || 'Unable to start the AR viewer. Check camera permission and use localhost or HTTPS.')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      activeMediaRef.current = null
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
      mediaPlayersRef.current.forEach((media) => media.destroy())
      mediaPlayersRef.current = []
      if (mindarRef.current) {
        try { mindarRef.current.stop() } catch (_) {}
        mindarRef.current = null
      }
      if (mindBlobUrl) URL.revokeObjectURL(mindBlobUrl)
    }
  }, [config])

  // Tap handler lives in the React DOM — works reliably on all platforms including
  // Android WebViews where touch events inside CSS3D transforms are unreliable.
  const handleTapOverlay = useCallback(() => {
    if (activeMediaRef.current) {
      activeMediaRef.current.toggle()
    }
  }, [])

  return (
    <div className={styles.page}>
      <div ref={containerRef} className={styles.arContainer} />

      {/* Full-screen tap overlay — only active when a target is being tracked.
          Lives in the normal 2D DOM so touch events work on every platform. */}
      {status === 'ready' && tracked && (
        <div
          className={styles.tapOverlay}
          onPointerDown={handleTapOverlay}
        />
      )}

      {(status === 'loading' || status === 'starting') && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingInner}>
            <div className={styles.loadingLogo}>◈</div>
            <div className={styles.loadingBar}>
              <div className={styles.loadingFill} />
            </div>
            <p className={styles.loadingText}>
              {loadingText}
              {compileProgress > 0 && compileProgress < 100 ? ` ${compileProgress}%` : ''}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.loadingOverlay}>
          <div className={styles.errorInner}>
            <div className={styles.errorIcon}>⚠</div>
            <h2 className={styles.errorTitle}>Something went wrong</h2>
            <p className={styles.errorMsg}>{errorMsg}</p>
            <button className={styles.retryBtn} onClick={() => window.location.reload()}>Try again</button>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className={styles.topBar}>
          <div className={styles.topLogo}>◈ AR Studio</div>
          <div className={`${styles.trackBadge} ${tracked ? styles.trackBadgeActive : ''}`}>
            <span className={styles.trackDot} />
            {tracked ? 'Tracking' : 'Searching…'}
          </div>
        </div>
      )}

      {status === 'ready' && activeExperience && (
        <ARCard config={activeExperience} visible={tracked} />
      )}
    </div>
  )
}
