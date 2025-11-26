<?php
include 'conexao.php';

$acao = $_POST['acao'] ?? '';

function valor_post(array $arr, array $keys, $default = '') {
    // retorna primeiro valor definido em keys (útil para compatibilidade de nomes)
    foreach ($keys as $k) {
        if (isset($arr[$k]) && strlen(trim((string)$arr[$k])) > 0) {
            return trim((string)$arr[$k]);
        }
    }
    return $default;
}

if ($acao == 'salvar') {
    // ler campos (com fallback para vários nomes possíveis)
    $nome = valor_post($_POST, ['nome', 'name']);
    $cpf = valor_post($_POST, ['cpf']);
    $data_nascimento = valor_post($_POST, ['data_nascimento', 'dob']);
    $cargo = valor_post($_POST, ['cargo', 'position']);
    $email = valor_post($_POST, ['email']);
    $telefone = valor_post($_POST, ['telefone', 'phone']);
    $endereco = valor_post($_POST, ['endereco', 'address']);
    $status = valor_post($_POST, ['status'], 'ativo');
    // checkbox pode vir como '1' ou existir como chave
    $acesso = isset($_POST['acesso_sistema']) ? (($_POST['acesso_sistema'] === '1' || $_POST['acesso_sistema'] === 'on') ? 1 : 0) : (isset($_POST['system-access']) ? 1 : 0);

    // Validações servidor (necessárias mesmo com validação no cliente)
    if ($nome === '' || $cpf === '' || $data_nascimento === '' || $cargo === '' || $email === '') {
        echo "Preencha todos os campos obrigatórios: nome, cpf, data de nascimento, cargo e email.";
        exit;
    }
    // CPF mínimo
    if (strlen(preg_replace('/\D/', '', $cpf)) < 11) {
        echo "CPF inválido.";
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "Email inválido.";
        exit;
    }

    // Checa se existe por CPF
    $check = $conn->prepare("SELECT id FROM funcionarios WHERE cpf = ?");
    if (!$check) {
        echo "Erro no banco (prepare).";
        exit;
    }
    $check->bind_param("s", $cpf);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        // Atualiza o registro existente
        $stmt = $conn->prepare("UPDATE funcionarios 
            SET nome_completo=?, data_nascimento=?, cargo=?, email=?, telefone=?, endereco=?, status=?, acesso_sistema=?, last_update=NOW()
            WHERE cpf=?");
        if (!$stmt) {
            echo "Erro ao preparar atualização.";
            exit;
        }
        $stmt->bind_param("sssssssis", $nome, $data_nascimento, $cargo, $email, $telefone, $endereco, $status, $acesso, $cpf);
        if ($stmt->execute()) {
            echo "Funcionário atualizado com sucesso!";
        } else {
            echo "Falha ao atualizar funcionário.";
        }
        $stmt->close();
    } else {
        // Insere novo (data_cadastro e last_update automáticos se coluna existir)
        $stmt = $conn->prepare("INSERT INTO funcionarios 
            (nome_completo, cpf, data_nascimento, cargo, email, telefone, endereco, status, acesso_sistema, data_cadastro, last_update)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        if (!$stmt) {
            echo "Erro ao preparar inserção.";
            exit;
        }
        $stmt->bind_param("sssssssis", $nome, $cpf, $data_nascimento, $cargo, $email, $telefone, $endereco, $status, $acesso);
        if ($stmt->execute()) {
            echo "Funcionário cadastrado com sucesso!";
        } else {
            if ($conn->errno === 1062) {
                echo "CPF já cadastrado.";
            } else {
                echo "Falha ao cadastrar funcionário.";
            }
        }
        $stmt->close();
    }

    $check->close();
    exit;
}

if ($acao == 'listar') {
    $resultado = $conn->query("SELECT id, nome_completo, cpf, data_nascimento, cargo, email, telefone, endereco, status, acesso_sistema, data_cadastro, last_update FROM funcionarios ORDER BY nome_completo ASC");
    $dados = [];
    if ($resultado) {
        while ($linha = $resultado->fetch_assoc()) {
            $dados[] = $linha;
        }
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($dados);
    exit;
}

if ($acao == 'excluir') {
    $cpf = $_POST['cpf'] ?? '';
    $cpf = trim($cpf);
    if ($cpf === '') {
        echo "Informe o CPF para excluir.";
        exit;
    }
    $stmt = $conn->prepare("DELETE FROM funcionarios WHERE cpf=?");
    if (!$stmt) {
        echo "Erro ao preparar exclusão.";
        exit;
    }
    $stmt->bind_param("s", $cpf);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) echo "Funcionário excluído com sucesso!";
        else echo "CPF não encontrado.";
    } else {
        echo "Falha ao excluir funcionário.";
    }
    $stmt->close();
    exit;
}
?>
