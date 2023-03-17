import { v4 as uuidv4 } from 'uuid'

let endpoint = 'https://api.cognitive.microsofttranslator.com'

// location, also known as region.
// required if you're using a multi-service or regional (not global) resource. It can be found in the Azure portal on the Keys and Endpoint page.
let location = 'westeurope'

const translate = async (key, prompt) => {
  try {
    const response = await fetch(
      endpoint + '/translate?api-version=3.0&from=nl&to=en',
      {
        method: 'post',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          // location required if you're using a multi-service or regional (not global) resource.
          'Ocp-Apim-Subscription-Region': location,
          'Content-type': 'application/json',
          'X-ClientTraceId': uuidv4().toString(),
        },
        body: JSON.stringify([
          {
            text: prompt,
          },
        ]),
      },
    ).then((res) => res.json())

    return response[0].translations[0].text
  } catch (e) {
    console.log('translation error', e)
  }
  return false
}

export { translate }
