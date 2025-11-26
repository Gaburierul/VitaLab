<?php
// API simples para Controle de Estoque
header('Content-Type: application/json; charset=utf-8');
include 'conexao.php';

// Garante que as tabelas existam (criação idempotente)
$create1 = "CREATE TABLE IF NOT EXISTS insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    categoria VARCHAR(100),
    quantidade INT NOT NULL DEFAULT 0,
    estoque_minimo INT DEFAULT 0,
    lote VARCHAR(100),
    validade DATE,
    fornecedor VARCHAR(200),
    status VARCHAR(30) DEFAULT 'ativo',
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);";
$conn->query($create1);

$create2 = "CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insumo_id INT NOT NULL,
    tipo ENUM('entrada','saida') NOT NULL,
    quantidade INT NOT NULL,
    responsavel VARCHAR(150),
    data_mov DATETIME DEFAULT CURRENT_TIMESTAMP,
    nota TEXT,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE
);";
$conn->query($create2);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
// aceitar JSON no body
$raw = file_get_contents('php://input');
$json = json_decode($raw, true);
if (!$action && is_array($json) && isset($json['action'])) $action = $json['action'];

function respond($arr){ echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($action === 'listar'){
    $sql = "SELECT * FROM insumos ORDER BY nome ASC";
    $res = $conn->query($sql);
    $out = [];
    if($res){ while($r = $res->fetch_assoc()){ $out[] = $r; }}
    respond($out);
}

if ($method === 'GET' && $action === 'export_csv'){
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="insumos_export.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['id','nome','categoria','quantidade','estoque_minimo','lote','validade','fornecedor','status','created_at','updated_at']);
    $res = $conn->query("SELECT id,nome,categoria,quantidade,estoque_minimo,lote,validade,fornecedor,status,created_at,updated_at FROM insumos ORDER BY nome");
    while($row = $res->fetch_assoc()) fputcsv($out, $row);
    fclose($out);
    exit;
}

if ($method === 'POST'){
    $data = is_array($json) ? $json : $_POST;
    $act = $data['action'] ?? '';

    if ($act === 'cadastrar'){
        $nome = trim($data['nome'] ?? '');
        $categoria = trim($data['categoria'] ?? '');
        $quantidade = (int)($data['quantidade'] ?? 0);
        $estoque_minimo = (int)($data['estoque_minimo'] ?? 0);
        $lote = trim($data['lote'] ?? '');
        $validade = !empty($data['validade']) ? $data['validade'] : null;
        $fornecedor = trim($data['fornecedor'] ?? '');

        if ($nome === '') respond(['erro' => 'Nome é obrigatório']);

        $stmt = $conn->prepare("INSERT INTO insumos (nome,categoria,quantidade,estoque_minimo,lote,validade,fornecedor) VALUES (?,?,?,?,?,?,?)");
        if (!$stmt) respond(['erro'=>'Erro no banco: prepare']);
        $stmt->bind_param('ssiisss',$nome,$categoria,$quantidade,$estoque_minimo,$lote,$validade,$fornecedor);
        if($stmt->execute()) respond(['sucesso'=>'Insumo cadastrado','id'=>$stmt->insert_id]);
        else respond(['erro'=>'Falha ao inserir']);
    }

    if ($act === 'atualizar'){
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) respond(['erro'=>'ID inválido']);
        $nome = trim($data['nome'] ?? '');
        $categoria = trim($data['categoria'] ?? '');
        $quantidade = (int)($data['quantidade'] ?? 0);
        $estoque_minimo = (int)($data['estoque_minimo'] ?? 0);
        $lote = trim($data['lote'] ?? '');
        $validade = !empty($data['validade']) ? $data['validade'] : null;
        $fornecedor = trim($data['fornecedor'] ?? '');

        $stmt = $conn->prepare("UPDATE insumos SET nome=?,categoria=?,quantidade=?,estoque_minimo=?,lote=?,validade=?,fornecedor=?,updated_at=NOW() WHERE id=?");
        if (!$stmt) respond(['erro'=>'Erro no banco: prepare update']);
        $stmt->bind_param('ssiisssi',$nome,$categoria,$quantidade,$estoque_minimo,$lote,$validade,$fornecedor,$id);
        if($stmt->execute()) respond(['sucesso'=>'Insumo atualizado']); else respond(['erro'=>'Falha ao atualizar']);
    }

    if ($act === 'excluir'){
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) respond(['erro'=>'ID inválido']);
        // aqui deveria haver checagem de permissão (admin). Implementar conforme sistema de autenticação.
        $stmt = $conn->prepare("DELETE FROM insumos WHERE id=?");
        if(!$stmt) respond(['erro'=>'Erro no DB']);
        $stmt->bind_param('i',$id);
        if($stmt->execute()) respond(['sucesso'=>'Excluído']); else respond(['erro'=>'Falha ao excluir']);
    }

    if ($act === 'movimentar'){
        $insumo_id = (int)($data['insumo_id'] ?? 0);
        $tipo = ($data['tipo'] ?? 'saida') === 'entrada' ? 'entrada' : 'saida';
        $quantidade = (int)($data['quantidade'] ?? 0);
        $responsavel = trim($data['responsavel'] ?? '');
        if ($insumo_id <= 0 || $quantidade <= 0) respond(['erro'=>'Dados inválidos']);

        // atulizar quantidade na tabela insumos
        if ($tipo === 'entrada'){
            $stmt = $conn->prepare("UPDATE insumos SET quantidade = quantidade + ? WHERE id=?");
            $stmt->bind_param('ii',$quantidade,$insumo_id);
        } else {
            $stmt = $conn->prepare("UPDATE insumos SET quantidade = GREATEST(0, quantidade - ?) WHERE id=?");
            $stmt->bind_param('ii',$quantidade,$insumo_id);
        }
        $ok = $stmt->execute();
        if(!$ok) respond(['erro'=>'Falha na atualização de estoque']);

        // registrar movimentação
        $stmt2 = $conn->prepare("INSERT INTO movimentacoes (insumo_id,tipo,quantidade,responsavel) VALUES (?,?,?,?)");
        if($stmt2){ $stmt2->bind_param('isis',$insumo_id,$tipo,$quantidade,$responsavel); $stmt2->execute(); }

        respond(['sucesso'=>'Movimentação registrada']);
    }

    respond(['erro'=>'Ação inválida']);
}

// Se chegou aqui, nada aplicado
respond(['erro'=>'Método não suportado']);
?>
