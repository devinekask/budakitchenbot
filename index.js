import { Feed } from 'feed'
import { Router } from 'itty-router'
import { json } from 'itty-router-extras'

import { generateImg, getImage } from './services/leap.js'
import { translate } from './services/translation.js'

const router = Router()

const expiration = {
  expirationTtl: 20 * 60 * 60,
}

router.get('/', async (_, env) => {
  const data = await getData(env)
  return json(data)
})

const getOrCreateImage = async (env) => {
  const today = new Date().getDay()

  if (today != 6 && today != 0) {
    const dateKey = getDateKey()
    try {
      const storedMenu = await env.budakitchen.get(dateKey, { type: 'json' })
      if (!storedMenu.image || !storedMenu.image.inference) {
        console.log('inference aanmaken')
        const promptNL = storedMenu.menu[Math.floor(Math.random() * 2)]
        const translation = await translate(env.TRANSLATE_TOKEN, promptNL)
        console.log('trans', translation)
        const inference = await generateImg(env.AI_API_TOKEN, translation)
        console.log('inference', inference)
        storedMenu.image = { inference }
        await env.budakitchen.put(
          dateKey,
          JSON.stringify(storedMenu),
          expiration,
        )
      } else if (!storedMenu.image.uri) {
        console.log('image ophalen')
        const image = await getImage(
          env.AI_API_TOKEN,
          storedMenu.image.inference,
        )
        if (image) {
          storedMenu.image.uri = image
          await env.budakitchen.put(
            dateKey,
            JSON.stringify(storedMenu),
            expiration,
          )
        }
      }
    } catch (e) {
      console.log('Error', e)
    }
  }
}

router.post('/slack', async (_, env) => {
  const data = await getData(env)
  return json({
    response_type: `in_channel`,
    text: `Today's lunch at Buda Kitchen 🍽 `,
    attachments: [
      {
        text: data.menu.join('\n'),
      },
    ],
  })
})

router.get('/rss', async (_, env) => {
  const data = await getData(env)

  const feed = new Feed({
    title: 'Todays lunch at Buda Kitchen',
    description: 'Hungry yet?',
    id: 'https://budakitchen.be/',
    link: 'https://budakitchen.be/',
  })

  data.menu.forEach((item) => {
    feed.addItem({
      title: item,
      image:
        data.image?.uri ??
        'https://budakitchen.be/wp-content/uploads/2019/02/BUDA.jpg',
    })
  })

  return new Response(feed.rss2())
})

router.all('*', () => new Response('Not Found.', { status: 404 }))

const leadingZero = (n) => `${n}`.padStart(2, '0')

const getDateKey = () => {
  const today = new Date()
  return (
    '' +
    today.getFullYear() +
    leadingZero(today.getMonth() + 1) +
    leadingZero(today.getDate())
  )
}

const getData = async (env) => {
  const dateKey = getDateKey()
  let result = [
    'Het draait in de soep',
    'We zitten in de puree',
    'De mayonaise pakt niet',
  ]

  let storedMenu = null

  try {
    storedMenu = await env.budakitchen.get(dateKey, { type: 'json' })

    if (!storedMenu) {
      console.log('storedMenu is null')
      const resp = await fetch('http://budakitchen.be/')

      const handler = new ElementHandler()
      const lunch = await new HTMLRewriter()
        .on('#short-menu-sec .short-menu p', handler)
        .transform(resp)
        .text()

      if (handler.result.length > 0) {
        await env.budakitchen.put(
          dateKey,
          JSON.stringify({ menu: handler.result }),
          expiration,
        )
      }

      result = { menu: handler.result }
    } else {
      result = storedMenu
    }
  } catch (e) {
    console.log(e)
  }
  await getOrCreateImage(env)

  return result
}

class ElementHandler {
  constructor() {
    this.result = []
  }

  text(text) {
    if (text.text.trim() != '') {
      this.result.push(text.text)
    }
  }
}

export default {
  scheduled: async (event, env, ctx) => {
    ctx.waitUntil(getData(env))
  },
  fetch: router.handle,
}
