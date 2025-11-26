document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.querySelector('.search-bar');
    const listaPacientes = document.getElementById('lista-pacientes');
    const form = document.getElementById('form-paciente');

    const nomeInput = document.getElementById('nome_completo');
    const cpfInput = document.getElementById('cpf');
    const nascInput = document.getElementById('nascimento');
    const emailInput = document.getElementById('email');
    const telInput = document.getElementById('telefone');

    const lastUpdateTd = document.getElementById('last-update');
    const dataCadastroTd = document.getElementById('data-cadastro');

    const btnSalvar = document.getElementById('salvar');
    const btnCancelar = document.getElementById('cancelar');
    const btnExcluir = document.getElementById('excluir');

    let pacientes = [];
    let pacienteSelecionado = null;

    async function carregarPacientes() {
        try {
            const resp = await fetch('../php/pacientes.php?action=listar');
            if (!resp.ok) throw new Error('Resposta não OK');
            pacientes = await resp.json();
            renderLista();
        } catch (e) {
            mostrarMensagem('Erro ao carregar pacientes.', 'erro');
            console.error(e);
        }
    }

    function renderLista(filtro = '') {
        listaPacientes.innerHTML = '';
        const filtrados = pacientes.filter(p => (p.nome_completo || '').toLowerCase().includes(filtro.toLowerCase()));

        if (filtrados.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum paciente encontrado.';
            li.style.opacity = 0.6;
            listaPacientes.appendChild(li);
            return;
        }

        filtrados.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.nome_completo;
            li.addEventListener('click', () => preencherFormulario(p));
            listaPacientes.appendChild(li);
        });
    }

    function formatarDataParaPTBR(sqlDateTime) {
        if (!sqlDateTime) return '—';
        const iso = sqlDateTime.includes('T') ? sqlDateTime : sqlDateTime.replace(' ', 'T');
        const d = new Date(iso);
        if (isNaN(d.getTime())) return sqlDateTime;
        return d.toLocaleString('pt-BR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function preencherFormulario(paciente) {
        pacienteSelecionado = paciente;
        nomeInput.value = paciente.nome_completo || '';
        cpfInput.value = paciente.cpf || '';
        nascInput.value = paciente.nascimento || '';
        emailInput.value = paciente.email || '';
        telInput.value = paciente.telefone || '';

        dataCadastroTd.textContent = paciente.data_cadastro ? formatarDataParaPTBR(paciente.data_cadastro) : '—';
        lastUpdateTd.textContent = paciente.last_update ? formatarDataParaPTBR(paciente.last_update) : '—';
    }

    function limparFormulario() {
        form.reset();
        pacienteSelecionado = null;
        lastUpdateTd.textContent = '—';
        dataCadastroTd.textContent = '—';
    }

    searchBar.addEventListener('input', () => {
        renderLista(searchBar.value);
    });

    // Máscaras
    cpfInput.addEventListener('input', () => {
        let v = cpfInput.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        cpfInput.value = v;
    });

    telInput.addEventListener('input', () => {
        let v = telInput.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{5})(\d{4})$/, '$1-$2');
        telInput.value = v;
    });

    // Validação cliente
    function validarFormularioCliente() {
        const nome = nomeInput.value.trim();
        const cpf = cpfInput.value.trim();
        const nasc = nascInput.value;
        const email = emailInput.value.trim();
        const tel = telInput.value.trim();

        if (!nome) return { ok: false, erro: 'Preencha o nome completo.' };
        if (!cpf) return { ok: false, erro: 'Preencha o CPF.' };
        const cpfDigitos = cpf.replace(/\D/g, '');
        if (cpfDigitos.length < 11) return { ok: false, erro: 'CPF inválido (pelo menos 11 dígitos).' };
        if (!nasc) return { ok: false, erro: 'Preencha a data de nascimento.' };
        // checar data plausível (ex.: não futura)
        const nascDate = new Date(nasc);
        if (isNaN(nascDate.getTime())) return { ok: false, erro: 'Data de nascimento inválida.' };
        const hoje = new Date();
        if (nascDate > hoje) return { ok: false, erro: 'Data de nascimento não pode ser futura.' };

        if (!email) return { ok: false, erro: 'Preencha o email.' };
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailValido) return { ok: false, erro: 'Email inválido.' };
        if (!tel) return { ok: false, erro: 'Preencha o telefone.' };

        return { ok: true, dados: { nome_completo: nome, cpf, nascimento: nasc, email, telefone: tel } };
    }

    // Handler de salvar (cadastrar ou atualizar)
    btnSalvar.addEventListener('click', async () => {
        const valid = validarFormularioCliente();
        if (!valid.ok) {
            mostrarMensagem(valid.erro, 'erro');
            return;
        }

        const baseDados = valid.dados;
        baseDados.action = pacienteSelecionado ? 'atualizar' : 'cadastrar';
        if (pacienteSelecionado && pacienteSelecionado.id) baseDados.id = pacienteSelecionado.id;

        try {
            const resp = await fetch('../php/pacientes.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(baseDados)
            });

            const texto = await resp.text();
            let msg = texto;
            try {
                const json = JSON.parse(texto);
                if (json.sucesso) msg = json.sucesso;
                else if (json.erro) msg = json.erro;
                else if (json.info) msg = json.info;
                else msg = JSON.stringify(json);
            } catch (e) {}

            mostrarMensagem(msg, resp.ok ? 'sucesso' : 'erro');

            await carregarPacientes();
            if (baseDados.id) {
                const atualizado = pacientes.find(p => Number(p.id) === Number(baseDados.id));
                if (atualizado) preencherFormulario(atualizado);
                else limparFormulario();
            } else {
                limparFormulario();
            }
        } catch (err) {
            mostrarMensagem('Erro de comunicação com o servidor.', 'erro');
            console.error(err);
        }
    });

    btnExcluir.addEventListener('click', async () => {
        if (!pacienteSelecionado) return mostrarMensagem('Selecione um paciente para excluir.', 'erro');

        if (confirm(`Excluir ${pacienteSelecionado.nome_completo}?`)) {
            try {
                const resp = await fetch('../php/pacientes.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: pacienteSelecionado.id, action: 'excluir' })
                });
                const texto = await resp.text();
                let msg = 'Paciente excluído com sucesso!';
                try {
                    const json = JSON.parse(texto);
                    if (json.sucesso) msg = json.sucesso;
                    else if (json.erro) msg = json.erro;
                    else if (json.info) msg = json.info;
                } catch (e) {}
                mostrarMensagem(msg, resp.ok ? 'sucesso' : 'erro');
                await carregarPacientes();
                limparFormulario();
            } catch (e) {
                mostrarMensagem('Erro ao excluir paciente.', 'erro');
                console.error(e);
            }
        }
    });

    btnCancelar.addEventListener('click', () => {
        limparFormulario();
    });

    function mostrarMensagem(texto, tipo = 'info') {
        const cores = { sucesso: '#4CAF50', erro: '#E53935', info: '#1976D2' };
        const alerta = document.createElement('div');
        alerta.textContent = texto;
        alerta.style.position = 'fixed';
        alerta.style.bottom = '20px';
        alerta.style.right = '20px';
        alerta.style.backgroundColor = cores[tipo] || '#333';
        alerta.style.color = 'white';
        alerta.style.padding = '12px 18px';
        alerta.style.borderRadius = '8px';
        alerta.style.zIndex = '9999';
        alerta.style.fontSize = '14px';
        alerta.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(alerta);

        setTimeout(() => {
            alerta.style.opacity = '0';
            setTimeout(() => alerta.remove(), 500);
        }, 2500);
    }

    carregarPacientes();
});
