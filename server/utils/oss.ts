import OSS from "ali-oss"

let ossClient: OSS | null = null

function getOssConfig() {
  return {
    accessKeyId: process.env.NUXT_OSS_ACCESS_KEY_ID || "",
    accessKeySecret: process.env.NUXT_OSS_ACCESS_KEY_SECRET || "",
    bucket: process.env.NUXT_OSS_BUCKET || "",
    region: process.env.NUXT_OSS_REGION || "oss-cn-hangzhou",
    endpoint: process.env.NUXT_OSS_ENDPOINT || "",
  }
}

function getClient(): OSS {
  if (ossClient) return ossClient
  const config = getOssConfig()
  if (!config.accessKeyId || !config.accessKeySecret || !config.bucket) {
    throw new Error(
      "OSS not configured. Set NUXT_OSS_ACCESS_KEY_ID, NUXT_OSS_ACCESS_KEY_SECRET, NUXT_OSS_BUCKET env vars"
    )
  }
  ossClient = new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    region: config.region,
    endpoint: config.endpoint || undefined,
  })
  return ossClient
}

export function isOssConfigured(): boolean {
  const config = getOssConfig()
  return !!(config.accessKeyId && config.accessKeySecret && config.bucket)
}

export async function ossUpload(objectKey: string, buffer: Buffer): Promise<string> {
  const client = getClient()
  const result = await client.put(objectKey, buffer)
  return result.name
}

export async function ossDelete(objectKey: string): Promise<void> {
  const client = getClient()
  await client.delete(objectKey)
}

export function ossGetUrl(objectKey: string): string {
  const config = getOssConfig()
  // Encode each path segment to handle non-ASCII characters (e.g. Chinese filenames)
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/")
  if (config.endpoint) {
    return `https://${config.bucket}.${config.endpoint}/${encodedKey}`
  }
  return `https://${config.bucket}.${config.region}.aliyuncs.com/${encodedKey}`
}

export async function ossRead(objectKey: string): Promise<Buffer | null> {
  const client = getClient()
  try {
    const result = await client.get(objectKey)
    return Buffer.from(result.content as Uint8Array)
  } catch {
    return null
  }
}