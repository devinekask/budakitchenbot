const MODELID = 'eab32df0-de26-4b83-a908-a83f3015e971'

const generateImg = async (key, prompt) => {
  try {
    const url = `https://api.tryleap.ai/api/v1/images/models/${MODELID}/inferences`
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt: `${prompt} on a plate on the table of a cosy restaurant  :: food photography, photorealistic, ultra realistic, maximum detail, recipes.com, epicurious, instagram :: 8k, volumetric light, cinematic, octane render  --v 3  --ar 9:16 --uplight --no blur, depth of field, dof, bokeh`,
        negativePrompt: 'asymmetric, watermarks',
        steps: 50,
        width: 1024,
        height: 288,
        numberOfImages: 1,
        promptStrength: 7,
        // seed: 4523184,
        enhancePrompt: false,
      }),
    }

    const json = await fetch(url, options).then((res) => res.json())
    console.log('json', json)
    if (json.error) {
      console.log('ERROR', json.message)
    }
    if (json) {
      return json.id
    }
  } catch (e) {
    console.log(e)
  }
  return 'niet ok'
}

const getImage = async (key, id) => {
  const url = `https://api.tryleap.ai/api/v1/images/models/${MODELID}/inferences/${id}`
  const options = {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${key}` },
  }

  const img = await fetch(url, options).then((res) => res.json())
  if (!img.images || !img.images.length) return false
  return img.images[0].uri
}

export { generateImg, getImage }
