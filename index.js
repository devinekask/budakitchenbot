import { Router } from 'worktop'
import { listen } from 'worktop/cache'
import { Feed } from 'feed'

const API = new Router()

API.add('GET', '/', async (req, res) => {
  const data = await getData()

  res.setHeader('content-type', 'application/json;charset=UTF-8')
  res.end(JSON.stringify(data))
})

API.add('POST', '/slack', async (req, res) => {
  const data = await getData()
  res.setHeader('content-type', 'application/json;charset=UTF-8')
  res.setHeader('Cache-Control', 'public,max-age=60')

  res.end(
    JSON.stringify({
      response_type: `in_channel`,
      text: `Today's lunch at Buda Kitchen 🍽 `,
      attachments: [
        {
          text: data.join('\n'),
        },
      ],
    }),
  )
})

API.add('GET', '/rss', async (req, res) => {
  const data = await getData()

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

  res.end(feed.rss2())
})

const getData = async () => {
  const resp = await fetch('http://budakitchen.be/')

  const handler = new ElementHandler()
  const lunch = await new HTMLRewriter()
    .on('#short-menu-sec .short-menu p', handler)
    .transform(resp)
    .text()

  if (handler.result.length === 0) {
    handler.result = [
      'Het draait in de soep',
      'We zitten in de puree',
      'De mayonaise pakt niet',
    ]
  }

  return handler.result
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

listen(API.run)
