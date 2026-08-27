import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AmbientLight, AnimationMixer, Box3, DirectionalLight, Euler, Group, HemisphereLight, LoopRepeat, MathUtils, Vector3 } from 'three'
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
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

// Loads a GLB model and normalizes it so the largest dimension is exactly 0.8
// "marker units". Normalization is applied through the model's OWN node
// transform (position/scale), NOT by mutating vertex data: the GLB hierarchy
// carries non-uniform node scales (e.g. the exported FBX/Box chains), and
// baking them into geometry would leave those node scales applied on top,
// producing a wildly oversized, mispositioned model.
// Returns { model, mixer } where mixer has all animations playing.
function loadGlbModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      new URL(url, window.location.href).toString(),
      (gltf) => {
        try {
          const model = gltf.scene

          const box = new Box3().setFromObject(model)
          const center = new Vector3()
          const size = new Vector3()
          box.getCenter(center)
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = maxDim > 0 ? 0.8 / maxDim : 1

          model.position.sub(center).multiplyScalar(scale)
          model.scale.multiplyScalar(scale)

          // Create animation mixer and play all animations
          const mixer = new AnimationMixer(model)
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip)
            action.setLoop(LoopRepeat, Infinity)
            action.clampWhenFinished = true
            action.play()
          })

          resolve({ model, mixer })
        } catch (err) {
          reject(err)
        }
      },
      undefined,
      (err) => reject(err)
    )
  })
}

// Applies the current display mode (2D video vs 3D diagram) to every anchor
// setup. Exactly one thing is visible for the active target.
function applyDisplay(setups, activeIndex, mode) {
  for (let i = 0; i < setups.length; i += 1) {
    const setup = setups[i]
    const isActive = i === activeIndex
    const useModel = isActive && mode === '3d' && setup.modelGroup != null

    setup.cssObj.visible = isActive && !useModel
    if (setup.modelGroup) setup.modelGroup.visible = useModel

    if (isActive && setup.media) {
      if (useModel) setup.media.pause()
      else setup.media.play()
    }
  }
}

