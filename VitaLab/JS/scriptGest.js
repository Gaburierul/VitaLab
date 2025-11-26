document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById("popup");
  const detailsPopup = document.getElementById("detailsPopup");
  const tableBody = document.getElementById("examTableBody");
  const api = '../php/exames.php';

  function openModal(modal){ modal.classList.remove('hidden'); document.body.classList.add('modal-open'); }
  function closeModal(modal){ modal.classList.add('hidden'); document.body.classList.remove('modal-open'); }

  async function fetchExames(){
    try{
      const res = await fetch(api + '?action=listar');
      const data = await res.json();
      renderTable(data);
    }catch(e){ console.error('Erro ao listar exames', e); }
  }

  function renderTable(rows){
    tableBody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.nome}</td>
        <td>${r.data_exame ? (new Date(r.data_exame)).toLocaleDateString('pt-BR') : '—'}</td>
        <td>${r.tipo || ''}</td>
        <td>${r.status || ''}</td>
        <td>
          <button class="action-btn editBtn" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#2C3E50" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="action-btn detailsBtn" title="Detalhes">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#2C3E50" stroke-width="1.2"/><path d="M12 8h.01M11 11h2v4h-2z" stroke="#2C3E50" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="action-btn deleteBtn" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="#e74c3c" stroke-width="1.4" stroke-linecap="round"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="#e74c3c" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </td>
      `;
      tr.dataset.r = JSON.stringify(r);
      tableBody.appendChild(tr);
    });
    attachRowEvents();
  }

  function attachRowEvents(){
    document.querySelectorAll('.detailsBtn').forEach(btn => btn.onclick = (e) => {
      const r = JSON.parse(btn.closest('tr').dataset.r || '{}');
      document.getElementById('examDetails').innerHTML = `
        <strong>ID:</strong> ${r.id}<br>
        <strong>Exame:</strong> ${r.nome}<br>
        <strong>Data:</strong> ${r.data_exame ? new Date(r.data_exame).toLocaleDateString('pt-BR') : '—'}<br>
        <strong>Tipo:</strong> ${r.tipo || '—'}<br>
        <strong>Status:</strong> ${r.status || '—'}<br><br>
        <strong>Nome do paciente:</strong> ${r.paciente_nome || '—'}<br>
        <strong>Idade:</strong> ${r.paciente_idade || '—'}<br>
        <strong>CPF do paciente:</strong> ${r.paciente_cpf || '—'}<br><br>
        <strong>Nome do médico:</strong> ${r.medico_nome || '—'}<br>
        <strong>CPF do médico:</strong> ${r.medico_cpf || '—'}<br>
      `;
      openModal(detailsPopup);
    });

    document.querySelectorAll('.deleteBtn').forEach(btn => btn.onclick = async (e) => {
      const tr = btn.closest('tr');
      const r = JSON.parse(tr.dataset.r || '{}');
      if(!confirm('Confirma exclusão deste exame?')) return;
      try{
        const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'excluir', id: r.id }) });
        const j = await res.json();
        if(j.sucesso) fetchExames(); else alert(j.erro || 'Erro ao excluir');
      }catch(er){ console.error(er); alert('Erro ao excluir'); }
    });

    // editar
    document.querySelectorAll('.editBtn').forEach(btn => btn.onclick = (e) => {
      const r = JSON.parse(btn.closest('tr').dataset.r || '{}');
      // preencher formulário
      document.getElementById('exam_id').value = r.id;
      document.getElementById('examName').value = r.nome || '';
      document.getElementById('examDate').value = r.data_exame || '';
      document.getElementById('examType').value = r.tipo || 'Sangue';
      document.getElementById('examStatus').value = r.status || 'Pendente';
      document.getElementById('patientName').value = r.paciente_nome || '';
      document.getElementById('patientAge').value = r.paciente_idade || '';
      document.getElementById('patientCPF').value = r.paciente_cpf || '';
      document.getElementById('doctorName').value = r.medico_nome || '';
      document.getElementById('doctorCPF').value = r.medico_cpf || '';
      openModal(popup);
    });
  }

  // abrir popup novo exame
  document.getElementById('addExamBtn').addEventListener('click', () => openModal(popup));

  // fechar popups
  document.querySelectorAll('.close').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.popup').forEach(p => closeModal(p));
  }));

  // salvar novo exame ou atualizar
  document.querySelector('.save').addEventListener('click', async () => {
    const id = document.getElementById('exam_id').value || '';
    const action = id ? 'atualizar' : 'cadastrar';
    const payload = {
      action,
      id: id || undefined,
      nome: document.getElementById('examName').value,
      data_exame: document.getElementById('examDate').value,
      tipo: document.getElementById('examType').value,
      status: document.getElementById('examStatus').value,
      paciente_nome: document.getElementById('patientName').value,
      paciente_idade: document.getElementById('patientAge').value || 0,
      paciente_cpf: document.getElementById('patientCPF').value,
      medico_nome: document.getElementById('doctorName').value,
      medico_cpf: document.getElementById('doctorCPF').value
    };

    if(!payload.nome || !payload.data_exame) return alert('Preencha os campos obrigatórios');

    try{
      const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const j = await res.json();
      if(j.sucesso){
        document.querySelectorAll('.popup').forEach(p => closeModal(p));
        // limpar formulário
        document.getElementById('exam_id').value = '';
        document.getElementById('examName').value = '';
        document.getElementById('examDate').value = '';
        document.getElementById('examType').value = 'Sangue';
        document.getElementById('examStatus').value = 'Pendente';
        document.getElementById('patientName').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientCPF').value = '';
        document.getElementById('doctorName').value = '';
        document.getElementById('doctorCPF').value = '';
        fetchExames();
      } else alert(j.erro || 'Erro ao salvar');
    }catch(e){ console.error('Erro ao salvar', e); alert('Erro ao salvar exame'); }
  });

  // pesquisa local
  document.querySelector('.search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#examTableBody tr').forEach(row => {
      const text = row.children[1].innerText.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // --- Aba Solicitações ---
  const solApi = '../php/solicitacoes.php';
  const tabBtnGest = document.getElementById('tabBtnGest');
  const tabBtnSol = document.getElementById('tabBtnSol');
  const tabGest = document.getElementById('tabGestao');
  const tabSol = document.getElementById('tabSolicitacoes');

  function showTabGest(){
    tabGest.style.display='block'; tabSol.style.display='none';
    tabBtnGest.classList.add('active'); tabBtnSol.classList.remove('active');
    tabBtnGest.classList.remove('secondary'); tabBtnSol.classList.add('secondary');
  }
  function showTabSol(){
    tabGest.style.display='none'; tabSol.style.display='block';
    tabBtnSol.classList.add('active'); tabBtnGest.classList.remove('active');
    tabBtnSol.classList.remove('secondary'); tabBtnGest.classList.add('secondary');
  }
  tabBtnGest.addEventListener('click', showTabGest);
  tabBtnSol.addEventListener('click', showTabSol);

  async function fetchSolicitacoes(){
    try{
      const res = await fetch(solApi + '?action=listar');
      const data = await res.json(); renderSolicitacoes(data);
    }catch(e){ console.error('Erro listar solicitacoes',e); }
  }

  function renderSolicitacoes(rows){
    const body = document.getElementById('solBody');
    body.innerHTML='';
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.exame}</td>
        <td>${r.paciente_nome || ''}</td>
        <td>${r.paciente_cpf || ''}</td>
        <td>${r.solicitante || ''}</td>
        <td>${r.status || ''}</td>
        <td>
          <button class="action-btn editSol" data-id="${r.id}" data-row='${JSON.stringify(r).replace(/'/g,"&#39;")}' title="Editar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#2C3E50" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="action-btn delSol" data-id="${r.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="#e74c3c" stroke-width="1.4" stroke-linecap="round"/><path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="#e74c3c" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </td>
      `;
      body.appendChild(tr);
    });
    // attach delete handlers
    document.querySelectorAll('.delSol').forEach(b=> b.addEventListener('click', async (ev)=>{
      const id = b.dataset.id; if(!confirm('Excluir solicitação?')) return; try{ const res=await fetch(solApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'excluir',id})}); const j=await res.json(); if(j.sucesso) fetchSolicitacoes(); else alert(j.erro||'Erro'); }catch(e){console.error(e);} 
    }));

    // attach edit handlers
    document.querySelectorAll('.editSol').forEach(b=> b.addEventListener('click', (ev)=>{
      const json = b.getAttribute('data-row') || '{}';
      const r = JSON.parse(json.replace(/&#39;/g, "'"));
      document.getElementById('sol_id').value = r.id || '';
      document.getElementById('sol_exame').value = r.exame || '';
      document.getElementById('sol_paciente').value = r.paciente_nome || '';
      document.getElementById('sol_cpf').value = r.paciente_cpf || '';
      document.getElementById('sol_solicitante').value = r.solicitante || '';
      openModal(document.getElementById('popupSol'));
    }));
  }

  // abrir modal de solicitação
  document.getElementById('addSolicBtn').addEventListener('click', ()=> openModal(document.getElementById('popupSol')));
  document.getElementById('saveSolic').addEventListener('click', async ()=>{
    const id = document.getElementById('sol_id').value || '';
    const action = id ? 'atualizar' : 'cadastrar';
    const payload = { action, exame: document.getElementById('sol_exame').value, paciente_nome: document.getElementById('sol_paciente').value, paciente_cpf: document.getElementById('sol_cpf').value, solicitante: document.getElementById('sol_solicitante').value };
    if(id) payload.id = id;
    if(!payload.exame) return alert('Informe o exame');
    try{ const res=await fetch(solApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await res.json(); if(j.sucesso){ document.querySelectorAll('.popup').forEach(p=>closeModal(p)); document.getElementById('sol_id').value=''; document.getElementById('sol_exame').value=''; document.getElementById('sol_paciente').value=''; document.getElementById('sol_cpf').value=''; document.getElementById('sol_solicitante').value=''; fetchSolicitacoes(); } else alert(j.erro||'Erro'); }catch(e){console.error(e); alert('Erro ao salvar solicitação'); }
  });

  document.getElementById('searchSolic').addEventListener('input',(e)=>{ const q=e.target.value.toLowerCase(); document.querySelectorAll('#solBody tr').forEach(row=>{ row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none'; }); });

  // iniciar abas e listas
  showTabGest();
  fetchExames();
  fetchSolicitacoes();
});
