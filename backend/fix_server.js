// Este script corrige las rutas duplicadas en server.js
const fs = require('fs');
const path = require('path');

try {
  // Leer el archivo server.js
  const serverPath = path.join(__dirname, 'server.js');
  let content = fs.readFileSync(serverPath, 'utf8');
  
  // Primera aparición de la ruta de unidades POST (la que hay que comentar)
  const firstRoute = "app.post('/api/unidades', verificarAdmin, async (req, res) => {";
  const endOfFirstRoute = "});";
  
  if (content.includes(firstRoute)) {
    console.log('Encontrada ruta duplicada...');
    
    // Encuentra la posición de inicio y fin de la primera ruta
    const startIndex = content.indexOf(firstRoute);
    // Buscar el cierre de la función
    let braces = 1; // Ya contamos la llave de apertura de la función
    let endIndex = startIndex + firstRoute.length;
    
    while (braces > 0 && endIndex < content.length) {
      endIndex++;
      if (content[endIndex] === '{') braces++;
      if (content[endIndex] === '}') braces--;
    }
    
    // Si encontramos el cierre completo, añadimos el paréntesis de cierre
    if (braces === 0) {
      endIndex += 2; // Incluir "});"
      
      // Comentar la ruta
      const routeToComment = content.substring(startIndex, endIndex);
      const commentedRoute = "/* RUTA COMENTADA - DUPLICADA \n" + routeToComment + "\n*/";
      
      // Reemplazar en el contenido
      content = content.substring(0, startIndex) + commentedRoute + content.substring(endIndex);
      
      // Guardar el archivo
      fs.writeFileSync(serverPath, content, 'utf8');
      console.log('✅ Archivo server.js modificado exitosamente');
      console.log('Ahora puedes reiniciar el servidor con "node server.js"');
    } else {
      console.error('⚠️ No se pudo encontrar el fin de la ruta duplicada');
    }
  } else {
    console.log('⚠️ No se encontró la ruta duplicada');
  }
} catch (error) {
  console.error('❌ Error al procesar el archivo:', error);
} 