const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const translations = {
  en: {
    heroTitle: "Build enterprise mobility solutions with Urovo.",
    heroText: "Search the complete USDK interface reference, review parameters and return values, and share a direct link to any API.",
    searchButton: "Search",
    browseTitle: "One technical portal, built to grow.",
    browseText: "USDK is available now. The remaining categories are ready for your next content batches.",
  },
  zh: {
    heroTitle: "用优博讯构建企业移动解决方案。",
    heroText: "搜索完整 USDK 接口，查看参数与返回值，并把任意 API 的直达链接分享给客户或研发团队。",
    searchButton: "搜索",
    browseTitle: "一个持续扩展的技术资料入口。",
    browseText: "USDK 内容现已可用，其余分类可随下一批资料直接加入。",
  },
};

let language = localStorage.getItem("urovo-kb-language") || "en";

function applyLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  $$("[data-i18n]").forEach((node) => {
    const value = translations[language][node.dataset.i18n];
    if (value) node.textContent = value;
  });
  $$("[data-language-toggle]").forEach((button) => {
    button.textContent = language === "zh" ? "EN" : "中文";
  });
}

$$("[data-language-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    language = language === "en" ? "zh" : "en";
    localStorage.setItem("urovo-kb-language", language);
    applyLanguage();
  });
});
applyLanguage();

