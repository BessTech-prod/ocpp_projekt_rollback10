// /assets/user_index.js  (v2)
// User-dashboard: visar CP-lista (filtrerad av backend per org/roll) + status.
// Kräver /assets/ui-common.js (initPage, getJSON, navbar, tema m.m.)
(function(){
  const API = { cps:'/api/cps', status:'/api/status' };
  const $ = (s)=>document.querySelector(s);

  function setDashboardHeading(me){
    const heading = $('.page-header h1');
    if (!heading) return;
    const orgName = String(me?.org_name || '').trim();
    const orgId = String(me?.org_id || '').trim();
    if (orgName || orgId) heading.textContent = orgName || orgId;
  }

  function displayCpId(id){
    try { return String(id||'').split('/').pop() || String(id||''); }
    catch { return String(id||''); }
  }
  function statusClass(s){
    const v=(s||'').toLowerCase();
    if(v==='charging')   return 'badge status-charging';
    if(v==='available')  return 'badge status-available';
    if(v==='preparing' || v==='finishing') return 'badge status-preparing';
    if(v==='suspendedev' || v==='suspendedevse' || v==='suspended') return 'badge status-suspended';
    if(v==='faulted')    return 'badge status-faulted';
    if(v==='unavailable')return 'badge status-unavailable';
    return 'badge status-unknown';
  }

  function cpState(cpStatus){
    const s1 = (cpStatus?.[1]?.status || '').toLowerCase();
    const s2 = (cpStatus?.[2]?.status || '').toLowerCase();
    const all = [s1, s2];
    if (all.includes('charging')) return 'charging';
    if (all.includes('faulted')) return 'faulted';
    if (all.includes('available')) return 'available';
    return 'other';
  }

  function renderStatusCards(cps, statusData){
    const host = $('#cp-status-cards');
    if (!host) return;

    const counters = { charging: 0, available: 0, faulted: 0 };
    cps.forEach(cpId => {
      const bucket = cpState(statusData[cpId] || {});
      if (bucket in counters) counters[bucket] += 1;
    });

    host.innerHTML = `
      <div class="col-6 col-lg-4"><div class="card border-0 shadow-sm"><div class="card-body"><div class="small text-muted">Ledig</div><div class="h3 m-0">${counters.available}</div></div></div></div>
      <div class="col-6 col-lg-4"><div class="card border-0 shadow-sm"><div class="card-body"><div class="small text-muted">Laddar</div><div class="h3 m-0">${counters.charging}</div></div></div></div>
      <div class="col-6 col-lg-4"><div class="card border-0 shadow-sm"><div class="card-body"><div class="small text-muted">Ur drift</div><div class="h3 m-0">${counters.faulted}</div></div></div></div>`;
  }

  function renderGrid(cps, statusMap){
    const grid = $('#cp-grid'); grid.innerHTML='';
    renderStatusCards(cps || [], statusMap || {});
    if(!cps || !cps.length){
      grid.innerHTML = `<div class="col-12"><div class="alert alert-warning mb-0">Ingen laddare ansluten ännu.</div></div>`;
      return;
    }
    cps.forEach(cpId=>{
      const cpStat = statusMap[cpId] || {};
      const c1 = cpStat[1];
      const c2 = cpStat[2];
      const col = document.createElement('div');
      col.className = 'col-12 col-md-6 col-lg-4';
      col.innerHTML = `
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <h5 class="card-title d-flex align-items-center gap-2">
              <i class="bi bi-ev-front"></i> ${displayCpId(cpId)}
            </h5>
            <div class="mb-2">
              <strong>Uttag 1:</strong>
              <span class="${statusClass(c1?.status)}">${c1?.status || 'Ingen data'}</span>
            </div>
            <div>
              <strong>Uttag 2:</strong>
              <span class="${statusClass(c2?.status)}">${c2?.status || 'Ingen data'}</span>
            </div>
          </div>
        </div>`;
      grid.appendChild(col);
    });
  }

  let timer=null;
  async function tick(){
    try{
      const [cpsRes, statusRes] = await Promise.all([
        UI.getJSON(API.cps),
        UI.getJSON(API.status)
      ]);
      renderGrid(cpsRes?.connected || [], statusRes || {});
      const ts = $('#last-refresh'); if(ts) ts.textContent = 'Senast: ' + new Date().toLocaleTimeString();
    }catch(e){
      if(String(e).includes('401')){ if(timer){ clearInterval(timer); timer=null; } return; }
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    // Endast user
    const me = await UI.initPage({ requiredRoles:['user'] }); if(!me) return;

    setDashboardHeading(me);

    // Start poll
    await tick();
    timer = setInterval(tick, 2000);

    // Pausa/återuppta vid flikbyte
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden){ if(timer){ clearInterval(timer); timer=null; } }
      else { if(!timer){ tick(); timer=setInterval(tick,2000); } }
    });
  });
})();
