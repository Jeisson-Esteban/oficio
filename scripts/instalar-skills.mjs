import { existsSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Recrea en .claude/skills/ los enlaces a las skills propias del proyecto
 * (.agents/skills/) -- necesario después de un `git clone` fresco, porque
 * los junctions de Windows / symlinks no viajan con git. Correr una vez:
 *
 *   node scripts/instalar-skills.mjs
 *
 * Solo toca las 7 skills propias de este repo. Las de terceros
 * (find-skills, impeccable, ui-ux-pro-max...) se reinstalan con sus
 * propios comandos si hacen falta -- ver README.md.
 */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origenDir = path.join(raiz, '.agents', 'skills');
const destinoDir = path.join(raiz, '.claude', 'skills');

mkdirSync(destinoDir, { recursive: true });

const nombresPropios = readdirSync(origenDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((nombre) => !['find-skills', 'impeccable', 'ui-ux-pro-max'].includes(nombre));

let creadas = 0;
for (const nombre of nombresPropios) {
  const destino = path.join(destinoDir, nombre);
  if (existsSync(destino)) continue;
  const origen = path.join(origenDir, nombre);
  // 'junction' funciona sin privilegios de administrador en Windows;
  // en macOS/Linux Node lo trata como un symlink normal.
  symlinkSync(origen, destino, 'junction');
  console.log(`+ .claude/skills/${nombre}`);
  creadas++;
}

console.log(
  creadas > 0
    ? `Listo: ${creadas} skill(s) enlazada(s). Abre una conversación nueva de Claude Code para que las detecte.`
    : 'Ya estaban todas enlazadas -- nada que hacer.',
);
