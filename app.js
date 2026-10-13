// Loads the herbs from data/herbs.json and shows each one as a card.

const list = document.querySelector("#herbs-list")
const count = document.querySelector(".count")

async function loadHerbs() {
  const response = await fetch("data/herbs.json")
  if (!response.ok) {
    throw new Error(`Could not load ${response.url}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

function element(tag, className, text) {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

function card(herb) {
  const item = element("li", "card", "")
  const title = element("h3", "name", "")

  if (herb.name === "Chives") {
    const link = document.createElement("a")
    link.href = "chives.html"
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.textContent = herb.name
    title.append(link)
  } else {
    title.textContent = herb.name
  }

  item.append(
    title,
    element("p", "latin", herb.latin),
    element("p", "use", herb.use),
    element("p", "life", herb.life)
  )

  return item
}

async function show() {
  const herbs = await loadHerbs()
  list.replaceChildren(...herbs.map(card))
  count.textContent = `${herbs.length} herbs grow here.`
}

show()
