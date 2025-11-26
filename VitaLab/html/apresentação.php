<?php session_start(); ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laboratório VitaLab</title>
    <link rel="stylesheet" href="../CSS/cssApresent.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
    body {
      cursor: url("../cursor.png") 4 4, auto;
    }
    /* se quiser diferentes cursores em links / botões */
    a:hover, button:hover {
      cursor: url("../cursor-de-mao.png") 4 4, pointer;
    }

    input:hover{
        cursor: url("../cursor-input.png") 4 4, pointer;
    }
</style>
</head>
<body>
    <header>
        <div class="container header-flex">
            <img src="../images/logo.webp" alt="Logo do Laboratório" class="logo logo-grande">
            <nav>
                <ul class="menu">
                    <li><a href="#sobre"><i class="fa-solid fa-circle-info"></i> Sobre</a></li>
                    <li><a href="#funcionalidades"><i class="fa-solid fa-gears"></i> Funcionalidades</a></li>
                    <li><a href="#login" class="btn-menu-login"><i class="fa-solid fa-right-to-bracket"></i> Entrar</a></li>
                </ul>
            </nav>
            
        </div>
    </header>

    <section class="hero">
        <div class="hero-content">
            <h1>Bem-vindo ao Laboratório VitaLab</h1>
            <p>Gerencie exames, controle o estoque e mantenha os cadastros de pacientes e médicos organizados em um só lugar.</p>
            <div class="cta-buttons" id="login">
                <div class="auth-wrap">
                    <div class="auth-tabs">
                        <button id="tab-login" class="tab active" type="button">Login</button>
                        <button id="tab-register" class="tab" type="button">Cadastrar</button>
                    </div>
                    <div class="auth-forms">
                        <form id="loginForm" action="../php/dashboard.php" method="POST">
                            <input type="hidden" name="action" value="login" />
                            <input type="text" name="usuario" placeholder="Usuário" required>
                            <input type="password" name="senha" placeholder="Senha" required>
                            <button type="submit" class="btn-login">Entrar</button>
                        </form>

                        <form id="registerForm" action="../php/register.php" method="POST" style="display:none;">
                            <input type="hidden" name="action" value="register" />
                            <input type="text" name="nome" placeholder="Nome completo" required>
                            <input type="text" name="usuario" placeholder="Usuário desejado" required>
                            <input type="password" name="senha" placeholder="Senha" required>
                            <button type="submit" class="btn-login">Criar Conta</button>
                        </form>
                    </div>
                    <div class="auth-messages" id="authMessages">
                        <?php
                        if (!empty($_SESSION['auth_error'])){
                            echo '<div class="msg error">'.htmlspecialchars($_SESSION['auth_error']).'</div>';
                            unset($_SESSION['auth_error']);
                        }
                        if (!empty($_SESSION['auth_success'])){
                            echo '<div class="msg success">'.htmlspecialchars($_SESSION['auth_success']).'</div>';
                            unset($_SESSION['auth_success']);
                        }
                        ?>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="features" id="funcionalidades">
        <div class="container">
            <h2>Funcionalidades do Sistema</h2>
            <div class="feature-boxes">
                <div class="feature">
                    <h3>Gerenciamento de Exames</h3>
                    <p>Registre, consulte e acompanhe exames com facilidade e segurança.</p>
                </div>
                <div class="feature">
                    <h3>Controle de Estoque</h3>
                    <p>Controle de insumos e reagentes em tempo real para evitar desperdícios.</p>
                </div>
                <div class="feature">
                    <h3>Cadastro de Pacientes</h3>
                    <p>Armazene e acesse dados de pacientes de forma segura e eficiente.</p>
                </div>
                <div class="feature">
                    <h3>Cadastro de Médicos</h3>
                    <p>Gerencie médicos responsáveis pelos exames e laudos.</p>
                </div>
            </div>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2025 Laboratório Vida+ | Todos os direitos reservados</p>
            <p>Email: luiz.yaginuma@etec.sp.gov.br | Tel: (14) 99674-3520</p>
        </div>
    </footer>

    <script>
    // Toggle between login and register forms
    (function(){
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        function showLogin(){ tabLogin.classList.add('active'); tabRegister.classList.remove('active'); loginForm.style.display='block'; registerForm.style.display='none'; }
        function showRegister(){ tabLogin.classList.remove('active'); tabRegister.classList.add('active'); loginForm.style.display='none'; registerForm.style.display='block'; }
        tabLogin.addEventListener('click', showLogin); tabRegister.addEventListener('click', showRegister);
        // focus first input
        if(tabLogin) tabLogin.click();
    })();
    </script>
</body>
</html>
