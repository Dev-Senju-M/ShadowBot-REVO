const fs = require('fs');
const path = require('path');
const axios = require('axios');

const personalidadPath = path.join(__dirname, '../personalidad.json');
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const MODELOS_VALIDOS = {
    rapido: 'claude-haiku-4-5-20251001',
    equilibrado: 'claude-sonnet-5',
};

const DEFAULT_PERSONALIDAD = {
    nombre: 'Shadow',
    personalidad: 'Eres Shadow, el espíritu con IA del Santuario Mocho. Hablas en español, con tono cercano, un poco misterioso y nocturno, pero siempre claro y útil.',
    modelo: MODELOS_VALIDOS.rapido,
    activada: true,
};

// Evita spam/abuso y controla el costo: un usuario no puede pedir dos
// respuestas de IA en menos de este tiempo.
const COOLDOWN_MS = 8 * 1000;
const cooldowns = new Map(); // userId -> timestamp del último uso

class AIError extends Error {
    constructor(message, tipo) {
        super(message);
        this.tipo = tipo; // 'sin_api_key' | 'api_error' | 'desactivada'
    }
}

function getPersonalidad() {
    try {
        return { ...DEFAULT_PERSONALIDAD, ...JSON.parse(fs.readFileSync(personalidadPath, 'utf8')) };
    } catch {
        return { ...DEFAULT_PERSONALIDAD };
    }
}

function savePersonalidad(cambios) {
    const actual = getPersonalidad();
    const nueva = { ...actual, ...cambios };
    fs.writeFileSync(personalidadPath, JSON.stringify(nueva, null, 2));
    return nueva;
}

// Devuelve los segundos restantes de cooldown para un usuario, o 0 si ya puede usar la IA.
function segundosRestantesCooldown(userId) {
    const ultimo = cooldowns.get(userId);
    if (!ultimo) return 0;
    const restante = COOLDOWN_MS - (Date.now() - ultimo);
    return restante > 0 ? Math.ceil(restante / 1000) : 0;
}

function marcarUso(userId) {
    cooldowns.set(userId, Date.now());
}

/**
 * Envía una consulta a la IA usando la personalidad configurada del bot.
 * @param {string} pregunta - Texto del usuario.
 * @param {object} [opts]
 * @param {string} [opts.systemExtra] - Instrucciones adicionales para esta llamada puntual
 *   (por ejemplo, para tareas específicas como resumir o traducir).
 * @param {Array<{role: 'user'|'assistant', content: string}>} [opts.historial] - Turnos previos.
 * @param {number} [opts.maxTokens]
 * @returns {Promise<string>} Respuesta en texto plano.
 */
async function preguntarIA(pregunta, opts = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new AIError('No hay una ANTHROPIC_API_KEY configurada en el servidor.', 'sin_api_key');
    }

    const personalidad = getPersonalidad();
    if (personalidad.activada === false) {
        throw new AIError('Las funciones de IA están desactivadas en este servidor.', 'desactivada');
    }

    const system = [personalidad.personalidad, opts.systemExtra]
        .filter(Boolean)
        .join('\n\n');

    const messages = [
        ...(opts.historial ?? []),
        { role: 'user', content: pregunta },
    ];

    try {
        const res = await axios.post(
            ANTHROPIC_URL,
            {
                model: personalidad.modelo || DEFAULT_PERSONALIDAD.modelo,
                max_tokens: opts.maxTokens ?? 700,
                system,
                messages,
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                    'content-type': 'application/json',
                },
                timeout: 30000,
            }
        );

        const texto = res.data.content
            ?.filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n')
            .trim();

        return texto || 'No obtuve una respuesta de la IA. Intenta de nuevo.';
    } catch (error) {
        const detalle = error.response?.data?.error?.message || error.message;
        console.error('[ai.js] Error consultando Anthropic API:', detalle);
        throw new AIError(`La IA no pudo responder: ${detalle}`, 'api_error');
    }
}

module.exports = {
    MODELOS_VALIDOS,
    DEFAULT_PERSONALIDAD,
    getPersonalidad,
    savePersonalidad,
    segundosRestantesCooldown,
    marcarUso,
    preguntarIA,
    AIError,
};
