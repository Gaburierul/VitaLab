// =========================
// CONFIGURAÇÕES GERAIS
// =========================
function getPhpFile() {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    const base = page.replace("Cadastro_Gerenciamento_", "").replace(".html", "");
    return `../PHP/${base.toLowerCase()}.php`;
}

let currentFilter = 'ativo';
let currentCpf = null;

// =========================
// MÁSCARAS DE INPUT
// =========================
document.addEventListener('input', (e) => {
    if (e.target.id === 'cpf') {
        e.target.value = e.target.value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            .substring(0, 14);
    }

    if (e.target.id === 'phone') {
        e.target.value = e.target.value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d{4}).*/, '$1-$2')
            .substring(0, 15);
    }
});

// =========================
// VALIDAÇÃO (CLIENTE)
// =========================
function validarFuncionarioCliente() {
    const form = document.getElementById('employeeForm');
    // suporta ambos os nomes de campo: name / nome
    const nome = (form.name?.value || form.nome?.value || '').trim();
    const cpf = (form.cpf?.value || '').trim();
    const dob = (form.dob?.value || form.data_nascimento?.value || '').trim();
    const cargo = (form.position?.value || form.cargo?.value || '').trim();
    const email = (form.email?.value || '').trim();
    const phone = (form.phone?.value || form.telefone?.value || '').trim();

    if (!nome) return { ok: false, erro: 'Preencha o nome completo.' };
    if (!cpf) return { ok: false, erro: 'Preencha o CPF.' };
    const cpfDig = cpf.replace(/\D/g, '');
    if (cpfDig.length < 11) return { ok: false, erro: 'CPF inválido (pelo menos 11 dígitos).' };
    if (!dob) return { ok: false, erro: 'Preencha a data de nascimento.' };
    const nascDate = new Date(dob);
    if (isNaN(nascDate.getTime())) return { ok: false, erro: 'Data de nascimento inválida.' };
    if (nascDate > new Date()) return { ok: false, erro: 'Data de nascimento não pode ser no futuro.' };
    if (!cargo) return { ok: false, erro: 'Preencha o cargo.' };
    if (!email) return { ok: false, erro: 'Preencha o email.' };
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) return { ok: false, erro: 'Email inválido.' };
    // telefone opcionalmente pode ser exigido — aqui deixei opcional mas checando formato mínimo se preenchido
    if (phone) {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 8) return { ok: false, erro: 'Telefone inválido.' };
    }

    return {
        ok: true,
        dados: {
            nome,
            cpf,
            data_nascimento: dob,
            cargo,
            email,
            telefone: phone,
            endereco: (form.address?.value || form.endereco?.value || '').trim(),
            status: (form.status?.value || 'ativo'),
            acesso_sistema: (form['system-access']?.checked ? 1 : (form.acesso_sistema?.checked ? 1 : 0))
        }
    };
}

// =========================
// SALVAR FUNCIONÁRIO
// =========================
function saveEmployee() {
    const phpFile = getPhpFile();
    const valid = validarFuncionarioCliente();
    if (!valid.ok) {
        alert(valid.erro);
        return;
    }

    const formData = new FormData();
    // monta manualmente para evitar campos vazios indesejados
    const d = valid.dados;
    formData.append('acao', 'salvar');
    formData.append('nome', d.nome);
    formData.append('cpf', d.cpf);
    formData.append('data_nascimento', d.data_nascimento);
    formData.append('cargo', d.cargo);
    formData.append('email', d.email);
    formData.append('telefone', d.telefone);
    formData.append('endereco', d.endereco);
    formData.append('status', d.status);
    // checkbox como 1/0
    formData.append('acesso_sistema', d.acesso_sistema ? '1' : '0');

    fetch(phpFile, { method: 'POST', body: formData })
        .then(resp => resp.text())
        .then(txt => {
            alert(txt);
            clearForm();
            carregarFuncionarios();
        })
        .catch(err => alert('Erro ao salvar: ' + err));
}

// =========================
// EXCLUIR FUNCIONÁRIO
// =========================
function deleteEmployee() {
    const form = document.getElementById('employeeForm');
    const cpf = (form.cpf?.value || '').trim();
    if (!cpf) return alert('Informe o CPF do funcionário para excluir.');
    if (!confirm('Deseja realmente excluir este funcionário?')) return;

    const phpFile = getPhpFile();
    const formData = new FormData();
    formData.append('cpf', cpf);
    formData.append('acao', 'excluir');

    fetch(phpFile, { method: 'POST', body: formData })
        .then(resp => resp.text())
        .then(txt => {
            alert(txt);
            clearForm();
            carregarFuncionarios();
        })
        .catch(err => alert('Erro ao excluir: ' + err));
}

