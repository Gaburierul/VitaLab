<?php
header('Content-Type: application/json; charset=utf-8');
include 'conexao.php';

// Create necessary tables if they don't exist
$createInvoices="CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(50) NOT NULL UNIQUE,
    cliente_nome VARCHAR(200) NOT NULL,
    cliente_cpf VARCHAR(30),
    data_emissao DATE DEFAULT CURRENT_DATE,
    vencimento DATE,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('pendente','pago','vencido','cancelado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);";
$conn->query($createInvoices);

$createItems = "CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    quantidade INT DEFAULT 1,
    valor_unitario DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);";
$conn->query($createItems);

$createPayments = "CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT,
    valor DECIMAL(10,2) NOT NULL,
    forma VARCHAR(50) DEFAULT 'dinheiro',
    data_pagamento DATETIME DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(200),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);";
$conn->query($createPayments);

$createExpenses = "CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE,
    status ENUM('pendente','pago','vencido') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);";
$conn->query($createExpenses);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$action && is_array($data) && isset($data['action'])) $action = $data['action'];

function respond($arr){ echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($action === 'resumo'){
    // basic KPIs: faturamento do mês, recebidos, contas a pagar, inadimplência%
    $period = $data['period'] ?? 'month';
    // faturamento do mês (soma de invoices created this month)
    $res = $conn->query("SELECT SUM(valor_total) as total FROM invoices WHERE MONTH(data_emissao)=MONTH(CURRENT_DATE) AND YEAR(data_emissao)=YEAR(CURRENT_DATE)");
    $row = $res->fetch_assoc(); $faturamento = $row['total'] ?: 0;
    // recebidos (payments this month)
    $res = $conn->query("SELECT SUM(valor) as total FROM payments WHERE MONTH(data_pagamento)=MONTH(CURRENT_DATE) AND YEAR(data_pagamento)=YEAR(CURRENT_DATE)");
    $row = $res->fetch_assoc(); $recebidos = $row['total'] ?: 0;
    // contas a pagar (sum of expenses pending)
    $res = $conn->query("SELECT SUM(valor) as total FROM expenses WHERE status='pendente'");
    $row = $res->fetch_assoc(); $contas_pagar = $row['total'] ?: 0;
    // inadimplência % = (soma faturas vencidas pendentes) / total faturado
    $res = $conn->query("SELECT SUM(valor_total) as total_vencido FROM invoices WHERE status='vencido'");
    $row = $res->fetch_assoc(); $vencido = $row['total_vencido'] ?: 0;
    $inadimplencia = $faturamento ? round(($vencido / $faturamento) * 100,2) : 0;
    respond(['faturamento'=>$faturamento, 'recebidos'=>$recebidos, 'contas_pagar'=>$contas_pagar, 'inadimplencia'=>$inadimplencia]);
}

if ($action === 'listar'){
    $q = [];
    $res = $conn->query("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 500");
    $out = [];
    while($r = $res->fetch_assoc()) $out[] = $r;
    respond($out);
}

if ($method === 'POST'){
    $act = $data['action'] ?? $_POST['action'] ?? '';
    if ($act === 'criar'){
        $numero = trim($data['numero'] ?? date('YmdHis'));
        $cliente = trim($data['cliente_nome'] ?? '');
        $cpf = trim($data['cliente_cpf'] ?? '');
        $data_emissao = $data['data_emissao'] ?? date('Y-m-d');
        $venc = $data['vencimento'] ?? null;
        $valor = (float)($data['valor_total'] ?? 0);
        $items = $data['items'] ?? [];
        if ($cliente === '') respond(['erro'=>'Cliente obrigatório']);
        $stmt = $conn->prepare("INSERT INTO invoices (numero,cliente_nome,cliente_cpf,data_emissao,vencimento,valor_total,status) VALUES (?,?,?,?,?,?,?)");
        $status = 'pendente';
        if(!$stmt) respond(['erro'=>'DB error']);
        $stmt->bind_param('sssssss',$numero,$cliente,$cpf,$data_emissao,$venc,$valor,$status);
        if(!$stmt->execute()) respond(['erro'=>'Falha ao criar fatura']);
        $inv_id = $stmt->insert_id;
        if(is_array($items) && count($items)){
            $stmt2 = $conn->prepare("INSERT INTO invoice_items (invoice_id,descricao,quantidade,valor_unitario) VALUES (?,?,?,?)");
            foreach($items as $it){
                $d = $it['descricao'] ?? '';
                $qtd = (int)($it['quantidade'] ?? 1);
                $vu = (float)($it['valor_unitario'] ?? 0);
                $stmt2->bind_param('isid',$inv_id,$d,$qtd,$vu);
                $stmt2->execute();
            }
        }
        respond(['sucesso'=>'Fatura criada','id'=>$inv_id]);
    }

    if ($act === 'registrar_pagamento'){
        $invoice_id = (int)($data['invoice_id'] ?? 0);
        $valor = (float)($data['valor'] ?? 0);
        $forma = $data['forma'] ?? 'dinheiro';
        if ($invoice_id <= 0 || $valor <= 0) respond(['erro'=>'Dados inválidos']);
        $stmt = $conn->prepare("INSERT INTO payments (invoice_id,valor,forma,referencia) VALUES (?,?,?,?)");
        $ref = $data['referencia'] ?? null;
        $stmt->bind_param('idss',$invoice_id,$valor,$forma,$ref);
        if(!$stmt->execute()) respond(['erro'=>'Falha ao registrar pagamento']);
        // update invoice status if fully paid
        $res = $conn->query("SELECT SUM(valor) as total_pay FROM payments WHERE invoice_id={$invoice_id}");
        $row = $res->fetch_assoc(); $paid = (float)($row['total_pay'] ?: 0);
        $res2 = $conn->query("SELECT valor_total FROM invoices WHERE id={$invoice_id}");
        $inv = $res2->fetch_assoc(); $total = (float)($inv['valor_total'] ?: 0);
        if ($paid >= $total){
            $u = $conn->prepare("UPDATE invoices SET status='pago' WHERE id=?");
            $u->bind_param('i',$invoice_id); $u->execute();
        }
        respond(['sucesso'=>'Pagamento registrado']);
    }

    if ($act === 'listar_pagamentos'){
        $invoice_id = (int)($data['invoice_id'] ?? 0);
        if ($invoice_id <= 0) respond(['erro'=>'ID inválido']);
        $res = $conn->query("SELECT * FROM payments WHERE invoice_id={$invoice_id} ORDER BY data_pagamento DESC");
        $out = []; while($r=$res->fetch_assoc()) $out[] = $r; respond($out);
    }

    if ($act === 'detalhes'){
        $invoice_id = (int)($data['invoice_id'] ?? 0);
        if ($invoice_id <= 0) respond(['erro'=>'ID inválido']);
        $res = $conn->query("SELECT * FROM invoices WHERE id={$invoice_id} LIMIT 1");
        $inv = $res->fetch_assoc();
        $items = [];
        $res2 = $conn->query("SELECT descricao,quantidade,valor_unitario FROM invoice_items WHERE invoice_id={$invoice_id}");
        while($r=$res2->fetch_assoc()) $items[] = $r;
        $payments = [];
        $res3 = $conn->query("SELECT * FROM payments WHERE invoice_id={$invoice_id} ORDER BY data_pagamento DESC");
        while($r=$res3->fetch_assoc()) $payments[] = $r;
        respond(['invoice'=>$inv,'items'=>$items,'payments'=>$payments]);
    }

    if ($act === 'atualizar'){
        $invoice_id = (int)($data['invoice_id'] ?? 0);
        if ($invoice_id <= 0) respond(['erro'=>'ID inválido']);
        $cliente = trim($data['cliente_nome'] ?? '');
        $cpf = trim($data['cliente_cpf'] ?? '');
        $data_emissao = $data['data_emissao'] ?? date('Y-m-d');
        $venc = $data['vencimento'] ?? null;
        $valor = (float)($data['valor_total'] ?? 0);
        $items = $data['items'] ?? [];
        if ($cliente === '') respond(['erro'=>'Cliente obrigatório']);
        $stmt = $conn->prepare("UPDATE invoices SET cliente_nome=?, cliente_cpf=?, data_emissao=?, vencimento=?, valor_total=?, updated_at=CURRENT_TIMESTAMP WHERE id=?");
        if(!$stmt) respond(['erro'=>'DB error']);
        $stmt->bind_param('sssdsi',$cliente,$cpf,$data_emissao,$venc,$valor,$invoice_id);
        if(!$stmt->execute()) respond(['erro'=>'Falha ao atualizar fatura']);
        // replace items: remove old and insert new
        $del = $conn->prepare("DELETE FROM invoice_items WHERE invoice_id=?");
        $del->bind_param('i',$invoice_id); $del->execute();
        if(is_array($items) && count($items)){
            $stmt2 = $conn->prepare("INSERT INTO invoice_items (invoice_id,descricao,quantidade,valor_unitario) VALUES (?,?,?,?)");
            foreach($items as $it){
                $d = $it['descricao'] ?? '';
                $qtd = (int)($it['quantidade'] ?? 1);
                $vu = (float)($it['valor_unitario'] ?? 0);
                $stmt2->bind_param('isid',$invoice_id,$d,$qtd,$vu);
                $stmt2->execute();
            }
        }
        respond(['sucesso'=>'Fatura atualizada']);
    }

    if ($act === 'excluir'){
        $invoice_id = (int)($data['invoice_id'] ?? 0);
        if ($invoice_id <= 0) respond(['erro'=>'ID inválido']);
        $stmt = $conn->prepare("DELETE FROM invoices WHERE id=?");
        if(!$stmt) respond(['erro'=>'DB error']);
        $stmt->bind_param('i',$invoice_id);
        if(!$stmt->execute()) respond(['erro'=>'Falha ao excluir fatura']);
        if($conn->affected_rows>0) respond(['sucesso'=>'Fatura excluída']);
        respond(['erro'=>'Fatura não encontrada']);
    }

    respond(['erro'=>'Ação inválida']);
}

respond(['erro'=>'Método não suportado']);
?>
