export function speak(text: string, lang: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
    u.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const pref = voices.find((v) => v.lang.startsWith(u.lang)) || voices.find((v) => v.lang.startsWith('hi'))
    if (pref) u.voice = pref
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
