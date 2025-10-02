import { v4 as uuidv4 } from 'uuid'

const translate = async (prompt, env) => {
  try {
    const response = await env.AI.run('@cf/meta/m2m100-1.2b', {
      text: prompt,
      source_lang: 'nl',
      target_lang: 'en',
    })

    return await response.translated_text
  } catch (e) {
    console.log(e)
  }
}

export { translate }
