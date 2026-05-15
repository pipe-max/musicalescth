import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ESTUDIANTES } from './estudiantes.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Supabase ────────────────────────────────────────────────────────────────
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'EXISTE' : 'UNDEFINED')
console.log('Todas las env vars:', import.meta.env)

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─── Constantes ──────────────────────────────────────────────────────────────
const SECCIONES = Object.keys(ESTUDIANTES).sort()
const PIN_DEFAULT = import.meta.env.VITE_DIRECTOR_PIN || 'musical80'
const TOTAL_ESTUDIANTES = Object.values(ESTUDIANTES).reduce((acc, arr) => acc + arr.length, 0)

const shortName = (sec) =>
  `${sec.split(' - ')[0]} ${sec.endsWith('Alef') ? 'Alef' : 'Bet'}`

// Mapeo de grado (nombre antes del " - ") a nivel
const NIVEL_MAP = {
  'K3': 'Preescolar', 'K4': 'Preescolar', 'K5': 'Preescolar', 'Primero': 'Preescolar',
  'Segundo': 'Primaria', 'Tercero': 'Primaria', 'Cuarto': 'Primaria', 'Quinto': 'Primaria', 'Sexto': 'Primaria',
  'Séptimo': 'Bachillerato', 'Octavo': 'Bachillerato', 'Noveno': 'Bachillerato',
  'Décimo': 'Bachillerato', 'Once': 'Bachillerato', 'Doce': 'Bachillerato',
}
const NIVELES = ['Preescolar', 'Primaria', 'Bachillerato']

// Lista de grados únicos (sin Alef/Bet) ordenados
const GRADOS_ORDEN = ['K3','K4','K5','Primero','Segundo','Tercero','Cuarto','Quinto','Sexto','Séptimo','Octavo','Noveno','Décimo','Once','Doce']
const GRADOS_POR_NIVEL = (nivel) => GRADOS_ORDEN.filter(g => NIVEL_MAP[g] === nivel)

// Obtener grados (secciones reales) filtrados por nivel, con nombre legible
const SECCIONES_POR_NIVEL = (nivel) =>
  SECCIONES
    .filter(s => NIVEL_MAP[s.split(' - ')[0]] === nivel)
    .sort((a, b) => {
      const ia = GRADOS_ORDEN.indexOf(a.split(' - ')[0])
      const ib = GRADOS_ORDEN.indexOf(b.split(' - ')[0])
      return ia !== ib ? ia - ib : a.localeCompare(b)
    })

// Nombre legible de sección: "K3 Alef", "Cuarto Bet", etc.
const nombreSeccion = (sec) => {
  const grado = sec.split(' - ')[0]
  const div = sec.endsWith('Alef') ? 'Alef' : 'Bet'
  return `${grado} ${div}`
}

// Obtener la sección real de un estudiante dado grado y nombre
const seccionDeEstudiante = (grado, nombre) => {
  return SECCIONES.find(s => s.startsWith(grado + ' - ') && (ESTUDIANTES[s] || []).includes(nombre)) || grado
}

const emptyAuth = () => ({ nombre: '', cedula: '', placa: '', parentesco: '', celular: '' })
const emptyRecoge = () => ({ tipo: '', auth: emptyAuth() })

// ─── Colores ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#f0f4f9', card: '#ffffff', cardB: '#d0dce8',
  blue: '#1d6eed', blueL: '#1a5abf',
  text: '#1a2a3a', muted: '#5a7a9a',
  green: '#10b981', red: '#f43f5e', yellow: '#f59e0b',
}

// ─── Estilos utilitarios ──────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", padding: '0 0 60px' },
  header: { background: '#ffffff', borderBottom: `1px solid #d0dff0`, padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoText: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 1, color: '#1d3a6e', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#4a6a9a', marginTop: 2, textAlign: 'center' },
  container: { maxWidth: 720, margin: '0 auto', padding: '28px 16px' },
  card: { background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: '24px 22px', marginBottom: 20 },
  label: { fontSize: 13, color: C.muted, marginBottom: 6, display: 'block', fontWeight: 500 },
  input: { width: '100%', background: '#f5f8fc', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none' },
  select: { width: '100%', background: '#f5f8fc', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 16, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', cursor: 'pointer' },
  btn: (color = C.blue) => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }),
  btnSm: (color = C.blue) => ({ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }),
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  tag: (color) => ({ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }),
  sectionTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: C.blueL, marginBottom: 16, letterSpacing: 0.5 },
}

// ─── Componente Campo ─────────────────────────────────────────────────────────
function Campo({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>
      <input
        type={type}
        style={S.input}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        required={required}
      />
    </div>
  )
}

