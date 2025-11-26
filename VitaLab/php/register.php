<?php
session_start();
header('Content-Type: text/html; charset=utf-8');
require_once 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../html/apresentação.php'); exit;
}

$action = $_POST['action'] ?? 'register';
if ($action !== 'register') {
    header('Location: ../html/apresentação.php'); exit;
}

$usuario = trim($_POST['usuario'] ?? '');
$senha = $_POST['senha'] ?? '';
$nome = trim($_POST['nome'] ?? '');

if ($usuario === '' || $senha === '') {
    $_SESSION['auth_error'] = 'Usuário e senha são obrigatórios.';
    header('Location: ../html/apresentação.php'); exit;
}

// Ensure users table exists (same structure as dashboard.php)
$createUsers = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);";
$conn->query($createUsers);

// check exists
$stmt = $conn->prepare('SELECT id FROM users WHERE username=? LIMIT 1');
if (!$stmt) {
    $_SESSION['auth_error'] = 'Erro ao verificar usuário.';
    header('Location: ../html/apresentação.php'); exit;
}
$stmt->bind_param('s', $usuario); $stmt->execute(); $stmt->store_result();
if ($stmt->num_rows > 0) {
    $_SESSION['auth_error'] = 'Usuário já existe.';
    header('Location: ../html/apresentação.php'); exit;
}

$hash = password_hash($senha, PASSWORD_DEFAULT);
$stmt2 = $conn->prepare('INSERT INTO users (username,password_hash,name) VALUES (?,?,?)');
if (!$stmt2) {
    $_SESSION['auth_error'] = 'Erro ao criar conta.';
    header('Location: ../html/apresentação.php'); exit;
}
$stmt2->bind_param('sss', $usuario, $hash, $nome);
if ($stmt2->execute()) {
    $_SESSION['auth_success'] = 'Conta criada com sucesso. Faça login.';
    header('Location: ../html/apresentação.php'); exit;
} else {
    $_SESSION['auth_error'] = 'Erro ao criar conta.';
    header('Location: ../html/apresentação.php'); exit;
}

?>
