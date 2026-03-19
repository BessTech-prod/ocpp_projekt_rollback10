(function(){
  const API = {
    orgs: '/api/orgs',
    live: '/api/portal/live/chargers',
    status: '/api/status',
    cpsMap: '/api/cps/map',
    send: '/api/portal/ocpp/command',
    commandStatus: (id) => `/api/portal/ocpp/command/${encodeURIComponent(id)}`
  };

  const $ = (s) => document.querySelector(s);

  const state = {
    orgs: {},
    items: [],
    timer: null,
    pendingCommandId: null,
    statusTimer: null,
  };

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function statusBadge(raw){
    const v = String(raw || 'Ingen data');
    const s = v.toLowerCase();
    let cls = 'badge status-unknown';
    if (s === 'charging') cls = 'badge status-charging';
    else if (s === 'available') cls = 'badge status-available';
    else if (s === 'preparing' || s === 'finishing') cls = 'badge status-preparing';
    else if (s === 'faulted') cls = 'badge status-faulted';
    else if (s === 'unavailable') cls = 'badge status-unavailable';
    else if (s === 'suspendedev' || s === 'suspendedevse' || s === 'suspended') cls = 'badge status-suspended';
    return `<span class="${cls}">${esc(v)}</span>`;
  }

  async function fetchLiveFallback(orgId){
    const [statusMap, cpsMap] = await Promise.all([
      UI.getJSON(API.status),
      UI.getJSON(API.cpsMap).catch(() => ({})),
    ]);

    const items = Object.keys(statusMap || {}).sort().map((cpId) => ({
      cp_id: cpId,
      org_id: (cpsMap && cpsMap[cpId]) || 'default',
      status: (statusMap && statusMap[cpId]) || {},
    }));

    return orgId ? items.filter((it) => (it.org_id || 'default') === orgId) : items;
  }

  async function fetchLive(){
    const orgId = ($('#orgFilter')?.value || '').trim();
    const query = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    const meta = $('#liveMeta');
    try {
      const res = await UI.getJSON(`${API.live}${query}`);
      state.items = res.items || [];
      renderTable();
      renderCpPick();
      if (meta) meta.textContent = `Senast uppdaterad: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (msg.includes(`${API.live} -> 404`)) {
        try {
          state.items = await fetchLiveFallback(orgId);
          renderTable();
          renderCpPick();
          if (meta) meta.textContent = `Senast uppdaterad: ${new Date().toLocaleTimeString()} (kompatibilitetsläge)`;
          return;
        } catch (fallbackErr) {
          if (meta) meta.textContent = `Fel vid hämtning: ${fallbackErr.message || fallbackErr}`;
          return;
        }
      }
      if (meta) meta.textContent = `Fel vid hämtning: ${msg}`;
      // Do NOT rethrow — keep the polling timer alive even on transient errors
    }
  }

  function renderTable(){
    const tbody = $('#liveTable tbody');
    if (!tbody) return;

    if (!state.items.length){
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Inga anslutna laddare för valt filter.</td></tr>';
      return;
    }

    tbody.innerHTML = state.items.map((it)=>{
      const c1 = it.status?.[1]?.status || 'Ingen data';
      const c2 = it.status?.[2]?.status || 'Ingen data';
      const ts = it.status?.[1]?.timestamp || it.status?.[2]?.timestamp || '-';
      const orgName = state.orgs[it.org_id]?.name || it.org_id || 'default';
      return `<tr>
        <td>${esc(it.cp_id)}</td>
        <td>${esc(orgName)} <span class="text-muted">(${esc(it.org_id || 'default')})</span></td>
        <td>${statusBadge(c1)}</td>
        <td>${statusBadge(c2)}</td>
        <td>${esc(ts)}</td>
      </tr>`;
    }).join('');
  }

  function renderCpPick(){
    const sel = $('#cpPick');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = state.items.map((it)=>`<option value="${esc(it.cp_id)}">${esc(it.cp_id)} (${esc(it.org_id || 'default')})</option>`).join('');
    if (!state.items.length){
      sel.innerHTML = '<option value="">Ingen laddare tillgänglig</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    if (current && state.items.some((it)=>it.cp_id === current)) sel.value = current;
  }

  function setCommandOptions(){
    const command = ($('#commandPick')?.value || 'reset');
    const arg = $('#commandArg');
    if (!arg) return;

    if (command === 'reset'){
      arg.innerHTML = '<option value="Hard">Hard</option><option value="Soft">Soft</option>';
      return;
    }
    if (command === 'change_availability'){
      arg.innerHTML = '<option value="Operative">Operative</option><option value="Inoperative">Inoperative</option>';
      return;
    }
    arg.innerHTML = '<option value="StatusNotification">StatusNotification</option><option value="Heartbeat">Heartbeat</option><option value="BootNotification">BootNotification</option>';
  }

  async function pollCommandResult(commandId){
    if (state.statusTimer){ clearInterval(state.statusTimer); state.statusTimer = null; }

    const statusEl = $('#commandStatus');
    let attempts = 0;
    state.statusTimer = setInterval(async ()=>{
      attempts += 1;
      try {
        const data = await UI.getJSON(API.commandStatus(commandId));
        if (statusEl){
          if (data.status === 'success') statusEl.textContent = `Kommando klart (${data.command}) kl ${new Date().toLocaleTimeString()}`;
          else if (data.status === 'failed') statusEl.textContent = `Kommando misslyckades: ${data.error || 'okänt fel'}`;
          else statusEl.textContent = `Kommando köat (${data.command})...`;
        }
        if (data.status === 'success' || data.status === 'failed' || attempts >= 20){
          clearInterval(state.statusTimer);
          state.statusTimer = null;
        }
      } catch (err){
        if (attempts >= 20){
          clearInterval(state.statusTimer);
          state.statusTimer = null;
          if (statusEl) statusEl.textContent = 'Kunde inte läsa kommandoresultat.';
        }
      }
    }, 1000);
  }

  async function sendCommand(){
    const cpId = ($('#cpPick')?.value || '').trim();
    const command = ($('#commandPick')?.value || '').trim();
    const arg = ($('#commandArg')?.value || '').trim();
    const connectorRaw = ($('#connectorId')?.value || '1');
    const connectorId = Number(connectorRaw);
    const btn = $('#btnSendCommand');
    const statusEl = $('#commandStatus');

    if (!cpId){
      UI.alert('Välj en laddare först.');
      return;
    }

    const payload = {};
    if (command === 'reset') payload.type = arg || 'Hard';
    else if (command === 'change_availability'){
      payload.type = arg || 'Operative';
      payload.connector_id = connectorId;
    } else {
      payload.requested_message = arg || 'StatusNotification';
      payload.connector_id = connectorId;
    }

    try {
      if (btn) btn.disabled = true;
      if (statusEl) statusEl.textContent = 'Skickar kommando...';
      const res = await UI.postJSON(API.send, { cp_id: cpId, command, payload });
      state.pendingCommandId = res.command_id;
      if (statusEl) statusEl.textContent = `Kommando köat (${command})...`;
      await pollCommandResult(res.command_id);
    } catch (e){
      UI.alert(`Kunde inte skicka kommando: ${e.message || e}`);
      if (statusEl) statusEl.textContent = 'Kommando misslyckades.';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function bootstrap(){
    await UI.initPage({ requiredRoles: ['portal_admin','admin'] });
    state.orgs = await UI.getJSON(API.orgs);

    const orgFilter = $('#orgFilter');
    if (orgFilter){
      orgFilter.innerHTML = '<option value="">Alla organisationer</option>' +
        Object.entries(state.orgs).map(([id, data])=>`<option value="${esc(id)}">${esc(data?.name || id)} (${esc(id)})</option>`).join('');
      orgFilter.addEventListener('change', fetchLive);
    }

    $('#commandPick')?.addEventListener('change', setCommandOptions);
    $('#btnSendCommand')?.addEventListener('click', sendCommand);

    setCommandOptions();

    // Start the timer first so the page keeps polling even if the first request fails
    state.timer = setInterval(fetchLive, 2000);
    await fetchLive();

    document.addEventListener('visibilitychange', ()=>{
      if (document.hidden && state.timer){
        clearInterval(state.timer);
        state.timer = null;
      } else if (!document.hidden && !state.timer){
        fetchLive();
        state.timer = setInterval(fetchLive, 2000);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    bootstrap().catch((e)=>{
      // Only real boot failures reach here (auth/role errors).
      // fetchLive errors are caught internally and shown in #liveMeta.
      const msg = e?.message || String(e);
      if (!msg.includes('redirect to login')) {
        UI.alert(`Fel vid start av livepanelen: ${msg}`);
      }
    });
  });
})();

