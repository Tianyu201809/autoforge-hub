function isApiRequest(input: RequestInfo | URL) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(url, window.location.origin).pathname.startsWith('/api/')
}

export default defineNuxtPlugin(() => {
  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args)
    if (response.status === 401 && isApiRequest(args[0])) {
      useSessionExpiry().show()
    }
    return response
  }
})
