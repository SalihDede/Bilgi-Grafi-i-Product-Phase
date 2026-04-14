import { useState, useEffect } from 'react'
import './App.css'
import GraphCanvas from './GraphCanvas'
import PlusGraph   from './PlusGraph'
import ResultCard  from './ResultCard'

const GROUPS = [
  {
    id: 'veri',
    cx: 0.1, cy: 0.28,
    nodes: [
      { id: 'Wikipedia',    type: 'step' },
      { id: 'Wikidata',     type: 'step' },
      { id: 'Akademik',     type: 'step' },
      { id: 'Veri Toplama', type: 'step' },
    ],
    links: [
      { source: 'Wikipedia',    target: 'Veri Toplama' },
      { source: 'Wikidata',     target: 'Veri Toplama' },
      { source: 'Akademik',     target: 'Veri Toplama' },
    ],
  },
  {
    id: 'llm',
    cx: 0.9, cy: 0.22,
    nodes: [
      { id: 'LLM',            type: 'step' },
      { id: 'Triple Çıkarım', type: 'step' },
      { id: 'APE / DSPy',     type: 'step' },
    ],
    links: [
      { source: 'APE / DSPy', target: 'LLM' },
      { source: 'LLM',        target: 'Triple Çıkarım' },
    ],
  },
  {
    id: 'dogrulama',
    cx: 0.1, cy: 0.75,
    nodes: [
      { id: 'Wikontic',              type: 'step' },
      { id: 'Ontoloji Doğrulama',    type: 'step' },
      { id: 'Maliyet Optimizasyonu', type: 'step' },
    ],
    links: [
      { source: 'Wikontic',           target: 'Ontoloji Doğrulama' },
      { source: 'Ontoloji Doğrulama', target: 'Maliyet Optimizasyonu' },
    ],
  },
  {
    id: 'sonuc',
    cx: 0.9, cy: 0.78,
    nodes: [
      { id: 'Varlık Tekilleştirme', type: 'step' },
      { id: 'Bilgi Grafı',          type: 'person' },
      { id: '22M+ Triple',          type: 'person' },
    ],
    links: [
      { source: 'Varlık Tekilleştirme', target: 'Bilgi Grafı' },
      { source: 'Bilgi Grafı',          target: '22M+ Triple' },
    ],
  },
]

const MAX = 300

function App() {
  const [text, setText]           = useState('')
  const [models, setModels]       = useState([])
  const [model, setModel]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [cards, setCards]         = useState([])

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        setModels(data)
        if (data.length > 0) setModel(data[0].id)
      })
  }, [])

  const isActive = text.length > 0

  function handleSend() {
    if (!text.trim()) return
    setSubmitted(true)
  }

  async function handleGraphSend(sel) {
    if (cards.length >= 3) return
    const cardId = Date.now()

    setCards(prev => [...prev, {
      id:             cardId,
      model,
      text,
      kgLabel:        sel.kgLabel,
      promptLabel:    sel.promptLabel,
      embeddingLabel: sel.embeddingLabel || null,
      status:         'loading',
      triplets:       [],
      highlight:      [],
    }])
    setExpanded(false)

    try {
      const res = await fetch('/api/extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          text,
          model,
          prompt_type:     sel.prompt,
          kg_type:         sel.kg,
          embedding_model: sel.embedding || 'contriever',
        }),
      })
      if (!res.ok) throw new Error(res.statusText)
      const data = await res.json()
      setCards(prev => prev.map(c => c.id === cardId
        ? { ...c, status: 'done', triplets: data.triplets, highlight: data.highlight ?? [] }
        : c
      ))
    } catch {
      setCards(prev => prev.map(c => c.id === cardId
        ? { ...c, status: 'error' }
        : c
      ))
    }
  }

  return (
    <>
      <GraphCanvas groups={GROUPS} hidden={isActive} />

      <main className={`page ${submitted ? 'submitted' : ''}`}>
        <div className={`container ${submitted ? 'submitted' : ''}`}>
          <h1 className="title">Bilgi Grafiği Üretimi</h1>

          <p className={`subtitle ${isActive ? 'hidden' : ''}`}>
            MEF Üniversitesi Bilgisayar Mühendisliği Bitirme Projesi — Düzensiz
            metinden farklı tekniklerle standart bilgi grafiği üçlüsü çıkarımı
          </p>

          <div className={`input-wrapper ${submitted ? 'submitted' : ''}`}>
            <div className="input-header">
              <span className="model-label">Model Seç</span>
              <select
                className="model-select"
                value={model}
                onChange={e => setModel(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="textarea-wrapper">
              <textarea
                className="text-input"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                placeholder="Ey Türk gençliği! Birinci vazifen; Türk istiklalini, Türk cumhuriyetini, ilelebet muhafaza ve müdafaa etmektir."
                rows={6}
              />
              <button className="send-btn" disabled={!text.trim()} onClick={handleSend}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 14L14 2M14 2H5M14 2V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <span className={`char-count ${text.length === MAX ? 'limit' : ''}`}>
              {text.length} / {MAX}
            </span>
          </div>
        </div>

        {submitted && (
          <div className="results-row">
            {cards.map(card => (
              <ResultCard
                key={card.id}
                {...card}
                onDelete={() => setCards(prev => prev.filter(c => c.id !== card.id))}
              />
            ))}
            {cards.length < 3 && (
              <div className="plus-slot">
                <PlusGraph
                  key={cards.length}
                  expanded={expanded}
                  onToggle={() => setExpanded(e => !e)}
                  onSend={handleGraphSend}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}

export default App
