addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
	const resp = await fetch("http://budakitchen.be/")

	const handler = new ElementHandler();
	const lunch = await new HTMLRewriter()
	.on("#short-menu-sec .short-menu p", handler)
	.transform(resp)
	.text()

	if (handler.result.length===0) {
		handler.result = ["Het draait in de soep", "We zitten in de puree", "De mayonaise pakt niet"];
  }

	return new Response(JSON.stringify(	{
    "response_type": `in_channel`,
    "text": `Today's lunch at Buda Kitchen 🍽 `,
    "attachments": [
      {
        "text": handler.result.join('\n')
      }
    ]
  }), {
		headers: { 	'Content-Type': 'application/json' },
	})
}

class ElementHandler {
	constructor(){
		this.result = [];
	}

  text(text) {
		if(text.text.trim()!=""){
			this.result.push(text.text)
		}
  }
}
