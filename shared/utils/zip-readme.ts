import { strFromU8, unzipSync } from "fflate"

export function extractRootReadme(data: Uint8Array): string | null {
  const entries = unzipSync(data)
  const readme = entries["README.md"]
  return readme ? strFromU8(readme) : null
}
