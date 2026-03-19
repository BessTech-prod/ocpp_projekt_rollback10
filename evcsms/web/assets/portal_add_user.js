// /assets/portal_add_user.js  (v2)
(function(){
  const API = { orgs:'/api/orgs', map:'/api/users/map' };
  const $=(s)=>document.querySelector(s), $$=(s)=>document.querySelectorAll(s);
  const esc=(s)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function postJSON(url, body){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok) throw new Error(`${url} -> ${r.status} ${await r.text().catch(()=> '')}`); return r.json(); }
  async function deleteJSON(url){ const r=await fetch(url,{method:'DELETE'}); if(!r.ok) throw new Error(`${url} -> ${r.status} ${await r.text().catch(()=> '')}`); return r.json(); }
  function alertBox(msg,kind='danger',t=4500){ const el=document.getElementById('page-alerts'); if(!el)return; if(!msg){el.innerHTML='';return;} el.innerHTML=`<div class="alert alert-${kind}">${esc(msg)}</div>`; if(t>0)setTimeout(()=>el.innerHTML='',t); }
  function toast(msg, variant='success'){ const el=document.getElementById('toast-stack'); if(!el)return; const id='t_'+Date.now(); el.insertAdjacentHTML('beforeend', `<div id="${id}" class="toast align-items-center text-bg-${variant} border-0"><div class="d-flex"><div class="toast-body">${esc(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`); new bootstrap.Toast(document.getElementById(id), { delay: 2200 }).show(); }

  async function initOrgs(){
    const sel=document.getElementById('orgSelect'); if(!sel) return;
    const orgs=await UI.getJSON(API.orgs);
    sel.innerHTML = `<option value="" disabled selected>— Välj organisation —</option>` +
      Object.entries(orgs).map(([id,o])=>`<option value="${esc(id)}">${esc(o?.name||id)} (${esc(id)})</option>`).join('');
  }

  async function fetchUsers(){ return UI.getJSON(API.map); }
  function renderList(map){
    const tbody=document.querySelector('#users-table tbody'); const foot=document.getElementById('listFootnote');
    const q=(document.getElementById('filterInput')?.value||'').toLowerCase();
    const rows=Object.entries(map||{}).map(([tag,u])=>{
      const name=u?.name || [u?.first_name,u?.last_name].filter(Boolean).join(' ') || tag;
      return { tag, name, org:u?.org_id||'', user: u };
    }).filter(r=>!q||r.name.toLowerCase().includes(q)||r.tag.toLowerCase().includes(q)||r.org.toLowerCase().includes(q))
      .sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    if(!rows.length){ tbody.innerHTML=`<tr><td colspan="4" class="text-center text-muted">Inga användare.</td></tr>`; if(foot) foot.textContent=''; return; }
    tbody.innerHTML=rows.map(r=>`
      <tr>
        <td>${esc(r.name)}</td>
        <td><code>${esc(r.tag)}</code></td>
        <td><code>${esc(r.org)}</code></td>
        <td class="text-end"><button class="btn btn-sm btn-outline-primary" data-edit="${esc(r.tag)}" type="button"><i class="bi bi-pencil"></i> Redigera</button> <button class="btn btn-sm btn-outline-danger" data-del="${esc(r.tag)}" type="button"><i class="bi bi-trash"></i> Ta bort</button></td>
      </tr>`).join('');
    if(foot) foot.textContent=`Visar ${rows.length} användare.`;

    // Handle edit button
    document.querySelectorAll('#users-table button[data-edit]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const tag=btn.getAttribute('data-edit'); if(!tag) return;
        const u = Object.entries(map||{}).find(([t])=> t===tag)?.[1];
        if(!u) return;
        // Populate form with user data
        document.getElementById('firstName').value = u.first_name || '';
        document.getElementById('lastName').value = u.last_name || '';
        document.getElementById('rfidTag').value = tag;
        document.getElementById('role').value = u.role || 'user';
        document.getElementById('email').value = u.email || '';
        document.getElementById('password').value = '';
        document.getElementById('orgSelect').value = u.org_id || '';
        document.getElementById('editingTag').value = tag;
        // Update form state for editing
        document.getElementById('btnSaveLabel').textContent = 'Uppdatera';
        document.getElementById('btnCancel').classList.remove('d-none');
        document.getElementById('rfidTag').disabled = true;
        // Scroll to form
        document.getElementById('add-user-form')?.scrollIntoView({behavior:'smooth'});
      });
    });

    document.querySelectorAll('#users-table button[data-del]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const tag=btn.getAttribute('data-del'); if(!tag) return;
        if(!confirm(`Ta bort användare med RFID ${tag}?`)) return;
        try{ await deleteJSON(`${API.map}?tag=${encodeURIComponent(tag)}`); toast(`RFID ${tag} borttagen`,'success'); await refresh(); }
        catch(e){ alertBox(`Kunde inte ta bort: ${e.message}`); }
      });
    });
  }
  async function refresh(){ const map=await fetchUsers(); renderList(map); }

  function normalizeRole(v){ const s=String(v||'').toLowerCase();
    if(s==='portal-admin'||s==='portal admin'||s==='admin') return 'portal_admin';
    if(s==='org-admin'||s==='org admin'||s==='organisation admin'||s==='organisations-admin') return 'org_admin';
    if(s==='användare'||s==='user') return 'user';
    if(['portal_admin','org_admin','user'].includes(s)) return s;
    return 'user';
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const me = await UI.initPage({ requiredRoles:['portal_admin','admin'] }); if(!me) return;
    await initOrgs();
    document.getElementById('btnRefreshList')?.addEventListener('click', refresh);
    document.getElementById('filterInput')?.addEventListener('input', refresh);

    const form=document.getElementById('add-user-form');

    // Cancel button handler
    document.getElementById('btnCancel')?.addEventListener('click', ()=>{
      form.reset();
      form.classList.remove('was-validated');
      document.getElementById('editingTag').value = '';
      document.getElementById('btnSaveLabel').textContent = 'Spara';
      document.getElementById('btnCancel').classList.add('d-none');
      document.getElementById('rfidTag').disabled = false;
    });

    document.getElementById('btnSaveUser')?.addEventListener('click', async (e)=>{
      e.preventDefault(); e.stopPropagation(); form.classList.add('was-validated');
      if(!form.checkValidity()) return;
      const isEditing = document.getElementById('editingTag').value !== '';
      const role=normalizeRole(document.getElementById('role')?.value);
      const payload={
        tag: (document.getElementById('rfidTag')?.value||'').trim(),
        first_name: (document.getElementById('firstName')?.value||'').trim(),
        last_name: (document.getElementById('lastName')?.value||'').trim(),
        name: `${(document.getElementById('firstName')?.value||'').trim()} ${(document.getElementById('lastName')?.value||'').trim()}`.trim(),
        email: (document.getElementById('email')?.value||'').trim().toLowerCase(),
        role,
        org_id: document.getElementById('orgSelect')?.value || '',
        password: (document.getElementById('password')?.value||undefined)
      };
      if(!payload.org_id){ alertBox('Välj organisation.','warning'); return; }
      try{
        await postJSON(API.map, payload);
        const action = isEditing ? 'uppdaterad' : 'sparad';
        toast(`Användaren "${payload.name}" ${action}`,'success');
        form.reset();
        form.classList.remove('was-validated');
        document.getElementById('editingTag').value = '';
        document.getElementById('btnSaveLabel').textContent = 'Spara';
        document.getElementById('btnCancel').classList.add('d-none');
        document.getElementById('rfidTag').disabled = false;
        await refresh();
      }
      catch(e){ alertBox(`Kunde inte spara: ${e.message}`); return; }
    });

    await refresh();
  });
})();
