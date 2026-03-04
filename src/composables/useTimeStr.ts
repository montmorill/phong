import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const now = ref(Date.now())
let timerRefs = 0
let timer: ReturnType<typeof setInterval> | null = null

export default function useTimeStr() {
  const { t, d } = useI18n()

  onMounted(() => {
    if (timerRefs++ === 0)
      timer = setInterval(() => { now.value = Date.now() }, 60_000)
  })

  onUnmounted(() => {
    if (--timerRefs === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return (createdAt: number): string => {
    const diff = now.value - createdAt
    if (diff < 60_000)
      return t('time.justNow')
    if (diff < 3_600_000)
      return t('time.minutesAgo', { n: Math.floor(diff / 60_000) })
    if (diff < 86_400_000)
      return t('time.hoursAgo', { n: Math.floor(diff / 3_600_000) })
    return d(new Date(createdAt), 'short')
  }
}
