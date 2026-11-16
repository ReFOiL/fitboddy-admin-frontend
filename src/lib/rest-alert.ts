/** Короткий сигнал в конце отдыха. Вибрация и звук только если браузер их отдаёт. */
export function notifyRestFinished(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(180)
    }
  } catch {
    // Часть браузеров запрещает вибрацию без жеста.
  }
  playRestChime()
}

function playRestChime(): void {
  if (typeof window === 'undefined') return
  const AudioCtx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  try {
    const context = new AudioCtx()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.04, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.18)
    oscillator.onended = () => {
      void context.close()
    }
  } catch {
    // Автовоспроизведение может быть закрыто, пока нет жеста.
  }
}
