<?php
header('Content-Type: application/json; charset=utf-8');
include 'conexao.php';

// Cria tabela se não existir
$create = "CREATE TABLE IF NOT EXISTS exames (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(250) NOT NULL,
    data_exame DATE,
    tipo VARCHAR(80),
    status VARCHAR(80),
    paciente_nome VARCHAR(200),
    paciente_idade INT,
    paciente_cpf VARCHAR(30),
    medico_nome VARCHAR(200),
    medico_cpf VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);";
$conn->query($create);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$action && is_array($data) && isset($data['action'])) $action = $data['action'];

function respond($arr){ echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($action === 'listar'){
    $res = $conn->query("SELECT * FROM exames ORDER BY data_exame DESC, id DESC");
    $out = [];
    while($r = $res->fetch_assoc()) $out[] = $r;
    respond($out);
}

if ($method === 'POST'){
    $act = $data['action'] ?? $_POST['action'] ?? '';
    if ($act === 'cadastrar'){
        $nome = trim($data['nome'] ?? '');
        $data_exame = !empty($data['data_exame']) ? $data['data_exame'] : null;
        $tipo = trim($data['tipo'] ?? '');
        $status = trim($data['status'] ?? '');
        $paciente_nome = trim($data['paciente_nome'] ?? '');
        $paciente_idade = (int)($data['paciente_idade'] ?? 0);
        $paciente_cpf = trim($data['paciente_cpf'] ?? '');
        $medico_nome = trim($data['medico_nome'] ?? '');
        $medico_cpf = trim($data['medico_cpf'] ?? '');

        if ($nome === '') respond(['erro'=>'Nome do exame obrigatório']);

        $stmt = $conn->prepare("INSERT INTO exames (nome,data_exame,tipo,status,paciente_nome,paciente_idade,paciente_cpf,medico_nome,medico_cpf) VALUES (?,?,?,?,?,?,?,?,?)");
        if(!$stmt) respond(['erro'=>'Erro DB prepare']);
        $stmt->bind_param('sssssiiss',$nome,$data_exame,$tipo,$status,$paciente_nome,$paciente_idade,$paciente_cpf,$medico_nome,$medico_cpf);
        if($stmt->execute()) respond(['sucesso'=>'Exame cadastrado','id'=>$stmt->insert_id]);
        else respond(['erro'=>'Falha ao inserir exame']);
    }

    if ($act === 'atualizar'){
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) respond(['erro'=>'ID inválido']);
        $nome = trim($data['nome'] ?? '');
        $data_exame = !empty($data['data_exame']) ? $data['data_exame'] : null;
        $tipo = trim($data['tipo'] ?? '');
        $status = trim($data['status'] ?? '');
        $paciente_nome = trim($data['paciente_nome'] ?? '');
        $paciente_idade = (int)($data['paciente_idade'] ?? 0);
        $paciente_cpf = trim($data['paciente_cpf'] ?? '');
        $medico_nome = trim($data['medico_nome'] ?? '');
        $medico_cpf = trim($data['medico_cpf'] ?? '');

        $stmt = $conn->prepare("UPDATE exames SET nome=?, data_exame=?, tipo=?, status=?, paciente_nome=?, paciente_idade=?, paciente_cpf=?, medico_nome=?, medico_cpf=?, updated_at=NOW() WHERE id=?");
        if(!$stmt) respond(['erro'=>'Erro DB prepare update']);
        $stmt->bind_param('sssssisssi',$nome,$data_exame,$tipo,$status,$paciente_nome,$paciente_idade,$paciente_cpf,$medico_nome,$medico_cpf,$id);
        if($stmt->execute()) respond(['sucesso'=>'Exame atualizado']); else respond(['erro'=>'Falha ao atualizar exame']);
    }

    if ($act === 'excluir'){
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) respond(['erro'=>'ID inválido']);
        $stmt = $conn->prepare("DELETE FROM exames WHERE id=?");
        if(!$stmt) respond(['erro'=>'Erro DB']);
        $stmt->bind_param('i',$id);
        if($stmt->execute()) respond(['sucesso'=>'Exame excluído']); else respond(['erro'=>'Falha ao excluir']);
    }

    respond(['erro'=>'Ação inválida']);
}

respond(['erro'=>'Método não suportado']);
?>