// =========================
// LISTAR FUNCIONÁRIOS
// =========================
function carregarFuncionarios() {
    const phpFile = getPhpFile();
    const formData = new FormData();
    formData.append('acao', 'listar');

    fetch(phpFile, { method: 'POST', body: formData })
        .then(resp => resp.json())
        .then(lista => {
            const ul = document.getElementById('employeeList');
            ul.innerHTML = '';

            const filtrados = lista.filter(f => (f.status || 'ativo') === currentFilter);

            if (filtrados.length === 0) {
                ul.innerHTML = "<li class='employee-item'>Nenhum funcionário encontrado</li>";
                return;
            }

            filtrados.forEach(func => {
                const li = document.createElement('li');
                li.classList.add('employee-item');
                li.textContent = `${func.nome_completo} - ${func.cargo} (${func.status})`;
                li.onclick = () => preencherFormulario(func);
                ul.appendChild(li);
            });
        })
        .catch(err => console.error("Erro ao carregar funcionários:", err));
}

// =========================
// FILTRAR ATIVOS/INATIVOS
// =========================
function filterEmployees(status) {
    currentFilter = status;
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    const btn = document.querySelector(`.tab-btn[onclick="filterEmployees('${status}')"]`);
    if (btn) btn.classList.add("active");
    carregarFuncionarios();
}

// =========================
// PREENCHER FORMULÁRIO
// =========================
function preencherFormulario(func) {
    currentCpf = func.cpf;
    const form = document.getElementById("employeeForm");
    // popula suportando ambos os nomes de campos
    if (form.name) form.name.value = func.nome_completo || '';
    if (form.nome) form.nome.value = func.nome_completo || '';
    if (form.cpf) form.cpf.value = func.cpf || '';
    if (form.data_nascimento) form.data_nascimento.value = func.data_nascimento || '';
    if (form.dob) form.dob.value = func.data_nascimento || '';
    if (form.position) form.position.value = func.cargo || '';
    if (form.cargo) form.cargo.value = func.cargo || '';
    if (form.email) form.email.value = func.email || '';
    if (form.phone) form.phone.value = func.telefone || '';
    if (form.telefone) form.telefone.value = func.telefone || '';
    if (form.address) form.address.value = func.endereco || '';
    if (form.endereco) form.endereco.value = func.endereco || '';
    if (form.status) form.status.value = func.status || 'ativo';
    if (form['system-access']) form['system-access'].checked = (func.acesso_sistema == 1 || func.acesso_sistema === "1");
    if (form.acesso_sistema) form.acesso_sistema.checked = (func.acesso_sistema == 1 || func.acesso_sistema === "1");
}

// =========================
// LIMPAR FORMULÁRIO
// =========================
function clearForm() {
    document.getElementById("employeeForm").reset();
    currentCpf = null;
}

// =========================
// BUSCAR POR NOME OU CPF
// =========================
function searchEmployee() {
    const termo = (document.getElementById("search").value || '').toLowerCase();
    const phpFile = getPhpFile();
    const formData = new FormData();
    formData.append('acao', 'listar');

    fetch(phpFile, { method: 'POST', body: formData })
        .then(resp => resp.json())
        .then(lista => {
            const ul = document.getElementById("employeeList");
            ul.innerHTML = '';

            const filtrados = lista.filter(f =>
                (f.nome_completo || '').toLowerCase().includes(termo) || (f.cpf || '').includes(termo)
            );

            if (filtrados.length === 0) {
                ul.innerHTML = "<li class='employee-item'>Nenhum resultado encontrado</li>";
                return;
            }

            filtrados.forEach(func => {
                const li = document.createElement('li');
                li.classList.add('employee-item');
                li.textContent = `${func.nome_completo} - ${func.cargo} (${func.status})`;
                li.onclick = () => preencherFormulario(func);
                ul.appendChild(li);
            });
        });
}

// =========================
// INICIALIZAÇÃO
// =========================
window.onload = () => carregarFuncionarios();
