<script setup lang="ts">
const code = new URLSearchParams(location.search).get('code')
if (code && window.opener) {
  window.opener.postMessage({ type: 'gravatar:code', code }, location.origin)
}
window.close()
</script>

<template />
