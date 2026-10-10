/**
 * 英 → 中 摘要翻译
 * 1) 优先 Chrome 内置 Translator API（本机、免费）
 * 2) 回退 MyMemory 公开接口（免 key，有额度限制）
 * 结果按原文缓存到 localStorage，避免重复请求
 */

const CACHE_KEY = 'rj-onc-radar-translate-v1'
const MAX_CACHE_ENTRIES = 80

type TranslateCache = Record<string, string>

declare global {
  interface Window {
    Translator?: {
      availability: (opts: {
        sourceLanguage: string
        targetLanguage: string
      }) => Promise<string>
      create: (opts: {
        sourceLanguage: string
        targetLanguage: string
      }) => Promise<{ translate: (text: string) => Promise<string> }>
    }
  }
}

function simpleHash(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  }
  return `t_${(h >>> 0).toString(16)}_${text.length}`
}

function readCache(): TranslateCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TranslateCache
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(map: TranslateCache) {
  const keys = Object.keys(map)
  if (keys.length > MAX_CACHE_ENTRIES) {
    // 粗暴淘汰最前面的旧项
    for (const k of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) {
      delete map[k]
    }
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function getCachedTranslation(text: string): string | null {
  const key = simpleHash(text)
  return readCache()[key] ?? null
}

function putCachedTranslation(text: string, translated: string) {
  const map = readCache()
  map[simpleHash(text)] = translated
  writeCache(map)
}

/** 按句号/长度切块，适配免费接口长度限制 */
function chunkText(text: string, maxLen = 420): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLen) return [cleaned]

  const parts: string[] = []
  const sentences = cleaned.split(/(?<=[.!?。；;])\s+/)
  let buf = ''
  for (const s of sentences) {
    if (!s) continue
    if ((buf + ' ' + s).trim().length <= maxLen) {
      buf = (buf + ' ' + s).trim()
    } else {
      if (buf) parts.push(buf)
      if (s.length <= maxLen) {
        buf = s
      } else {
        // 超长句硬切
        for (let i = 0; i < s.length; i += maxLen) {
          parts.push(s.slice(i, i + maxLen))
        }
        buf = ''
      }
    }
  }
  if (buf) parts.push(buf)
  return parts
}

async function translateWithBrowser(text: string): Promise<string | null> {
  const T = window.Translator
  if (!T) return null
  try {
    const availability = await T.availability({
      sourceLanguage: 'en',
      targetLanguage: 'zh',
    })
    if (availability === 'unavailable') return null
    const translator = await T.create({
      sourceLanguage: 'en',
      targetLanguage: 'zh',
    })
    return (await translator.translate(text)).trim()
  } catch {
    return null
  }
}

async function translateChunkMyMemory(chunk: string): Promise<string> {
  const url =
    'https://api.mymemory.translated.net/get?' +
    new URLSearchParams({
      q: chunk,
      langpair: 'en|zh-CN',
    }).toString()

  const res = await fetch(url)
  if (!res.ok) throw new Error(`翻译服务暂时不可用 (${res.status})`)
  const json = (await res.json()) as {
    responseStatus?: number
    responseData?: { translatedText?: string }
    responseDetails?: string
  }
  const out = json.responseData?.translatedText?.trim()
  if (!out || (json.responseStatus && json.responseStatus !== 200)) {
    throw new Error(json.responseDetails || '翻译失败，请稍后重试')
  }
  // MyMemory 超额时有时原样返回英文
  return out
}

async function translateWithMyMemory(text: string): Promise<string> {
  const chunks = chunkText(text)
  const translated: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    translated.push(await translateChunkMyMemory(chunks[i]))
    // 轻微限速，降低被限流概率
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 280))
    }
  }
  return translated.join('')
}

/**
 * 将英文摘要译为中文。
 * @returns 译文
 */
export async function translateToZh(text: string): Promise<string> {
  const src = text.trim()
  if (!src) return ''

  const cached = getCachedTranslation(src)
  if (cached) return cached

  const viaBrowser = await translateWithBrowser(src)
  if (viaBrowser) {
    putCachedTranslation(src, viaBrowser)
    return viaBrowser
  }

  const viaApi = await translateWithMyMemory(src)
  putCachedTranslation(src, viaApi)
  return viaApi
}
