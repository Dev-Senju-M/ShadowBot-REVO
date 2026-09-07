const fs = require('fs');
const path = require('path');
const axios = require('axios');

const personalidadPath = path.join(__dirname, '../personalidad.json');
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const MODELOS_VALIDOS = {
    rapido: 'gpt-5.6-luna',       // más barato y rápido, ideal para /ask del día a día
    equilibrado: 'gpt-5.6-terra', // más capaz, buen balance costo/calidad
    potente: 'gpt-5.6-sol',       // el más capaz, más caro y lento
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new AIError('No hay una OPENAI_API_KEY configurada en el servidor.', 'sin_api_key');
    }

    const personalidad = getPersonalidad();
    if (personalidad.activada === false) {
        throw new AIError('Las funciones de IA están desactivadas en este servidor.', 'desactivada');
    }

    const system = [personalidad.personalidad, opts.systemExtra]
        .filter(Boolean)
        .join('\n\n');

    const messages = [
        { role: 'system', content: system },
        ...(opts.historial ?? []),
        { role: 'user', content: pregunta },
    ];

    try {
        const res = await axios.post(
            OPENAI_URL,
            {
                model: personalidad.modelo || DEFAULT_PERSONALIDAD.modelo,
                // Nota: los modelos GPT-5.x solo aceptan su temperature por defecto,
                // así que no la enviamos explícitamente para evitar errores 400.
                max_completion_tokens: opts.maxTokens ?? 700,
                messages,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'content-type': 'application/json',
                },
                timeout: 30000,
            }
        );

        const texto = res.data.choices?.[0]?.message?.content?.trim();
        return texto || 'No obtuve una respuesta de la IA. Intenta de nuevo.';
    } catch (error) {
        const detalle = error.response?.data?.error?.message || error.message;
        console.error('[ai.js] Error consultando OpenAI API:', detalle);
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