// Traverses a mounted GLB scene and releases its GPU resources.
function disposeGlbModel(root) {
  if (!root) return
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      materials.forEach((mat) => {
        Object.values(mat).forEach((value) => {
          if (value && typeof value.dispose === 'function') value.dispose()
        })
        mat.dispose()
      })
    }
  })
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
// environments (web localhost vs Capacitor capacitor://localhost vs prod HTTPS).
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
 * We strip the origin and query-string and sort so the key is identical on both
 * web (http://localhost:5173) and Android (capacitor://localhost).
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
  // Ref used by the per-frame arbiter. Exactly one experience may be active at a
  // time. This prevents multiple videos from stacking when target images share
  // common elements and MindAR briefly tracks several candidates at once.
  const arbiterRef = useRef({ activeIndex: -1 })
  // Anchor setups are captured by the init effect; keep them in a ref so the
  // display-mode effect can re-apply visibility when the user toggles 2D/3D.
  const anchorSetupsRef = useRef([])
  // Mirror of `mode` state for use inside the non-React animation loop.
  const modeRef = useRef('2d')

  const [config, setConfig] = useState(null)
  const [activeExperience, setActiveExperience] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadingText, setLoadingText] = useState('Loading experience...')
  const [compileProgress, setCompileProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [tracked, setTracked] = useState(false)
  // Display mode for the active experience: '2d' shows the anchored video,
  // '3d' swaps in the GLB model when the experience configures one.
  const [mode, setMode] = useState('2d')

  // Keep the mode ref in sync so the animation loop arbiter reads fresh values.
  useEffect(() => {
    modeRef.current = mode
    const setups = anchorSetupsRef.current
    if (!setups.length) return
    // Re-apply visibility/playback without changing which target is active.
    applyDisplay(setups, arbiterRef.current.activeIndex, mode)
  }, [mode])

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

          // Build a stable key that is identical across web + Capacitor environments
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
          // Track at most one target at a time so overlapping detections from
          // images that share common elements can never play multiple videos.
          maxTrack: 1,
          // Require a target to be tracked steadily across several frames before
          // it is shown. Partial/spurious matches (shared elements) flicker and
          // drop out, while the real, persistent match surfaces as the winner.
          warmupTolerance: 8,
          missTolerance: 5,
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no',
        })

        const { renderer, scene, camera, cssRenderer } = mindarRef.current

        // Keep CSS3D layer non-interactive — tap handling is done via the React
        // DOM overlay (tapOverlay) which lives outside the transformed 3D tree.
        // This is the only approach that works reliably on Android WebViews.
        cssRenderer.domElement.style.pointerEvents = 'none'

        // GLB diagrams use MeshStandardMaterial, which needs light sources, or
        // it renders black. MindAR's scene starts dark, so add lights here.
        // Render in sRGB so glTF linear-space base colors come out correct.
        renderer.outputEncoding = 3001 // THREE.sRGBEncoding
        const hemiLight = new HemisphereLight(0xffffff, 0x404040, 1.1)
        const dirLight = new DirectionalLight(0xffffff, 1.6)
        dirLight.position.set(4, 8, 6)
        scene.add(hemiLight, dirLight)

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

          // Load the interactive 3D diagram if the experience configures one.
          // The normalized model lives inside this wrapper group, which is
          // placed in world space (scene root) each frame so the card's rotation
          // cannot tilt it — see updateModelTransforms. Using position/scale on
          // the wrapper keeps the model's own node-scale normalization intact.
          let modelGroup = null
          let modelMixer = null
          let modelCustomRotation = null
          let modelCustomPosition = null
          if (experience.glbModelUrl) {
            try {
              const { model, mixer } = await loadGlbModel(experience.glbModelUrl)
              if (cancelled) {
                disposeGlbModel(model)
                mindarRef.current.stop()
                return
              }
              modelGroup = new Group()
              modelGroup.add(model)
              modelGroup.visible = false
              scene.add(modelGroup)
              modelMixer = mixer

              // Apply custom position and rotation from config (degrees -> radians)
              const pos = experience.modelPosition || { x: 0, y: 0, z: 0 }
              const rot = experience.modelRotation || { x: 0, y: 0, z: 0 }
              modelCustomRotation = new Euler(
                MathUtils.degToRad(rot.x),
                MathUtils.degToRad(rot.y),
                MathUtils.degToRad(rot.z)
              )
              modelCustomPosition = new Vector3(pos.x, pos.y, pos.z)
              modelGroup.position.copy(modelCustomPosition)
              modelGroup.rotation.copy(modelCustomRotation)
            } catch (err) {
              console.warn('GLB model failed to load', experience.glbModelUrl, err)
              modelGroup = null
            }
          }

          const setup = {
            experience,
            wrapper,
            cssObj,
            media,
            mediaPromise: null,
            modelGroup,
            modelMixer,
            modelCustomRotation,
            modelCustomPosition,
            anchor,
          }
          anchorSetups.push(setup)

          // Visibility and playback are decided by the per-frame arbiter in the
          // animation loop, not by these events. The events are only used to
          // kick off media preparation so the arbiter never has to block.
          anchor.onTargetFound = () => {
            if (cancelled) return
            ensureMedia(setup).catch((err) => {
              console.warn('Media failed to load for target', setup.experience.targetImageUrl, err)
            })
          }
          anchor.onTargetLost = () => {
            // No-op: the arbiter owns active state, so a "lost" event for one
            // target can't wrongly clear another target that is still showing.
          }
        }

        await mindarRef.current.start()
        if (cancelled) { mindarRef.current.stop(); return }

        // Expose the built setups to the mode-toggle effect and cleanup.
        anchorSetupsRef.current = anchorSetups

        setStatus('ready')

        // Preload all media after the camera is running.
        anchorSetups.forEach((setup) => {
          ensureMedia(setup).catch(() => {})
        })

        // ------------------------------------------------------------------
        // Single-active-target arbiter. Runs every frame from MindAR's live
        // tracking state and guarantees at most ONE video is visible/playing,
        // even during the brief window where shared elements make MindAR report
        // several candidates as "showing" at once.
        // ------------------------------------------------------------------
        const runArbitration = () => {
          const controller = mindarRef.current?.controller
          if (!controller || !Array.isArray(controller.trackingStates)) return
          const states = controller.trackingStates
          if (states.length !== anchorSetups.length) return

          const showing = []
          for (let i = 0; i < states.length; i += 1) {
            if (states[i].showing) showing.push(i)
          }

          if (showing.length === 0) {
            if (arbiterRef.current.activeIndex !== -1) {
              arbiterRef.current.activeIndex = -1
              activeMediaRef.current = null
              setActiveExperience(null)
              setTracked(false)
            }
            anchorSetups.forEach((setup) => {
              if (setup.cssObj.visible) setup.cssObj.visible = false
              if (setup.modelGroup?.visible) setup.modelGroup.visible = false
              setup.media?.pause()
            })
            return
          }

          // Prefer the most stable candidate: the one that has been tracked for
          // the most consecutive frames is the real match, while partial matches
          // from shared elements tend to flicker and have lower counts.
          let activeIndex = showing[0]
          let bestCount = states[showing[0]].trackCount
          for (let k = 1; k < showing.length; k += 1) {
            const i = showing[k]
            if (states[i].trackCount > bestCount) {
              bestCount = states[i].trackCount
              activeIndex = i
            }
          }

          if (arbiterRef.current.activeIndex !== activeIndex) {
            const prev = arbiterRef.current.activeIndex
            if (prev !== -1 && prev !== activeIndex) {
              const prevSetup = anchorSetups[prev]
              prevSetup.cssObj.visible = false
              prevSetup.media?.pause()
            }

            arbiterRef.current.activeIndex = activeIndex
            applyDisplay(anchorSetups, activeIndex, modeRef.current)

            const setup = anchorSetups[activeIndex]
            activeMediaRef.current = setup.media ?? null
            setActiveExperience(setup.experience)
            setTracked(true)

            // Lazy media (only when eager creation was skipped) needs async
            // creation before it can start; applyDisplay drives playback.
            if (!setup.media) {
              ensureMedia(setup)
                .then((media) => {
                  if (!cancelled && arbiterRef.current.activeIndex === activeIndex) {
                    activeMediaRef.current = media
                    applyDisplay(anchorSetups, arbiterRef.current.activeIndex, modeRef.current)
                  }
                })
                .catch(() => {})
            }
          }
        }

        // Keeps every 3D diagram standing upright regardless of how the card is
        // held. Each frame it re-positions each model at its marker's world spot
        // but applies the custom rotation from config. The model itself keeps its
        // own normalized node transform inside the wrapper group.
        const modelPos = new Vector3()
        const modelScaleAxis = new Vector3()
        const updateModelTransforms = () => {
          for (let i = 0; i < anchorSetups.length; i += 1) {
            const setup = anchorSetups[i]
            if (!setup.modelGroup) continue
            const anchorMatrix = setup.anchor.group.matrix
            modelPos.setFromMatrixPosition(anchorMatrix)
            modelScaleAxis.setFromMatrixScale(anchorMatrix)

            // Apply marker world position + custom offset
            if (setup.modelCustomPosition) {
              setup.modelGroup.position.copy(modelPos).add(setup.modelCustomPosition)
            } else {
              setup.modelGroup.position.copy(modelPos)
            }
            setup.modelGroup.scale.setScalar(modelScaleAxis.x)

            // Apply custom rotation from config (instead of identity)
            if (setup.modelCustomRotation) {
              setup.modelGroup.rotation.copy(setup.modelCustomRotation)
            } else {
              setup.modelGroup.rotation.set(0, 0, 0)
            }
          }
        }

        let prevTime = 0
        renderer.setAnimationLoop((time) => {
          const delta = (time - prevTime) / 1000
          prevTime = time

          runArbitration()
          updateModelTransforms()

          // Update animation mixers
          for (let i = 0; i < anchorSetups.length; i += 1) {
            const setup = anchorSetups[i]
            if (setup.modelMixer) {
              setup.modelMixer.update(delta)
            }
          }

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
      arbiterRef.current.activeIndex = -1
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
      mediaPlayersRef.current.forEach((media) => media.destroy())
      mediaPlayersRef.current = []
      anchorSetupsRef.current.forEach((setup) => {
        if (setup.modelGroup) {
          try {
            setup.modelGroup.parent?.remove(setup.modelGroup)
            disposeGlbModel(setup.modelGroup)
          } catch (_) {}
        }
        if (setup.modelMixer) {
          try {
            setup.modelMixer.uncacheRoot(setup.modelMixer.getRoot())
            setup.modelMixer.stopAllAction()
          } catch (_) {}
        }
      })
      anchorSetupsRef.current = []
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

      {/* Full-screen tap overlay — only active when a target is being tracked
          and a video is actually on screen (hidden while showing the 3D model).
          Lives in the normal 2D DOM so touch events work on every platform. */}
      {status === 'ready' && tracked && !(mode === '3d' && activeExperience?.glbModelUrl) && (
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
        <header className={styles.topBar}>
          <span className={styles.topLogo}>STEM AR</span>
          <div className={`${styles.trackBadge} ${tracked ? styles.trackBadgeActive : ''}`}>
            <span className={styles.trackDot} />
            <span>{tracked ? 'Target Locked' : 'Searching Target'}</span>
          </div>
        </header>
      )}

      {status === 'ready' && activeExperience && (
        <ARCard config={activeExperience} visible={tracked} mode={mode} onToggleMode={setMode} />
      )}
    </div>
  )
}
