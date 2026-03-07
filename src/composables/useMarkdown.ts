import type { MaybeRefOrGetter } from 'vue'
import { computedAsync } from '@vueuse/core'
import DOMPurify from 'dompurify'
import githubDarkCss from 'highlight.js/styles/github-dark.min.css?inline'
import { marked } from 'marked'
import { toValue } from 'vue'

declare global {
  interface Window {
    hljs: {
      getLanguage: (name: string) => unknown
      highlight: (code: string, opts: { language: string }) => { value: string }
    }
  }
}

const { hljs } = window

const style = document.createElement('style')
style.textContent = githubDarkCss.replace(/\.hljs/g, '.dark .hljs')
document.head.appendChild(style)

marked.use({
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      return `<pre><code class="hljs language-${language}">${hljs.highlight(text, { language }).value}</code></pre>`
    },
  },
})

export function useMarkdown(content: MaybeRefOrGetter<string>) {
  return computedAsync(async () =>
    DOMPurify.sanitize(await marked.parse(toValue(content).normalize())),
  )
}
