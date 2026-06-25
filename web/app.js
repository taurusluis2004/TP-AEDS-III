// ====================================================================
//  NutriTrack — front-end (vanilla JS)
// ====================================================================
const API = "/api";

// ---------- state ----------
const state = {
  usuarios: [],
  alimentos: [],
  refeicoes: [],
  consumos: [],
  favoritos: [],
  filters: { usuario: "", alimento: "", refeicao: "", consumo: "", favorito: "" },
};

// ---------- helpers ----------
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!res.ok) {
    const msg = data && data.erro ? data.erro : "HTTP " + res.status;
    throw new Error(msg);
  }
  return data;
}

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const initials = (name) => (name||"?")
  .trim().split(/\s+/).slice(0,2).map(s => s[0] || "").join("").toUpperCase();

const fmtNum = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const fmtDate = (s) => {
  if (!s) return "—";
  const [y,m,d] = s.split("-");
  return `${d}/${m}/${y}`;
};

// ---------- TOAST ----------
function toast(message, type="success", title=null) {
  const c = $("#toast-container");
  const el = document.createElement("div");
  el.className = "toast " + type;
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>',
  };
  const titles = { success: "Sucesso", error: "Erro", info: "Info" };
  el.innerHTML =
    `<div class="ic">${icons[type] || icons.info}</div>
     <div class="body"><b>${escapeHtml(title || titles[type] || "")}</b><span>${escapeHtml(message)}</span></div>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add("removing");
    setTimeout(() => el.remove(), 220);
  }, 3500);
}

// ---------- CONFIRM ----------
function confirmar(titulo, mensagem) {
  return new Promise(resolve => {
    const back = $("#confirm-backdrop");
    $("#confirm-title").textContent = titulo;
    $("#confirm-msg").textContent   = mensagem;
    back.classList.remove("hidden");
    const yes = $("#confirm-yes"), no = $("#confirm-no");
    const close = (v) => { back.classList.add("hidden"); yes.onclick = no.onclick = null; resolve(v); };
    yes.onclick = () => close(true);
    no.onclick  = () => close(false);
  });
}

// ---------- MODAL ----------
const modal = {
  open(title, html, onSubmit) {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal-backdrop").classList.remove("hidden");
    const form = $("#modal-body form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try { await onSubmit(form); modal.close(); }
        catch (err) { toast(err.message, "error"); }
      });
      const first = form.querySelector("input,select"); if (first) first.focus();
    }
  },
  close() { $("#modal-backdrop").classList.add("hidden"); $("#modal-body").innerHTML = ""; },
};
$("#modal-close").addEventListener("click", () => modal.close());
$("#modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "modal-backdrop") modal.close(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.close(); });

// ====================================================================
//  NAVIGATION (sidebar)
// ====================================================================
$$(".menu-item[data-view]").forEach(b => b.addEventListener("click", () => {
  $$(".menu-item").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  $$(".view").forEach(x => x.classList.remove("active"));
  $("#view-" + b.dataset.view).classList.add("active");
  $("#sidebar").classList.remove("open");
}));
$("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

// ====================================================================
//  THEME
// ====================================================================
const savedTheme = localStorage.getItem("nutritrack-theme") || "dark";
document.documentElement.dataset.theme = savedTheme;
$("#theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("nutritrack-theme", next);
  if (charts.calorias) renderCharts();   // refresh chart colors
});

// ====================================================================
//  GLOBAL SEARCH (atalho /)
// ====================================================================
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    e.preventDefault();
    $("#globalSearch").focus();
  }
});
$("#globalSearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  Object.keys(state.filters).forEach(k => state.filters[k] = q);
  $$(".filter-input").forEach(i => i.value = q);
  renderAll();
});
$$(".filter-input").forEach(inp => {
  inp.addEventListener("input", (e) => {
    state.filters[inp.dataset.filter] = e.target.value.toLowerCase();
    renderAll();
  });
});

// ====================================================================
//  USUÁRIO
// ====================================================================
function formUsuario(u={}) {
  return `<form class="form-grid">
    <input type="hidden" name="id" value="${u.id||""}"/>
    <div class="field full"><label>Nome completo</label>
      <input name="nome" required value="${escapeHtml(u.nome||"")}" placeholder="Ex: Maria Silva"/></div>
    <div class="field"><label>Email</label>
      <input name="email" type="email" required value="${escapeHtml(u.email||"")}" placeholder="maria@email.com"/></div>
    <div class="field"><label>Data de nascimento</label>
      <input name="dataNascimento" type="date" required value="${u.dataNascimento||""}"/></div>
    <div class="field full"><label>Telefones <span class="muted">(separe por vírgula)</span></label>
      <input name="telefones" value="${escapeHtml((u.telefones||[]).join(", "))}" placeholder="(31) 99999-0000, (31) 3333-3333"/></div>
    <div class="modal-actions full">
      <button type="button" class="btn-ghost" onclick="modal.close()">Cancelar</button>
      <button type="submit" class="btn-primary">${u.id ? "Atualizar" : "Criar usuário"}</button>
    </div>
  </form>`;
}
async function submitUsuario(form) {
  const f = Object.fromEntries(new FormData(form));
  const payload = {
    nome: f.nome, email: f.email, dataNascimento: f.dataNascimento,
    telefones: (f.telefones||"").split(",").map(s=>s.trim()).filter(Boolean),
  };
  if (f.id) await api("PUT", "/usuario/"+f.id, payload);
  else      await api("POST","/usuario", payload);
  toast(f.id ? "Usuário atualizado" : "Usuário criado");
  await loadAll();
}
function renderUsuarios() {
  const q = state.filters.usuario;
  const tbody = $("#tabela-usuario tbody");
  const xs = state.usuarios.filter(u =>
    !q || (u.nome+" "+u.email).toLowerCase().includes(q));
  $("#empty-usuario").classList.toggle("hidden", xs.length > 0);
  tbody.innerHTML = xs.map(u => `<tr>
    <td><span class="id-pill">#${u.id}</span></td>
    <td><div class="cell-user"><div class="avatar">${initials(u.nome)}</div><div><div><b>${escapeHtml(u.nome)}</b></div></div></div></td>
    <td>${escapeHtml(u.email)}</td>
    <td>${fmtDate(u.dataNascimento)}</td>
    <td>${(u.telefones||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("") || '<span class="muted">—</span>'}</td>
    <td class="t-right">
      <button class="row-action" title="Editar" onclick='editarUsuario(${u.id})'>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="row-action danger" title="Remover" onclick="removerUsuario(${u.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </td>
  </tr>`).join("");
}
window.editarUsuario = (id) => {
  const u = state.usuarios.find(x => x.id === id);
  modal.open("Editar usuário #" + id, formUsuario(u), submitUsuario);
};
window.removerUsuario = async (id) => {
  if (!await confirmar("Remover usuário", "Confirma a remoção do usuário #"+id+"?")) return;
  try { await api("DELETE","/usuario/"+id); toast("Usuário removido"); await loadAll(); }
  catch (err) { toast(err.message, "error"); }
};

// ====================================================================
//  ALIMENTO
// ====================================================================
function formAlimento(a={}) {
  return `<form class="form-grid">
    <input type="hidden" name="id" value="${a.id||""}"/>
    <div class="field"><label>Nome</label>
      <input name="nome" required value="${escapeHtml(a.nome||"")}" placeholder="Ex: Aveia"/></div>
    <div class="field"><label>Marca</label>
      <input name="marca" value="${escapeHtml(a.marca||"")}" placeholder="Opcional"/></div>
    <div class="field"><label>Kcal / 100g</label>
      <input name="kcalPor100g" type="number" step="0.1" min="0" required value="${a.kcalPor100g||""}"/></div>
    <div class="field"><label>Proteína / 100g</label>
      <input name="proteinaPor100g" type="number" step="0.1" min="0" required value="${a.proteinaPor100g||""}"/></div>
    <div class="field"><label>Carboidrato / 100g</label>
      <input name="carboPor100g" type="number" step="0.1" min="0" required value="${a.carboPor100g||""}"/></div>
    <div class="field"><label>Gordura / 100g</label>
      <input name="gorduraPor100g" type="number" step="0.1" min="0" required value="${a.gorduraPor100g||""}"/></div>
    <div class="field full"><label>Tags <span class="muted">(separe por vírgula)</span></label>
      <input name="tags" value="${escapeHtml((a.tags||[]).join(", "))}" placeholder="vegano, sem glúten"/></div>
    <div class="modal-actions full">
      <button type="button" class="btn-ghost" onclick="modal.close()">Cancelar</button>
      <button type="submit" class="btn-primary">${a.id ? "Atualizar" : "Criar alimento"}</button>
    </div>
  </form>`;
}
async function submitAlimento(form) {
  const f = Object.fromEntries(new FormData(form));
  const payload = {
    nome: f.nome, marca: f.marca||"",
    kcalPor100g: parseFloat(f.kcalPor100g),
    proteinaPor100g: parseFloat(f.proteinaPor100g),
    carboPor100g: parseFloat(f.carboPor100g),
    gorduraPor100g: parseFloat(f.gorduraPor100g),
    tags: (f.tags||"").split(",").map(s=>s.trim()).filter(Boolean),
  };
  if (f.id) await api("PUT","/alimento/"+f.id, payload);
  else      await api("POST","/alimento", payload);
  toast(f.id ? "Alimento atualizado" : "Alimento criado");
  await loadAll();
}
function renderAlimentos() {
  const q = state.filters.alimento;
  const xs = state.alimentos.filter(a =>
    !q || (a.nome+" "+a.marca+" "+(a.tags||[]).join(" ")).toLowerCase().includes(q));
  $("#empty-alimento").classList.toggle("hidden", xs.length > 0);
  $("#tabela-alimento tbody").innerHTML = xs.map(a => `<tr>
    <td><span class="id-pill">#${a.id}</span></td>
    <td>
      <div><b>${escapeHtml(a.nome)}</b></div>
      <div class="muted" style="font-size:12px">${escapeHtml(a.marca||"sem marca")}</div>
    </td>
    <td><span class="kcal-pill">${fmtNum(a.kcalPor100g)} kcal</span></td>
    <td>${fmtNum(a.proteinaPor100g)}g</td>
    <td>${fmtNum(a.carboPor100g)}g</td>
    <td>${fmtNum(a.gorduraPor100g)}g</td>
    <td>${(a.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("") || '<span class="muted">—</span>'}</td>
    <td class="t-right">
      <button class="row-action" title="Editar" onclick='editarAlimento(${a.id})'>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="row-action danger" title="Remover" onclick="removerAlimento(${a.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </td>
  </tr>`).join("");
}
window.editarAlimento = (id) => {
  const a = state.alimentos.find(x => x.id === id);
  modal.open("Editar alimento #" + id, formAlimento(a), submitAlimento);
};
window.removerAlimento = async (id) => {
  if (!await confirmar("Remover alimento", "Confirma a remoção do alimento #"+id+"?")) return;
  try { await api("DELETE","/alimento/"+id); toast("Alimento removido"); await loadAll(); }
  catch (err) { toast(err.message, "error"); }
};

// ====================================================================
//  REFEIÇÃO
// ====================================================================
function formRefeicao(r={}) {
  const opts = state.usuarios.map(u =>
    `<option value="${u.id}" ${r.usuarioId===u.id?"selected":""}>#${u.id} · ${escapeHtml(u.nome)}</option>`).join("");
  const tipos = ["Café da manhã","Lanche da manhã","Almoço","Lanche da tarde","Jantar","Ceia"];
  return `<form class="form-grid">
    <input type="hidden" name="id" value="${r.id||""}"/>
    <div class="field full"><label>Usuário</label>
      <select name="usuarioId" required>${opts || '<option value="">Nenhum usuário cadastrado</option>'}</select></div>
    <div class="field"><label>Data</label>
      <input name="data" type="date" required value="${r.data||""}"/></div>
    <div class="field"><label>Tipo</label>
      <select name="tipo" required>${tipos.map(t=>`<option ${r.tipo===t?"selected":""}>${t}</option>`).join("")}</select></div>
    <div class="field full"><label>Observação</label>
      <input name="observacao" value="${escapeHtml(r.observacao||"")}" placeholder="Opcional"/></div>
    <div class="modal-actions full">
      <button type="button" class="btn-ghost" onclick="modal.close()">Cancelar</button>
      <button type="submit" class="btn-primary">${r.id ? "Atualizar" : "Criar refeição"}</button>
    </div>
  </form>`;
}
async function submitRefeicao(form) {
  const f = Object.fromEntries(new FormData(form));
  const payload = {
    usuarioId: parseInt(f.usuarioId,10),
    data: f.data, tipo: f.tipo,
    observacao: f.observacao||"",
  };
  if (f.id) await api("PUT","/refeicao/"+f.id, payload);
  else      await api("POST","/refeicao", payload);
  toast(f.id ? "Refeição atualizada" : "Refeição criada");
  await loadAll();
}
function renderRefeicoes() {
  const q = state.filters.refeicao;
  const userMap = Object.fromEntries(state.usuarios.map(u => [u.id, u]));
  const xs = state.refeicoes.filter(r =>
    !q || (r.tipo+" "+r.data+" "+(r.observacao||"")).toLowerCase().includes(q));
  $("#empty-refeicao").classList.toggle("hidden", xs.length > 0);
  $("#tabela-refeicao tbody").innerHTML = xs.map(r => {
    const u = userMap[r.usuarioId];
    return `<tr>
      <td><span class="id-pill">#${r.id}</span></td>
      <td><b>${escapeHtml(r.tipo)}</b></td>
      <td>${fmtDate(r.data)}</td>
      <td>${u ? `<div class="cell-user"><div class="avatar">${initials(u.nome)}</div><span>${escapeHtml(u.nome)}</span></div>` : '<span class="muted">desconhecido</span>'}</td>
      <td>${escapeHtml(r.observacao) || '<span class="muted">—</span>'}</td>
      <td class="t-right">
        <button class="row-action" title="Editar" onclick='editarRefeicao(${r.id})'>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="row-action danger" title="Remover (cascade)" onclick="removerRefeicao(${r.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </td>
    </tr>`;
  }).join("");
}
window.editarRefeicao = (id) => {
  const r = state.refeicoes.find(x => x.id === id);
  modal.open("Editar refeição #" + id, formRefeicao(r), submitRefeicao);
};
window.removerRefeicao = async (id) => {
  if (!await confirmar("Remover refeição", "Esta ação removerá também os consumos vinculados (cascade). Continuar?")) return;
  try { await api("DELETE","/refeicao/"+id); toast("Refeição removida (cascade)"); await loadAll(); }
  catch (err) { toast(err.message, "error"); }
};

// ====================================================================
//  CONSUMO
// ====================================================================
function formConsumo(c={}) {
  const refs = state.refeicoes.map(r =>
    `<option value="${r.id}" ${c.refeicaoId===r.id?"selected":""}>#${r.id} · ${escapeHtml(r.tipo)} (${fmtDate(r.data)})</option>`).join("");
  const als = state.alimentos.map(a =>
    `<option value="${a.id}" ${c.alimentoId===a.id?"selected":""}>#${a.id} · ${escapeHtml(a.nome)}</option>`).join("");
  return `<form class="form-grid">
    <input type="hidden" name="id" value="${c.id||""}"/>
    <div class="field full"><label>Refeição</label>
      <select name="refeicaoId" required>${refs || '<option value="">Nenhuma refeição</option>'}</select></div>
    <div class="field full"><label>Alimento</label>
      <select name="alimentoId" required>${als || '<option value="">Nenhum alimento</option>'}</select></div>
    <div class="field full"><label>Quantidade (g)</label>
      <input name="quantidadeGramas" type="number" step="0.1" min="0.1" required value="${c.quantidadeGramas||""}" placeholder="Ex: 50"/></div>
    <div class="modal-actions full">
      <button type="button" class="btn-ghost" onclick="modal.close()">Cancelar</button>
      <button type="submit" class="btn-primary">${c.id ? "Atualizar" : "Criar consumo"}</button>
    </div>
  </form>`;
}
async function submitConsumo(form) {
  const f = Object.fromEntries(new FormData(form));
  const payload = {
    refeicaoId: parseInt(f.refeicaoId,10),
    alimentoId: parseInt(f.alimentoId,10),
    quantidadeGramas: parseFloat(f.quantidadeGramas),
  };
  if (f.id) await api("PUT","/consumo/"+f.id, payload);
  else      await api("POST","/consumo", payload);
  toast(f.id ? "Consumo atualizado" : "Consumo criado");
  await loadAll();
}
function calcKcal(c) {
  const a = state.alimentos.find(x => x.id === c.alimentoId);
  if (!a) return 0;
  return (a.kcalPor100g * c.quantidadeGramas) / 100;
}
function renderConsumos() {
  const q = state.filters.consumo;
  const refMap = Object.fromEntries(state.refeicoes.map(r => [r.id, r]));
  const alMap  = Object.fromEntries(state.alimentos.map(a => [a.id, a]));
  const xs = state.consumos.filter(c => {
    if (!q) return true;
    const r = refMap[c.refeicaoId], a = alMap[c.alimentoId];
    return ((r?.tipo||"") + " " + (a?.nome||"")).toLowerCase().includes(q);
  });
  $("#empty-consumo").classList.toggle("hidden", xs.length > 0);
  $("#tabela-consumo tbody").innerHTML = xs.map(c => {
    const r = refMap[c.refeicaoId], a = alMap[c.alimentoId];
    return `<tr>
      <td><span class="id-pill">#${c.id}</span></td>
      <td>${r ? `<b>${escapeHtml(r.tipo)}</b><div class="muted" style="font-size:12px">${fmtDate(r.data)}</div>` : `<span class="muted">#${c.refeicaoId}</span>`}</td>
      <td>${a ? `<b>${escapeHtml(a.nome)}</b>` : `<span class="muted">#${c.alimentoId}</span>`}</td>
      <td>${fmtNum(c.quantidadeGramas)}g</td>
      <td><span class="kcal-pill">${fmtNum(calcKcal(c))} kcal</span></td>
      <td class="t-right">
        <button class="row-action" title="Editar" onclick='editarConsumo(${c.id})'>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="row-action danger" title="Remover" onclick="removerConsumo(${c.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </td>
    </tr>`;
  }).join("");

  // filtro 1:N
  $("#filtro-refeicao").innerHTML = state.refeicoes.map(r =>
    `<option value="${r.id}">#${r.id} · ${escapeHtml(r.tipo)} (${fmtDate(r.data)})</option>`).join("");
}
window.editarConsumo = (id) => {
  const c = state.consumos.find(x => x.id === id);
  modal.open("Editar consumo #" + id, formConsumo(c), submitConsumo);
};
window.removerConsumo = async (id) => {
  if (!await confirmar("Remover consumo", "Confirma a remoção do consumo #"+id+"?")) return;
  try { await api("DELETE","/consumo/"+id); toast("Consumo removido"); await loadAll(); }
  catch (err) { toast(err.message, "error"); }
};

$("#btn-filtrar").addEventListener("click", async () => {
  const refId = $("#filtro-refeicao").value;
  if (!refId) return;
  try {
    const xs = await api("GET","/refeicao/"+refId+"/consumos");
    $("#resultado-filtro").textContent =
      "GET /api/refeicao/"+refId+"/consumos\n" +
      "// Consulta resolvida via Hash Extensível 1:N (refeicaoId → consumoId)\n\n" +
      JSON.stringify(xs, null, 2);
  } catch (err) {
    $("#resultado-filtro").textContent = "Erro: " + err.message;
  }
});

// ====================================================================
//  ALIMENTO ORDENADO (FASE III · Árvore B+)
// ====================================================================
$("#btn-alimento-ordenado").addEventListener("click", async () => {
  try {
    const xs = await api("GET","/alimento/ordenado");
    const linhas = xs.map(a => `#${String(a.id).padStart(3)} · ${a.nome}${a.marca?` [${a.marca}]`:""}`).join("\n");
    $("#resultado-alimento-ordenado").textContent =
      "GET /api/alimento/ordenado\n" +
      "// Resolvido percorrendo as folhas encadeadas da Árvore B+\n" +
      "// (sem ordenação em memória)\n\n" +
      (linhas || "(nenhum alimento cadastrado)");
  } catch (err) {
    $("#resultado-alimento-ordenado").textContent = "Erro: " + err.message;
  }
});

// ====================================================================
//  FAVORITO (N:N · chave composta)
// ====================================================================
function formFavorito(f={}) {
  const us = state.usuarios.map(u =>
    `<option value="${u.id}" ${f.usuarioId===u.id?"selected":""}>#${u.id} · ${escapeHtml(u.nome)}</option>`).join("");
  const al = state.alimentos.map(a =>
    `<option value="${a.id}" ${f.alimentoId===a.id?"selected":""}>#${a.id} · ${escapeHtml(a.nome)}</option>`).join("");
  const lockKeys = !!f.id;
  return `<form class="form-grid">
    <input type="hidden" name="id" value="${f.id||""}"/>
    <div class="field full"><label>Usuário ${lockKeys?'<span class="muted">(imutável)</span>':""}</label>
      <select name="usuarioId" ${lockKeys?"disabled":"required"}>${us || '<option value="">Nenhum usuário</option>'}</select></div>
    <div class="field full"><label>Alimento ${lockKeys?'<span class="muted">(imutável)</span>':""}</label>
      <select name="alimentoId" ${lockKeys?"disabled":"required"}>${al || '<option value="">Nenhum alimento</option>'}</select></div>
    <div class="field"><label>Data</label>
      <input name="dataInclusao" type="date" value="${f.dataInclusao||""}"/></div>
    <div class="field"><label>Nota (1–5)</label>
      <input name="nota" type="number" min="1" max="5" step="1" value="${f.nota||""}" placeholder="opcional"/></div>
    <div class="field full"><label>Observação</label>
      <input name="observacao" value="${escapeHtml(f.observacao||"")}" placeholder="Opcional"/></div>
    <div class="modal-actions full">
      <button type="button" class="btn-ghost" onclick="modal.close()">Cancelar</button>
      <button type="submit" class="btn-primary">${f.id ? "Atualizar" : "Criar favorito"}</button>
    </div>
  </form>`;
}
async function submitFavorito(form) {
  const f = Object.fromEntries(new FormData(form));
  if (f.id) {
    const payload = {
      dataInclusao: f.dataInclusao || "",
      nota: f.nota ? parseInt(f.nota, 10) : 0,
      observacao: f.observacao || "",
    };
    await api("PUT","/favorito/"+f.id, payload);
  } else {
    const payload = {
      usuarioId: parseInt(f.usuarioId, 10),
      alimentoId: parseInt(f.alimentoId, 10),
      dataInclusao: f.dataInclusao || "",
      nota: f.nota ? parseInt(f.nota, 10) : 0,
      observacao: f.observacao || "",
    };
    await api("POST","/favorito", payload);
  }
  toast(f.id ? "Favorito atualizado" : "Favorito criado");
  await loadAll();
}
function renderFavoritos() {
  const q = state.filters.favorito;
  const userMap = Object.fromEntries(state.usuarios.map(u => [u.id, u]));
  const alMap   = Object.fromEntries(state.alimentos.map(a => [a.id, a]));
  const xs = state.favoritos.filter(f => {
    if (!q) return true;
    const u = userMap[f.usuarioId], a = alMap[f.alimentoId];
    return ((u?.nome||"")+" "+(a?.nome||"")+" "+(f.observacao||"")).toLowerCase().includes(q);
  });
  $("#empty-favorito").classList.toggle("hidden", xs.length > 0);
  $("#tabela-favorito tbody").innerHTML = xs.map(f => {
    const u = userMap[f.usuarioId], a = alMap[f.alimentoId];
    const nota = f.nota>0 ? "⭐".repeat(f.nota) : '<span class="muted">—</span>';
    return `<tr>
      <td><span class="id-pill">#${f.id}</span></td>
      <td>${u ? `<div class="cell-user"><div class="avatar">${initials(u.nome)}</div><span>${escapeHtml(u.nome)}</span></div>` : `<span class="muted">#${f.usuarioId}</span>`}</td>
      <td>${a ? `<b>${escapeHtml(a.nome)}</b>` : `<span class="muted">#${f.alimentoId}</span>`}</td>
      <td>${fmtDate(f.dataInclusao)}</td>
      <td>${nota}</td>
      <td>${escapeHtml(f.observacao) || '<span class="muted">—</span>'}</td>
      <td class="t-right">
        <button class="row-action" title="Editar" onclick='editarFavorito(${f.id})'>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="row-action danger" title="Remover" onclick="removerFavorito(${f.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </td>
    </tr>`;
  }).join("");

  // popula selects dos filtros laterais
  $("#filtro-fav-usuario").innerHTML = state.usuarios.map(u =>
    `<option value="${u.id}">#${u.id} · ${escapeHtml(u.nome)}</option>`).join("");
  $("#filtro-fav-alimento").innerHTML = state.alimentos.map(a =>
    `<option value="${a.id}">#${a.id} · ${escapeHtml(a.nome)}</option>`).join("");
}
window.editarFavorito = (id) => {
  const f = state.favoritos.find(x => x.id === id);
  modal.open("Editar favorito #" + id, formFavorito(f), submitFavorito);
};
window.removerFavorito = async (id) => {
  if (!await confirmar("Remover favorito", "Confirma a remoção do favorito #"+id+"?")) return;
  try { await api("DELETE","/favorito/"+id); toast("Favorito removido"); await loadAll(); }
  catch (err) { toast(err.message, "error"); }
};

$("#btn-fav-usuario").addEventListener("click", async () => {
  const id = $("#filtro-fav-usuario").value; if (!id) return;
  try {
    const xs = await api("GET","/usuario/"+id+"/favoritos");
    $("#resultado-fav-usuario").textContent =
      "GET /api/usuario/"+id+"/favoritos\n" +
      "// Resolvido via Hash Extensível (usuarioId → favoritoId)\n\n" +
      JSON.stringify(xs, null, 2);
  } catch (err) { $("#resultado-fav-usuario").textContent = "Erro: " + err.message; }
});
$("#btn-fav-alimento").addEventListener("click", async () => {
  const id = $("#filtro-fav-alimento").value; if (!id) return;
  try {
    const xs = await api("GET","/alimento/"+id+"/favoritos");
    $("#resultado-fav-alimento").textContent =
      "GET /api/alimento/"+id+"/favoritos\n" +
      "// Resolvido via Hash Extensível (alimentoId → favoritoId)\n\n" +
      JSON.stringify(xs, null, 2);
  } catch (err) { $("#resultado-fav-alimento").textContent = "Erro: " + err.message; }
});

// ====================================================================
//  QUICK ADD
// ====================================================================
$("#quick-add").addEventListener("click", () => {
  const active = $(".menu-item.active").dataset.view;
  openCreateModal(active === "dashboard" ? "usuario" : active);
});
$$("[data-open-modal]").forEach(b => b.addEventListener("click", () => openCreateModal(b.dataset.openModal)));

function openCreateModal(kind) {
  switch (kind) {
    case "usuario":  modal.open("Novo usuário",  formUsuario(),  submitUsuario);  break;
    case "alimento": modal.open("Novo alimento", formAlimento(), submitAlimento); break;
    case "refeicao": modal.open("Nova refeição", formRefeicao(), submitRefeicao); break;
    case "consumo":  modal.open("Novo consumo",  formConsumo(),  submitConsumo);  break;
    case "favorito": modal.open("Novo favorito", formFavorito(), submitFavorito); break;
  }
}

// ====================================================================
//  DASHBOARD
// ====================================================================
const charts = { calorias: null, macros: null };

function renderDashboard() {
  $("#kpi-usuarios").textContent  = state.usuarios.length;
  $("#kpi-alimentos").textContent = state.alimentos.length;
  $("#kpi-refeicoes").textContent = state.refeicoes.length;
  $("#kpi-consumos").textContent  = state.consumos.length;

  // recent feed (last 6 consumos)
  const refMap = Object.fromEntries(state.refeicoes.map(r => [r.id, r]));
  const alMap  = Object.fromEntries(state.alimentos.map(a => [a.id, a]));
  const recent = [...state.consumos].sort((a,b) => b.id - a.id).slice(0, 6);
  const feed = $("#recent-feed");
  if (recent.length === 0) {
    feed.innerHTML = '<li class="muted">Nenhum consumo registrado ainda.</li>';
  } else {
    feed.innerHTML = recent.map(c => {
      const a = alMap[c.alimentoId], r = refMap[c.refeicaoId];
      return `<li>
        <span class="dot"></span>
        <div style="flex:1">
          <div><b>${escapeHtml(a?.nome || "Alimento #"+c.alimentoId)}</b> · ${fmtNum(c.quantidadeGramas)}g
            <span class="kcal-pill" style="margin-left:6px">${fmtNum(calcKcal(c))} kcal</span></div>
          <div class="muted" style="font-size:12px">${escapeHtml(r?.tipo || "—")} · ${fmtDate(r?.data)}</div>
        </div>
      </li>`;
    }).join("");
  }

  renderCharts();
}

function renderCharts() {
  const dark = document.documentElement.dataset.theme === "dark";
  const grid = dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)";
  const tick = dark ? "#a3b3cc" : "#475569";

  // calorias por refeição (top 8)
  const refMap = Object.fromEntries(state.refeicoes.map(r => [r.id, r]));
  const totals = {};
  for (const c of state.consumos) {
    totals[c.refeicaoId] = (totals[c.refeicaoId] || 0) + calcKcal(c);
  }
  const entries = Object.entries(totals)
    .map(([id, k]) => ({ id: +id, kcal: k, label: refMap[+id] ? `${refMap[+id].tipo} (${refMap[+id].data})` : "#"+id }))
    .sort((a,b) => b.kcal - a.kcal).slice(0, 8);

  if (charts.calorias) charts.calorias.destroy();
  charts.calorias = new Chart($("#chartCalorias"), {
    type: "bar",
    data: {
      labels: entries.map(e => e.label),
      datasets: [{
        label: "Calorias",
        data: entries.map(e => Math.round(e.kcal)),
        backgroundColor: ctx => {
          const c = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
          c.addColorStop(0, "#10b981");
          c.addColorStop(1, "#047857");
          return c;
        },
        borderRadius: 8, borderSkipped: false, maxBarThickness: 36,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tick, maxRotation: 0, autoSkip: true } },
        y: { grid: { color: grid }, ticks: { color: tick } },
      },
    },
  });

  // macros — soma global ponderada pela quantidade
  let p = 0, c = 0, g = 0;
  const alMap = Object.fromEntries(state.alimentos.map(a => [a.id, a]));
  for (const x of state.consumos) {
    const a = alMap[x.alimentoId]; if (!a) continue;
    const f = x.quantidadeGramas / 100;
    p += a.proteinaPor100g * f;
    c += a.carboPor100g * f;
    g += a.gorduraPor100g * f;
  }
  if (charts.macros) charts.macros.destroy();
  charts.macros = new Chart($("#chartMacros"), {
    type: "doughnut",
    data: {
      labels: ["Proteína","Carboidrato","Gordura"],
      datasets: [{
        data: [Math.round(p), Math.round(c), Math.round(g)],
        backgroundColor: ["#8b5cf6","#10b981","#f59e0b"],
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { color: tick, padding: 16, usePointStyle: true } },
      },
    },
  });
}

// ====================================================================
//  LOAD / RENDER
// ====================================================================
async function loadAll() {
  try {
    const [us, al, rf, co, fv] = await Promise.all([
      api("GET","/usuario"),
      api("GET","/alimento"),
      api("GET","/refeicao"),
      api("GET","/consumo"),
      api("GET","/favorito"),
    ]);
    state.usuarios  = us || [];
    state.alimentos = al || [];
    state.refeicoes = rf || [];
    state.consumos  = co || [];
    state.favoritos = fv || [];
    renderAll();
  } catch (err) {
    toast("Falha ao carregar dados: " + err.message, "error");
  }
}
function renderAll() {
  renderUsuarios();
  renderAlimentos();
  renderRefeicoes();
  renderConsumos();
  renderFavoritos();
  renderDashboard();
  popularSelectUsuariosCripto();
}

loadAll();

// ====================================================================
//  BACKUP / COMPRESSÃO (FASE IV — Huffman e LZW)
// ====================================================================
const fmtBytes = (n) => {
  if (n == null || n < 0) return "—";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(2) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
};

async function backupStatus() {
  const box = $("#backup-status");
  if (!box) return;
  try {
    const s = await api("GET", "/backup");
    box.innerHTML = `
      <div class="card" style="padding:16px;">
        <div class="muted" style="font-size:.8rem;">Arquivos de origem</div>
        <div style="font-size:1.6rem;font-weight:800;">${s.arquivosOrigem}</div>
        <div class="muted" style="font-size:.8rem;">${fmtBytes(s.tamanhoOrigem)} em ./dados/</div>
      </div>
      <div class="card" style="padding:16px;">
        <div class="muted" style="font-size:.8rem;">Backup Huffman</div>
        <div style="font-size:1.6rem;font-weight:800;">${s.huffman.existe ? fmtBytes(s.huffman.tamanho) : "—"}</div>
        <div class="muted" style="font-size:.8rem;">${s.huffman.existe ? "gerado" : "ainda não gerado"}</div>
      </div>
      <div class="card" style="padding:16px;">
        <div class="muted" style="font-size:.8rem;">Backup LZW</div>
        <div style="font-size:1.6rem;font-weight:800;">${s.lzw.existe ? fmtBytes(s.lzw.tamanho) : "—"}</div>
        <div class="muted" style="font-size:.8rem;">${s.lzw.existe ? "gerado" : "ainda não gerado"}</div>
      </div>`;
  } catch (err) {
    box.innerHTML = `<div class="card" style="padding:16px;">Erro: ${escapeHtml(err.message)}</div>`;
  }
}

function renderResultadoCompressao(r) {
  const integ = r.integridadeOk
    ? '<span class="chip chip-primary">Integridade OK ✓</span>'
    : '<span class="chip" style="background:#ef4444;color:#fff;">Integridade FALHOU ✗</span>';
  return `
    <div style="margin-top:10px;">
      ${integ}
      <table style="margin-top:10px;width:100%;">
        <tbody>
          <tr><td>Arquivos incluídos</td><td><b>${r.quantidadeArquivos}</b></td></tr>
          <tr><td>Tamanho original (a)</td><td><b>${r.tamanhoOriginal.toLocaleString("pt-BR")} bytes</b> (${fmtBytes(r.tamanhoOriginal)})</td></tr>
          <tr><td>Tamanho comprimido (b)</td><td><b>${r.tamanhoComprimido.toLocaleString("pt-BR")} bytes</b> (${fmtBytes(r.tamanhoComprimido)})</td></tr>
          <tr><td>Taxa de compressão (c)</td><td><b style="color:var(--brand,#10b981);">${r.taxaCompressao}%</b></td></tr>
          <tr><td>Razão original:comprimido</td><td><b>${r.razao} : 1</b></td></tr>
          <tr><td>Tempo</td><td>${r.milissegundos} ms</td></tr>
        </tbody>
      </table>
    </div>`;
}

function renderForm4(algo, r) {
  const alvo = $("#form4-" + algo);
  if (!alvo) return;
  alvo.innerHTML = `
    <table style="width:100%;">
      <tbody>
        <tr><td><b>a)</b> Tamanho do arquivo original</td><td><b>${r.tamanhoOriginal.toLocaleString("pt-BR")} bytes</b> (${fmtBytes(r.tamanhoOriginal)})</td></tr>
        <tr><td><b>b)</b> Tamanho do arquivo comprimido</td><td><b>${r.tamanhoComprimido.toLocaleString("pt-BR")} bytes</b> (${fmtBytes(r.tamanhoComprimido)})</td></tr>
        <tr><td><b>c)</b> Taxa de compressão</td><td><b style="color:var(--brand,#10b981);">${r.taxaCompressao}%</b> &nbsp; (razão ${r.razao} : 1)</td></tr>
      </tbody>
    </table>`;
}

async function gerarBackup(algo) {
  const btn = $(`[data-gerar="${algo}"]`);
  const out = $("#resultado-" + algo);
  if (btn) { btn.disabled = true; btn.textContent = "Gerando…"; }
  try {
    const r = await api("POST", "/backup/" + algo);
    if (out) out.innerHTML = renderResultadoCompressao(r);
    renderForm4(algo, r);
    backupStatus();
    toast(`Backup ${r.algoritmo} gerado · taxa ${r.taxaCompressao}%`, "success");
  } catch (err) {
    toast("Erro ao gerar backup: " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Gerar backup " + (algo === "huffman" ? "Huffman" : "LZW"); }
  }
}

async function restaurarBackup(algo) {
  const ok = await confirmar("Restaurar backup",
    `Os arquivos do backup ${algo.toUpperCase()} serão extraídos em ./dados_restaurado/. Continuar?`);
  if (!ok) return;
  try {
    const r = await api("POST", "/backup/restaurar/" + algo);
    toast(`${r.arquivosRestaurados} arquivo(s) restaurados em ./dados_restaurado/`, "success");
  } catch (err) {
    toast("Erro ao restaurar: " + err.message, "error");
  }
}

$$("[data-gerar]").forEach(b => b.addEventListener("click", () => gerarBackup(b.dataset.gerar)));
$$("[data-restaurar]").forEach(b => b.addEventListener("click", () => restaurarBackup(b.dataset.restaurar)));
$$("[data-download]").forEach(b => b.addEventListener("click", () => {
  window.location.href = "/api/backup/download/" + b.dataset.download;
}));
const backupRefreshBtn = $("#backup-refresh");
if (backupRefreshBtn) backupRefreshBtn.addEventListener("click", backupStatus);

// carrega o status ao abrir a aba de backup
$$('.menu-item[data-view="backup"]').forEach(b => b.addEventListener("click", backupStatus));

// ====================================================================
//  BUSCA POR PADRÃO (FASE V — KMP e Boyer-Moore)
// ====================================================================

// destaca o padrão no nome (insensível a acentos e maiúsculas), preservando o original
function destacarPadrao(nome, padrao) {
  const original = String(nome ?? "");
  if (!padrao) return escapeHtml(original);
  const semMarca = (c) => c.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
  let norm = "";
  const mapa = []; // mapa[k] = índice no original do k-ésimo caractere normalizado
  for (let i = 0; i < original.length; i++) {
    for (const ch of semMarca(original[i])) { norm += ch; mapa.push(i); }
  }
  const pN = padrao.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
  if (!pN) return escapeHtml(original);
  const marcado = new Array(original.length).fill(false);
  let de = 0, idx;
  while ((idx = norm.indexOf(pN, de)) !== -1) {
    for (let k = idx; k < idx + pN.length; k++) marcado[mapa[k]] = true;
    de = idx + pN.length;
  }
  let out = "", aberto = false;
  const ABRE = '<mark style="background:var(--brand,#10b981);color:#04140d;border-radius:3px;padding:0 2px;">';
  for (let i = 0; i < original.length; i++) {
    if (marcado[i] && !aberto) { out += ABRE; aberto = true; }
    if (!marcado[i] && aberto) { out += "</mark>"; aberto = false; }
    out += escapeHtml(original[i]);
  }
  if (aberto) out += "</mark>";
  return out;
}

function renderBusca(r) {
  $("#busca-metricas").style.display = "grid";
  $("#busca-resultado-card").style.display = "block";
  $("#m-algoritmo").textContent   = r.algoritmo;
  $("#m-encontrados").textContent = r.quantidadeEncontrada + " / " + r.totalRegistros;
  $("#m-comparacoes").textContent = Number(r.comparacoes).toLocaleString("pt-BR");
  $("#m-tempo").textContent       = r.milissegundos + " ms";

  const tbody = $("#tabela-busca tbody");
  $("#empty-busca").classList.toggle("hidden", r.quantidadeEncontrada > 0);
  tbody.innerHTML = (r.encontrados || []).map(it => `<tr>
    <td><span class="id-pill">#${it.id}</span></td>
    <td><b>${destacarPadrao(it.valor, r.padrao)}</b></td>
    <td>${it.ocorrencias}</td>
    <td>${(it.posicoes || []).join(", ")}</td>
  </tr>`).join("");
}

async function executarBusca() {
  const padrao = $("#busca-padrao").value.trim();
  const algoritmo = $("#busca-algoritmo").value;
  if (!padrao) { toast("Informe um padrão para pesquisar.", "error"); return; }
  try {
    const r = await api("GET", "/busca?padrao=" + encodeURIComponent(padrao) + "&algoritmo=" + algoritmo);
    renderBusca(r);
    $("#busca-comparativo").style.display = "none";
  } catch (err) {
    toast("Erro na busca: " + err.message, "error");
  }
}

const formBusca = $("#form-busca");
if (formBusca) formBusca.addEventListener("submit", (e) => { e.preventDefault(); executarBusca(); });

const btnComparar = $("#btn-busca-comparar");
if (btnComparar) btnComparar.addEventListener("click", async () => {
  const padrao = $("#busca-padrao").value.trim();
  if (!padrao) { toast("Informe um padrão para comparar.", "error"); return; }
  try {
    const [kmp, bm] = await Promise.all([
      api("GET", "/busca?padrao=" + encodeURIComponent(padrao) + "&algoritmo=kmp"),
      api("GET", "/busca?padrao=" + encodeURIComponent(padrao) + "&algoritmo=bm"),
    ]);
    renderBusca(kmp); // tabela com o resultado (idêntico nos dois)
    const vencedor = kmp.comparacoes === bm.comparacoes
      ? "empate"
      : (kmp.comparacoes < bm.comparacoes ? "KMP" : "Boyer-Moore");
    $("#busca-comparativo").style.display = "block";
    $("#resultado-comparativo").textContent =
      `Padrão: "${padrao}"   ·   Campo: ${kmp.campo}   ·   Registros varridos: ${kmp.totalRegistros}\n` +
      `Encontrados: ${kmp.quantidadeEncontrada}\n\n` +
      `KMP ............ comparações: ${kmp.comparacoes.toLocaleString("pt-BR").padStart(8)}   tempo: ${kmp.milissegundos} ms\n` +
      `Boyer-Moore .... comparações: ${bm.comparacoes.toLocaleString("pt-BR").padStart(8)}   tempo: ${bm.milissegundos} ms\n\n` +
      `Menos comparações: ${vencedor}`;
  } catch (err) {
    toast("Erro ao comparar: " + err.message, "error");
  }
});

// ====================================================================
//  SEGURANÇA / CRIPTOGRAFIA (FASE V — XOR)
// ====================================================================
function popularSelectUsuariosCripto() {
  const sel = $("#cripto-usuario");
  if (!sel) return;
  sel.innerHTML = state.usuarios.map(u =>
    `<option value="${u.id}">#${u.id} · ${escapeHtml(u.nome)}</option>`).join("")
    || '<option value="">Nenhum usuário</option>';
}

const btnCriptoDemo = $("#btn-cripto-demo");
if (btnCriptoDemo) btnCriptoDemo.addEventListener("click", async () => {
  const texto = $("#cripto-texto").value;
  if (!texto) { toast("Digite um texto para cifrar.", "error"); return; }
  try {
    const r = await api("GET", "/seguranca/demo?texto=" + encodeURIComponent(texto));
    $("#resultado-cripto-demo").textContent =
      `Método ......... : ${r.metodo}\n` +
      `Original ....... : ${r.original}\n` +
      `Cifrado (hex) .. : ${r.cifradoHex}\n` +
      `Cifrado (Base64) : ${r.cifradoBase64}\n` +
      `Decifrado ...... : ${r.decifrado}`;
  } catch (err) {
    $("#resultado-cripto-demo").textContent = "Erro: " + err.message;
  }
});

const btnCriptoUsuario = $("#btn-cripto-usuario");
if (btnCriptoUsuario) btnCriptoUsuario.addEventListener("click", async () => {
  const id = $("#cripto-usuario").value;
  if (!id) return;
  try {
    const r = await api("GET", "/seguranca/usuario/" + id);
    $("#resultado-cripto-usuario").textContent =
      `Campo .................... : ${r.campo}\n` +
      `E-mail em memória (claro)  : ${r.emailClaro}\n` +
      `E-mail em disco (hex) .... : ${r.emailCifradoHex}\n` +
      `E-mail em disco (Base64) . : ${r.emailCifradoBase64}\n\n` +
      `// ${r.observacao}`;
  } catch (err) {
    $("#resultado-cripto-usuario").textContent = "Erro: " + err.message;
  }
});

// popula o select de usuários ao abrir a aba Segurança
$$('.menu-item[data-view="seguranca"]').forEach(b => b.addEventListener("click", popularSelectUsuariosCripto));

