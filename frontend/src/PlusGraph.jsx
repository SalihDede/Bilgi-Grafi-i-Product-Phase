import { useEffect, useRef } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCollide } from 'd3-force'

const NODES_DEF = [
  // level 0 — merkez
  { id: 'center',   level: 0 },
  // level 1 — ana dallar
  { id: 'kg',       level: 1, label: 'KG Çıkarım Tekniği' },
  { id: 'prompt',   level: 1, label: 'Prompt Optimizasyon Tekniği' },
  // level 2 — KG altı
  { id: 'kggen',    level: 2, parent: 'kg',     label: 'KG-GEN' },
  { id: 'wicontic', level: 2, parent: 'kg',     label: 'Wicontic' },
  { id: 'wikipedia',level: 2, parent: 'kg',     label: 'Wikipedia' },
  // level 2 — Prompt altı
  { id: 'temel',    level: 2, parent: 'prompt', label: 'Temel Prompt' },
  { id: 'dspy',     level: 2, parent: 'prompt', label: 'DSPy' },
  { id: 'textgrad', level: 2, parent: 'prompt', label: 'TextGrad' },
]

const LINKS_DEF = [
  { source: 'center',  target: 'kg' },
  { source: 'center',  target: 'prompt' },
  { source: 'kg',      target: 'kggen' },
  { source: 'kg',      target: 'wicontic' },
  { source: 'kg',      target: 'wikipedia' },
  { source: 'prompt',  target: 'temel' },
  { source: 'prompt',  target: 'dspy' },
  { source: 'prompt',  target: 'textgrad' },
]

const R = { 0: 56, 1: 36, 2: 20 }

