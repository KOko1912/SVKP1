const bcrypt = require('bcrypt');

(async () => {
  const hash = await bcrypt.hash('Kokodile19112#L', 10);
  console.log(hash);
})();
