export const THEME_STORAGE_KEY = 'theme'
export const LOCALE_STORAGE_KEY = 'locale'

export const LOCALES = ['zh-CN', 'en-US'] as const

export type ThemeMode = 'light' | 'dark' | 'system'
export type LocaleCode = typeof LOCALES[number]

export function isLocaleCode(value: string | null): value is LocaleCode {
  return !!value && LOCALES.includes(value as LocaleCode)
}

export function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

export function applyTheme(mode: ThemeMode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
    return
  }

  if (mode === 'light') {
    document.documentElement.classList.remove('dark')
    return
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)
}

export function getInitialLocale(): LocaleCode {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (isLocaleCode(stored))
    return stored

  const browserLocale = navigator.language
  if (isLocaleCode(browserLocale))
    return browserLocale

  return browserLocale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}