if (document.body.classList.contains("knowledge-page")) {
  const state = { entries: [], filtered: [], selectedId: "" };
  const searchInput = $("#kb-search-input");
  const moduleFilter = $("#module-filter");
  const statusFilter = $("#status-filter");
  const list = $("#api-list");
  const detail = $("#detail-panel");
  const params = new URLSearchParams(location.search);

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]));

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function updateUrl(entry, replace = false) {
    const url = new URL(location.href);
    if (entry) url.searchParams.set("id", entry.id);
    else url.searchParams.delete("id");
    if (searchInput.value) url.searchParams.set("q", searchInput.value);
    else url.searchParams.delete("q");
    if (moduleFilter.value) url.searchParams.set("module", moduleFilter.value);
    else url.searchParams.delete("module");
    const method = replace ? "replaceState" : "pushState";
    history[method]({}, "", url);
  }

  function renderList() {
    const query = searchInput.value.trim().toLowerCase();
    state.filtered = state.entries.filter((entry) => {
      const haystack = [entry.title, entry.module, entry.summary, entry.signature, entry.keywords].join(" ").toLowerCase();
      return (!query || haystack.includes(query))
        && (!moduleFilter.value || entry.module === moduleFilter.value)
        && (!statusFilter.value || entry.status === statusFilter.value);
    });
    const selectionChanged = !state.filtered.some((entry) => entry.id === state.selectedId);
    if (selectionChanged) state.selectedId = state.filtered[0]?.id || "";
    $("#result-count").textContent = `${state.filtered.length} of ${state.entries.length} interfaces`;
    list.innerHTML = state.filtered.map((entry) => `
      <button class="api-item ${entry.id === state.selectedId ? "selected" : ""}" type="button"
        data-id="${escapeHtml(entry.id)}" role="option" aria-selected="${entry.id === state.selectedId}">
        <span class="api-item-top"><strong>${escapeHtml(entry.title)}</strong>
          <span class="badge ${entry.status === "Deprecated" ? "deprecated" : ""}">${escapeHtml(entry.status)}</span>
        </span>
        <span class="api-item-meta">${escapeHtml(entry.module)}</span>
        <p>${escapeHtml(entry.summary || entry.signature || "USDK interface")}</p>
      </button>`).join("");
    $("#empty-state").hidden = state.filtered.length > 0;
    $$(".api-item", list).forEach((button) => {
      button.addEventListener("click", () => selectEntry(button.dataset.id));
    });
    if (selectionChanged && state.selectedId) selectEntry(state.selectedId, false);
    updateUrl(state.entries.find((entry) => entry.id === state.selectedId), true);
  }

  function selectEntry(id, push = true) {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    state.selectedId = id;
    $$(".api-item", list).forEach((item) => {
      const selected = item.dataset.id === id;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-selected", selected);
    });
    const parameters = entry.parameters?.length
      ? `<table class="parameter-table"><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>
        ${entry.parameters.map((item) => `<tr><td><code>${escapeHtml(item.name || "—")}</code></td><td>${escapeHtml(item.description).replace(/\n/g, "<br>")}</td></tr>`).join("")}
        </tbody></table>`
      : `<div class="return-box">No parameters.</div>`;
    detail.innerHTML = `<div class="detail-content">
      <button class="mobile-back" type="button" id="mobile-back">← API list</button>
      <div class="breadcrumbs">USDK API&nbsp; / &nbsp;${escapeHtml(entry.module)}&nbsp; / &nbsp;V15.5.01E</div>
      <div class="detail-title-row"><h1>${escapeHtml(entry.title)}</h1><button class="copy-link" type="button" id="copy-link">Copy link</button></div>
      <p class="detail-summary">${escapeHtml(entry.summary || "No description provided.")}</p>
      <section class="detail-section"><h2>Definition</h2>
        <pre class="code-block"><code>${escapeHtml(entry.signature || entry.title)}</code><button class="copy-code" type="button" id="copy-code">Copy</button></pre>
      </section>
      <section class="detail-section"><h2>Parameters</h2>${parameters}</section>
      <section class="detail-section"><h2>Return value</h2><div class="return-box">${escapeHtml(entry.returns || "No return value documented.")}</div></section>
      <div class="detail-meta"><span>Status: <strong>${escapeHtml(entry.status)}</strong></span><span>Module: ${escapeHtml(entry.module)}</span><span>Source: ${escapeHtml(entry.source)}</span></div>
    </div>`;
    detail.classList.add("mobile-open");
    $("#copy-link").addEventListener("click", async () => {
      await navigator.clipboard.writeText(location.href);
      showToast("API link copied");
    });
    $("#copy-code").addEventListener("click", async () => {
      await navigator.clipboard.writeText(entry.signature || entry.title);
      showToast("Definition copied");
    });
    $("#mobile-back").addEventListener("click", () => detail.classList.remove("mobile-open"));
    if (push) updateUrl(entry);
  }

  function clearFilters() {
    searchInput.value = "";
    moduleFilter.value = "";
    statusFilter.value = "";
    renderList();
  }

  fetch("public/knowledge.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      state.entries = data.entries;
      $("#usdk-count").textContent = data.entries.length;
      [...new Set(data.entries.map((entry) => entry.module))].sort().forEach((module) => {
        const option = document.createElement("option");
        option.value = module;
        option.textContent = module;
        moduleFilter.append(option);
      });
      searchInput.value = params.get("q") || "";
      moduleFilter.value = params.get("module") || "";
      renderList();
      const requestedId = params.get("id");
      if (requestedId) selectEntry(requestedId, false);
      else if (state.filtered.length) selectEntry(state.filtered[0].id, false);
    })
    .catch((error) => {
      $("#result-count").textContent = "Unable to load knowledge data";
      detail.innerHTML = `<div class="detail-placeholder"><span class="placeholder-mark">!</span><h2>Data could not be loaded</h2><p>Run this site through a local or hosted web server. Details: ${escapeHtml(error.message)}</p></div>`;
    });

  searchInput.addEventListener("input", renderList);
  moduleFilter.addEventListener("change", renderList);
  statusFilter.addEventListener("change", renderList);
  $("#clear-filters").addEventListener("click", clearFilters);
  $("#mobile-filters").addEventListener("click", () => $("#filters").classList.toggle("open"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape" && detail.classList.contains("mobile-open")) {
      detail.classList.remove("mobile-open");
    }
  });
  window.addEventListener("popstate", () => {
    const current = new URLSearchParams(location.search).get("id");
    if (current) selectEntry(current, false);
  });
}
