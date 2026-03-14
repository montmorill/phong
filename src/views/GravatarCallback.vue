<script setup lang="ts">
const params = new URLSearchParams(location.search)
const code = params.get('code')
const error = params.get('error')
console.log('[gravatar callback] search:', location.search, 'code:', code, 'error:', error)
if (code && window.opener) {
  window.opener.postMessage({ type: 'gravatar:code', code }, location.origin)
}
setTimeout(() => window.close(), 2000)
</script>

<template />
