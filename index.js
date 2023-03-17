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
    blocks: data.map(item => ({
      type: 'section',
      text: {
        type: "mrkdwn",
        text: item.dish
      },
      accessory: {
        type: "image",
        image_url: item.img,
        alt_text: item.dish
      }
    }))
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

  console.log(data)

  data.forEach(item => {
    feed.addItem({
      title: item.dish,
      description: item.dishEn,
      image: item.img,
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

const processResult = async result => {
  try {
    const response = await fetch('https://bud-ai-kitchen.onrender.com/?key=XXq2u4c0EEzJiScBEU62xLe6QYDpesUHKv4ekBT96aTv9', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dishes: result })
    });

    const json = await response.json();
    return json
  } catch (error) {
    console.log(error);
    return result
  }
}

const getData = async (env) => {
  const dateKey = getDateKey()

  let result = [
    {
      dish: 'Het draait in de soep',
      dishEn: 'It\'s boiling in the soup',
      img: 'https://i.imgur.com/8ZQ5Z0M.jpg'
    },
    {
      dish: 'We zitten in de puree',
      dishEn: 'We\'re in the puree',
      img: 'https://i.imgur.com/8ZQ5Z0M.jpg'
    },
    {
      dish: 'De mayonaise pakt niet',
      dishEn: 'The mayonnaise doesn\'t work',
      img: 'https://i.imgur.com/8ZQ5Z0M.jpg'
    }
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

      const processed = await processResult(handler.result)

      if (processed.length > 0) {

        await env.budakitchen.put(dateKey, JSON.stringify(handler.result), {
          expirationTtl: 20 * 60 * 60,
        })
      }

      result = processed;
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
