document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = '../php/estoque.php';

    const insumoTableBody = document.querySelector('#insumoTable tbody');
    const searchName = document.getElementById('searchName');
    const filterCategory = document.getElementById('filterCategory');
    const filterExpiry = document.getElementById('filterExpiry');
    const filterLowStock = document.getElementById('filterLowStock');
    const btnAddItem = document.getElementById('btnAddItem');
    const btnExportCSV = document.getElementById('btnExportCSV');

    const modalForm = document.getElementById('modalForm');
    const insumoForm = document.getElementById('insumoForm');
    const formTitle = document.getElementById('formTitle');

    const modalMove = document.getElementById('modalMove');
    const moveForm = document.getElementById('moveForm');

    let insumos = [];

    function showModal(modal){ modal.classList.remove('hidden'); }
    function hideModal(modal){ modal.classList.add('hidden'); }

    // fechar botões
    document.querySelectorAll('.popup .close').forEach(b => b.addEventListener('click', e => {
        hideModal(e.target.closest('.popup'));
    }));

    async function fetchInsumos(){
        try{
            const res = await fetch(apiUrl + '?action=listar');
            const data = await res.json();
            insumos = data || [];
            populateCategoryFilter();
            renderTable();
        } catch(e){ console.error('Erro listar insumos', e); }
    }

    function populateCategoryFilter(){
        const cats = Array.from(new Set(insumos.map(i => i.categoria || '').filter(Boolean)));
        filterCategory.innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    function daysUntil(dateStr){ if(!dateStr) return Infinity; const d = new Date(dateStr); const diff = (d - new Date())/ (1000*60*60*24); return Math.ceil(diff); }

    function renderTable(){
        const q = searchName.value.toLowerCase();
        const cat = filterCategory.value;
        const expiry = filterExpiry.value;
        const lowOnly = filterLowStock.checked;

        insumoTableBody.innerHTML = '';
        insumos.forEach(i => {
            if(q && !(i.nome || '').toLowerCase().includes(q)) return;
            if(cat && (i.categoria || '') !== cat) return;
            if(expiry !== 'all'){
                const days = daysUntil(i.validade);
                if(!(days <= Number(expiry))) return;
            }
            if(lowOnly && Number(i.quantidade) > Number(i.estoque_minimo || 0)) return;

            const tr = document.createElement('tr');

            // status highlighting
            const days = daysUntil(i.validade);
            if(i.validade && days < 0){ tr.style.background = '#ffcccc'; }
            else if(i.validade && days <= 30){ tr.style.background = '#fff3cd'; }
            else if(Number(i.quantidade) <= Number(i.estoque_minimo || 0)) { tr.style.background = '#ffd6d6'; }

            tr.innerHTML = `
                <td>${i.id}</td>
                <td>${i.nome}</td>
                <td>${i.categoria || ''}</td>
                <td>${i.quantidade}</td>
                <td>${i.lote || ''}</td>
                <td>${i.validade || ''}</td>
                <td>${i.fornecedor || ''}</td>
                <td>${i.estoque_minimo || ''}</td>
                <td>${i.status || ''}</td>
                <td>
                    <button class="edit" data-id="${i.id}">Editar</button>
                    <button class="move" data-id="${i.id}">Mov.</button>
                    <button class="del" data-id="${i.id}">Excluir</button>
                </td>
            `;

            insumoTableBody.appendChild(tr);
        });
    }

    // eventos filtros
    [searchName, filterCategory, filterExpiry, filterLowStock].forEach(el => el.addEventListener('input', renderTable));

    // abrir modal novo
    btnAddItem.addEventListener('click', () => {
        formTitle.innerText = 'Novo Insumo';
        insumoForm.reset();
        document.getElementById('insumo_id').value = '';
        showModal(modalForm);
    });

    // salvar insumo
    insumoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            action: document.getElementById('insumo_id').value ? 'atualizar' : 'cadastrar',
            id: document.getElementById('insumo_id').value || undefined,
            nome: document.getElementById('nome').value.trim(),
            categoria: document.getElementById('categoria').value.trim(),
            quantidade: document.getElementById('quantidade').value,
            estoque_minimo: document.getElementById('estoque_minimo').value || 0,
            lote: document.getElementById('lote').value.trim(),
            validade: document.getElementById('validade').value || null,
            fornecedor: document.getElementById('fornecedor').value.trim()
        };

        // validação simples
        if(!payload.nome || payload.quantidade === ''){ alert('Nome e quantidade são obrigatórios'); return; }

        try{
            const res = await fetch('../php/estoque.php', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const j = await res.json();
            if(j.sucesso) { hideModal(modalForm); await fetchInsumos(); }
            else alert(j.erro || 'Erro no servidor');
        } catch(e){ console.error(e); alert('Erro ao salvar'); }
    });

    // actions editar / excluir / movimentar
    insumoTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if(!id) return;
        const ins = insumos.find(x => String(x.id) === String(id));
        if(e.target.classList.contains('edit')){
            formTitle.innerText = 'Editar Insumo';
            document.getElementById('insumo_id').value = ins.id;
            document.getElementById('nome').value = ins.nome || '';
            document.getElementById('categoria').value = ins.categoria || '';
            document.getElementById('quantidade').value = ins.quantidade || 0;
            document.getElementById('estoque_minimo').value = ins.estoque_minimo || 0;
            document.getElementById('lote').value = ins.lote || '';
            document.getElementById('validade').value = ins.validade ? ins.validade.split(' ')[0] : '';
            document.getElementById('fornecedor').value = ins.fornecedor || '';
            showModal(modalForm);
        }
        else if(e.target.classList.contains('del')){
            if(!confirm('Confirmar exclusão do insumo? Esta ação não pode ser desfeita.')) return;
            try{
                const res = await fetch('../php/estoque.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'excluir', id }) });
                const j = await res.json();
                if(j.sucesso) await fetchInsumos(); else alert(j.erro || 'Erro ao excluir');
            } catch(e){ console.error(e); alert('Erro ao excluir'); }
        }
        else if(e.target.classList.contains('move')){
            document.getElementById('move_insumo_id').value = ins.id;
            document.getElementById('move_quantidade').value = 1;
            document.getElementById('move_responsavel').value = '';
            showModal(modalMove);
        }
    });

    moveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            action: 'movimentar',
            insumo_id: document.getElementById('move_insumo_id').value,
            tipo: document.getElementById('move_tipo').value,
            quantidade: document.getElementById('move_quantidade').value,
            responsavel: document.getElementById('move_responsavel').value
        };
        try{
            const res = await fetch('../php/estoque.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const j = await res.json();
            if(j.sucesso){ hideModal(modalMove); await fetchInsumos(); }
            else alert(j.erro || 'Erro na movimentação');
        } catch(e){ console.error(e); alert('Erro ao registrar movimentação'); }
    });

    btnExportCSV.addEventListener('click', () => {
        window.location = '../php/estoque.php?action=export_csv';
    });

    // auto-refresh a cada 60s
    fetchInsumos();
    setInterval(fetchInsumos, 60000);
});
