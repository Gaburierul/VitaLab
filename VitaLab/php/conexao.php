<?php
$host = "localhost";
$usuario = "root"; // seu usuário do MySQL
$senha = ""; // senha do seu MySQL
$banco = "vitalab";

$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    die("Erro de conexão: " . $conn->connect_error);
}
?>
