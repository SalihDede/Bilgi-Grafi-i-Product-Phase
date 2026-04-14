import { useEffect, useState } from 'react'
import './KGGraph.css'

/**
 * Bilgi grafı bileşeni.
 * Backend /api/visualize endpoint'ine tripletleri gönderir,
 * dönen Pyvis HTML'ini iframe içinde render eder.
 *
 * Props
 * -----
 * triplets  : [[subject, relation, object], ...]
 * highlight : vurgulanacak düğüm adları []
 */
export default function KGGraph({ triplets = [], highlight = [] }) {
  const [html, setHtml]       = useState('')
  const [status, setStatus]   = useState('idle') // idle | loading | ready | error | empty

  useEffect(() => {
    if (!triplets.length) {
      setStatus('empty')
      return
    }

    setStatus('loading')

    fetch('/api/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triplets, highlight }),
    })
      .then(r => {
        if (!r.ok) throw new Error(r.statusText)
        return r.text()
      })
      .then(h => { setHtml(h); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [triplets, highlight])

  if (status === 'loading') {
    return (
      <div className="kg-wrapper">
        <div className="kg-state">
          <div className="kg-loading">
            <span /><span /><span />
          </div>
          <p className="kg-hint">Graf oluşturuluyor…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="kg-wrapper">
        <div className="kg-state">
          <p className="kg-hint kg-hint--error">Graf yüklenemedi.</p>
        </div>
      </div>
    )
  }

  if (status === 'empty' || !html) {
    return (
      <div className="kg-wrapper">
        <div className="kg-state">
          <p className="kg-hint">Triplet bekleniyor…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kg-wrapper">
      <iframe
        className="kg-frame"
        srcDoc={html}
        title="Bilgi Grafı"
        sandbox="allow-scripts"
      />
    </div>
  )
}
