export default function ResultCard({ model, text, kgLabel, promptLabel, onDelete }) {
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
      </div>

      <div className="result-card-body">
        <div className="result-card-loading">
          <span /><span /><span />
        </div>
        <p className="result-card-hint">Graf oluşturuluyor…</p>
      </div>
    </div>
  )
}
