// Elementos del DOM
const rojo = document.getElementById('rojo')
const verde = document.getElementById('verde')
const tiempoInput = document.getElementById('tiempo')
const startBtn = document.getElementById('startBtn')
const resetBtn = document.getElementById('resetBtn')
const tiempoRestanteEl = document.getElementById('tiempoRestante')
const countdownEl = document.getElementById('countdown')
const countEl = document.getElementById('count')
const statusEl = document.getElementById('status')
const resetCounterBtn = document.getElementById('resetCounterBtn')
const clearHistoryBtn = document.getElementById('clearHistoryBtn')
const historyListEl = document.getElementById('historyList')
const historyTotalTimeEl = document.getElementById('historyTotalTime')

// temporizadores
let timerTimeout = null
let countdownInterval = null

// tiempo en verde
let greenStart = null
let greenInterval = null
let lastGreenMs = 0

// contador de fumadas (persistente en localStorage)
const STORAGE_KEY = 'smokeCount'
let smokeCount = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
countEl.textContent = smokeCount
const HISTORY_KEY = 'greenHistory'

// --- funciones para controlar las luces ---
function limpiarLuces() {
    rojo.classList.remove('rojoActivo')
    verde.classList.remove('verdeActivo')
}

function encenderRojo() {
    // si estaba en verde, guardar el periodo verde
    if (greenInterval) { clearInterval(greenInterval); greenInterval = null }
    if (greenStart) {
        const elapsed = Date.now() - greenStart
        greenStart = null
        lastGreenMs = elapsed
        addGreenRecord(elapsed)
        // ocultar contador mientras esté en rojo
        if (countdownEl) countdownEl.classList.add('hidden')
    }
    limpiarLuces()
    rojo.classList.add('rojoActivo')
}

function encenderVerde() {
    limpiarLuces()
    verde.classList.add('verdeActivo')
    // mostrar contador y iniciar desde 0 al ponerse en verde
    if (countdownEl) countdownEl.classList.remove('hidden')
    if (greenInterval) { clearInterval(greenInterval); greenInterval = null }
    greenStart = Date.now()
    lastGreenMs = 0
    tiempoRestanteEl.textContent = msToTime(0)
    greenInterval = setInterval(() => {
        const elapsed = Date.now() - greenStart
        tiempoRestanteEl.textContent = msToTime(elapsed)
    }, 250)
}

// --- historial ---
function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch (e) {
        console.error('Error leyendo historial', e)
        return {}
    }
}

function saveHistory(obj) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(obj))
    } catch (e) {
        console.error('Error guardando historial', e)
    }
}

function getTodayStr() {
    return new Date().toISOString().slice(0, 10)
}

function addGreenRecord(ms) {
    if (!ms || ms <= 0) return
    const hist = loadHistory()
    const today = getTodayStr()
    if (!hist[today]) hist[today] = []
    hist[today].push({ ms: ms, at: Date.now() })
    saveHistory(hist)
    renderHistory()
}

function renderHistory() {
    const hist = loadHistory()
    const today = getTodayStr()
    const list = hist[today] || []
    historyListEl.innerHTML = ''
    let total = 0
    for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i]
        const li = document.createElement('li')
        const time = new Date(item.at).toLocaleTimeString()
        li.textContent = `${time} — ${msToTime(item.ms)}`
        historyListEl.appendChild(li)
        total += item.ms
    }
    historyTotalTimeEl.textContent = msToTime(total)
}

function resetCounter() {
    smokeCount = 0
    localStorage.setItem(STORAGE_KEY, String(smokeCount))
    countEl.textContent = smokeCount
    setStatus('Contador reseteado.')
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
    renderHistory()
    setStatus('Historial borrado.')
}

// --- utilidades ---
function msToTime(ms) {
    if (ms <= 0) return '00:00'
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
}

function setStatus(message, isError = false) {
    statusEl.textContent = message
    statusEl.style.color = isError ? 'salmon' : 'lightgreen'
}

function disableControls(disabled) {
    tiempoInput.disabled = disabled
    startBtn.disabled = disabled
}

// --- lógica principal ---
function iniciar() {
    try {
        let minutos = parseFloat(tiempoInput.value)

        // validaciones
        if (Number.isNaN(minutos)) {
            // si está vacío, asumimos 1 por defecto
            minutos = 1
            setStatus('Tiempo vacío: usando 1 minuto por defecto.')
        }

        if (minutos <= 0) {
            setStatus('Introduce un número de minutos mayor que 0.', true)
            return
        }

        // convertimos a ms
        const tiempoMs = minutos * 60 * 1000

        // incrementar contador porque el usuario inició (fuma)
        smokeCount = (smokeCount || 0) + 1
        localStorage.setItem(STORAGE_KEY, String(smokeCount))
        countEl.textContent = smokeCount

        // ponemos semáforo en rojo y preparamos transición a verde
        encenderRojo()

        // si estaba contando tiempo en verde, lo detenemos y guardamos
        if (greenInterval) {
            clearInterval(greenInterval)
            greenInterval = null
            if (greenStart) lastGreenMs = Date.now() - greenStart
            greenStart = null
        }

        // limpiamos temporizadores anteriores
        if (timerTimeout) clearTimeout(timerTimeout)
        if (countdownInterval) clearInterval(countdownInterval)

        // deshabilitar input mientras cuenta
        disableControls(true)

    // ocultar contador mientras esté en rojo
    if (countdownEl) countdownEl.classList.add('hidden')

        // programa el cambio a verde
        timerTimeout = setTimeout(() => {
            encenderVerde()
            setStatus('Semáforo en verde.')
            disableControls(false)
            timerTimeout = null
        }, tiempoMs)

        setStatus('Temporizador iniciado y contador incrementado.')
    } catch (err) {
        console.error(err)
        setStatus('Error al iniciar: ' + (err.message || err), true)
        disableControls(false)
    }
}

// función llamada por el botón Reiniciar / cuando el usuario fuma
function volverRojo() {
    try {
        // incrementar contador
        smokeCount = (smokeCount || 0) + 1
        localStorage.setItem(STORAGE_KEY, String(smokeCount))
        countEl.textContent = smokeCount

        // encender rojo y cancelar temporizadores
        encenderRojo()
        if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null }
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }

        // detener contador verde si estaba activo y guardar tiempo
        if (greenInterval) { clearInterval(greenInterval); greenInterval = null }
        if (greenStart) {
            lastGreenMs = Date.now() - greenStart
            greenStart = null
        }

    // el cronómetro está oculto en rojo; el periodo verde ya se guardó en el historial
    if (countdownEl) countdownEl.classList.add('hidden')
        setStatus('Se ha reiniciado a rojo. Contador incrementado.')

        // permitir iniciar de nuevo
        disableControls(false)
    } catch (err) {
        console.error(err)
        setStatus('Error al reiniciar: ' + (err.message || err), true)
    }
}

// --- eventos ---
startBtn.addEventListener('click', iniciar)
resetBtn.addEventListener('click', volverRojo)
resetCounterBtn.addEventListener('click', resetCounter)
clearHistoryBtn.addEventListener('click', clearHistory)

// accesibilidad: permitir Enter en el input para iniciar
tiempoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') iniciar()
})

// estado inicial: mostrar contador y empezar en verde
countEl.textContent = smokeCount
// al iniciar la página, ponemos en verde y empezamos a contar tiempo en verde
encenderVerde()
// renderizar historial al cargar
renderHistory()