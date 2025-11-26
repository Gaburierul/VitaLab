/* scriptFinanceiro.js
   Implementação do front-end para Faturamento e Financeiro
   - Usa endpoints em ../php/financeiro.php
   - Elementos esperados no HTML: KPIs, tabela #invoicesTable, modais com ids usados abaixo
*/

document.addEventListener('DOMContentLoaded', () => {
  const api = '../php/financeiro.php';

  // KPIs
  const kpiFaturamento = document.getElementById('kpiFaturamento');
  const kpiRecebidos = document.getElementById('kpiRecebidos');
  const kpiPagar = document.getElementById('kpiPagar');
  const kpiInad = document.getElementById('kpiInadimplencia');

  // Table and modals
  const invoicesTableBody = document.querySelector('#invoicesTable tbody');
  const modalInvoice = document.getElementById('modalInvoice');
  const modalPayment = document.getElementById('modalPayment');
  const modalDetails = document.getElementById('modalInvoiceDetails');

  // Editing state
  let editingInvoiceId = null;

  // Invoice modal elements
  const invItemsContainer = document.getElementById('inv_items');
  const invTotalInput = document.getElementById('inv_total');

  // Helpers
  function openModal(el){ if(!el) return; el.classList.remove('hidden'); document.body.classList.add('modal-open'); }
  function closeModal(el){ if(!el) return; el.classList.add('hidden'); document.body.classList.remove('modal-open'); }

  function resetInvoiceForm(){
    editingInvoiceId = null;
    if(document.getElementById('inv_cliente')) document.getElementById('inv_cliente').value = '';
    if(document.getElementById('inv_cpf')) document.getElementById('inv_cpf').value = '';
    if(document.getElementById('inv_data_emissao')) document.getElementById('inv_data_emissao').value = '';
    if(document.getElementById('inv_vencimento')) document.getElementById('inv_vencimento').value = '';
    if(invItemsContainer) invItemsContainer.innerHTML = '';
    if(invTotalInput) invTotalInput.value = formatMoney(0);
  }

  document.querySelectorAll('.close').forEach(b => b.addEventListener('click', () => { resetInvoiceForm(); document.querySelectorAll('.popup').forEach(p => closeModal(p)); }));

  function formatMoney(v){ return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // Fetch KPIs
  async function fetchResumo(){
    try{
      const res = await fetch(api + '?action=resumo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
      const j = await res.json();
      if(kpiFaturamento) kpiFaturamento.innerText = formatMoney(j.faturamento || 0);
      if(kpiRecebidos) kpiRecebidos.innerText = formatMoney(j.recebidos || 0);
      if(kpiPagar) kpiPagar.innerText = formatMoney(j.contas_pagar || 0);
      if(kpiInad) kpiInad.innerText = (j.inadimplencia || 0) + '%';
    }catch(e){ console.error('fetchResumo', e); }
  }

  // Fetch invoices
  async function fetchInvoices(){
    try{
      const res = await fetch(api + '?action=listar');
      const rows = await res.json();
      renderInvoices(rows || []);
      populateInvoiceSelect(rows || []);
      renderCharts(rows || []);
    }catch(e){ console.error('fetchInvoices', e); }
  }

  // Render table
  function renderInvoices(rows){
    if(!invoicesTableBody) return;
    invoicesTableBody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = (r.status === 'vencido') ? 'overdue' : '';
      const idVal = r.id || r.numero || '';
      tr.innerHTML = `
          <td>${r.numero || r.id}</td>
          <td>${r.cliente_nome || ''}</td>
          <td>${r.data_emissao || '—'}</td>
          <td>${r.vencimento || '—'}</td>
          <td>${formatMoney(r.valor_total)}</td>
          <td>${r.status || ''}</td>
          <td class="actions">
            <button class="btn action-btn viewBtn" data-id="${idVal}">Detalhes</button>
            <button class="btn action-btn editBtn" data-id="${idVal}">Editar</button>
            <button class="btn action-btn payBtn" data-id="${idVal}">Pagar</button>
            <button class="btn action-btn deleteBtn" data-id="${idVal}">Excluir</button>
          </td>
        `;
      invoicesTableBody.appendChild(tr);
    });
    attachInvoiceEvents();
  }

  // Events for each invoice row
  function attachInvoiceEvents(){
    document.querySelectorAll('.viewBtn').forEach(b => b.onclick = async () => {
      const id = b.dataset.id || b.getAttribute('data-id'); if(!id) return;
      try{
        const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'detalhes', invoice_id: id }) });
        const j = await res.json(); showInvoiceDetails(j);
      }catch(e){ console.error('detalhes', e); alert('Erro ao obter detalhes da fatura'); }
    });

    document.querySelectorAll('.payBtn').forEach(b => b.onclick = () => {
      const id = b.dataset.id || b.getAttribute('data-id'); const sel = document.getElementById('pay_invoice_select'); if(sel) sel.value = id; openModal(modalPayment);
    });

    // Edit handler
    document.querySelectorAll('.editBtn').forEach(b => b.onclick = async () => {
      const id = b.dataset.id || b.getAttribute('data-id'); if(!id) return;
      try{
        const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'detalhes', invoice_id: id }) });
        const j = await res.json();
        if(j && j.invoice){
          const inv = j.invoice;
          editingInvoiceId = id;
          if(document.getElementById('inv_cliente')) document.getElementById('inv_cliente').value = inv.cliente_nome || '';
          if(document.getElementById('inv_cpf')) document.getElementById('inv_cpf').value = inv.cliente_cpf || '';
          if(document.getElementById('inv_data_emissao')) document.getElementById('inv_data_emissao').value = (inv.data_emissao||'').slice(0,10) || '';
          if(document.getElementById('inv_vencimento')) document.getElementById('inv_vencimento').value = (inv.vencimento||'').slice(0,10) || '';
          if(invItemsContainer) invItemsContainer.innerHTML = '';
          (j.items || []).forEach(it => {
            const row = createItemRow({ descricao: it.descricao||'', quantidade: it.quantidade||1, valor_unitario: parseFloat(it.valor_unitario||0) });
            if(row){ /* ensure inputs updated if any formatting */ }
          });
          computeInvTotal();
          openModal(modalInvoice);
        } else {
          alert('Detalhes da fatura não encontrados');
        }
      }catch(e){ console.error('abrir edicao', e); alert('Erro ao abrir edição da fatura'); }
    });

    // Delete handler
    document.querySelectorAll('.deleteBtn').forEach(b => b.onclick = async () => {
      const id = b.dataset.id || b.getAttribute('data-id'); if(!id) return;
      if(!confirm('Confirma exclusão desta fatura?')) return;
      try{
        const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'excluir', invoice_id: id }) });
        const j = await res.json(); if(j && j.sucesso){ fetchResumo(); fetchInvoices(); alert('Fatura excluída'); } else alert(j.erro||'Erro ao excluir');
      }catch(e){ console.error('excluir', e); alert('Erro ao excluir fatura'); }
    });
  }

  // Show details modal
  function showInvoiceDetails(data){
    if(!modalDetails) return;
    const info = document.getElementById('det_inv_info'); const items = document.getElementById('det_inv_items'); const pays = document.getElementById('det_inv_payments');
    info.innerHTML = ''; items.innerHTML = ''; pays.innerHTML = '';
    if(!data) return;
    const inv = data.invoice || {};
    info.innerHTML = `<strong>Fatura:</strong> ${inv.numero || inv.id} — <strong>Cliente:</strong> ${inv.cliente_nome || ''} — <strong>Total:</strong> ${formatMoney(inv.valor_total||0)}`;
    (data.items || []).forEach(it => { const d = document.createElement('div'); d.innerText = `${it.descricao} — ${it.quantidade} x ${formatMoney(it.valor_unitario)}`; items.appendChild(d); });
    (data.payments || []).forEach(p => { const d = document.createElement('div'); d.innerText = `${p.data || p.created_at || ''} — ${formatMoney(p.valor)} — ${p.forma||''} ${p.referencia?'- '+p.referencia:''}`; pays.appendChild(d); });
    openModal(modalDetails);
  }

  // Populate select used in payment modal
  function populateInvoiceSelect(rows){
    const sel = document.getElementById('pay_invoice_select'); if(!sel) return;
    const cur = sel.value;
    sel.innerHTML = (rows || []).map(r => { const v = r.id || r.numero || ''; return `<option value="${v}">${r.numero || r.id} — ${r.cliente_nome || ''} — ${formatMoney(r.valor_total)}</option>`; }).join('');
    if(cur) sel.value = cur;
  }

  // Invoice items helpers
  function createItemRow(item = { descricao:'', quantidade:1, valor_unitario:0 }){
    if(!invItemsContainer) return null;
    const div = document.createElement('div'); div.className = 'inv-item';
    div.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <input class="it-desc" placeholder="Descrição" value="${item.descricao||''}" style="flex:2;" />
        <input class="it-qtd" type="number" min="1" value="${item.quantidade||1}" style="width:80px;" />
        <input class="it-vu" type="number" step="0.01" value="${item.valor_unitario||0}" style="width:110px;" />
        <button class="btn secondary removeItem">Remover</button>
      </div>
    `;
    invItemsContainer.appendChild(div);
    const rem = div.querySelector('.removeItem'); if(rem) rem.addEventListener('click', () => { div.remove(); computeInvTotal(); });
    div.querySelectorAll('.it-qtd, .it-vu').forEach(i => i.addEventListener('input', computeInvTotal));
    return div;
  }

  function computeInvTotal(){
    if(!invItemsContainer) return 0; let total = 0;
    invItemsContainer.querySelectorAll('.inv-item').forEach(div => { const q = parseFloat(div.querySelector('.it-qtd').value||0); const vu = parseFloat(div.querySelector('.it-vu').value||0); total += q*vu; });
    if(invTotalInput) invTotalInput.value = formatMoney(total);
    return total;
  }

  // Buttons: add item, new invoice
  const addItemBtn = document.getElementById('addItemBtn'); if(addItemBtn) addItemBtn.addEventListener('click', () => createItemRow());
  const btnNewInvoice = document.getElementById('btnNewInvoice');
  if(btnNewInvoice) btnNewInvoice.addEventListener('click', () => {
    resetInvoiceForm();
    if(document.getElementById('inv_cliente')) document.getElementById('inv_cliente').value = '';
    if(document.getElementById('inv_cpf')) document.getElementById('inv_cpf').value = '';
    if(document.getElementById('inv_data_emissao')) document.getElementById('inv_data_emissao').value = new Date().toISOString().slice(0,10);
    if(document.getElementById('inv_vencimento')) document.getElementById('inv_vencimento').value = '';
    if(invItemsContainer) invItemsContainer.innerHTML = '';
    createItemRow(); computeInvTotal(); openModal(modalInvoice);
  });

  // Save invoice
  const saveInvoice = document.getElementById('saveInvoice');
  if(saveInvoice) saveInvoice.addEventListener('click', async () => {
    const cliente = (document.getElementById('inv_cliente')||{}).value || '';
    if(!cliente) return alert('Informe o cliente');
    const items = [];
    (invItemsContainer ? invItemsContainer.querySelectorAll('.inv-item') : []).forEach(div => { items.push({ descricao: div.querySelector('.it-desc').value||'', quantidade: parseInt(div.querySelector('.it-qtd').value||1), valor_unitario: parseFloat(div.querySelector('.it-vu').value||0) }); });
    const total = computeInvTotal();
    const base = { cliente_nome: cliente, cliente_cpf: (document.getElementById('inv_cpf')||{}).value||'', data_emissao:(document.getElementById('inv_data_emissao')||{}).value||'', vencimento:(document.getElementById('inv_vencimento')||{}).value||'', valor_total: total, items };
    const payload = editingInvoiceId ? Object.assign({ action:'atualizar', invoice_id: editingInvoiceId }, base) : Object.assign({ action:'criar' }, base);
    try{
      const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const j = await res.json();
      if(j.sucesso){
        const wasEdit = !!editingInvoiceId;
        editingInvoiceId = null;
        closeModal(modalInvoice);
        resetInvoiceForm();
        fetchResumo(); fetchInvoices();
        alert(wasEdit ? 'Fatura atualizada' : 'Fatura criada');
      } else alert(j.erro||'Erro');
    }catch(e){ console.error('saveInvoice', e); alert('Erro ao salvar fatura'); }
  });

  // Payment modal
  const btnNewPayment = document.getElementById('btnNewPayment'); if(btnNewPayment) btnNewPayment.addEventListener('click', () => { if(document.getElementById('pay_valor')) document.getElementById('pay_valor').value=''; if(document.getElementById('pay_referencia')) document.getElementById('pay_referencia').value=''; openModal(modalPayment); });
  const savePayment = document.getElementById('savePayment');
  if(savePayment) savePayment.addEventListener('click', async () => {
    const invoice_id = parseInt((document.getElementById('pay_invoice_select')||{}).value||0);
    const valor = parseFloat(((document.getElementById('pay_valor')||{}).value||'').replace(',','.') )||0;
    const forma = (document.getElementById('pay_forma')||{}).value||'';
    const ref = (document.getElementById('pay_referencia')||{}).value||'';
    if(!invoice_id || valor<=0) return alert('Selecione fatura e informe valor válido');
    try{
      const res = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'registrar_pagamento', invoice_id, valor, forma, referencia: ref }) });
      const j = await res.json(); if(j.sucesso){ closeModal(modalPayment); fetchResumo(); fetchInvoices(); alert('Pagamento registrado'); } else alert(j.erro||'Erro');
    }catch(e){ console.error('savePayment', e); alert('Erro ao registrar pagamento'); }
  });

  // Charts
  let chartRevenue = null;
  function renderCharts(rows){
    if(typeof Chart === 'undefined') return;
    // Prepare monthly aggregation
    const byMonth = {};
    (rows||[]).forEach(r => { const m = (r.data_emissao||'').slice(0,7) || 'zz-unknown'; byMonth[m] = (byMonth[m]||0) + parseFloat(r.valor_total||0); });
    const monthKeys = Object.keys(byMonth).sort();
    // convert YYYY-MM to localized labels (e.g., Jan/2025)
    let labels = monthKeys.map(k => {
      if(!k || k === 'zz-unknown') return 'Sem data';
      const [y,mo] = k.split('-');
      try{ return new Date(Number(y), Number(mo)-1, 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).replace(' de ','/'); }catch(e){ return k; }
    });
    const data = monthKeys.map(l => byMonth[l]);

    // Fallback if there's no data (make chart show an empty zero point)
    if(labels.length === 0){ labels = ['Sem dados']; }
    if(data.length === 0){ data.push(0); }

    // Revenue chart
    const ctxEl = document.getElementById('chartRevenue');
    if(ctxEl){
      const ctx = ctxEl.getContext('2d');
      if(chartRevenue) chartRevenue.destroy();
      const grad = ctx.createLinearGradient(0,0,0,300);
      grad.addColorStop(0,'rgba(52,152,219,0.40)');
      grad.addColorStop(1,'rgba(52,152,219,0.04)');
      chartRevenue = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Faturamento (R$)',
            data,
            borderColor: '#2980b9',
            backgroundColor: grad,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2980b9',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Faturamento mensal', font: { size: 16 } },
            tooltip: {
              callbacks: {
                label: function(context){
                  const v = context.parsed.y || 0; return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2 });
                }
              }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation:0, autoSkip: true } },
            y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { callback: v => 'R$ ' + Number(v).toLocaleString('pt-BR') } }
          }
        }
      });
    }

    // Simple secondary chart (by service) - build a basic distribution from items if available
    const ctxSvcEl = document.getElementById('chartByService');
    if(ctxSvcEl){
      try{
        const svcCtx = ctxSvcEl.getContext('2d');
        // attempt to aggregate by a 'servico' field if present, else show top customers
        const byKey = {};
        (rows||[]).forEach(r => {
          const key = r.servico || r.tipo || (r.cliente_nome ? r.cliente_nome.split(' ')[0] : 'Outros');
          byKey[key] = (byKey[key]||0) + parseFloat(r.valor_total||0);
        });
        const svcLabels = Object.keys(byKey).slice(0,8);
        const svcData = svcLabels.map(k => byKey[k]);
        // destroy existing chart if any
        if(window.chartByService) window.chartByService.destroy();
        const palette = ['#2c3e50','#2980b9','#16a34a','#f59e0b','#ef4444','#7c3aed','#06b6d4','#f97316'];
        window.chartByService = new Chart(svcCtx, {
          type: 'doughnut',
          data: { labels: svcLabels, datasets: [{ data: svcData, backgroundColor: svcLabels.map((_,i)=>palette[i%palette.length]) }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' }, title:{ display:true, text:'Distribuição por serviço' }, tooltip:{ callbacks:{ label: function(ctx){ return ctx.label + ': R$ ' + Number(ctx.parsed).toLocaleString('pt-BR', { minimumFractionDigits:2 }); } } } } }
        });
      }catch(e){ console.warn('chartByService', e); }
    }
  }

  // initial load
  fetchResumo(); fetchInvoices();

});
