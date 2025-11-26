<?php
header('Content-Type: application/json; charset=utf-8');
include 'conexao.php';

$create = "CREATE TABLE IF NOT EXISTS solicitacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exame VARCHAR(200) NOT NULL,
    paciente_nome VARCHAR(200),
    paciente_cpf VARCHAR(30),
    solicitante VARCHAR(150),
    status ENUM('pendente','atendida','cancelada') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);";
$conn->query($create);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$action && is_array($data) && isset($data['action'])) $action = $data['action'];

function respond($arr){ echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($action === 'listar'){
    $res = $conn->query("SELECT * FROM solicitacoes ORDER BY created_at DESC");
    $out = [];
    while($r = $res->fetch_assoc()) $out[] = $r;
    respond($out);
}

if ($method === 'POST'){
    $act = $data['action'] ?? $_POST['action'] ?? '';
    if ($act === 'cadastrar'){
        $exame = trim($data['exame'] ?? '');
        $paciente = trim($data['paciente_nome'] ?? '');
        $cpf = trim($data['paciente_cpf'] ?? '');
        $solicitante = trim($data['solicitante'] ?? '');
        if ($exame === '') respond(['erro'=>'Exame obrigatório']);
        $stmt = $conn->prepare("INSERT INTO solicitacoes (exame,paciente_nome,paciente_cpf,solicitante) VALUES (?,?,?,?)");
        if(!$stmt) respond(['erro'=>'DB error']);
        $stmt->bind_param('ssss',$exame,$paciente,$cpf,$solicitante);
        if($stmt->execute()) respond(['sucesso'=>'Solicitação criada','id'=>$stmt->insert_id]); else respond(['erro'=>'Falha ao criar']);
    }

    if ($act === 'atualizar'){
        $id = (int)($data['id'] ?? 0);
        $exame = trim($data['exame'] ?? '');
        $paciente = trim($data['paciente_nome'] ?? '');
        $cpf = trim($data['paciente_cpf'] ?? '');
        $solicitante = trim($data['solicitante'] ?? '');
        $status = trim($data['status'] ?? 'pendente');
        if ($id <= 0) respond(['erro'=>'ID inválido']);
        if ($exame === '') respond(['erro'=>'Exame obrigatório']);
        $stmt = $conn->prepare("UPDATE solicitacoes SET exame=?, paciente_nome=?, paciente_cpf=?, solicitante=?, status=? WHERE id=?");
        if(!$stmt) respond(['erro'=>'DB error']);
        $stmt->bind_param('sssssi', $exame, $paciente, $cpf, $solicitante, $status, $id);
        if($stmt->execute()) respond(['sucesso'=>'Solicitação atualizada']); else respond(['erro'=>'Falha ao atualizar']);
    }

    if ($act === 'excluir'){
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) respond(['erro'=>'ID inválido']);
        $stmt = $conn->prepare("DELETE FROM solicitacoes WHERE id=?");
        $stmt->bind_param('i',$id);
        if($stmt->execute()) respond(['sucesso'=>'Excluído']); else respond(['erro'=>'Falha ao excluir']);
    }

    respond(['erro'=>'Ação inválida']);
}

respond(['erro'=>'Método não suportado']);
?>
