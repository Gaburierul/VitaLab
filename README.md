# 🔬 VitaLab

**VitaLab** é um sistema web acadêmico desenvolvido como Trabalho de Conclusão de Curso (TCC) em Desenvolvimento de Sistemas. O projeto simula a gestão laboratorial e clínica, fornecendo ferramentas integradas para pacientes, médicos, controle de estoque e módulos financeiros.

## 🚀 Módulos e Funcionalidades

- **Apresentação e Autenticação:** Landing page integrada (`apresentação.php`) com sistema de login e cadastro seguro de usuários.
- **Gestão de Pacientes & Funcionários:** Interfaces de CRUD (Create, Read, Update, Delete) completas.
- **Controle de Estoque:** Módulo dedicado à listagem e controle de materiais e insumos laboratoriais.
- **Faturamento e Financeiro:** Módulo de relatórios e gestão de recursos.
- **Gestão de Exames:** Agendamentos e processamento de solicitações laboratoriais.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído "do zero", dominando as linguagens base da web sem a dependência de grandes bibliotecas:

- **Frontend:** HTML5, CSS3, e JavaScript puro (Vanilla JS). Interfaces estilizadas manualmente e otimizadas (`style.css`, cursores customizados, modais).
- **Backend:** PHP 8+ com consultas preparadas (Prepared Statements via `mysqli`) para máxima proteção contra injeções SQL.
- **Banco de Dados:** MySQL.

## ⚙️ Diferenciais Técnicos

* **Auto-Setup do Banco de Dados:** O sistema não necessita de importação manual de SQL. Ao rodar a aplicação, o backend (via `dashboard.php` e `register.php`) cria automaticamente as tabelas (`users`, etc.) se não existirem, e "semeia" um usuário administrador de fábrica para facilitar o ambiente de testes.
* **Segurança:** As senhas dos usuários utilizam hash criptográfico unidirecional seguro (`password_hash`), impossibilitando engenharia reversa do banco.
* **UX/Sessão:** Erros de login e cadastro são gerenciados por cookies/sessões (`$_SESSION`), retornando avisos elegantes à interface de usuário sem recarregar a tela bruscamente com erros fatais.

## 📥 Como Executar Localmente

1. Clone o repositório para o seu ambiente local usando o comando: git clone https://github.com/Gaburierul/VitaLab.git
2. Mova a pasta `VitaLab` para o diretório de hospedagem do seu servidor Apache local (ex: `htdocs` se estiver usando XAMPP ou `www` no WAMP).
3. Inicie os serviços do **Apache** e **MySQL** no seu painel de controle.
4. Abra o phpMyAdmin e crie um banco de dados vazio chamado `vitalab`.
5. Acesse o sistema através do navegador na rota do seu servidor local correspondente ao arquivo de apresentação.
6. Como o sistema possui Auto-Setup, basta utilizar as credenciais de teste para visualizar os módulos:
   * **Usuário:** admin
   * **Senha:** 1234

## 👨‍💻 Autor

- **Gabriel** (@Gaburierul) - *Desenvolvedor e Autor do TCC*
