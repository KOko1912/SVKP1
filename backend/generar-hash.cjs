// generar-hash.cjs
const bcrypt = require('bcryptjs'); // usa bcryptjs para evitar compilación nativa
(async () => {
  const hash = await bcrypt.hash('Kokodile19112#L', 10);
  console.log(hash);
})();
