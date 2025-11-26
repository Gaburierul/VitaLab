<?php
session_start();
header('Content-Type: text/html; charset=utf-8');
require_once 'conexao.php';

// Ensure users table exists
$createUsers = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);";
$conn->query($createUsers);

// If no users exist, create default admin (password: 1234) — only on empty table
$res = $conn->query("SELECT COUNT(*) as c FROM users");
$row = $res->fetch_assoc();
if ($row && intval($row['c']) === 0) {
    $pw = password_hash('1234', PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (username,password_hash,name) VALUES (?,?,?)");
    $name = 'Administrador';
    $user = 'admin';
    $stmt->bind_param('sss', $user, $pw, $name);
    @$stmt->execute();
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    $action = $_POST['action'] ?? 'login';
    $usuario = trim($_POST['usuario'] ?? '');
    $senha = $_POST['senha'] ?? '';

    if ($action === 'register') {
        $nome = trim($_POST['nome'] ?? '');
        if ($usuario === '' || $senha === '') {
            $_SESSION['auth_error'] = 'Usuário e senha são obrigatórios.';
            header('Location: ../html/apresentação.php'); exit;
        }
        // check exists
        $stmt = $conn->prepare('SELECT id FROM users WHERE username=? LIMIT 1');
        $stmt->bind_param('s', $usuario); $stmt->execute(); $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $_SESSION['auth_error'] = 'Usuário já existe.';
            header('Location: ../html/apresentação.php'); exit;
        }
        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt2 = $conn->prepare('INSERT INTO users (username,password_hash,name) VALUES (?,?,?)');
        $stmt2->bind_param('sss', $usuario, $hash, $nome);
        if ($stmt2->execute()) {
            $_SESSION['auth_success'] = 'Conta criada com sucesso. Faça login.';
            header('Location: ../html/apresentação.php'); exit;
        } else {
            $_SESSION['auth_error'] = 'Erro ao criar conta.';
            header('Location: ../html/apresentação.php'); exit;
        }
    }

    // login
    if ($usuario === '' || $senha === '') {
        $_SESSION['auth_error'] = 'Preencha usuário e senha.';
        header('Location: ../html/apresentação.php'); exit;
    }

    $stmt = $conn->prepare('SELECT id,username,password_hash,name FROM users WHERE username=? LIMIT 1');
    if (!$stmt) {
        $_SESSION['auth_error'] = 'Erro interno (prepare falhou)';
        header('Location: ../html/apresentação.php'); exit;
    }
    $stmt->bind_param('s', $usuario);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows === 0) {
        // usuário não encontrado
        $_SESSION['auth_error'] = 'Usuário ou senha incorretos.';
        $stmt->close();
        header('Location: ../html/apresentação.php'); exit;
    }

    // Bind results and fetch
    $stmt->bind_result($uid, $db_username, $db_hash, $db_name);
    $stmt->fetch();

    // close statement
    $stmt->close();

    if (!empty($db_hash) && password_verify($senha, $db_hash)) {
        // authenticated
        $_SESSION['user_id'] = $uid;
        $_SESSION['username'] = $db_username;
        $_SESSION['name'] = $db_name;
        header('Location: ../html/Menu_Principal.html'); exit;
    } else {
        $_SESSION['auth_error'] = 'Usuário ou senha incorretos.';
        header('Location: ../html/apresentação.php'); exit;
    }
}
// If reached without POST, just redirect to apresentação
header('Location: ../html/apresentação.php'); exit;
?>
