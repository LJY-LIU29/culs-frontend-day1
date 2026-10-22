// Loads the herb names from data/herbs.json, then each herb from
// data/<name>.json, and shows each one as a card.
// When the address ends in #<name>, shows that one herb instead of the list.

const herbsSection = document.querySelector("#herbs")
const list = document.querySelector("#herbs-list")
const count = document.querySelector(".count")
const detail = document.querySelector("#herb-detail")
const detailContent = document.querySelector("#herb-detail-content")
const search = document.querySelector("#herb-search")

// Each loaded herb with its card, kept so the search can filter without loading anything again.
// Stays null until the herbs have loaded.
let herbCards = null

// Thrown when the server cannot be reached at all.
class NetworkError extends Error {}

// Thrown when the server answers, but without the file (for example 404 Not Found).
class HttpError extends Error {}

async function loadJson(path) {
  let response
  try {
    response = await fetch(path)
  } catch (error) {
    throw new NetworkError(`Could not reach the server for ${path}: ${error.message}`)
  }
  if (!response.ok) {
    throw new HttpError(`Could not load ${response.url}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

// The list of herb names, loaded once and shared by the list and the detail page.
const names = loadJson("data/herbs.json")

function loadHerb(name) {
  return loadJson(`data/${name}.json`)
}

function element(tag, className, text) {
  const node = document.createElement(tag)
  node.className = className
  node.textContent = text
  return node
}

// A message that screen readers announce as soon as it appears.
function problem(text) {
  const node = element("p", "problem", text)
  node.setAttribute("role", "alert")
  return node
}

// Turns a loading error into a friendly message about `what` could not be loaded.
function problemText(error, what) {
  if (error instanceof NetworkError) {
    return "We could not reach the server. Check your connection, then reload the page to try again."
  }
  return `Sorry, ${what} could not be loaded.`
}

function card(herb, name) {
  const item = element("li", "card", "")
  const title = element("h3", "name", "")

  const link = document.createElement("a")
  link.href = `#${encodeURIComponent(name)}`
  link.textContent = herb.name
  title.append(link)

  item.append(
    title,
    element("p", "latin", herb.latin),
    element("p", "use", herb.use),
    element("p", "life", herb.life)
  )

  return item
}

async function show() {
  let herbNames
  try {
    herbNames = await names
  } catch (error) {
    count.textContent = "No herbs to show."
    count.after(problem(problemText(error, "the list of herbs")))
    return
  }

  // Show every herb that loaded, even if some of them did not.
  const results = await Promise.allSettled(herbNames.map(loadHerb))
  herbCards = results
    .map((result, i) => (result.status === "fulfilled" ? { herb: result.value, item: card(result.value, herbNames[i]) } : null))
    .filter((entry) => entry !== null)
  list.replaceChildren(...herbCards.map((entry) => entry.item))
  filterHerbs() // also applies a search the browser kept from an earlier visit

  // If any herb failed because the server was unreachable, say so: reloading may help.
  const errors = results.filter((result) => result.status === "rejected").map((result) => result.reason)
  if (errors.length > 0) {
    const error = errors.find((reason) => reason instanceof NetworkError) ?? errors[0]
    count.after(problem(problemText(error, "some of the herbs")))
  }
}

function matches(herb, query) {
  return [herb.name, herb.latin, herb.use].some((text) => text.toLowerCase().includes(query))
}

// Shows only the cards that match the search box, and says how many there are.
function filterHerbs() {
  if (herbCards === null) {
    return // still loading; show() calls this again when the herbs are there
  }

  const query = search.value.trim().toLowerCase()
  let shown = 0
  for (const { herb, item } of herbCards) {
    item.hidden = !matches(herb, query)
    if (!item.hidden) {
      shown++
    }
  }

  const total = herbCards.length
  if (query === "") {
    count.textContent = `${total} herbs grow here.`
  } else if (shown === 0) {
    count.textContent = "No herbs match your search."
  } else {
    count.textContent = `${shown} of ${total} herbs ${shown === 1 ? "matches" : "match"}`
  }
}

// The name in a hash, e.g. "basil" for "#basil".
function nameFromHash(hash) {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw // not valid %-encoding, e.g. "#100%"
  }
}

// The part of the current address after "#".
function hashName() {
  return nameFromHash(location.hash)
}

// `previousName` is what the address showed before, e.g. "basil" when coming back from #basil.
function showList(previousName) {
  const wasHidden = herbsSection.hidden
  detail.hidden = true
  herbsSection.hidden = false
  if (!wasHidden) {
    return
  }

  const name = hashName()
  const target = document.getElementById(name)
  const herbLink = list.querySelector(`a[href="#${encodeURIComponent(previousName)}"]`)

  if ((name === "" || name === "herbs") && herbLink) {
    // Back to the list: put focus on the herb the reader just left, so Tab carries on from there.
    herbLink.focus()
  } else if (target) {
    // The browser cannot scroll to an anchor while the list is hidden,
    // so scroll there ourselves once the list is back.
    target.scrollIntoView()
  }
}

// `moveFocus` is true when the reader asked for this page, rather than arriving with it in the address.
function showDetail(name, nodes, moveFocus) {
  if (hashName() !== name) {
    return // the address changed while this herb was loading
  }

  detailContent.replaceChildren(...nodes)
  herbsSection.hidden = true
  detail.hidden = false
  detail.scrollIntoView()

  if (moveFocus) {
    // The link that had focus is now hidden, so move focus to the new heading.
    const heading = detailContent.querySelector("h2")
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }
}

function herbDetails(herb) {
  const nodes = [
    element("h2", "name", herb.name)
  ]

  // Add herb image if available
  if (herb.image) {
    const img = document.createElement("img")
    img.src = herb.image
    img.alt = herb.name
    img.className = "herb-image"
    nodes.push(img)
  }

  nodes.push(
    element("p", "latin", herb.latin),
    element("p", "use", herb.use),
    element("p", "life", herb.life),
    element("p", "description", herb.description),
    element("h3", "", "Growing"),
    element("p", "growing", herb.growing),
    element("h3", "", "Kitchen tip"),
    element("p", "tip", herb.tip)
  )

  return nodes
}

// Decides what to show for the current address.
// Anchors that already exist on the page (#herbs, #visit, #about…) win over herb names.
// `event` is the hashchange event, or undefined when the page first loads.
async function route(event) {
  const name = hashName()
  const isPageAnchor = document.getElementById(name) !== null
  const moveFocus = event !== undefined

  if (name === "" || isPageAnchor) {
    showList(event ? nameFromHash(new URL(event.oldURL).hash) : "")
    return
  }

  try {
    if (!(await names).includes(name)) {
      showDetail(name, [
        element("h2", "name", "Herb not found"),
        problem(`Sorry, we could not find a herb called “${name}”.`)
      ], moveFocus)
      return
    }
    showDetail(name, herbDetails(await loadHerb(name)), moveFocus)
  } catch (error) {
    showDetail(name, [
      element("h2", "name", "Could not load this herb"),
      problem(problemText(error, "the information about this herb"))
    ], moveFocus)
  }
}

// The skip link moves focus to the main content without changing the address,
// so using it on a herb page does not take the reader back to the list.
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault()
  document.querySelector("#main").focus()
})

search.addEventListener("input", filterHerbs)
window.addEventListener("hashchange", route)

show()
route()
