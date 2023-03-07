import { Feed } from 'feed'
import { Router } from 'itty-router'
import { json } from 'itty-router-extras'

const router = Router()

router.get('/', async (_, env) => {
  const data = await getData(env)
  return json(data)
})

router.post('/slack', async (_, env) => {
  const data = await getData(env)
  return json({
    response_type: `in_channel`,
    text: `Today's lunch at Buda Kitchen 🍽 `,
    attachments: [
      {
        text: data.join('\n'),
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

  data.forEach((item) => {
    feed.addItem({
      title: item,
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
        await env.budakitchen.put(dateKey, JSON.stringify(handler.result), {
          expirationTtl: 20 * 60 * 60,
        })
      }

      result = handler.result
    } else {
      result = storedMenu
    }
  } catch (e) {
    console.log(e)
  }

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
