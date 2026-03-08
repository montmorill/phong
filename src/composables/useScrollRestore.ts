import { nextTick, onActivated, onDeactivated } from 'vue'

function getViewport() {
  return document.querySelector<HTMLElement>('[data-reka-scroll-area-viewport]')
}

export function useScrollRestore(scrollToKey = 'scrollToPost') {
  let savedScrollTop = 0

  onDeactivated(() => {
    savedScrollTop = getViewport()?.scrollTop ?? 0
  })

  onActivated(async () => {
    const scrollToId = sessionStorage.getItem(scrollToKey)
    if (scrollToId) {
      sessionStorage.removeItem(scrollToKey)
      await nextTick()
      const el = document.getElementById(scrollToId)
      const viewport = getViewport()
      if (el && viewport) {
        const elTop = el.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop
        const target = elTop - (viewport.clientHeight - el.offsetHeight) / 2
        viewport.scrollTop = target
        return
      }
    }
    getViewport()!.scrollTop = savedScrollTop
  })
}
