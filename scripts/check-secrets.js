// Busca claves privadas o frases semilla en los archivos versionados (git ls-files).
const { execSync } = require("child_process");
const fs = require("fs");

// Claves públicas conocidas de las cuentas de prueba de Hardhat que no son secretos: no hay ninguna en el repo.
const PATTERNS = [
  { name: "clave privada hex (64)", re: /(?<![0-9a-fA-F])(0x)?[0-9a-fA-F]{64}(?![0-9a-fA-F])/ },
  { name: "asignación de clave", re: /PRIVATE_KEY\s*=\s*\S+/ },
  { name: "posible frase semilla", re: /\b(mnemonic|seed phrase)\b\s*[:=]\s*["']?\w+(\s+\w+){11,}/i },
];
const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean)
  .filter((f) => !f.startsWith("web/data/") && !f.endsWith(".png") && f !== "package-lock.json");
let found = 0;
for (const f of files) {
  if (f === ".env") { console.log(`✖ ${f} no debería estar versionado`); found++; continue; }
  const text = fs.readFileSync(f, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const p of PATTERNS) if (p.re.test(line)) { console.log(`✖ ${f}:${i + 1} ${p.name}`); found++; }
  });
}
// En web/data solo hay direcciones (40 hex) y hashes de transacciones públicos (64 hex): se excluye del patrón hex.
if (found) { console.log(`\n${found} coincidencias. Revisa antes de hacer commit.`); process.exit(1); }
console.log(`✔ ${files.length} archivos revisados: no se han encontrado claves privadas ni frases semilla.`);