// ─── Sección de "¿Quién recoge?" ──────────────────────────────────────────────
function RecogeCard({ dia, value, onChange }) {
  return (
    <div style={{ ...S.card, marginBottom: 0 }}>
      <div style={S.sectionTitle}>{dia}</div>
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>¿Quién recoge? <span style={{ color: C.red }}>*</span></label>
        <select
          style={S.select}
          value={value.tipo}
          onChange={e => onChange({ ...value, tipo: e.target.value, auth: emptyAuth() })}
          required
        >
          <option value="">— Selecciona —</option>
          <option value="padres">Padres</option>
          <option value="autorizado">Persona autorizada</option>
          <option value="propios">Sale por sus propios medios</option>
        </select>
      </div>

      {value.tipo === 'autorizado' && (
        <div style={{ borderTop: `1px solid ${C.cardB}`, paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Datos de la persona autorizada</div>
          <Campo label="Nombre completo" value={value.auth.nombre} onChange={v => onChange({ ...value, auth: { ...value.auth, nombre: v } })} placeholder="Ej. Carlos Pérez" required />
          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Cédula" value={value.auth.cedula} onChange={v => onChange({ ...value, auth: { ...value.auth, cedula: v } })} placeholder="Ej. 12345678" required />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Parentesco" value={value.auth.parentesco} onChange={v => onChange({ ...value, auth: { ...value.auth, parentesco: v } })} placeholder="Ej. Tío, abuelo..." required />
            </div>
          </div>
          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Celular" value={value.auth.celular} onChange={v => onChange({ ...value, auth: { ...value.auth, celular: v } })} placeholder="Ej. 3001234567" type="tel" required />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Campo label="Placa del vehículo" value={value.auth.placa} onChange={v => onChange({ ...value, auth: { ...value.auth, placa: v } })} placeholder="Ej. ABC123" required />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Buscar y editar registro existente ──────────────────────────────────────
function BuscarRegistro({ onEditar, onOpenChange }) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [sinResultados, setSinResultados] = useState(false)
  const [pinCheck, setPinCheck] = useState({})     // { [id]: { input, error, visible } }

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

  // Verifica el PIN consultando en Supabase — el PIN nunca baja al navegador
  const verificarPin = async (id, inputPin) => {
    const { data } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', id)
      .eq('pin', inputPin)
      .maybeSingle()
    return !!data
  }

  const buscar = async () => {
    if (!busqueda.trim()) return
    setBuscando(true); setSinResultados(false); setResultados([])
    // Traer todos y filtrar localmente para tolerar tildes y mayúsculas
    // Excluir el campo pin para no exponerlo en el navegador
    const { data, error } = await supabase
      .from('submissions')
      .select('id, nombre, seccion, day4, day5, submitted_at')
      .order('submitted_at', { ascending: false })
    setBuscando(false)
    if (error) { setSinResultados(true); return }
    const termino = norm(busqueda.trim())
    const filtrados = (data || []).filter(r => norm(r.nombre || '').includes(termino)).slice(0, 10)
    if (filtrados.length === 0) { setSinResultados(true); return }
    setResultados(filtrados)
  }

  if (!open) return (
    <div style={{ marginBottom: 20, textAlign: 'center' }}>
      <button type="button" style={{ ...S.btn(C.yellow), fontSize: 15, padding: '12px 28px', fontWeight: 700, boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }} onClick={() => { setOpen(true); onOpenChange?.(true) }}>
        🔍 ¿Ya registraste? Busca y edita tu registro
      </button>
    </div>
  )

  return (
    <div style={{ ...S.card, marginBottom: 20, border: `1px solid ${C.yellow}66` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ ...S.sectionTitle, marginBottom: 0 }}>🔍 Buscar registro existente</div>
        <button type="button" onClick={() => { setOpen(false); setBusqueda(''); setResultados([]); onOpenChange?.(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          style={{ ...S.input, flex: 1 }}
          placeholder="Escribe el nombre del estudiante..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setSinResultados(false) }}
          onKeyDown={e => e.key === 'Enter' && buscar()}
        />
        <button type="button" style={S.btn(C.blue)} onClick={buscar} disabled={buscando}>
          {buscando ? '...' : 'Buscar'}
        </button>
      </div>
      {sinResultados && <div style={{ color: C.muted, fontSize: 14 }}>No se encontró ningún registro con ese nombre.</div>}
      {resultados.map(reg => (
        <div key={reg.id} style={{ background: '#f8fbff', border: `1px solid ${C.cardB}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{reg.nombre}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{nombreSeccion(reg.seccion)} · Lunes: {reg.day4?.tipo === 'padres' ? 'Papá/Mamá' : reg.day4?.tipo === 'propios' ? 'Propios medios' : reg.day4?.nombre || '—'} · Martes: {reg.day5?.tipo === 'padres' ? 'Papá/Mamá' : reg.day5?.tipo === 'propios' ? 'Propios medios' : reg.day5?.nombre || '—'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 180 }}>
            {!pinCheck[reg.id]?.visible ? (
              <button
                type="button"
                style={S.btn(C.yellow)}
                onClick={() => setPinCheck(p => ({ ...p, [reg.id]: { input: '', error: '', visible: true } }))}
              >
                ✏️ Editar
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>🔐 Ingresa tu PIN:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    style={{ ...S.input, width: 90, textAlign: 'center', letterSpacing: 4, fontWeight: 700, fontSize: 16 }}
                    placeholder="_ _ _ _"
                    value={pinCheck[reg.id]?.input || ''}
                    onChange={e => setPinCheck(p => ({ ...p, [reg.id]: { ...p[reg.id], input: e.target.value, error: '' } }))}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const ok = await verificarPin(reg.id, pinCheck[reg.id]?.input)
                        if (ok) { onEditar(reg); setOpen(false); onOpenChange?.(false) }
                        else setPinCheck(p => ({ ...p, [reg.id]: { ...p[reg.id], error: 'PIN incorrecto' } }))
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    style={S.btn(C.green)}
                    onClick={async () => {
                      const ok = await verificarPin(reg.id, pinCheck[reg.id]?.input)
                      if (ok) { onEditar(reg); setOpen(false); onOpenChange?.(false) }
                      else setPinCheck(p => ({ ...p, [reg.id]: { ...p[reg.id], error: 'PIN incorrecto' } }))
                    }}
                  >✓</button>
                  <button
                    type="button"
                    style={S.btn(C.muted)}
                    onClick={() => setPinCheck(p => ({ ...p, [reg.id]: { input: '', error: '', visible: false } }))}
                  >✕</button>
                </div>
                {pinCheck[reg.id]?.error && (
                  <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>⚠️ {pinCheck[reg.id].error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── FORMULARIO PADRES ────────────────────────────────────────────────────────
function FormularioPadres({ extra }) {
  const [nivel, setNivel] = useState('')
  const [grado, setGrado] = useState('')
  const [nombre, setNombre] = useState('')
  const [day4, setDay4] = useState(emptyRecoge())
  const [day5, setDay5] = useState(emptyRecoge())
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)   // id del registro guardado
  const [isEditing, setIsEditing] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [generatedPin, setGeneratedPin] = useState('')
  const [duplicado, setDuplicado] = useState(null)  // registro duplicado detectado

  const gradosDisponibles = nivel ? SECCIONES_POR_NIVEL(nivel) : []
  const estudiantes = grado ? ESTUDIANTES[grado] || [] : []

  const resetForm = () => {
    setNivel(''); setGrado(''); setNombre('')
    setDay4(emptyRecoge()); setDay5(emptyRecoge())
    setEditId(null); setIsEditing(false); setSuccess(false); setError(''); setGeneratedPin(''); setDuplicado(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nivel || !grado || !nombre) return setError('Por favor completa el nivel, grado y nombre del estudiante.')
    if (!day4.tipo || !day5.tipo) return setError('Indica quién recoge en cada día.')
    if (day4.tipo === 'autorizado' && (!day4.auth.nombre || !day4.auth.cedula || !day4.auth.parentesco || !day4.auth.celular))
      return setError('Completa todos los datos de la persona autorizada para el lunes 4.')
    if (day5.tipo === 'autorizado' && (!day5.auth.nombre || !day5.auth.cedula || !day5.auth.parentesco || !day5.auth.celular))
      return setError('Completa todos los datos de la persona autorizada para el martes 5.')

    setError('')
    setLoading(true)
    const seccion = grado
    const toPayload = (d) =>
      d.tipo === 'padres' ? { tipo: 'padres' } :
      d.tipo === 'propios' ? { tipo: 'propios' } :
      { tipo: 'autorizado', ...d.auth }
    const payload = {
      nombre, seccion,
      day4: toPayload(day4),
      day5: toPayload(day5),
    }
    try {
      if (isEditing && editId) {
        // ACTUALIZAR registro existente
        const { error: err } = await supabase.from('submissions').update(payload).eq('id', editId)
        if (err) throw err
      } else {
        // Verificar si ya existe un registro para este estudiante
        const { data: existing } = await supabase
          .from('submissions')
          .select('id, nombre, seccion, submitted_at')
          .eq('nombre', nombre)
          .eq('seccion', seccion)
          .limit(1)
        if (existing && existing.length > 0) {
          setDuplicado(existing[0])
          setLoading(false)
          return
        }
        // CREAR nuevo registro — generar PIN de 4 dígitos
        const pin = Math.floor(1000 + Math.random() * 9000).toString()
        const newId = crypto.randomUUID()
        const { error: err } = await supabase.from('submissions').insert([{ id: newId, pin, ...payload }])
        if (err) throw err
        setEditId(newId)
        setGeneratedPin(pin)
      }
      setIsEditing(false)
      setSuccess(true)
    } catch (e) {
      setError('Error al enviar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const ResumenDia = ({ label, recoge }) => (
      <div style={{ background: '#f8fbff', border: `1px solid ${C.cardB}`, borderRadius: 10, padding: '14px 16px', textAlign: 'left', flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700, color: C.blueL, fontSize: 14, marginBottom: 8 }}>{label}</div>
        {recoge.tipo === 'padres' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.green, fontWeight: 600, fontSize: 14 }}>
            👨‍👩‍👧 Papá / Mamá
          </div>
        ) : recoge.tipo === 'propios' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.blue, fontWeight: 600, fontSize: 14 }}>
            🚶 Sale por sus propios medios
          </div>
        ) : recoge.tipo === 'autorizado' ? (
          <div style={{ fontSize: 13, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>👤 <strong>{recoge.auth.nombre}</strong></div>
            <div style={{ color: C.muted }}>🪪 Cédula: {recoge.auth.cedula}</div>
            <div style={{ color: C.muted }}>🤝 Parentesco: {recoge.auth.parentesco}</div>
            <div style={{ color: C.muted }}>📱 Celular: {recoge.auth.celular}</div>
            {recoge.auth.placa && <div style={{ color: C.muted }}>🚗 Placa: {recoge.auth.placa}</div>}
          </div>
        ) : <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
      </div>
    )
    const PinCopiado = () => {
      const [copiado, setCopiado] = useState(false)
      const copiar = () => {
        navigator.clipboard.writeText(generatedPin).then(() => {
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2500)
        })
      }
      return (
        <button
          onClick={copiar}
          style={{ marginTop: 12, background: copiado ? C.green : '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.3s', display: 'flex', alignItems: 'center', gap: 7, margin: '12px auto 0' }}
        >
          {copiado ? '✅ ¡Copiado!' : '📋 Copiar PIN'}
        </button>
      )
    }

    return (
      <div style={S.page}>
        <Header extra={extra} />
        <div style={{ ...S.container, paddingTop: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: C.green, marginBottom: 8 }}>
              ¡Formulario enviado!
            </div>
            <div style={{ color: C.muted, fontSize: 14 }}>
              Información registrada para <strong style={{ color: C.text }}>{nombre}</strong> · {nombreSeccion(grado)}
            </div>

            {generatedPin && (
              <div style={{ marginTop: 22, background: '#fff8e1', border: '2px solid #f59e0b', borderRadius: 14, padding: '18px 24px', display: 'inline-block', minWidth: 260 }}>
                <div style={{ fontSize: 13, color: '#92610a', fontWeight: 600, marginBottom: 6 }}>🔐 Tu PIN de edición</div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 8, color: '#1a2a3a', fontFamily: 'monospace' }}>{generatedPin}</div>
                <PinCopiado />
                <div style={{ fontSize: 12, color: '#92610a', marginTop: 10, lineHeight: 1.5 }}>
                  ⚠️ <strong>Guarda este PIN.</strong> Lo necesitarás si en el futuro<br/>quieres modificar la información de este registro.
                </div>
              </div>
            )}
          </div>

          {/* Resumen */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ ...S.sectionTitle, marginBottom: 16 }}>📋 Resumen del registro</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <ResumenDia label="☀️ Lunes 4 de mayo" recoge={day4} />
              <ResumenDia label="🌤️ Martes 5 de mayo" recoge={day5} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={S.btn(C.yellow)} onClick={() => { setSuccess(false); setIsEditing(true); setError('') }}>
              ✏️ Corregir información
            </button>
            <button style={S.btn(C.blue)} onClick={resetForm}>
              Registrar otro estudiante
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Header extra={extra} />
      <div style={S.container}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          {isEditing && (
            <div style={{ background: C.yellow + '22', border: `1px solid ${C.yellow}88`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: C.yellow, fontWeight: 600 }}>
              ✏️ Modo edición — Corrige los datos y vuelve a enviar el formulario.
            </div>
          )}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
            Formulario de Recogida
          </div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7 }}>
            Teatro Metropolitano de Medellín<br />
            Lunes 4 y Martes 5 de mayo a las 6:00 p.m.
          </div>
        </div>

        {/* ── Buscar registro existente ── */}
        {!isEditing && <BuscarRegistro
          onOpenChange={setBuscadorAbierto}
          onEditar={(reg) => {
          // Detectar nivel y grado a partir de la sección guardada
          const sec = reg.seccion
          const gradoKey = sec ? sec.split(' - ')[0] : ''
          const nivelDetectado = NIVEL_MAP[gradoKey] || ''
          setNivel(nivelDetectado)
          setGrado(sec)
          setNombre(reg.nombre)
          // Reconstruir day4 y day5
          const toRecoge = (d) => d.tipo === 'padres'
            ? { tipo: 'padres', auth: emptyAuth() }
            : d.tipo === 'propios'
            ? { tipo: 'propios', auth: emptyAuth() }
            : { tipo: 'autorizado', auth: { nombre: d.nombre||'', cedula: d.cedula||'', placa: d.placa||'', parentesco: d.parentesco||'', celular: d.celular||'' } }
          setDay4(toRecoge(reg.day4 || {}))
          setDay5(toRecoge(reg.day5 || {}))
          setEditId(reg.id)
          setIsEditing(true)
          setError('')
        }} />}
        {!buscadorAbierto && <form onSubmit={handleSubmit}>
          {/* Sección y nombre */}
          <div style={S.card}>
            <div style={S.sectionTitle}>Datos del Estudiante</div>
            {isEditing ? (
              /* En edición: mostrar solo texto, no se puede cambiar el estudiante */
              <div style={{ background: '#f0f4f9', border: `1px solid ${C.cardB}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 500 }}>Estudiante</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{nombre}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{grado ? nombreSeccion(grado) : ''}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, fontStyle: 'italic' }}>🔒 El estudiante no se puede cambiar en modo edición.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Sección <span style={{ color: C.red }}>*</span></label>
                  <select style={S.select} value={nivel} onChange={e => { setNivel(e.target.value); setGrado(''); setNombre('') }} required>
                    <option value="">— Selecciona la sección —</option>
                    {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Grado <span style={{ color: C.red }}>*</span></label>
                  <select style={S.select} value={grado} onChange={e => { setGrado(e.target.value); setNombre('') }} required disabled={!nivel}>
                    <option value="">— Selecciona el grado —</option>
                    {gradosDisponibles.map(g => <option key={g} value={g}>{nombreSeccion(g)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Nombre del estudiante <span style={{ color: C.red }}>*</span></label>
                  <select style={S.select} value={nombre} onChange={e => setNombre(e.target.value)} required disabled={!grado}>
                    <option value="">— Selecciona el nombre —</option>
                    {estudiantes.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Días */}
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <RecogeCard dia="☀️ Lunes 4 de mayo" value={day4} onChange={setDay4} />
            <RecogeCard dia="🌤️ Martes 5 de mayo" value={day5} onChange={setDay5} />
          </div>

          {error && (
            <div style={{ background: C.red + '22', border: `1px solid ${C.red}55`, color: C.red, borderRadius: 8, padding: '12px 16px', marginTop: 16, fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {duplicado && (
            <div style={{ background: '#fff8e1', border: '2px solid #f59e0b', borderRadius: 12, padding: '16px 18px', marginTop: 16 }}>
              <div style={{ fontWeight: 700, color: '#92610a', fontSize: 15, marginBottom: 6 }}>⚠️ Ya existe un registro para este estudiante</div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                <strong>{duplicado.nombre}</strong> ya fue registrado el {new Date(duplicado.submitted_at).toLocaleString('es-CO')}.
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
                Si quieres modificar ese registro, usa el botón <strong>"¿Ya registraste?"</strong> e ingresa tu PIN. Si de todas formas quieres crear un registro nuevo, confirma abajo.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={S.btn(C.red)}
                  onClick={async () => {
                    setDuplicado(null)
                    setLoading(true)
                    const seccion = grado
                    const pin = Math.floor(1000 + Math.random() * 9000).toString()
                    const newId = crypto.randomUUID()
                    const payload = {
                      nombre, seccion,
                      day4: day4.tipo === 'padres' ? { tipo: 'padres' } : day4.tipo === 'propios' ? { tipo: 'propios' } : { tipo: 'autorizado', ...day4.auth },
                      day5: day5.tipo === 'padres' ? { tipo: 'padres' } : day5.tipo === 'propios' ? { tipo: 'propios' } : { tipo: 'autorizado', ...day5.auth },
                    }
                    const { error: err } = await supabase.from('submissions').insert([{ id: newId, pin, ...payload }])
                    setLoading(false)
                    if (err) { setError('Error al enviar: ' + err.message); return }
                    setEditId(newId); setGeneratedPin(pin); setIsEditing(false); setSuccess(true)
                  }}
                >
                  Crear de todas formas
                </button>
                <button type="button" style={S.btn(C.muted)} onClick={() => setDuplicado(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <button type="submit" style={{ ...S.btn(C.blue), marginTop: 20, width: '100%', padding: '14px', fontSize: 16 }} disabled={loading}>
            {loading ? 'Enviando...' : isEditing ? '💾 Guardar cambios' : '📨 Enviar formulario'}
          </button>

          {/* ── Sección informativa ── */}
          <div style={{ ...S.card, marginTop: 20, marginBottom: 0, border: `1px solid #d0dce8` }}>
            <div style={{ ...S.sectionTitle, marginBottom: 18 }}>📌 Información importante</div>

            {/* Pico y placa */}
            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b88', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#92610a', fontSize: 14, marginBottom: 8 }}>🚗 Pico y Placa — Medellín</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', border: '1px solid #f59e0b55', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#92610a', fontWeight: 600, marginBottom: 4 }}>☀️ LUNES 4 DE MAYO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2a3a', letterSpacing: 2 }}>1 · 7</div>
                  <div style={{ fontSize: 11, color: '#5a7a9a', marginTop: 2 }}>Últimos dígitos de placa</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #f59e0b55', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#92610a', fontWeight: 600, marginBottom: 4 }}>🌤️ MARTES 5 DE MAYO</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2a3a', letterSpacing: 2 }}>0 · 3</div>
                  <div style={{ fontSize: 11, color: '#5a7a9a', marginTop: 2 }}>Últimos dígitos de placa</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#92610a', marginTop: 10 }}>⏰ Restricción: 5:00 a.m. – 8:00 p.m. · Verifica en <strong>medellin.gov.co</strong></div>
            </div>

            {/* Mapa y puntos de recogida */}
            <div style={{ background: '#f0f7ff', border: '1px solid #1d6eed44', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: C.blueL, fontSize: 14, marginBottom: 8 }}>📍 Ubicación</div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 10 }}>
                <strong>Teatro Metropolitano José Gutiérrez Gómez</strong><br />
                <span style={{ color: C.muted }}>Calle 41 #57-30, El Centro, Medellín</span>
              </div>
              <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <iframe
                  title="Ubicación Teatro Metropolitano"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.1!2d-75.5741!3d6.2476!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4428e3e9b9a1e7%3A0x6e1e1e1e1e1e1e1e!2sTeatro%20Metropolitano%20Jos%C3%A9%20Guti%C3%A9rrez%20G%C3%B3mez!5e0!3m2!1ses!2sco!4v1"
                  width="100%"
                  height="180"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Teatro+Metropolitano+Jos%C3%A9+Guti%C3%A9rrez+G%C3%B3mez,+Medell%C3%ADn"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#0fb3faff', border: '1px solid #1d6eed44', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#ffffffff', textDecoration: 'none' }}
                >
                  🗺️ Google Maps
                </a>
                <a
                  href="https://waze.com/ul?q=Teatro+Metropolitano+Medellin&navigate=yes"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#27ae49ff', border: '1px solid #33ccff44', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#ffffffff', textDecoration: 'none' }}
                >
                  🚗 Waze
                </a>
              </div>
            </div>

            {/* Información importante */}
            <div style={{ background: '#f0fff8', border: '1px solid #10b98144', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 15, marginBottom: 14, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' }}>⚠️ Información Importante</div>

              {/* Salida de estudiantes — primero */}
              <div style={{ fontWeight: 600, color: '#0a7a54', fontSize: 13, marginBottom: 8 }}>📋 Salida de estudiantes</div>
              <div style={{ fontSize: 13, color: '#2d6a4f', lineHeight: 1.7, marginBottom: 10 }}>
                Una vez finalice el espectáculo (entre 7:30 y 8:00 p.m., aproximadamente) los estudiantes regresarán a sus casas con sus familias de la siguiente manera:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  { icon: '🎭', title: 'Familias de Kinder 3 a 2°', text: 'Permanecerán sentados en el teatro. Aproximadamente 15–20 minutos después de finalizado el espectáculo, se realizará la entrega de los niños directamente a sus familias dentro del teatro.' },
                  { icon: '⛺', title: 'Familias de 3° a 12°', text: 'Al finalizar el espectáculo deberán salir del teatro y seguir las indicaciones del personal logístico, quienes los guiarán hacia la plazoleta central. Allí, en carpas dispuestas para este fin, se realizará la entrega. Este desplazamiento debe hacerse caminando (no en vehículo).' },
                  { icon: '🚙', title: 'Familias que van solo a recoger (sin asistir al espectáculo)', text: 'Se habilitará el ingreso de vehículos entre las 8:20 y 8:40 p.m. aproximadamente. Una vez ingresen, deberán estacionar y dirigirse al punto de entrega: K3 a 2° ingresan al teatro; 3° a 12° se dirigen a las carpas de la plazoleta central.' },
                  { icon: '👨‍👩‍👧‍👦', title: 'Hijos en diferentes secciones', text: 'Les solicitamos recoger primero a los niños de Kinder 3 a 2° y, posteriormente, ir por los estudiantes de 3° a 12°.' },
                  { icon: '⏳', title: 'Tiempos aproximados', text: 'Agradecemos su paciencia y comprensión. Los tiempos indicados son aproximados y pueden presentar variaciones, ya que este proceso logístico requiere el tiempo necesario para garantizar la seguridad y el bienestar de todos los estudiantes.' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fff', border: '1px solid #d1fae5', borderRadius: 8, padding: '10px 12px' }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0a7a54', marginBottom: 2 }}>{r.title}</div>
                      <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{r.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recomendaciones de seguridad — después */}
              <div style={{ borderTop: '1px solid #a7f3d0', paddingTop: 14 }}>
                <div style={{ fontWeight: 600, color: '#0a7a54', fontSize: 13, marginBottom: 8 }}>🛡️ Recomendaciones de seguridad</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: '⏰', text: 'Llegue puntual al horario de recogida asignado para evitar congestión.' },
                    { icon: '📵', text: 'No envíe a personas no registradas en este formulario. No se entregará el estudiante sin autorización previa.' },
                    { icon: '📞', text: 'Mantenga su celular activo antes y después (no durante el evento) por si el colegio necesita contactarle.' },
                    { icon: '🚗', text: 'Si llega en vehículo, respete las zonas señalizadas y las indicaciones del personal de seguridad.' },
                    { icon: '👮', text: 'El personal del colegio verificará la identidad de quien recoge. Este proceso es por la seguridad de su hijo.' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                      <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </form>}
      </div>
    </div>
  )
}

// ─── DATOS LOGÍSTICA ──────────────────────────────────────────────────────────
const COMISIONES = [
  {
    nombre: 'Cubrimiento de ingreso y evacuación al teatro',
    funciones: [
      'Coordinar la apertura y control de accesos al teatro.',
      'Orientar a los estudiantes en puntos de ingreso y salida.',
      'Regular el flujo de personas para evitar congestiones en entradas, pasillos y accesos.',
      'Apoyar la ubicación ordenada de los estudiantes.',
      'Cubrimiento de evacuación.',
      'Guiar los flujos de evacuación por rutas establecidas y salidas habilitadas.',
      'Evitar aglomeraciones en puertas, corredores y zonas externas.',
      'Orientar al público durante procedimientos de evacuación preventiva o de emergencia.',
      'Apoyar la activación y seguimiento de protocolos de emergencia del teatro.',
      'Mantener comunicación permanente con el equipo de logística, seguridad y coordinación durante el proceso.',
      'Reportar novedades o incidentes a coordinación logística.',
    ],
    responsables: [
      'Escaleras 1: Jorge Ohel / Décimo Bet CAVIEDES OROZCO, NICOLÁS',
      'Escalera 2: Tomás González / Décimo Bet PATIÑO CORONADO, JUAN DAVID',
      'Puerta ingreso 3: Sonia Franco / Décimo Bet USME FERRER, JUAN JACOBO',
      'Puerta 4: Diana Restrepo / Once Alef PATIÑO GOMEZ, CRISTOBAL',
      'Puerta 6: Mariza Velásquez / Once Alef PIZA PARODY, JERONIMO',
      'Puerta 7: Adriana Hannah Cooper / Décimo Alef GALEANO MUNERA, NICOLAS',
      'Zona externa 8: Giovani Torres / Once Alef ROITER, EDEN',
      'Zona Externa 9: Ivón Valenzuela / Once Alef VASQUEZ GALLON, MARTIN',
      'Zona externa 10: Óscar Castañeda / Once Bet PIEDRAHITA GUZMAN, ESTEBAN',
      'Zona externa 11: Carlos Velásquez / Once Bet MEJIA ALZATE, MIGUEL',
      'Puerta de evacuación 5: Nicolás Naranjo / Séptimo Alef RIOS BUSTAMANTE, PABLO',
      'Escaleras 12: Laura Torres / Décimo Alef GOLDSTEIN FLEISMAN, JOSE',
      'Escaleras 13: Juan Carlos Cadavid / Séptimo Bet ESCOBAR PONCE, MATIAS',
      'Escaleras 14: Darwin Mercado / Octavo Alef SAENZ FRANCO, JERONIMO',
    ],
  },
  {
    nombre: 'Escenario laterales',
    funciones: [
      'Apoyar la organización y disposición de accesorios, utilería y elementos requeridos para cada presentación.',
      'Verificar que los materiales y apoyos escénicos estén listos y disponibles.',
      'Asistir en entradas y salidas de participantes hacia el escenario.',
      'Facilitar el movimiento seguro de estudiantes, evitando congestiones o interrupciones durante las presentaciones.',
      'Mantener comunicación constante con coordinación logística, dirección de escenario y responsables de cada presentación.',
      'Reportar novedades, imprevistos o requerimientos que puedan afectar el desarrollo del evento.',
    ],
    responsables: ['Astrid Betancur', 'Vanessa Vivares', 'Camilo Gómez', 'Marlon', 'Diana Ocampo', 'Adriana Cooper', 'Yorman', 'Área de música'],
  },
  {
    nombre: 'Patinadores',
    funciones: [
      'Apoyar en los requerimientos generales de utilería.',
      'Transportar y entregar oportunamente la utilería necesaria durante el evento.',
      'Atender necesidades imprevistas o urgentes que surjan en escenario.',
      'Apoyar montajes y desmontaje.',
      'Estar atentos a instrucciones de coordinación logística para cubrir necesidades emergentes.',
    ],
    responsables: ['William Vélez', 'Victor Vélez', 'Luis Felipe Tejada'],
  },
  {
    nombre: 'Busetas - Carros particulares en el teatro',
    funciones: [
      'Planificar la llegada y ubicación de vehículos.',
      'Organizar rutas y tiempos de transporte.',
      'Coordinar la evacuación ordenada al finalizar el evento.',
      'Garantizar seguridad en movilidad.',
    ],
    responsables: [
      'Tabares Londoño Santiago', 'López Cardona Cristian Camilo', 'Ruiz Rhenals Nover Alonso', 'Lezer Hila Carolina',
      'Once Bet SERRANO BERMUDEZ, EMILIO', 'Once Bet VELASQUEZ DANGOND, MAXIMILIANO',
    ],
  },
  {
    nombre: 'Escenografía y elementos digitales',
    funciones: [
      'Diseñar y elaborar elementos de utilería y escenografía.',
      'Crear y gestionar apoyos visuales y digitales.',
      'Coordinar montaje y desmontaje escenográfico.',
      'Verificar funcionalidad técnica antes del evento.',
    ],
    responsables: ['Alvarez Hernandez Ricardo Alberto', 'Velasquez Londoño Luz Mariza', 'Gonzalez Felipe', 'Camilo Gómez', 'Zohar Milchgrub'],
  },
  {
    nombre: 'Utilería / Mantenimiento',
    funciones: [
      'Organizar y distribuir la utilería necesaria.',
      'Apoyar montaje de instrumentos y mobiliario.',
      'Transportar materiales desde el colegio al teatro.',
      'Garantizar el orden y cuidado de los elementos.',
    ],
    responsables: ['Garcia Yorman Augusto', 'Betancur Alzate Andres Felipe', 'Velez Escudero Victor Manuel', 'Velez Escudero William Andres', 'TEJADA BOLIVAR LUIS FELIPE'],
    requerimientos: 'Walkie Talkie 12',
  },
  {
    nombre: 'Coordinación y Logística',
    funciones: [
      'Supervisar el desarrollo logístico dentro y fuera del teatro.',
      'Verificar que cada comisión cumpla sus funciones.',
      'Resolver imprevistos en tiempo real.',
      'Mantener comunicación constante entre equipos.',
      'Asegurar la coherencia y fluidez del evento.',
    ],
    responsables: ['Amar Ospina Olga Lucia', 'Zuluaga Gil Alexander', 'Cardona Paola Catalina', 'Nidia Londoño Echeverri', 'Andrea Toledo', 'Sandra Agudelo', 'Andrés Betancur'],
  },
  {
    nombre: 'Comunicaciones / Sistemas',
    funciones: [
      'Gestionar los canales de comunicación interna (radios, mensajes, etc.).',
      'Apoyar el funcionamiento de sistemas tecnológicos.',
      'Coordinar información entre comisiones.',
      'Responder ante fallas técnicas durante el evento.',
    ],
    responsables: ['Lince Gomez Laura', 'Ramirez Agudelo Juan Camilo', 'Giraldo Jaramillo Carlos Mario', 'Cañas Marin Valentina', 'González Tomás'],
  },
  {
    nombre: 'Seguridad',
    funciones: ['Se encarga de toda la seguridad en compañía de la Policía Nacional y autoridades locales.'],
    responsables: ['Hermes Cañaveral Walkie'],
  },
  {
    nombre: 'Coordinadores de sección artístico',
    funciones: [
      'Los coordinadores deben estar todo el tiempo en comunicación con el director general (Camilo Correa), apoyándose con el guión técnico y dando las instrucciones en el espacio que corresponda.',
      'Camerinos preescolar: Patricia Larralde',
      'Carpas primaria: Kelly Pulgarín',
      'Carpas bachillerato: Estefanía Ordóñez',
    ],
    responsables: ['Larralde Quiroba Patricia Helena', 'Juán Camilo Correa (Director General)', 'Manuela Chica', 'Estefania Ordóñez'],
    requerimientos: 'Walkie Talkie',
  },
  {
    nombre: 'Carpas Bachillerato',
    funciones: [
      'Directores de grupo y maestros auxiliares/acompañantes.',
      'Coordinar la preparación de los estudiantes para la escena.',
      'Apoyar en logística de vestuario y utilería.',
      'Garantizar organización, puntualidad y flujo hacia el escenario.',
      'Supervisar el comportamiento y cumplimiento de tiempos.',
    ],
    responsables: [
      'Rodriguez España Mario Alberto', 'Lorenzo Correa Tahia', 'Salazar Correa Santiago',
      'Abraham Mrejen', 'Felipe Vélez',
      'Décimo Bet MEJIA ARANGO, MATIAS', 'Once Bet PIEDRAHITA GUZMAN, ESTEBAN', 'Once Bet CASAS QUINTERO, LORENZO',
    ],
  },
  {
    nombre: 'Dirección Espectáculo',
    funciones: [
      'Coordinar integralmente el desarrollo del espectáculo.',
      'Dirigir desde cabina y tarima.',
      'Asegurar el cumplimiento del guion, tiempos y transiciones.',
      'Tomar decisiones en tiempo real ante imprevistos.',
    ],
    responsables: ['Correa Jiménez Juan Camilo', 'Andres Cardona', 'Carlos Giraldo'],
    requerimientos: 'Walkie Talkie',
  },
  {
    nombre: 'Brigada y Protocolos de Bioseguridad',
    funciones: [
      'Diseñar y comunicar los protocolos del evento.',
      'Verificar la asignación y control de asistentes.',
      'Supervisar el cumplimiento de normas de seguridad durante el evento.',
      'Coordinar servicios médicos, ambulancia y atención de emergencias.',
      'Velar por la seguridad general de todos los participantes.',
    ],
    responsables: [
      'Montoya Tamayo Diana Marcela', 'Henao Escobar Sara', 'Hoyos Zuleta Veronica',
      'Doce Alef MEDINA HURTADO, CRISTOBAL', 'Doce Alef ESCOBAR JURADO, DANIEL', 'Décimo Alef RAMIREZ PELAEZ, CLEMENTE',
    ],
  },
  {
    nombre: 'Refrigerios',
    funciones: [
      'Organizar la entrega de refrigerios por grupos.',
      'Coordinar la alimentación del personal y equipo logístico.',
      'Garantizar tiempos adecuados de distribución.',
      'Supervisar higiene y manejo adecuado de alimentos.',
    ],
    responsables: [
      'Franco Correa Sonia Irene', 'Restrepo Gonzalez Diana Yorlen', 'Cristina Cres',
      'Once Alef DUQUE ALVAREZ, JUAN FELIPE', 'Décimo Alef EVANGELISTA FEDERICO',
    ],
  },
  {
    nombre: 'Carpas Primaria',
    funciones: [
      'Directores de grupo y maestros auxiliares/acompañantes.',
      'Organizar a los estudiantes antes y después de su presentación.',
      'Supervisar accesorios y vestuario.',
      'Mantener el orden en el espacio asignado.',
      'Acompañar y guiar a los estudiantes en tiempos de espera.',
    ],
    responsables: [
      'Laloum Yael', 'Cartagena Ramírez Edwin Alejandro', 'Lebrun Perez Diana Marcela',
      'Pulgarin Gomez Kelly Andrea', 'Gomez Agudelo Sirley Johana', 'Zapata Sanchez Valeria',
      'Dorrell Giraldo Jessica', 'Bedoya Marulanda Jennyfer', 'Pelaez Alvarez Alejandra',
      'Ortega Vanegas Mariana Lisbeth', 'Alvarez Molina Diana Cecilia', 'Betancur Ortiz Marco Antonio',
      'Gonzalez Suarez Laura', 'Mazo Meneses Lina Marcela', 'Rosita Kertzman',
      'Décimo Bet MANRIQUE ECHEVERRI, CRISTOBAL', 'Décimo Bet DE LA ESPRIELLA ZULUAGA, TOMAS',
    ],
  },
  {
    nombre: 'Camerinos Preschool',
    funciones: [
      'Directores de grupo y maestros auxiliares.',
      'Organizar a los niños para su salida a escena.',
      'Apoyar con vestuario y accesorios.',
      'Mantener el orden, cuidado y acompañamiento permanente.',
      'Garantizar la seguridad y el bienestar de los niños.',
    ],
    responsables: [
      'Goldstein Elaine Cristina', 'Arboleda Morales Isabel Cristina', 'Arias Montoya Sara Maria',
      'Salinas Acosta Luisa Fernanda', 'Solano Guerra Sandra Patricia', 'Preciado Ortiz Nataly',
      'Daza Aristizabal Valentina', 'Arango Giraldo Luisa Maria', 'Lopez Cadavid Valentina',
      'Uran Ramirez Nathalie', 'Agudelo Restrepo Ana Maria', 'Gonzalez Fontalvo Catherine Liseth',
      'Lopez Lopez Liliana Patricia', 'Betancur Gómez Jeniffer', 'Lopez Mejia Carolina',
      'Durango Jaramillo Daniela', 'Monsalve Tobon Paula Andrea', 'Herrera Arenas Natalia',
      'Cano Rendon Manuela',
      'Doce Bet SIERRA COLMENARES, ALEJANDRO', 'Doce Bet URIBE LLANO, MANUEL',
    ],
    requerimientos: 'Stiberman Mora / Carlos Velásquez',
  },
  {
    nombre: 'Presupuesto',
    funciones: [
      'Aprobar el presupuesto general de todas las comisiones.',
      'Revisar y validar cotizaciones.',
      'Ejecutar y hacer seguimiento a las compras requeridas.',
      'Gestionar la reserva del teatro para ambos días del evento.',
      'Llevar control de gastos y asegurar el cumplimiento del presupuesto asignado.',
    ],
    responsables: ['Nidia Londoño', 'Andrea Toledo', 'Juan Camilo Correa', 'Andrés Cardona'],
  },
  {
    nombre: 'Boletería',
    funciones: [
      'Diseñar e implementar el sistema de boletería digital.',
      'Gestionar la adquisición de boletas con anterioridad.',
      'Llevar registro de asistentes y aforo.',
    ],
    responsables: ['Andrea Toledo', 'Laura Lince', 'Juan Camilo Ramírez', 'Felipe González'],
  },
  {
    nombre: 'Puerta Principal',
    funciones: [
      'Recibir y dar la bienvenida a los asistentes.',
      'Orientar a los padres de familia sobre el ingreso al teatro.',
      'Informar sobre la logística interna (ubicación, tiempos, recomendaciones).',
      'Garantizar un flujo organizado de entrada.',
    ],
    responsables: [
      'Criollo Monsalve Luz Dary', 'Restrepo Granada Luz Elena', 'Nidia Londoño Echeverry',
      'Juan Camilo Ramírez', 'Mariana Tamayo', 'Franco Correa Sonia Irene',
      'Once Bet HERRON MONTOYA, EMILIO', 'Once Bet OSORIO GAVIRIA, AGUSTIN', 'Once Alef LEIDERMAN BOTERO, ARI',
    ],
  },
  {
    nombre: 'Camerinos / Escenario',
    funciones: [
      'Coordinar la preparación del elenco antes de salir a escena.',
      'Supervisar el orden y funcionamiento en camerinos.',
      'Asegurar la correcta transición de los estudiantes hacia el escenario.',
      'Apoyar la coordinación musical y técnica durante el espectáculo.',
    ],
    responsables: [
      'Diaz Arcia Edinson Javier', 'Palacio Zuluaga Eliana Marcela', 'Huffington Webster Georgie Bell',
      'Restrepo Vera Marlon', 'Giraldo Duque Christian David', 'Toro Perez Lorena', 'Hurtado Rivera Said Enrique',
    ],
  },
  {
    nombre: 'Zona de camerino instrumentos de cuerda',
    funciones: [],
    responsables: [
      'Yuliana Suarez', 'Vivares Figueroa Vanesa Isabel',
      '2 estudiantes de logística',
      'Doce Alef VARGAS QUINTERO, SAMUEL', 'Once Alef MUÑOZ ALVAREZ, SAMUEL',
    ],
  },
  {
    nombre: 'Zona de camerino instrumentos de viento',
    funciones: [],
    responsables: [
      'Hobbys',
      '2 estudiantes de logística',
      'Doce Bet ALEMAN GIRARD, FEDERICO', 'Doce Bet GIRALDO OSPINA, CRISTOBAL',
    ],
  },
  {
    nombre: 'Danza (movilidad)',
    funciones: [],
    responsables: ['Cristian Castaño', 'Dayron Garcés', 'Christian Giraldo'],
  },
  {
    nombre: 'Elenco teatro',
    funciones: [],
    responsables: ['Marlon Teatro'],
  },
  {
    nombre: 'Zonas internas escenario — Zona posterior vestuario / Tras telón',
    funciones: ['Grados: 3°-5°-6° — Estudiantes Danza bachillerato'],
    responsables: [
      'Liliana Castrillón', '10 estudiantes (mujeres)', 'Lindsay Goldfeder',
      'Elena Barco', 'Maria Rivas 10Bet', 'Candelaria Barrientos',
    ],
  },
  {
    nombre: 'Zonas internas escenario — Lateral izquierdo vestuario',
    funciones: ['Grados: 2bet-4bet'],
    responsables: [
      'Daniela Montes', '5 estudiantes logística',
      'Maria José Arriola Mesa 10 Alef', 'Leticia Salazar Isaza 10Alef',
    ],
  },
  {
    nombre: 'Zonas internas escenario — Lateral derecho vestuario',
    funciones: [],
    responsables: [
      'Astrid Betancur', '5 estudiantes mujeres logística',
      'María del Mar Acero Puerta 10Bet', 'Florentina Uribe 10Bet',
    ],
  },
  {
    nombre: 'Disciplina zonas de flujo',
    funciones: [],
    responsables: ['Katty Marchena', 'Ferney Rave', 'Mora Stiberman'],
  },
]

const CRONOGRAMA = {
  '4 de mayo': [
    { hora: '7:00 – 10:00 am', desc: 'Montaje: Los encargados del montaje deben bajar todo el material para el evento.' },
    { hora: '9:00 am', desc: 'Recogida del personal del Colegio — Envigado' },
    { hora: '9:15 am', desc: 'Recogida del personal del Colegio — San Diego' },
    { hora: '10:00 am – 12:00 m', desc: 'Llegada Elenco: Recepción de estudiantes participantes del elenco teatro, música (solistas) y todo el personal del colegio.' },
    { hora: '11:50 am', desc: 'Inicia recorrido de rutas para primaria y bachillerato.' },
    { hora: '12:00 m – 12:30 pm', desc: 'Almuerzo: Habrá servicio del restaurante CRES para llevar los almuerzos al teatro.' },
    { hora: '1:00 pm', desc: 'Inicio recorrido de rutas para preescolar.' },
    { hora: '1:00 pm', desc: 'Llegada al teatro: Llegada de los estudiantes de primaria y bachillerato, rutas escolares y carros particulares. Todo el equipo logístico estará presente.' },
    { hora: '2:30 pm', desc: 'Llegada al teatro: Llegada de niños de preescolar, rutas escolares y carros particulares.' },
    { tipo: 'nota', desc: 'Todo el equipo logístico estará presente para el acompañamiento y orientación. Se brindarán indicaciones generales y ubicación de los estudiantes en los espacios asignados en los horarios de 1:00 p.m. y 2:30 p.m.' },
    { hora: '4:30 pm', desc: 'Refrigerio para todo el personal y estudiantes. Habrá unos puntos específicos con señalización para hacer entrega de los refrigerios.' },
    { hora: '5:00 pm', desc: '🎵 Calentamiento: Inicia el calentamiento de voces e instrumentos.' },
    { hora: '5:30 pm', desc: '🚪 Apertura de puertas: En ese momento, todas las personas en sus comisiones deben estar en los espacios designados.' },
    { hora: '6:00 pm', desc: '🎭 Inicio del espectáculo. Todas las comisiones deben estar pendientes por si se presenta algún imprevisto.' },
    { hora: '7:30 pm', desc: '🎂 Finalización del espectáculo: Cantar el cumpleaños del colegio. Desde el teatro se darán indicaciones claras para la salida.' },
    { hora: '7:35 pm', desc: '🎓 Entrega de estudiantes: Entrega organizada en la plazoleta del teatro.' },
    { tipo: 'nota', desc: 'Cada estudiante será entregado únicamente a su padre/madre o acudiente autorizado. Se recomienda mantener el orden y seguir indicaciones del equipo logístico.' },
  ],
  '5 de mayo': [
    { hora: '1:00 pm', desc: 'Recogida del personal del Colegio — Envigado' },
    { hora: '1:15 pm', desc: 'Recogida del personal del Colegio — San Diego' },
    { hora: '1:10 pm', desc: 'Inicia recorrido de rutas para primaria y bachillerato.' },
    { hora: '1:50 pm', desc: 'Inicio recorrido de rutas para preescolar.' },
    { hora: '2:00 pm', desc: 'Llegada Elenco: Recepción de estudiantes participantes del elenco teatro, música (solistas) y todo el personal del colegio.' },
    { hora: '2:30 pm', desc: 'Llegada al teatro: Llegada de los estudiantes de primaria y bachillerato, rutas escolares y carros particulares.' },
    { tipo: 'nota', desc: 'Todo el equipo logístico estará presente para el acompañamiento y orientación. Se brindarán indicaciones generales y ubicación de los estudiantes en los espacios asignados en los horarios de 2:30 p.m.' },
    { hora: '3:00 pm', desc: 'Llegada al teatro: Llegada de niños de preescolar, rutas escolares y carros particulares.' },
    { hora: '4:30 pm', desc: 'Refrigerio para todo el personal y estudiantes. Habrá unos puntos específicos con señalización para hacer entrega de los refrigerios.' },
    { hora: '5:00 pm', desc: '🎵 Calentamiento: Inicia el calentamiento de voces e instrumentos.' },
    { hora: '5:30 pm', desc: '🚪 Apertura de puertas — En ese momento todas las personas en sus comisiones deben estar en los espacios designados.' },
    { hora: '6:00 pm', desc: '🎭 Inicio del espectáculo. Todas las comisiones deben estar pendientes por si se presenta algún imprevisto.' },
    { hora: '7:30 pm', desc: '🎂 Finalización del espectáculo: Cantar el cumpleaños del colegio. Desde el teatro se darán indicaciones claras para la salida.' },
    { tipo: 'nota', desc: 'Todo el equipo logístico estará presente para el acompañamiento y orientación. Se brindarán indicaciones generales y ubicación de los estudiantes en los espacios asignados en los horarios de 3:00 p.m.' },
    { hora: '7:35 pm', desc: '🎓 Entrega de estudiantes: Entrega organizada en la plazoleta del teatro.' },
    { hora: '7:45 pm', desc: '🔧 Desmontaje: Todo el personal colaborará con el desmontaje y ayudará a subirlo al camión que llevará los instrumentos y silletería del colegio.' },
    { tipo: 'nota', desc: 'Cada estudiante será entregado únicamente a su padre/madre o acudiente autorizado al finalizar el evento. Se recomienda mantener el orden y seguir indicaciones del equipo logístico.' },
  ],
}

const LINEAMIENTOS = [
  'Todos los equipos deben asistir a los ensayos generales.',
  'Cada comisión debe conocer sus funciones y las de los demás.',
  'Se debe mantener comunicación permanente durante el evento.',
  'Ante cualquier situación, se debe informar a Coordinaciones y equipo logístico.',
  'Se debe priorizar siempre la seguridad de los estudiantes.',
]

// ─── VISTA LOGÍSTICA ──────────────────────────────────────────────────────────
function LogisticaView({ onBack }) {
  const [tab, setTab] = useState('buscar')
  const [busqueda, setBusqueda] = useState('')
  const [diaActivo, setDiaActivo] = useState('4 de mayo')

  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  // Coincidencia flexible: todas las palabras buscadas deben aparecer en el nombre (en cualquier orden)
  const matchNombre = (responsable, termino) => {
    const normedR = norm(responsable)
    const palabras = norm(termino).trim().split(/\s+/).filter(Boolean)
    return palabras.every(p => normedR.includes(p))
  }

  // Buscar persona en todas las comisiones
  const resultadosBusqueda = busqueda.trim().length >= 2
    ? COMISIONES.filter(c =>
        c.responsables.some(r => matchNombre(r, busqueda))
      ).map(c => ({
        ...c,
        coincidentes: c.responsables.filter(r => matchNombre(r, busqueda))
      }))
    : []

  const TabBtn = ({ id, icon, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '8px 4px', cursor: 'pointer',
        background: tab === id ? C.blue : 'transparent',
        color: tab === id ? '#fff' : C.muted,
        border: 'none', borderBottom: tab === id ? `3px solid ${C.blueL}` : '3px solid transparent',
        fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
    </button>
  )

  return (
    <div style={S.page}>
      <Header extra={
        <button onClick={onBack} style={{ background: '#1d3a6e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          ← Volver
        </button>
      } />
      <div style={{ ...S.container, maxWidth: 760 }}>
        {/* Cabecera */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#1d3a6e', letterSpacing: 1 }}>
            📋 Logística
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Teatro Metropolitano · 4 y 5 de mayo de 2026</div>
        </div>

        {/* Lineamientos */}
        <div style={{ ...S.card, background: '#f0f7ff', border: `1px solid ${C.blue}44`, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: C.blueL, fontSize: 14, marginBottom: 10 }}>🎯 Objetivo y lineamientos generales</div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 10, fontStyle: 'italic' }}>
            Organizar, orientar y garantizar el adecuado desarrollo del espectáculo de los 80 años del colegio, asegurando una ejecución coordinada, segura y exitosa del evento.
          </div>
          {LINEAMIENTOS.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ color: C.blue, fontWeight: 800, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Fases de la operación logística */}
        <div style={{ ...S.card, marginBottom: 20, background: '#fafbff', border: `1px solid ${C.cardB}`, padding: '12px 16px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 800, color: '#1d3a6e', marginBottom: 10, letterSpacing: 0.5, borderLeft: '3px solid #b8972e', paddingLeft: 10 }}>
            FASES DE LA OPERACIÓN LOGÍSTICA
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Antes', desc: 'Verificación de espacios y materiales. Ensayo general y preparación de comisiones.', color: '#10b981' },
              { label: 'Durante', desc: 'Sincronía total con el espectáculo. Información inmediata a coordinaciones ante cualquier novedad.', color: '#1d6eed' },
              { label: 'Después', desc: 'Salida organizada. Entrega ordenada de estudiantes y colaboración en desmontaje.', color: '#b8972e' },
            ].map((fase) => (
              <div key={fase.label} style={{ flex: 1, background: '#fff', border: `1px solid ${C.cardB}`, borderRadius: 8, padding: '8px 10px', borderTop: `3px solid ${fase.color}` }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1d3a6e', marginBottom: 4 }}>{fase.label}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{fase.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: '12px 12px 0 0', border: `1px solid ${C.cardB}`, borderBottom: 'none', overflow: 'hidden', marginBottom: 0 }}>
          <TabBtn id="buscar" icon="🔍" label="Mi comisión" />
          <TabBtn id="comisiones" icon="📋" label="Comisiones" />
          <TabBtn id="guion" icon="🎭" label="Guión" />
          <TabBtn id="enescena" icon="🌟" label="En escena" />
          <TabBtn id="cronograma" icon="🕐" label="Cronograma" />
          <TabBtn id="mapa" icon="🗺️" label="Mapa" />
        </div>
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', border: `1px solid ${C.cardB}`, padding: '20px 18px', marginBottom: 20 }}>

          {/* Tab: Buscar mi comisión */}
          {tab === 'buscar' && (
            <div>
              {/* Banner hero */}
              <div style={{ background: 'linear-gradient(135deg, #1d3a6e 0%, #2a52a0 100%)', borderRadius: 12, padding: '20px 18px', marginBottom: 18, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>🔍</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5, marginBottom: 4 }}>¿A qué comisión perteneces?</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Escribe tu nombre y descubre tu rol en el espectáculo</div>
              </div>
              <input
                style={{ ...S.input, marginBottom: 16, fontSize: 15, border: `2px solid ${C.blue}`, boxShadow: `0 0 0 4px ${C.blue}18` }}
                placeholder="Ej: Sonia Franco, Carlos Giraldo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
              {busqueda.trim().length >= 2 && resultadosBusqueda.length === 0 && (
                <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                  No se encontró ninguna coincidencia para "<strong>{busqueda}</strong>".
                </div>
              )}
              {resultadosBusqueda.map((c, i) => (
                <div key={i} style={{ border: `2px solid ${C.blue}55`, borderRadius: 12, padding: '16px 18px', marginBottom: 14, background: '#f8fbff' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, fontWeight: 800, color: C.blueL, marginBottom: 4 }}>{c.nombre}</div>
                  {c.requerimientos && (
                    <div style={{ ...S.tag('#f59e0b'), marginBottom: 10, display: 'inline-block' }}>🔧 {c.requerimientos}</div>
                  )}
                  <div style={{ marginBottom: 10 }}>
                    {c.coincidentes.map((r, j) => (
                      <div key={j} style={{ display: 'inline-block', background: C.green + '22', color: C.green, border: `1px solid ${C.green}55`, borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700, marginRight: 6, marginBottom: 4 }}>
                        ✅ {r}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 6 }}>Funciones:</div>
                  {c.funciones.map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                      <span style={{ color: C.blue, flexShrink: 0 }}>›</span>
                      <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              ))}
              {busqueda.trim().length < 2 && (
                <div style={{ textAlign: 'center', padding: '10px 0 20px', color: C.muted, fontSize: 13 }}>
                  Escribe al menos 2 caracteres para buscar.
                </div>
              )}
            </div>
          )}

          {/* Tab: En escena */}
          {tab === 'enescena' && (
            <div>
              <div style={{ background: '#f0f7ff', border: `1px solid ${C.blue}33`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#1d3a6e' }}>
                <strong>🌟 Participantes todo el tiempo en escenario</strong> — Estudiantes que permanecen en escena durante el espectáculo, organizados por grado y rol.
              </div>
              {[
                {
                  grado: '2°',
                  coro: ['Santiago David Golenberg Aguirre','Mariana Arcila','Antonia Mejía Echeverry','Mía Echeverry Ordóñez','Miguel Ángel Patarrollo Correa','Sofía García Lopera','Martina Peña Vélez','Salomón Toledo Gómez','Emma Peñagos Vélez','Mariana Lloreda Ayerbe','Valeriano Quiroz Pinedo','Mariana Arcila Marrugo','Salomón Roldán Salas','Martina Villa Herrera','Jacobo Soto Muriel','Sarah Shoam Cano','Abril de la Cruz Uribe','Gastón Arango','Julieta Posada Piedrahita','Lucia Giraldo Gómez','Gregorio Quintero García','Joaquín Toro Solorzano','Pedro Gómez Botero','Salomón Salazar'],
                  vientos: [],
                  cuerdas: [],
                },
                {
                  grado: '3°',
                  coro: ['Filipa Celis','Olivia García','Emma Correa','Laura Korenfield','Amalia Gómez','Rebeca Mejía','Vicente Mendoza','Celeste Molina','Emma Ortiz','Magdalena Velásquez','Luna Toro','Elisa Ortiz','Sabina Bojanini','Victoria Quintero','Marcelo Escobar','Celeste Restrepo','Julieta Llano','Emma Vélez','Matías Villegas','Guadalupe Calle','Amalia Cano','Clemente Castrillón','David Cásallas','Mayan Milchgrub','Pedro Gómez','Tomás Ríos','Adelaida Hoyos','Thiago Saldarriaga','Pablo Jaramillo','Martín Ujueta'],
                  vientos: [],
                  cuerdas: ['Laura Korenfel Farberoff'],
                },
                {
                  grado: '4°',
                  coro: ['Gabriela Peláez','Juan Martín Betancourt','Pedro Ángel','Martina Cifuentes','Martina Barreto','Mala Nemas','Mariana Botero','Tomás Ríos','Joel Miranda','Lourdes Sierra','Gabriela Peláez','Martina Velasco','Lucía Pinzón','Máximo Trujillo'],
                  vientos: [],
                  cuerdas: ['Joaquín Díez Prada','Salomón Ríos','Lucía Pinzón'],
                },
                {
                  grado: '5°',
                  coro: ['Celeste Arcila Herrera','Helena Cardona García','Gema García Vélez','Alicia Henao Correa','Amalia Martínez Restrepo','Monserrat Molano Sierra','Martín Villegas Ceballos','Salomé Rojas González','Amalia Vagner Peñagos','Miranda Valencia Osorio','Antonio Begue Valderrama','Helena Cifuentes Arroyave'],
                  vientos: [],
                  cuerdas: ['Min Ky Shin','Juan Simón García','Julieta Ángel Pérez','Laura Korenfel Farberoff','Joaquín Díez Prada','Salomón Ríos','Lucía Pinzón','Min Ky Shin','Juan Simón García','Julieta Ángel Pérez','Vicente Saldarriaga','Agustín Vélez Vélez'],
                },
                {
                  grado: '6°',
                  coro: ['Martín Cano','Matías Llano','Vicente Vélez','Samuel Rodríguez','Matías Pineda','Julieta Peñate','Alicia Escobar','Valentina Arango','Elena Gómez','Simona Pérez','Emma Álzate','Paloma Milano','Alana Ramírez'],
                  vientos: ['Betancur Granda, Cristóbal','Jaramillo David, Joaquín','Vélez Rendón, Vicente','Ramírez Herrera, Isaac','Cano Ballesteros, Jacobo','Saray Uribe, Joel','Mejía Restrepo, Maximiliano','Álvarez Aristizabal, Emilio','López Aldana, Lucas','González García, Matías','Saldarriaga Hinestroza, Valentín','Aristizabal Vasquez, Simón','Vasquez Peña, Benjamín','Quintero Londoño, Juan Sebastián','Herrera Duque, Israel','Milchgrub, Raní Menachem','Martina Vélez'],
                  cuerdas: [],
                },
                {
                  grado: '7°',
                  coro: ['Noah Bluman','Amelia Montoya','Florencia Fernández','Maxi Cuervo','Miranda Montoya','Martina Giménez','Rafael Mejía','Martina Jaramillo','Martín Mejía','Tomás Restrepo Osorio','Manolo Valencia'],
                  vientos: ['Vasquez Zawadzky, Matías','Ceballos Álzate, Joaquín','Vega Álzate, Jerónimo','Shin, Aaron Myung Ki','Munera Carvajal, Emiliano','De la Espriella Zuluaga, Mateo','Zapata Fleisman, Miguel','Beltrán Galindo, Miguel','Jaramillo Sánchez, Miguel','Ordóñez Montoya, Miguel','Toro Ramírez Jerónimo','Wancier, Isaac','Muñoz Dávalos Maximo','Trujillo Ochoa, Cristóbal','Colorado Ealo, Lucia','Giraldo Gómez, Emilia','Gaviria Cardona, Miguel','Zuluaga Quintero, Matías'],
                  cuerdas: ['Builes Villegas, Valentina','Ortiz Hurtado, Valeria','Evangelista Solorzano, Amelia','Díaz Ossa, Alejandro','Posada Aguirre, Jacobo','Cappeletti Ospina, Mia','Apontes Ríos, Antonia','Roldán Jaramillo, Pedro José','Vagner Peñagos, Alicia','Valencia Londoño, Martina','Quintero García, Lorenzo','Paulo Botero','Miguel Sánchez','Mas Barbier, Sofía','Duque Espinosa, Salomón','Ramírez López, María Gabriela','Vélez Uribe, Emiliana'],
                },
                {
                  grado: '8°',
                  coro: ['María Villegas','Cristóbal Pineda','Matías Peñate','Simón Vélez','Lila Restrepo','María Ángel','Luciana Bravo','Antonia Calle','Alicia Marín','Valeria Piza','Ana Sofía Toro','Camila Valencia','Susana Valencia','Amelia Vélez','Antonia Gutiérrez','Violeta Montoya'],
                  vientos: ['García Zivic, Leandro Maximiliano','Correa Aguilar, Martín','Jaramillo Naranjo, Nicolás','Correa Aguilar, Jerónimo','Pérez Gómez, Miguel','Shin, Alexander Myung Soo','Lezer, Eden Ari','Gómez Ceballos, Emiliano','Milchgrub, Ombri'],
                  cuerdas: ['Arroyave Ospina, Jacobo','Pinzón Gil, Matías','Vasquez Salazar, Cristóbal','Acero Puerta, Jerónimo','Betancur Ossa, Gabriel','López Villegas, Matilda','Tobón Gaviria, Alejandro','Juan Diego Villa Henao','Belén Palacio Mejía','Sabina Helena Pérez','Martín Rojas','Miranda Velásquez'],
                },
                {
                  grado: '9°',
                  coro: ['Martín Restrepo Ocampo','Emiliano Calderón','María del Mar Agudelo','Manuela Rodríguez','Amalia Ruiz'],
                  vientos: ['Molina Echeverri, Pedro Juan','Giraldo Gómez, Gregorio','Zapata Ángel, Vicente','Calderón Arango, Isaac','Ríos Peláez, Matías','Begue Valderrama, Pedro','Vélez Rendón, Salvador','Restrepo Marulanda, Martín','Saray Uribe, Jacobo','Zuluaga Pórteles, Emiliano','Pardo González, Matías','Camila López','Lalinde Macías, Federico','Ramírez López, Federico','Miranda Vergara, Isaac'],
                  cuerdas: ['Gutiérrez Mesa, Cristóbal','Jaramillo Brunstein, Lucas Ilán','Jaramillo Soto, Rosario','Ángel Pérez, Nicolás','Arias López, Cristóbal','Cristóbal Herrera','Jacob Manuel Rojas','María Emilia Mejía','Estrada Ochoa, Lourdes','Saade Posada, Salomé','Aristizabal Moreno, Emilio','Tirado Amaya, José Manuel'],
                },
                {
                  grado: '10°',
                  coro: ['María Ñpaz Betancourt Patiño','Luciana Botero Pérez','Elena Builes Vesga','María de los Santos Herrera Duque','Martín Jones Osrio','Elías Melo Betancourt','María Belén Naranjo Munera','Sara Peláez Henao','María José Pérez Gómez','Leticia Pulgarín Ramírez','Guadalupe Rendón Jaramillo','Juan Pedro Restrepo Osorio'],
                  vientos: ['Guarnizo García, Isabela','Ossa Sierra, Juan José'],
                  cuerdas: ['Restrepo Marulanda, Sara','Hanah Olmos'],
                },
                {
                  grado: '11°',
                  coro: ['Jerónimo Gutiérrez','Jerónimo Mejía','Cristóbal Arango','Juliana Berrío','Juanita Bocanegra','Sigal Legher','Miranda Muñoz','Amelia Restrepo','Juliana Rico','Belén Toro','Susana Valencia','Luciana Vélez','Amalia Villegas','Juan Antonio García'],
                  vientos: ['Mc Pherson Franco, Thomas','Sánchez González, Alejandro','Tamayo Sánchez, Cristóbal','Castañeda Jaramillo, Jacobo','Vasquez Escobar, Ricardo'],
                  cuerdas: ['Jaramillo Arcila, Sofía','Boorla Gómez, Daniel','Palacio Mejía, Luciano','Paucar Sierra, Adelaida','Ramírez Echeverri, Isabella','Roldán Orosco, Alejandro','Jaramillo Brunstein, Tomás Isaac','Molina Echeverri, Nicolás','Restrepo Ocampo, Irene'],
                },
                {
                  grado: '12°',
                  coro: ['María Paz Aristizabal Muñoz','Salomé Cueter Jaramillo','María Antonia Echeverry Llano','Mía Garat Villegas','Andrés Gaviria González','Carolina Jaramillo Montes','Sofía Lalinde Macías','Sara Elena Prasquier Maza','Paloma Ramírez Avilez','Isabel Lara Aristizabal'],
                  vientos: ['Arismendi Monsalve, Matías','Giraldo Ramírez, Matías','Arango Raigoza, Camilo','Echeverry Maximiliano'],
                  cuerdas: ['Mejía Tirado, Elena','Toledo Giraldo, Paulina','Diego Yan Shen','Leona Lozanova','Matías Delgado','Lorenzo Restrepo','Diego Yan Shen'],
                },
              ].map((g, gi) => (
                <details key={gi} style={{ marginBottom: 10, border: `1px solid ${C.cardB}`, borderRadius: 10, overflow: 'hidden' }} open={gi === 0}>
                  <summary style={{ padding: '12px 16px', cursor: 'pointer', background: '#f5f8fc', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#1d3a6e', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, borderRadius: 8, padding: '2px 12px', minWidth: 38, textAlign: 'center' }}>{g.grado}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.blueL }}>
                      {g.coro.length > 0 && `🎵 ${g.coro.length} coro`}
                      {g.vientos.length > 0 && `  🎺 ${g.vientos.length} vientos`}
                      {g.cuerdas.length > 0 && `  🎻 ${g.cuerdas.length} cuerdas`}
                    </span>
                  </summary>
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {g.coro.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1d6eed', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>🎵 Coro</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {g.coro.map((n, i) => <span key={i} style={{ background: '#e8f0fb', color: '#1d3a6e', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>{n}</span>)}
                        </div>
                      </div>
                    )}
                    {g.vientos.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>🎺 Vientos</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {g.vientos.map((n, i) => <span key={i} style={{ background: '#e0f2fe', color: '#075985', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>{n}</span>)}
                        </div>
                      </div>
                    )}
                    {g.cuerdas.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>🎻 Cuerdas</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {g.cuerdas.map((n, i) => <span key={i} style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>{n}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* Tab: Guión */}
          {tab === 'guion' && (
            <div>
              <div style={{ background: '#f0f7ff', border: `1px solid ${C.blue}33`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#1d3a6e' }}>
                <strong>🎭 Orden del espectáculo</strong> — Revisa qué grupo entra y sale en cada escena para estar preparado en tu puesto.
              </div>
              {[
                {
                  seccion: 'OVERTURA',
                  color: '#7c3aed',
                  items: [
                    {
                      numero: 'Overtura',
                      obra: 'Inicio de los sueños',
                      coro: 'CORO: 2° y 4° (completos) · 7° 8° 9° 10° 11° 12° (selección) · ORQUESTA SELECCIÓN 6° a 12° · GRUPO POP',
                      danza: 'K5 canta',
                      solistas: 'Salomé Cueter (solista) · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Paloma Ramírez · Sofía Lalinde · Helena Cardona · Celeste Arcila · Adelaida Hoyos',
                      obs: 'Grado 5° no participa en Overtura y Acto 1 (baila en Escena 2). De 6° y 4° algunos alumnos de cuerdas y vientos participan tocando. Grado 3° no canta en Overtura y Acto 1 (baila en Escena 3).',
                    },
                  ],
                },
                {
                  seccion: 'ACTO 1',
                  color: '#1d6eed',
                  items: [
                    {
                      numero: 'Acto 1 · Esc 1',
                      obra: 'El baile de los sueños',
                      coro: 'CORO: 2° y 4° (completos) · 7° 8° 9° 10° 11° 12° (selección) · ORQUESTA SELECCIÓN 6° a 12°',
                      danza: '7° 8° 9° baila (selección) · 1° · Tambores y maracas',
                      solistas: 'Sofía Lalinde · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Paloma Ramírez · Helena Cardona · Celeste Arcila · Adelaida Hoyos',
                      obs: 'Grado 5° no participa (baila en Esc 2). Grado 6° alumnos de cuerdas y vientos participan. Grado 3° no canta (baila en Esc 3).',
                    },
                    {
                      numero: 'Acto 1 · Esc 2',
                      obra: 'Matanok Tanok',
                      coro: 'CORO: 2° y 4° (completos) · 7° 8° 9° 10° 11° 12° (selección) · ORQUESTA SELECCIÓN 6° a 12°',
                      danza: '5° baila',
                      solistas: 'Adelaida Hoyos · Salomé Cueter · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Paloma Ramírez · Sofía Lalinde · Helena Cardona · Celeste Arcila',
                      obs: 'Alumnos de danza del coro de 7° 8° 9° no pueden cantar en Overtura, Acto 1,2 y 3. Solo participan en Acto 4 y Final.',
                    },
                    {
                      numero: 'Acto 1 · Esc 3',
                      obra: 'The Gift of a Friend',
                      coro: 'CORO: 2° y 4° (completos) · 7° 8° 9° 10° 11° 12° (selección) · PISTA',
                      danza: '3° baila',
                      solistas: 'Isabel Lara · Sofía Lalinde · Salomé Cueter · Manuela Rodríguez · Carolina Jaramillo · Paloma Ramírez · Helena Cardona · Celeste Arcila · Adelaida Hoyos',
                      obs: 'Grado 5° no participa (baila en Esc 2). Grado 6° alumnos de cuerdas y vientos. Grado 3° no canta.',
                    },
                  ],
                },
                {
                  seccion: 'ACTO 2',
                  color: '#0891b2',
                  items: [
                    {
                      numero: 'Acto 2 · Esc 1',
                      obra: 'Renacer en mí',
                      coro: 'No hay coro',
                      danza: '10° 11° 12° baila (seleccionados)',
                      solistas: 'Salomé Cueter · Isabel Lara',
                      obs: '',
                    },
                    {
                      numero: 'Acto 2 · Esc 1',
                      obra: 'Algo nuevo',
                      coro: 'No hay coro',
                      danza: '7° 8° 9° baila',
                      solistas: 'Isabel Lara · Sofía Lalinde',
                      obs: 'Se preparan vientos (selección).',
                    },
                    {
                      numero: 'Acto 2 · Esc 2',
                      obra: 'Mi destino es hoy',
                      coro: 'No hay coro',
                      danza: '10° 11° 12° baila (seleccionados)',
                      solistas: 'Paloma Ramírez · Carolina Jaramillo · Manuela Rodríguez · Isabel Lara · Sofía Lalinde · Helena Cardona · Celeste Arcila · Adelaida Hoyos',
                      obs: '',
                    },
                    {
                      numero: 'Acto 2 · Esc 3',
                      obra: 'Un mundo diverso',
                      coro: 'CORO: 2° 3° 4° 5° (completos) · 7° 8° 9° 10° 11° 12° (selección)',
                      danza: '6° baila · K4 canta',
                      solistas: 'Adelaida Hoyos · Celeste Arcila · Elena Cardona · Alicia Escobar · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Paloma Ramírez · Sofía Lalinde · Helena Cardona',
                      obs: 'Grado 6° no participa en Acto 2 (baila en Esc 3). ENTRAN CUERDAS ACTO 3 — UN MUNDO DIVERSO. Al finalizar salen 2° y 4° a vestuario.',
                    },
                  ],
                },
                {
                  seccion: 'ACTO 3',
                  color: '#059669',
                  items: [
                    {
                      numero: 'Acto 3 · Esc 1',
                      obra: 'Who Would Think That Love',
                      coro: 'No hay coro · Pista',
                      danza: '7° 8° 9° baila',
                      solistas: 'Paloma Ramírez · Isabel Lara · Carolina Jaramillo · Manuela Rodríguez · Martín Mejía · Noah Bluman · Martín Restrepo Ocampo · Jerónimo Gutiérrez',
                      obs: '',
                    },
                    {
                      numero: 'Acto 3 · Esc 2',
                      obra: 'Vamos a cambiar el mundo',
                      coro: 'CORO: 2° 3° 4° 5° 6° (completos) · 7° 8° 9° 10° 11° 12° (selección) · ORQUESTA SELECCIÓN 7° a 12°',
                      danza: '1° Campanas seleccionados y cantan',
                      solistas: 'Emma Peñagos · Olivia García · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Paloma Ramírez · Sofía Lalinde · Helena Cardona · Celeste Arcila · Adelaida Hoyos',
                      obs: '2° y 4° NO CANTAN — están en vestuario. Grado 6° no alcanza a llegar de zona de vestuario.',
                    },
                    {
                      numero: 'Acto 3 · Esc 3',
                      obra: 'Send It On',
                      coro: 'No hay coro',
                      danza: 'Cello: Jerónimo Acero · Violín: Irene',
                      solistas: 'Manuela Rodríguez · Belén Toro · Isabel Lara · Sofía Lalinde · Carolina Jaramillo · Salomé Cueter · Paloma Ramírez',
                      obs: 'Grado 6° se sube a zona de coro.',
                    },
                  ],
                },
                {
                  seccion: 'ACTO 4',
                  color: '#b8972e',
                  items: [
                    {
                      numero: 'Acto 4 · Esc 1',
                      obra: 'El Amanecer (animales variados)',
                      coro: 'ORQUESTA SELECCIÓN 7° a 12°',
                      danza: '2° baila',
                      solistas: 'No hay',
                      obs: '',
                    },
                    {
                      numero: 'Acto 4 · Esc 2',
                      obra: 'Insectos / Génesis',
                      coro: 'ORQUESTA SELECCIÓN BANDA 7° a 12°',
                      danza: 'K3 baila',
                      solistas: 'No hay',
                      obs: '',
                    },
                    {
                      numero: 'Acto 4 · Esc 3',
                      obra: 'Reptiles / In the Hall of the Mountain King',
                      coro: 'ORQUESTA SELECCIÓN CUERDAS 7° a 12°',
                      danza: '4° baila',
                      solistas: 'No hay',
                      obs: '',
                    },
                    {
                      numero: 'Acto 4 · Esc 4',
                      obra: 'Aves / Morning',
                      coro: 'PISTA',
                      danza: 'K5 baila',
                      solistas: 'No hay',
                      obs: '',
                    },
                    {
                      numero: 'Acto 4 · Esc 5',
                      obra: 'Felinos / Furioso',
                      coro: 'ORQUESTA SELECCIÓN 7° a 12°',
                      danza: 'K4 baila',
                      solistas: 'No hay',
                      obs: '',
                    },
                    {
                      numero: 'Acto 4 · Esc 6',
                      obra: 'Peces / Agua',
                      coro: 'PISTA',
                      danza: '1° baila',
                      solistas: 'No hay',
                      obs: '',
                    },
                    {
                      numero: 'Acto 4 · Esc 7',
                      obra: 'Haskediyah Porachat',
                      coro: 'CORO: 2° 3° 4° 5° 6° (completos) · 7° 8° 9° 10° 11° 12° (selección) + alumnos de danza (si lo consideran) · ORQUESTA SELECCIÓN 7° a 12°',
                      danza: 'No hay',
                      solistas: 'Gemma García · Alicia Escobar · Celeste Arcila · Helena Cardona · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Paloma Ramírez · Sofía Lalinde · Adelaida Hoyos · Martín Mejía · Noah Bluman · Martín Restrepo Ocampo · Jerónimo Gutiérrez',
                      obs: 'Se integran algunos estudiantes de primaria que van a tocar.',
                    },
                  ],
                },
                {
                  seccion: 'FINAL',
                  color: '#dc2626',
                  items: [
                    {
                      numero: 'Final · Esc 1',
                      obra: 'Reach for the Stars',
                      coro: 'No hay coro · PISTA',
                      danza: '12° · K3',
                      solistas: 'Isabel Lara · Carolina Jaramillo · Sofía Lalinde · Paloma Ramírez · Salomé Cueter · Andrés Gaviria',
                      obs: '',
                    },
                    {
                      numero: 'Final',
                      obra: '80 Años de Historia',
                      coro: 'CORO: 2° 3° 4° 5° 6° (completos) + alumnos de danza (si lo consideran) · 7° 8° 9° 10° 11° 12° (selección) · ORQUESTA SELECCIÓN 7° a 12°',
                      danza: 'No hay',
                      solistas: 'Belén Toro · Paloma Ramírez · Manuela Rodríguez · Isabel Lara · Carolina Jaramillo · Sofía Lalinde · Helena Cardona · Celeste Arcila · Adelaida Hoyos · Gemma García · Alicia Escobar · Emma Peñagos · Olivia García · Martín Mejía · Noah Bluman · Martín Restrepo Ocampo · Jerónimo Gutiérrez',
                      obs: 'TODO EL COLEGIO SALE Y PARTICIPA CANTANDO: alumnos de danza, teatro, logística (según lista), docentes, administrativos, servicios generales y logísticos, entre otros.',
                    },
                  ],
                },
              ].map((seccion, si) => (
                <div key={si} style={{ marginBottom: 20 }}>
                  <div style={{ background: seccion.color, color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 1, padding: '7px 14px', borderRadius: 8, marginBottom: 8, textTransform: 'uppercase' }}>
                    {seccion.seccion}
                  </div>
                  {seccion.items.map((item, ii) => (
                    <details key={ii} style={{ marginBottom: 8, border: `1px solid ${C.cardB}`, borderRadius: 10, overflow: 'hidden', borderLeft: `4px solid ${seccion.color}` }}>
                      <summary style={{ padding: '11px 14px', cursor: 'pointer', background: '#f8fafc', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#1d3a6e' }}>{item.numero}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: seccion.color, marginLeft: 10 }}>{item.obra}</span>
                        </div>
                        <span style={{ fontSize: 11, color: C.muted }}>▼</span>
                      </summary>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>🎵 Coro / Orquesta</div>
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item.coro}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>💃 Danza / Música</div>
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item.danza}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>🎤 Solistas y acompañantes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {item.solistas.split(' · ').map((s, si2) => (
                              <span key={si2} style={{ background: '#e8f0fb', color: '#1d3a6e', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                        {item.obs && (
                          <div style={{ background: '#fffbeb', border: '1px solid #f59e0b44', borderRadius: 8, padding: '8px 11px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>⚠️ Observaciones</div>
                            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>{item.obs}</div>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Tab: Todas las comisiones */}
          {tab === 'comisiones' && (
            <div>
              {COMISIONES.map((c, i) => (
                <details key={i} style={{ marginBottom: 10, border: `1px solid ${C.cardB}`, borderRadius: 10, overflow: 'hidden' }}>
                  <summary style={{ padding: '13px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#f5f8fc', color: C.blueL, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{c.nombre}</span>
                    {c.requerimientos && <span style={{ ...S.tag('#f59e0b'), fontSize: 11 }}>🔧 {c.requerimientos}</span>}
                  </summary>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Responsables</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {c.responsables.map((r, j) => (
                          <span key={j} style={{ background: '#e8f0fb', color: '#1d3a6e', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Funciones</div>
                    {c.funciones.map((f, j) => (
                      <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                        <span style={{ color: C.blue, flexShrink: 0 }}>›</span>
                        <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* Tab: Cronograma */}
          {tab === 'cronograma' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {['4 de mayo', '5 de mayo'].map(d => (
                  <button key={d} onClick={() => setDiaActivo(d)} style={{
                    flex: 1, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 8,
                    background: diaActivo === d ? C.blue : '#f5f8fc',
                    color: diaActivo === d ? '#fff' : C.muted,
                    border: `1px solid ${diaActivo === d ? C.blueL : C.cardB}`,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {d === '4 de mayo' ? '☀️ Lunes 4 de mayo' : '🌤️ Martes 5 de mayo'}
                  </button>
                ))}
              </div>
              {CRONOGRAMA[diaActivo].map((item, i) => (
                item.tipo === 'nota'
                  ? (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 110, flexShrink: 0 }} />
                      <div style={{ flex: 1, background: '#fffbea', border: '1px solid #f59e0b88', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#7c5a00', lineHeight: 1.5 }}>
                        <strong>📌 Nota:</strong> {item.desc}
                      </div>
                    </div>
                  ) : (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 110, fontSize: 12, fontWeight: 800, color: C.blue, textAlign: 'right', paddingTop: 2, flexShrink: 0 }}>{item.hora}</div>
                      <div style={{ width: 3, background: C.cardB, borderRadius: 4, alignSelf: 'stretch', flexShrink: 0 }} />
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  )
              ))}
            </div>
          )}

          {/* Tab: Mapa */}
          {tab === 'mapa' && (
            <div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>Plano del evento. Pellizca o usa el scroll para hacer zoom.</div>
              <div style={{ borderRadius: 10, overflowX: 'auto', overflowY: 'hidden', border: `1px solid ${C.cardB}`, WebkitOverflowScrolling: 'touch' }}>
                <img
                  src="/mapadelevento.jpg"
                  alt="Mapa del evento"
                  style={{ width: '900px', maxWidth: 'none', display: 'block' }}
                />
              </div>
              <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 }}>← Desliza horizontalmente para ver el mapa completo →</div>
            </div>
          )}
        </div>

        {/* Frase motivacional */}
        <div style={{ background: 'linear-gradient(135deg, #1d3a6e, #2a52a0)', borderRadius: 14, padding: '18px 20px', marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✨</div>
          <div style={{ fontSize: 14, color: '#fff', fontStyle: 'italic', lineHeight: 1.7, fontWeight: 500 }}>
            "Este evento es el reflejo del trabajo, la dedicación y el amor por nuestra comunidad educativa.
            <br />Cada rol es fundamental para que este espectáculo sea una experiencia inolvidable."
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LOGIN LOGÍSTICA ──────────────────────────────────────────────────────────
function LoginLogistica({ onLogin, onBack }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const PIN_LOG = import.meta.env.VITE_DIRECTOR_PIN || 'musical80'

  const handleLogin = (e) => {
    e.preventDefault()
    if (pin === PIN_LOG) { onLogin() }
    else { setError('PIN incorrecto'); setPin('') }
  }

  return (
    <div style={S.page}>
      <Header extra={
        <button onClick={onBack} style={{ background: '#1d3a6e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          ← Volver
        </button>
      } />
      <div style={{ ...S.container, maxWidth: 380, paddingTop: 60 }}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Logística — Personal Colegio</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Esta sección es solo para docentes, directivos y personal de servicio.</div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              style={{ ...S.input, textAlign: 'center', fontSize: 20, letterSpacing: 6, marginBottom: 14 }}
              placeholder="••••••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
            />
            {error && <div style={{ color: C.red, marginBottom: 10, fontSize: 13 }}>{error}</div>}
            <button type="submit" style={{ ...S.btn(C.blue), width: '100%' }}>Ingresar</button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── PANEL DIRECTORES ─────────────────────────────────────────────────────────
function PanelDirectores({ onLogout }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroSec, setFiltroSec] = useState('')
  const [filtroDia, setFiltroDia] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [saving, setSaving] = useState({})
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 20
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (!error) setSubmissions(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Tiempo real: escuchar cambios en submissions ─────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('submissions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(r => r.id === payload.new.id ? payload.new : r))
        } else if (payload.eventType === 'DELETE') {
          setSubmissions(prev => prev.filter(r => r.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const toggle = async (id, field, currentVal) => {
    setSaving(s => ({ ...s, [id + field]: true }))
    await supabase.from('submissions').update({ [field]: !currentVal }).eq('id', id)
    setSubmissions(prev => prev.map(r => r.id === id ? { ...r, [field]: !currentVal } : r))
    setSaving(s => ({ ...s, [id + field]: false }))
  }

  const saveObs = async (id, field, value) => {
    await supabase.from('submissions').update({ [field]: value }).eq('id', id)
    setSubmissions(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  // Filtrar
  const filtered = submissions.filter(r => {
    const matchSec = !filtroSec || r.seccion === filtroSec
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const matchBus = !busqueda || norm(r.nombre).includes(norm(busqueda))
    if (!matchSec || !matchBus) return false
    if (filtroDia === 'd4_pendiente') return !r.d4_checked
    if (filtroDia === 'd5_pendiente') return !r.d5_checked
    return true
  })

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA)
  const paginados = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const secLabel = filtroSec ? nombreSeccion(filtroSec) : 'Todos los grupos'
    const diaLabel = filtroDia === 'todos' ? 'Ambos días' : filtroDia === 'lunes' ? 'Lunes 4 de mayo' : 'Martes 5 de mayo'

    // Encabezado
    doc.setFontSize(16)
    doc.setTextColor(29, 110, 237)
    doc.text('CTH · 80 Años Creando Memorias', 14, 14)
    doc.setFontSize(10)
    doc.setTextColor(90, 122, 154)
    doc.text(`Listado de Recogida · ${secLabel} · ${diaLabel}`, 14, 21)
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 27)

    const head = [['Estudiante', 'Grado', 'Lunes 4 - Quien recoge', 'Recogido Lunes', 'Martes 5 - Quien recoge', 'Recogido Martes']]
    const body = filtered.map(r => {
      const d4 = r.day4 || {}
      const d5 = r.day5 || {}
      const fmt = (d) => d.tipo === 'padres'
        ? 'Papa / Mama'
        : d.tipo === 'autorizado'
          ? `${d.nombre || ''}\nCC: ${d.cedula || ''} - ${d.parentesco || ''}\nCel: ${d.celular || ''}${d.placa ? ' - Placa: ' + d.placa : ''}`
          : '-'
      return [
        r.nombre,
        nombreSeccion(r.seccion),
        fmt(d4),
        r.d4_checked ? 'Si' : '-',
        fmt(d5),
        r.d5_checked ? 'Si' : '-',
      ]
    })

    autoTable(doc, {
      startY: 32,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [29, 110, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 249] },
      columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 26 }, 2: { cellWidth: 62 }, 3: { cellWidth: 26 }, 4: { cellWidth: 62 }, 5: { cellWidth: 26 } },
      didParseCell: (data) => {
        // Columnas 2 y 3 = Lunes (azul claro)
        if (data.column.index === 2 || data.column.index === 3) {
          if (data.section === 'head') data.cell.styles.fillColor = [30, 90, 180]
          else data.cell.styles.fillColor = [220, 234, 255]
        }
        // Columnas 4 y 5 = Martes (verde claro)
        if (data.column.index === 4 || data.column.index === 5) {
          if (data.section === 'head') data.cell.styles.fillColor = [14, 130, 100]
          else data.cell.styles.fillColor = [210, 245, 230]
        }
      },
    })

    const secFile = filtroSec ? nombreSeccion(filtroSec).replace(/\s+/g, '_') : 'todas'
    doc.save(`recogida_cth80_${secFile}_${filtroDia}.pdf`)
  }

  const countD4 = filtered.filter(r => r.d4_checked).length
  const countD5 = filtered.filter(r => r.d5_checked).length

  return (
    <div style={S.page}>
      <Header extra={
        <button
          style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}
          onClick={onLogout}
        >
          🚪 Cerrar
        </button>
      } />
      <div style={S.container}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
          Panel de Directores
        </div>

        {/* Filtros */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <label style={S.label}>🔍 Buscar estudiante</label>
              <input style={S.input} placeholder="Nombre..." value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1) }} />
            </div>
            <div>
              <label style={S.label}>📚 Filtrar por grupo</label>
              <select style={S.select} value={filtroSec} onChange={e => { setFiltroSec(e.target.value); setPagina(1) }}>
                <option value="">Todos los grupos</option>
                {[...SECCIONES].sort((a, b) => {
                  const ia = GRADOS_ORDEN.indexOf(a.split(' - ')[0])
                  const ib = GRADOS_ORDEN.indexOf(b.split(' - ')[0])
                  return ia !== ib ? ia - ib : a.localeCompare(b)
                }).map(s => <option key={s} value={s}>{shortName(s)}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>📅 Filtrar por día</label>
              <select style={S.select} value={filtroDia} onChange={e => { setFiltroDia(e.target.value); setPagina(1) }}>
                <option value="todos">Todos</option>
                <option value="d4_pendiente">Lunes 4 — Pendientes</option>
                <option value="d5_pendiente">Martes 5 — Pendientes</option>
              </select>
            </div>
          </div>

          {/* Stats + acciones */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={S.tag(C.blue)}>{filtered.length} registros</span>
            <span style={S.tag(C.green)}>L4: {countD4}/{filtered.length} recogidos</span>
            <span style={S.tag(C.yellow)}>M5: {countD5}/{filtered.length} recogidos</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button style={S.btnSm(C.green)} onClick={exportPDF} title="Exportar vista actual a PDF">
                ⬇️ Exportar PDF
              </button>
              <button style={S.btnSm(C.cardB)} onClick={fetchData} title="Refrescar datos">
                🔄 Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>No hay registros para este filtro.</div>
        ) : (
          <>
            {paginados.map(r => (
              <RowSubmission key={r.id} r={r} onToggle={toggle} onSaveObs={saveObs} saving={saving} />
            ))}
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                <button
                  style={{ ...S.btnSm(pagina === 1 ? C.cardB : C.blue), opacity: pagina === 1 ? 0.5 : 1, cursor: pagina === 1 ? 'default' : 'pointer' }}
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                >← Anterior</button>
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>
                  Página {pagina} de {totalPaginas} · {filtered.length} registros
                </span>
                <button
                  style={{ ...S.btnSm(pagina === totalPaginas ? C.cardB : C.blue), opacity: pagina === totalPaginas ? 0.5 : 1, cursor: pagina === totalPaginas ? 'default' : 'pointer' }}
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                >Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Fila de submission ───────────────────────────────────────────────────────
function RowSubmission({ r, onToggle, onSaveObs, saving }) {
  const [obs4, setObs4] = useState(r.d4_obs || '')
  const [obs5, setObs5] = useState(r.d5_obs || '')

  const d4 = r.day4 || {}
  const d5 = r.day5 || {}

  const recogeLabel = (d) => d.tipo === 'padres'
    ? <span style={S.tag(C.blue)}>Papá/Mamá</span>
    : <span style={S.tag(C.yellow)}>Autorizado: {d.nombre}</span>

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{r.nombre}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{shortName(r.seccion)}</div>
          {r.pin && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, background: '#fff8e1', border: '1px solid #f59e0b99', borderRadius: 6, padding: '2px 8px' }}>
              <span style={{ fontSize: 11, color: '#92610a', fontWeight: 600 }}>🔑 PIN:</span>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: '#1a2a3a', fontFamily: 'monospace' }}>{r.pin}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString('es-CO') : ''}</div>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {/* Día 4 */}
        <DiaPanel
          label="☀️ Lunes 4 de mayo"
          recoge={recogeLabel(d4)}
          auth={d4}
          checked={r.d4_checked}
          obs={obs4}
          onObs={setObs4}
          onToggle={() => onToggle(r.id, 'd4_checked', r.d4_checked)}
          onSaveObs={() => onSaveObs(r.id, 'd4_obs', obs4)}
          isSaving={saving[r.id + 'd4_checked']}
        />
        {/* Día 5 */}
        <DiaPanel
          label="🌤️ Martes 5 de mayo"
          recoge={recogeLabel(d5)}
          auth={d5}
          checked={r.d5_checked}
          obs={obs5}
          onObs={setObs5}
          onToggle={() => onToggle(r.id, 'd5_checked', r.d5_checked)}
          onSaveObs={() => onSaveObs(r.id, 'd5_obs', obs5)}
          isSaving={saving[r.id + 'd5_checked']}
        />
      </div>
    </div>
  )
}

function DiaPanel({ label, recoge, auth, checked, obs, onObs, onToggle, onSaveObs, isSaving }) {
  return (
    <div style={{ background: '#f5f8fc', borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.cardB}` }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 600, marginBottom: 8, color: C.blueL }}>{label}</div>
      <div style={{ marginBottom: 8 }}>{recoge}</div>
      {auth.tipo === 'autorizado' && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.6 }}>
          {auth.cedula && <div>CC: {auth.cedula}</div>}
          {auth.parentesco && <div>Parentesco: {auth.parentesco}</div>}
          {auth.celular && <div>Cel: {auth.celular}</div>}
          {auth.placa && <div>Placa: {auth.placa}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button
          onClick={onToggle}
          disabled={isSaving}
          style={{
            ...S.btnSm(checked ? C.green : '#1a2a1a'),
            border: `1px solid ${checked ? C.green : '#2a4a2a'}`,
            flex: 1,
          }}
        >
          {isSaving ? '...' : checked ? '✅ Recogido' : '⬜ Marcar recogido'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          style={{ ...S.input, fontSize: 12, padding: '6px 10px', flex: 1 }}
          placeholder="Observación..."
          value={obs}
          onChange={e => onObs(e.target.value)}
        />
        <button style={S.btnSm(C.cardB)} onClick={onSaveObs} title="Guardar observación">💾</button>
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
// ─── Hook: contador de registros en tiempo real ───────────────────────────────
function useContadorRegistros() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    // Carga inicial
    supabase.from('submissions').select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0))

    // Escuchar INSERT y DELETE en tiempo real
    const channel = supabase
      .channel('contador-registros')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => {
        setCount(c => (c ?? 0) + 1)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'submissions' }, () => {
        setCount(c => Math.max(0, (c ?? 0) - 1))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return count
}

function Header({ extra }) {
  const count = useContadorRegistros()
  return (
    <div style={{ ...S.header, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', gap: 8 }}>
      <div style={{ flexShrink: 0, minWidth: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
        <img src="/logo80.png" alt="Logo 80 años" style={{ height: 80, width: 'auto', objectFit: 'contain' }} />
        {count !== null && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#43a047', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
            {count} de {TOTAL_ESTUDIANTES} estudiantes registrados
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>{extra}</div>
    </div>
  )
}

// ─── Login directores ─────────────────────────────────────────────────────────
function LoginDirectores({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showChangePin, setShowChangePin] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const storedPin = () => localStorage.getItem('director_pin') || PIN_DEFAULT

  const handleLogin = (e) => {
    e.preventDefault()
    if (pin === storedPin()) {
      onLogin()
    } else {
      setError('PIN incorrecto')
      setTimeout(() => setError(''), 2000)
    }
  }

  const handleChangePin = () => {
    if (newPin.length < 4) return setError('El PIN debe tener al menos 4 caracteres')
    if (newPin !== confirmPin) return setError('Los PINs no coinciden')
    localStorage.setItem('director_pin', newPin)
    setShowChangePin(false)
    setNewPin('')
    setConfirmPin('')
    setError('')
  }

  return (
    <div style={S.page}>
      <Header />
      <div style={{ ...S.container, maxWidth: 400, paddingTop: 60 }}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Acceso Directores</div>

          {!showChangePin ? (
            <form onSubmit={handleLogin}>
              <input
                type="password"
                style={{ ...S.input, textAlign: 'center', fontSize: 20, letterSpacing: 6, marginBottom: 14 }}
                placeholder="••••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
              />
              {error && <div style={{ color: C.red, marginBottom: 10, fontSize: 13 }}>{error}</div>}
              <button type="submit" style={{ ...S.btn(C.blue), width: '100%' }}>Entrar</button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// ─── Modal Habeas Data / Términos ────────────────────────────────────────────
function ModalTerminos({ onAceptar }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,20,50,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px 16px 0 0', padding: '0',
        maxWidth: 520, width: '100%', boxShadow: '0 -4px 30px rgba(0,0,0,0.25)',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle / drag indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, background: '#dde3ec', borderRadius: 4 }} />
        </div>

        {/* Contenido scrolleable */}
        <div style={{ overflowY: 'auto', padding: '16px 20px 12px', flex: 1 }}>
          {/* Logo + título */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img src="/logo80.png" alt="Logo" style={{ height: 44, marginBottom: 8 }} />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: '#1a2a3a' }}>
              Autorización de Tratamiento de Datos
            </div>
            <div style={{ fontSize: 12, color: '#5a7a9a', marginTop: 2 }}>
              Colegio Theodoro Herzl · Evento 80 Años
            </div>
          </div>

          {/* Texto legal */}
          <div style={{ fontSize: 13, color: '#2a3a4a', lineHeight: 1.65, marginBottom: 8 }}>
            <p>De conformidad con la <strong>Ley 1581 de 2012</strong> (Habeas Data) y el <strong>Decreto 1377 de 2013</strong> de la República de Colombia, el <strong>Colegio Theodoro Herzl</strong> le informa que los datos personales que usted suministre serán tratados de forma confidencial:</p>

            <ul style={{ paddingLeft: 16, margin: '10px 0' }}>
              <li><strong>Finalidad:</strong> Coordinación y control de la recogida de estudiantes durante el evento <strong>"80 Años Creando Memorias"</strong> (4 y 5 de mayo de 2026), Teatro Metropolitano de Medellín.</li>
              <li style={{ marginTop: 8 }}><strong>Responsable:</strong> Colegio Theodoro Herzl — Medellín, Colombia.</li>
              <li style={{ marginTop: 8 }}><strong>Confidencialidad:</strong> La información es estrictamente confidencial y no será cedida a terceros. Solo accederá el personal necesario para la coordinación del evento.</li>
              <li style={{ marginTop: 8 }}><strong>Almacenamiento:</strong> Los datos serán conservados únicamente durante el período del evento y eliminados posteriormente.</li>
              <li style={{ marginTop: 8 }}><strong>Derechos:</strong> Puede conocer, actualizar, rectificar y suprimir sus datos comunicándose con la institución.</li>
            </ul>

            <p style={{ marginTop: 10 }}>Al hacer clic en <strong>"Acepto y continuar"</strong>, declara haber leído y aceptado el tratamiento de sus datos.</p>
          </div>
        </div>

        {/* Botón fijo al fondo */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #edf0f5', background: '#fff', borderRadius: '0 0 16px 16px' }}>
          <button
            onClick={onAceptar}
            style={{
              width: '100%', background: '#1d6eed', color: '#fff', border: 'none',
              borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 2px 10px rgba(29,110,237,0.3)',
            }}
          >
            ✅ Acepto y continuar
          </button>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#9aacbe' }}>
            Si no acepta, no podrá diligenciar el formulario.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  // URL routing simple: si hay ?panel en la URL → panel
  const isPanel = window.location.search.includes('panel') || window.location.pathname.includes('panel')
  const [view, setView] = useState(isPanel ? 'login' : 'form')
  const [authed, setAuthed] = useState(false)
  const [logAuthed, setLogAuthed] = useState(false)
  // Términos: directores y logística no necesitan aceptar
  const [termAceptado, setTermAceptado] = useState(() => sessionStorage.getItem('termAceptado') === 'si' || isPanel)

  const aceptarTerminos = () => {
    sessionStorage.setItem('termAceptado', 'si')
    setTermAceptado(true)
  }

  const extraBtns = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        style={{ background: '#1d6e3a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
        onClick={() => setView(logAuthed ? 'logistica' : 'loginLogistica')}
      >
        📋 Logística
      </button>
      <button
        style={{ background: '#1d3a6e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
        onClick={() => setView('login')}
      >
        🔐 Directores
      </button>
    </div>
  )

  return (
    <div>
      {/* Modal de términos — solo para el formulario de padres */}
      {!termAceptado && view === 'form' && <ModalTerminos onAceptar={aceptarTerminos} />}

      {view === 'form' && <FormularioPadres extra={extraBtns} />}
      {view === 'login' && !authed && (
        <LoginDirectores onLogin={() => { setAuthed(true); setView('panel') }} />
      )}
      {view === 'panel' && authed && (
        <PanelDirectores onLogout={() => { setAuthed(false); setView('form') }} />
      )}
      {view === 'loginLogistica' && (
        <LoginLogistica
          onLogin={() => { setLogAuthed(true); setView('logistica') }}
          onBack={() => setView('form')}
        />
      )}
      {view === 'logistica' && logAuthed && (
        <LogisticaView onBack={() => setView('form')} />
      )}
    </div>
  )
}
