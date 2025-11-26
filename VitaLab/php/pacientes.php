<?php
header('Content-Type: application/json; charset=utf-8');

$host = 'localhost';
$user = 'root';
$pass = '';
$db = 'vitalab';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['erro' => 'Falha na conexão com o banco.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$queryAction = $_GET['action'] ?? null;
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
$bodyAction = is_array($data) && isset($data['action']) ? $data['action'] : null;
$action = $queryAction ?: $bodyAction;

function campo_obrigatorio(array $data, string $campo) {
    return isset($data[$campo]) && strlen(trim((string)$data[$campo])) > 0;
}

if ($action === 'listar') {
    $sql = "SELECT id, nome_completo, cpf, nascimento, email, telefone, data_cadastro, last_update FROM pacientes ORDER BY nome_completo";
    $result = $conn->query($sql);
    if ($result === false) {
        http_response_code(500);
        echo json_encode(['erro' => 'Erro ao buscar pacientes.']);
    } else {
        $pacientes = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode($pacientes);
    }
    $conn->close();
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido. Use POST para esta ação.']);
    $conn->close();
    exit;
}

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['erro' => 'JSON inválido ou corpo vazio.']);
    $conn->close();
    exit;
}

if ($action === 'cadastrar') {
    // Valida campos obrigatórios
    $required = ['nome_completo', 'cpf', 'nascimento', 'email', 'telefone'];
    foreach ($required as $r) {
        if (!campo_obrigatorio($data, $r)) {
            http_response_code(400);
            echo json_encode(['erro' => "Campo obrigatório ausente ou vazio: $r"]);
            $conn->close();
            exit;
        }
    }

    // Trim e atribuição segura
    $nome = trim($data['nome_completo']);
    $cpf = trim($data['cpf']);
    $nasc = trim($data['nascimento']);
    $email = trim($data['email']);
    $tel = trim($data['telefone']);

    // Validações simples (exemplo CPF mínimo)
    if (strlen(preg_replace('/\D/', '', $cpf)) < 11) {
        http_response_code(400);
        echo json_encode(['erro' => 'CPF inválido (pelo menos 11 dígitos esperados).']);
        $conn->close();
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['erro' => 'Email inválido.']);
        $conn->close();
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO pacientes (nome_completo, cpf, nascimento, email, telefone, data_cadastro, last_update) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['erro' => 'Erro ao preparar inserção.']);
        $conn->close();
        exit;
    }

    $stmt->bind_param("sssss", $nome, $cpf, $nasc, $email, $tel);
    if ($stmt->execute()) {
        echo json_encode(['sucesso' => 'Paciente cadastrado com sucesso!', 'id' => $stmt->insert_id]);
    } else {
        // verificação de key duplicate
        if ($conn->errno === 1062) {
            http_response_code(409);
            echo json_encode(['erro' => 'CPF já cadastrado.']);
        } else {
            http_response_code(500);
            echo json_encode(['erro' => 'Falha ao cadastrar paciente.']);
        }
    }
    $stmt->close();
}
elseif ($action === 'atualizar') {
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['erro' => 'ID do paciente é obrigatório para atualização.']);
        $conn->close();
        exit;
    }

    // Valida campos obrigatórios (mesma lista)
    $required = ['nome_completo', 'cpf', 'nascimento', 'email', 'telefone'];
    foreach ($required as $r) {
        if (!campo_obrigatorio($data, $r)) {
            http_response_code(400);
            echo json_encode(['erro' => "Campo obrigatório ausente ou vazio: $r"]);
            $conn->close();
            exit;
        }
    }

    $id = (int)$data['id'];
    $nome = trim($data['nome_completo']);
    $cpf = trim($data['cpf']);
    $nasc = trim($data['nascimento']);
    $email = trim($data['email']);
    $tel = trim($data['telefone']);

    if (strlen(preg_replace('/\D/', '', $cpf)) < 11) {
        http_response_code(400);
        echo json_encode(['erro' => 'CPF inválido (pelo menos 11 dígitos esperados).']);
        $conn->close();
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['erro' => 'Email inválido.']);
        $conn->close();
        exit;
    }

    $stmt = $conn->prepare("UPDATE pacientes SET nome_completo=?, cpf=?, nascimento=?, email=?, telefone=?, last_update=NOW() WHERE id=?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['erro' => 'Erro ao preparar atualização.']);
        $conn->close();
        exit;
    }
    $stmt->bind_param("sssssi", $nome, $cpf, $nasc, $email, $tel, $id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['sucesso' => 'Paciente atualizado com sucesso!']);
        } else {
            http_response_code(404);
            echo json_encode(['info' => 'Nenhuma alteração detectada ou ID não encontrado.']);
        }
    } else {
        // possível conflito de CPF único
        if ($conn->errno === 1062) {
            http_response_code(409);
            echo json_encode(['erro' => 'CPF já cadastrado para outro paciente.']);
        } else {
            http_response_code(500);
            echo json_encode(['erro' => 'Falha ao atualizar paciente.']);
        }
    }
    $stmt->close();
}
elseif ($action === 'excluir') {
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['erro' => 'ID do paciente é obrigatório para exclusão.']);
        $conn->close();
        exit;
    }
    $id = (int)$data['id'];
    $stmt = $conn->prepare("DELETE FROM pacientes WHERE id=?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['erro' => 'Erro ao preparar exclusão.']);
        $conn->close();
        exit;
    }
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['sucesso' => 'Paciente excluído com sucesso!']);
        } else {
            http_response_code(404);
            echo json_encode(['info' => 'ID não encontrado.']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['erro' => 'Falha ao excluir paciente.']);
    }
    $stmt->close();
}
else {
    http_response_code(400);
    echo json_encode(['erro' => 'Ação inválida.']);
}

$conn->close();
?>
