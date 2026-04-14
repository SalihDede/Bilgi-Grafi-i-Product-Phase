import { useState } from 'react'
import { createPortal } from 'react-dom'
import KGGraph from './visualization/KGGraph'

function useStats(triplets = []) {
  const tripleCount   = triplets.length
  const entityCount   = new Set(triplets.flatMap(t => [t.baş, t.uç].filter(Boolean))).size
  const relationCount = new Set(triplets.map(t => t.ilişki).filter(Boolean)).size
  return { tripleCount, entityCount, relationCount }
}

function ExpandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 4.5V1H4.5M7.5 1H11V4.5M11 7.5V11H7.5M4.5 11H1V7.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}


export default function ResultCard({ model, text, kgLabel, promptLabel, status, triplets, highlight, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { tripleCount, entityCount, relationCount } = useStats(status === 'done' ? triplets : [])

  return (
    <div className="result-card">
      <div className="result-card-header">
        <span className="result-card-model">{model}</span>
        <button className="result-card-delete" onClick={onDelete} aria-label="Kartı sil">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <p className="result-card-text">{text}</p>

      <div className="result-chips">
        <span className="result-chip">
          <span className="result-chip-dot" />
          {kgLabel}
        </span>
        <span className="result-chip">
          <span className="result-chip-dot result-chip-dot--prompt" />
          {promptLabel}
        </span>

        {status === 'done' && (
          <div className="result-card-stats">
            <div className="result-card-stat">
              <span className="result-card-stat-value">{tripleCount}</span>
              <span className="result-card-stat-label">Triple</span>
            </div>
            <span className="result-card-stat-sep" />
            <div className="result-card-stat">
              <span className="result-card-stat-value">{entityCount}</span>
              <span className="result-card-stat-label">Benzersiz Varlık</span>
            </div>
            <span className="result-card-stat-sep" />
            <div className="result-card-stat">
              <span className="result-card-stat-value">{relationCount}</span>
              <span className="result-card-stat-label">Benzersiz İlişki</span>
            </div>
          </div>
        )}
      </div>

      <div className="result-card-body">
        {status === 'loading' && (
          <div className="result-card-state">
            <div className="result-card-loading">
              <span /><span /><span />
            </div>
            <p className="result-card-hint">Tripletler çıkarılıyor…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="result-card-state">
            <p className="result-card-hint result-card-hint--error">LLM isteği başarısız.</p>
          </div>
        )}

        {status === 'done' && (
          <>
            <button
              className="result-card-expand"
              onClick={() => setExpanded(true)}
              aria-label="Grafı büyüt"
            >
              <ExpandIcon />
            </button>
            <KGGraph triplets={triplets ?? []} highlight={highlight ?? []} />
          </>
        )}
      </div>

      {expanded && createPortal(
        <div className="kg-modal-overlay" onClick={() => setExpanded(false)}>
          <div className="kg-modal" onClick={e => e.stopPropagation()}>
            <div className="kg-modal-header">
              <span className="kg-modal-title">{model}</span>
              <div className="kg-modal-chips">
                <span className="result-chip">
                  <span className="result-chip-dot" />{kgLabel}
                </span>
                <span className="result-chip">
                  <span className="result-chip-dot result-chip-dot--prompt" />{promptLabel}
                </span>
              </div>
              <button
                className="kg-modal-close"
                onClick={() => setExpanded(false)}
                aria-label="Kapat"
              >
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="kg-modal-body">
              <KGGraph triplets={triplets ?? []} highlight={highlight ?? []} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
