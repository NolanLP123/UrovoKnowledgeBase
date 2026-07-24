const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const PAGE_SIZE = 30;

const state = {
  entries: [],
  filtered: [],
  module: "",
  query: "",
  visible: PAGE_SIZE,
};

const params = new URLSearchParams(location.search);
const searchInput = $("#manual-search-input");
const grid = $("#api-card-grid");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1500);
}

function syncUrl() {
  const url = new URL(location.href);
  state.query ? url.searchParams.set("q", state.query) : url.searchParams.delete("q");
  state.module ? url.searchParams.set("module", state.module) : url.searchParams.delete("module");
  history.replaceState({}, "", url);
}

function renderParameters(parameters) {
  if (!parameters?.length) return `<div class="card-note">No parameters.</div>`;
  return `<div class="parameter-list">${parameters.map((parameter) => `
    <div class="parameter-row">
      <code>${escapeHtml(parameter.name || "—")}</code>
      <p>${escapeHtml(parameter.description || "").replace(/\n/g, "<br>")}</p>
    </div>`).join("")}</div>`;
}

function apiCard(entry) {
  return `<article class="manual-api-card" id="${escapeHtml(entry.id)}" data-id="${escapeHtml(entry.id)}">
    <div class="card-heading">
      <div>
        <h2>${escapeHtml(entry.title)}</h2>
        <span class="module-badge">${escapeHtml(entry.module)}</span>
      </div>
      <span class="status-badge ${entry.status === "Deprecated" ? "deprecated" : ""}">${escapeHtml(entry.status)}</span>
    </div>
    <p class="card-summary">${escapeHtml(entry.summary || "No description provided.")}</p>
    <div class="card-label">Definition</div>
    <pre class="signature-block"><code>${escapeHtml(entry.signature || entry.title)}</code><button type="button" data-copy-signature="${escapeHtml(entry.id)}">Copy</button></pre>
    <details class="card-details" ${entry.parameters?.length ? "" : "open"}>
      <summary>Parameters <span>${entry.parameters?.length || 0}</span></summary>
      ${renderParameters(entry.parameters)}
    </details>
    <div class="card-label">Return value</div>
    <div class="return-value">${escapeHtml(entry.returns || "No return value documented.").replace(/\n/g, "<br>")}</div>
    <div class="card-actions">
      <button type="button" data-copy-link="${escapeHtml(entry.id)}">Copy API link</button>
      <span>USDK ${escapeHtml(entry.version || "V15.5.01E")}</span>
    </div>
  </article>`;
}

function bindCardActions() {
  $$("[data-copy-signature]", grid).forEach((button) => {
    button.addEventListener("click", async () => {
      const entry = state.entries.find((item) => item.id === button.dataset.copySignature);
      await navigator.clipboard.writeText(entry?.signature || entry?.title || "");
      showToast("Definition copied");
    });
  });
  $$("[data-copy-link]", grid).forEach((button) => {
    button.addEventListener("click", async () => {
      const url = new URL(location.href);
      url.searchParams.set("id", button.dataset.copyLink);
      await navigator.clipboard.writeText(url.toString());
      showToast("API link copied");
    });
  });
}

function applyFilters(resetVisible = true) {
  if (resetVisible) state.visible = PAGE_SIZE;
  const query = state.query.trim().toLowerCase();
  state.filtered = state.entries.filter((entry) => {
    const content = [
      entry.title, entry.module, entry.summary, entry.signature, entry.returns, entry.keywords,
      ...(entry.parameters || []).flatMap((item) => [item.name, item.description]),
    ].join(" ").toLowerCase();
    return (!state.module || entry.module === state.module) && (!query || content.includes(query));
  });
  renderCards();
  syncUrl();
}

function renderCards() {
  const visibleEntries = state.filtered.slice(0, state.visible);
  grid.innerHTML = visibleEntries.map(apiCard).join("");
  bindCardActions();
  $("#manual-result-count").textContent = `${state.filtered.length} matching APIs`;
  $("#manual-empty").hidden = state.filtered.length > 0;
  const loadMore = $("#load-more");
  loadMore.hidden = state.visible >= state.filtered.length;
  if (!loadMore.hidden) loadMore.textContent = `Load ${Math.min(PAGE_SIZE, state.filtered.length - state.visible)} more APIs`;
}

function buildModuleChips() {
  const modules = [...new Set(state.entries.map((entry) => entry.module))];
  $("#module-chips").insertAdjacentHTML("beforeend", modules.map((module) => {
    const count = state.entries.filter((entry) => entry.module === module).length;
    return `<button class="module-chip" type="button" data-module="${escapeHtml(module)}">${escapeHtml(module)} <b>${count}</b></button>`;
  }).join(""));
  $$(".module-chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.module = button.dataset.module;
      $$(".module-chip").forEach((item) => item.classList.toggle("active", item === button));
      applyFilters();
    });
  });
}

fetch("public/knowledge.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    state.entries = data.entries;
    $("#entry-total").textContent = data.entries.length;
    state.query = params.get("q") || "";
    state.module = params.get("module") || "";
    searchInput.value = state.query;
    buildModuleChips();
    const activeChip = $(`.module-chip[data-module="${CSS.escape(state.module)}"]`) || $('.module-chip[data-module=""]');
    $$(".module-chip").forEach((button) => button.classList.toggle("active", button === activeChip));

    const targetId = params.get("id");
    if (targetId) {
      const target = state.entries.find((entry) => entry.id === targetId);
      if (target) {
        state.module = target.module;
        state.visible = state.entries.filter((entry) => entry.module === target.module).findIndex((entry) => entry.id === targetId) + PAGE_SIZE;
        $$(".module-chip").forEach((button) => button.classList.toggle("active", button.dataset.module === target.module));
      }
    }
    applyFilters(!targetId);
    if (targetId) requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  })
  .catch((error) => {
    $("#manual-result-count").textContent = "Knowledge data could not be loaded";
    grid.innerHTML = `<div class="manual-load-error"><strong>Unable to load API data</strong><p>Serve this folder through GitHub Pages or another web server.</p><code>${escapeHtml(error.message)}</code></div>`;
  });

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  applyFilters();
});

$("#reset-manual-filters").addEventListener("click", () => {
  state.query = "";
  state.module = "";
  searchInput.value = "";
  $$(".module-chip").forEach((button) => button.classList.toggle("active", button.dataset.module === ""));
  applyFilters();
});

$("#load-more").addEventListener("click", () => {
  state.visible += PAGE_SIZE;
  renderCards();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});
