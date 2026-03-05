import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['src/components/ui/**', 'server/drizzle/**'],
  rules: {
    'no-console': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
})
