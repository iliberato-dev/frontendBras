// frontendBras/build-env.js
const fs = require('fs');
const path = require('path'); // Importa o módulo 'path' para lidar com caminhos de forma segura

// Obtém a URL do backend da variável de ambiente definida no Vercel
const backendUrl = process.env.BACKEND_URL;

if (!backendUrl) {
    console.error('Erro: Variável de ambiente BACKEND_BASE_URLnão definida no Vercel.');
    process.exit(1);
}

const envContent = `const BACKEND_BASE_URL= "${backendUrl}";\n`;

// Define o caminho completo para a pasta 'js' dentro de 'public'
const jsFolderPath = path.join(__dirname, 'public', 'js');
// Define o caminho completo para o arquivo config.js
const configFilePath = path.join(jsFolderPath, 'config.js');

// Garante que a pasta 'public/js' existe. Se não existir, ele a cria.
// Isso é importante caso você não tenha uma pasta 'js' pré-existente ou queira garantir que ela exista.
if (!fs.existsSync(jsFolderPath)) {
    fs.mkdirSync(jsFolderPath, { recursive: true });
}

// Escreve o conteúdo no arquivo config.js
fs.writeFileSync(configFilePath, envContent);

console.log(`Backend URL injetada com sucesso em ${configFilePath}`);
console.log(`BACKEND_URL: ${backendUrl}`);console.log(`Tentando criar pasta: ${jsFolderPath}`);
if (!fs.existsSync(jsFolderPath)) {
    fs.mkdirSync(jsFolderPath, { recursive: true });
    console.log(`Pasta criada: ${jsFolderPath}`);
}
console.log(`Escrevendo arquivo em: ${configFilePath}`);
fs.writeFileSync(configFilePath, envContent);
console.log('Arquivo config.js criado com sucesso!');
