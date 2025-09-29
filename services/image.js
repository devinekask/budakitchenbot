const generateImage = async (prompt, env) => {
  const {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = env
  if (!CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID environment variable')
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary environment variables')
  }
  const API_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`

  const inputs = {
    prompt: `${prompt} on a plate on the table of a cosy restaurant  :: food photography, photorealistic, ultra realistic, maximum detail, recipes.com, epicurious, instagram :: 8k, volumetric light, cinematic, octane render  --v 3  --ar 9:16 --uplight --no blur, depth of field, dof, bokeh`,
    negativePrompt: 'asymmetric, watermarks, text',
    width: 2048,
    height: 512,
  }

  const stream = await env.AI.run(
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    inputs,
  )

  const bytes = await new Response(stream).bytes()

  // Convert bytes to base64 safely
  let base64
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    base64 = Buffer.from(bytes).toString('base64')
  } else {
    // Browser or non-Node environment
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    base64 = btoa(binary)
  }
  const dataUri = `data:image/png;base64,${base64}`

  // Prepare upload parameters
  const timestamp = Math.floor(Date.now() / 1000)
  const uploadParams = {
    timestamp: timestamp,
    public_id: 'menuvandedag',
    folder: 'budamenu',
    overwrite: true,
  }

  // Create signature for authentication
  const excludedParams = ['file', 'cloud_name', 'resource_type', 'api_key']
  const sortedParams = Object.keys(uploadParams)
    .filter((key) => !excludedParams.includes(key))
    .sort()
    .map((key) => `${key}=${uploadParams[key]}`)
    .join('&')

  const signatureString = `${sortedParams}${CLOUDINARY_API_SECRET}`
  const signature = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(signatureString),
  )
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Upload to Cloudinary
  const formData = new FormData()
  formData.append('file', dataUri)
  formData.append('api_key', CLOUDINARY_API_KEY)
  formData.append('signature', signatureHex)

  // Add all upload parameters to form data
  Object.entries(uploadParams).forEach(([key, value]) => {
    formData.append(key, value)
  })

  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!cloudinaryResponse.ok) {
    throw new Error(
      `Cloudinary upload failed: ${cloudinaryResponse.statusText}`,
    )
  }

  const result = await cloudinaryResponse.json()
  return result.secure_url
}

export { generateImage }
