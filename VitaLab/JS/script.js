document.addEventListener('DOMContentLoaded', () => {
    const examTable = document.getElementById('examTable').getElementsByTagName('tbody')[0];
    const addExamButton = document.getElementById('addExamButton');
    const examForm = document.getElementById('examForm');
    const formTitle = document.getElementById('formTitle');
    const examNameInput = document.getElementById('examName');
    const examTipoInput = document.getElementById('examTipo');
    const examDateInput = document.getElementById('examDate');
    const formSubmitButton = document.getElementById('formSubmitButton');
    const formCancelButton = document.getElementById('formCancelButton');

    let editingExamId = null;

    // Função para atualizar a tabela
    function updateTable() {
        examTable.innerHTML = ''; // Limpar a tabela
        const exams = JSON.parse(localStorage.getItem('exams')) || [];
        exams.forEach(exam => {
            const row = examTable.insertRow();
            row.innerHTML = `
                <td>${exam.id}</td>
                <td>${exam.name}</td>
                <td>${exam.date}</td>
                <td>${exam.tipo}</td>
                <td>
                    <button class="editButton" data-id="${exam.id}">Editar</button>
                    <button class="deleteButton" data-id="${exam.id}">Excluir</button>
                </td>
            `;
        });
    }

    // Função para adicionar ou editar exame
    function saveExam(event) {
        event.preventDefault();
        const examName = examNameInput.value;
        const examTipo = examTipoInput.value;
        const examDate = examDateInput.value;
        let exams = JSON.parse(localStorage.getItem('exams')) || [];

        if (editingExamId) {
            // Editar exame existente
            const examIndex = exams.findIndex(exam => exam.id === editingExamId);
            exams[examIndex].name = examName;
            exams[examIndex].date = examDate;
            exams[examIndex].tipo = examtipo;
        } else {
            // Adicionar novo exame
            const newExam = {
                id: Date.now(),
                name: examName,
                date: examDate,
                tipo: examTipo
            };
            exams.push(newExam);
        }

        localStorage.setItem('exams', JSON.stringify(exams));
        examForm.classList.add('hidden');
        updateTable();
    }

    // Função para cancelar o formulário
    function cancelForm() {
        examForm.classList.add('hidden');
    }

    // Função para editar exame
    function editExam(event) {
        if (event.target.classList.contains('editButton')) {
            const examId = parseInt(event.target.getAttribute('data-id'));
            const exams = JSON.parse(localStorage.getItem('exams')) || [];
            const examToEdit = exams.find(exam => exam.id === examId);

            examNameInput.value = examToEdit.name;
            examDateInput.value = examToEdit.date;
            formTitle.innerText = 'Editar Exame';
            formSubmitButton.innerText = 'Atualizar';
            editingExamId = examId;
            examForm.classList.remove('hidden');
        }
    }

    // Função para excluir exame
    function deleteExam(event) {
        if (event.target.classList.contains('deleteButton')) {
            const examId = parseInt(event.target.getAttribute('data-id'));
            let exams = JSON.parse(localStorage.getItem('exams')) || [];
            exams = exams.filter(exam => exam.id !== examId);
            localStorage.setItem('exams', JSON.stringify(exams));
            updateTable();
        }
    }

    // Exibir formulário de adicionar exame
    addExamButton.addEventListener('click', () => {
        examNameInput.value = '';
        examDateInput.value = '';
        formTitle.innerText = 'Adicionar Novo Exame';
        formSubmitButton.innerText = 'Salvar';
        editingExamId = null;
        examForm.classList.remove('hidden');
    });

    // Eventos de formulário
    formSubmitButton.addEventListener('click', saveExam);
    formCancelButton.addEventListener('click', cancelForm);

    // Eventos de editar e excluir
    examTable.addEventListener('click', editExam);
    examTable.addEventListener('click', deleteExam);

    // Inicializar a tabela com os exames armazenados
    updateTable();
});
