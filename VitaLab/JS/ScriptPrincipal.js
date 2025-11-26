// Exemplo de um código JavaScript simples

document.addEventListener("DOMContentLoaded", function() {
    console.log("Página carregada!");

    // Exemplo de interatividade: ao clicar em um link, alertar o usuário
    const links = document.querySelectorAll("nav a");
    links.forEach(link => {
        link.addEventListener("click", function() {
            alert("Você foi redirecionado para a área de: " + link.innerText);
        });
    });
});

// Animação de clique nos links da navbar
const links = document.querySelectorAll("nav a");
links.forEach(link => {
    link.addEventListener("click", function() {
        console.log("Acessando: " + link.innerText);
    });
});