export default function PlusGraph({ expanded, onToggle, onSend }) {
  const anchorRef    = useRef(null)
  const canvasRef    = useRef(null)
  const simRef       = useRef(null)
  const nodesRef     = useRef(null)
  const expandedRef  = useRef(expanded)
  const toggleRef    = useRef(onToggle)
  const sendRef      = useRef(onSend)
  // Her parent kategorisi için seçili node id'si: { kg: null, prompt: null }
  const selectionRef = useRef({ kg: null, prompt: null })

  useEffect(() => { expandedRef.current = expanded }, [expanded])
  useEffect(() => { toggleRef.current   = onToggle  }, [onToggle])
  useEffect(() => { sendRef.current     = onSend    }, [onSend])

  useEffect(() => {
    const canvas = canvasRef.current
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    const rect = anchorRef.current.getBoundingClientRect()
    const CX = rect.left + rect.width  / 2
    const CY = rect.top  + rect.height / 2

    const nodes = NODES_DEF.map(n => ({
      ...n, x: CX + (Math.random() - 0.5) * 2, y: CY + (Math.random() - 0.5) * 2,
    }))
    nodes[0].fx = CX
    nodes[0].fy = CY

    nodes.filter(n => n.level > 0).forEach(n => { n.fx = CX; n.fy = CY })

    const links = LINKS_DEF.map(l => ({ ...l }))
    nodesRef.current = nodes

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id(d => d.id)
        .distance(l => {
          const s = typeof l.source === 'object' ? l.source : nodes.find(n => n.id === l.source)
          return s?.level === 0 ? 185 : 100
        })
        .strength(0.55))
      .force('charge',  forceManyBody().strength(-80))
      .force('collide', forceCollide(d => R[d.level] + 12))
      .force('drift', () => {
        nodes.filter(n => n.level > 0).forEach(n => {
          if (n.fx !== undefined && n.fx !== null) return
          n.vx += (Math.random() - 0.5) * 0.04
          n.vy += (Math.random() - 0.5) * 0.04
          if (n.x < 60)      n.vx += 0.4
          if (n.x > W - 60)  n.vx -= 0.4
          if (n.y < 40)      n.vy += 0.4
          if (n.y > H - 40)  n.vy -= 0.4
        })
      })
      .alphaDecay(0)
      .velocityDecay(0.72)
      .on('tick', render)

    simRef.current = sim

    function drawCheckmark(x, y, r) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x - r * 0.38, y + r * 0.02)
      ctx.lineTo(x - r * 0.08, y + r * 0.36)
      ctx.lineTo(x + r * 0.42, y - r * 0.28)
      ctx.strokeStyle = '#1B44D8'
      ctx.lineWidth   = 2.2
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.stroke()
      ctx.restore()
    }

    // SVG send ikonu (M2 14 L14 2 M14 2 H5 M14 2 V11) — 16x16 viewBox'ı merkeze hizalanmış
    function drawSendArrow(cx, cy) {
      const s = 2.6
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx + (2  - 8) * s, cy + (14 - 8) * s)
      ctx.lineTo(cx + (14 - 8) * s, cy + (2  - 8) * s)
      ctx.moveTo(cx + (14 - 8) * s, cy + (2  - 8) * s)
      ctx.lineTo(cx + (5  - 8) * s, cy + (2  - 8) * s)
      ctx.moveTo(cx + (14 - 8) * s, cy + (2  - 8) * s)
      ctx.lineTo(cx + (14 - 8) * s, cy + (11 - 8) * s)
      ctx.strokeStyle = '#E8E5DF'
      ctx.lineWidth   = 2.4
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.stroke()
      ctx.restore()
    }

    function render() {
      ctx.clearRect(0, 0, W, H)
      const exp = expandedRef.current
      const sel = selectionRef.current

      // ── 1. Tüm edge'ler (en arkada) ──
      if (exp) {
        links.forEach(({ source: s, target: t }) => {
          if (typeof s !== 'object' || typeof t !== 'object') return
          const isMain = s.level === 0
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(t.x, t.y)
          ctx.strokeStyle = isMain
            ? 'rgba(27, 68, 216, 0.28)'
            : 'rgba(27, 68, 216, 0.18)'
          ctx.lineWidth = isMain ? 2.2 : 1.5
          ctx.stroke()
        })
      }

      // ── 2. Level-2 node'lar ──
      if (exp) {
        nodes.filter(n => n.level === 2).forEach(n => {
          const isSelected = sel[n.parent] === n.id

          ctx.beginPath()
          ctx.arc(n.x, n.y, R[2], 0, Math.PI * 2)
          ctx.fillStyle = '#E8E5DF'
          ctx.fill()
          ctx.fillStyle = 'rgba(136, 136, 136, 0.38)'
          ctx.fill()

          if (isSelected) {
            ctx.strokeStyle = '#1B44D8'
            ctx.lineWidth   = 2.8
          } else {
            ctx.strokeStyle = 'rgba(27, 68, 216, 0.22)'
            ctx.lineWidth   = 1.2
          }
          ctx.stroke()

          if (isSelected) drawCheckmark(n.x, n.y, R[2])

          ctx.font      = '10px Inter, sans-serif'
          ctx.fillStyle = isSelected ? '#1B44D8' : 'rgba(17, 17, 17, 0.58)'
          ctx.textAlign = 'center'
          ctx.fillText(n.label, n.x, n.y + R[2] + 13)
        })
      }

      // ── 3. Level-1 node'lar ──
      if (exp) {
        nodes.filter(n => n.level === 1).forEach(n => {
          ctx.beginPath()
          ctx.arc(n.x, n.y, R[1], 0, Math.PI * 2)
          ctx.fillStyle = '#E8E5DF'
          ctx.fill()
          ctx.fillStyle   = 'rgba(136, 136, 136, 0.45)'
          ctx.fill()
          ctx.strokeStyle = 'rgba(27, 68, 216, 0.32)'
          ctx.lineWidth   = 1.5
          ctx.stroke()
          ctx.font      = '11px Inter, sans-serif'
          ctx.fillStyle = 'rgba(17, 17, 17, 0.62)'
          ctx.textAlign = 'center'
          ctx.fillText(n.label, n.x, n.y + R[1] + 14)
        })
      }

      // ── 4. Merkez node (en önde) ──
      const c = nodes[0]
      const bothSelected = !!(sel.kg && sel.prompt)

      if (bothSelected) {
        // Nefes animasyonu: sin dalgası → -1..1
        const pulse = Math.sin(Date.now() * 0.0028)
        const r     = R[0] * (1 + pulse * 0.10)

        // Dış parıltı halkası
        ctx.beginPath()
        ctx.arc(c.x, c.y, r + 18, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(27, 68, 216, ${(0.07 + pulse * 0.06).toFixed(3)})`
        ctx.fill()

        // Node gövdesi
        ctx.beginPath()
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
        ctx.fillStyle = '#E8E5DF'
        ctx.fill()
        ctx.fillStyle = `rgba(27, 68, 216, ${(0.82 + pulse * 0.08).toFixed(3)})`
        ctx.fill()

        drawSendArrow(c.x, c.y)

        // Üstteki etiket — aynı nefes ritmiyle solar/parlar
        const labelAlpha = (0.45 + pulse * 0.42).toFixed(3)
        ctx.font         = '500 11px Inter, sans-serif'
        ctx.fillStyle    = `rgba(27, 68, 216, ${labelAlpha})`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText('tıklayarak grafı oluştur', c.x, c.y - r - 14)
      } else {
        ctx.beginPath()
        ctx.arc(c.x, c.y, R[0], 0, Math.PI * 2)
        ctx.fillStyle = '#E8E5DF'
        ctx.fill()
        ctx.fillStyle = 'rgba(27, 68, 216, 0.65)'
        ctx.fill()
        ctx.font         = '300 58px Inter, sans-serif'
        ctx.fillStyle    = '#E8E5DF'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(exp ? '−' : '+', c.x, c.y + 3)
        ctx.textBaseline = 'alphabetic'
      }
    }

    function hitLevel2(x, y) {
      if (!expandedRef.current) return null
      return nodes.find(
        n => n.level === 2 && Math.hypot(x - n.x, y - n.y) <= R[2]
      ) || null
    }

    function onWindowClick(e) {
      const c = nodes[0]
      if (Math.hypot(e.clientX - c.x, e.clientY - c.y) <= R[0]) {
        const sel = selectionRef.current
        if (sel.kg && sel.prompt) {
          const kgNode     = nodes.find(n => n.id === sel.kg)
          const promptNode = nodes.find(n => n.id === sel.prompt)
          sendRef.current?.({
            kg:          sel.kg,
            kgLabel:     kgNode?.label     || sel.kg,
            prompt:      sel.prompt,
            promptLabel: promptNode?.label || sel.prompt,
          })
        } else {
          toggleRef.current()
        }
        return
      }
      const hit = hitLevel2(e.clientX, e.clientY)
      if (hit) {
        const sel = selectionRef.current
        sel[hit.parent] = sel[hit.parent] === hit.id ? null : hit.id
      }
    }

    function onWindowMove(e) {
      const c = nodes[0]
      const overCenter = Math.hypot(e.clientX - c.x, e.clientY - c.y) <= R[0]
      const overLeaf   = !!hitLevel2(e.clientX, e.clientY)
      document.body.style.cursor = (overCenter || overLeaf) ? 'pointer' : ''
    }

    function onResize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('click',     onWindowClick)
    window.addEventListener('mousemove', onWindowMove)
    window.addEventListener('resize',    onResize)

    return () => {
      sim.stop()
      document.body.style.cursor = ''
      window.removeEventListener('click',     onWindowClick)
      window.removeEventListener('mousemove', onWindowMove)
      window.removeEventListener('resize',    onResize)
    }
  }, [])

  useEffect(() => {
    const nodes = nodesRef.current
    const sim   = simRef.current
    if (!nodes || !sim) return
    const center = nodes[0]

    nodes.filter(n => n.level > 0).forEach(n => {
      if (expanded) {
        n.fx = null; n.fy = null
      } else {
        n.fx = center.fx; n.fy = center.fy
      }
    })
    sim.alpha(0.9).restart()
  }, [expanded])

  return (
    <>
      <div ref={anchorRef} style={{ width: '100%', height: '100%' }} />
      <canvas ref={canvasRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 10,
      }} />
    </>
  )
}
