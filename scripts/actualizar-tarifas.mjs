// (2026-11-04, pedido del dueño) Copia las tarifas de Superpepe (config/tarifas) a los números escritos de
// base de la página. La página ya las cambia en vivo al cargar, pero esos números de base son los que ven
// Google, Facebook/WhatsApp (vista previa) y la gente durante el primer instante: tienen que quedar al día.
// Lo corre .github/workflows/tarifas.yml cada 30 minutos (y a mano desde Actions). Sin cambios, no hace nada.
// Las cuentas son las mismas que hace la página en vivo (index.html y pasajeros/index.html).
import fs from 'node:fs';

const URL_TARIFAS = 'https://firestore.googleapis.com/v1/projects/pepe-conductores/databases/(default)/documents/config/tarifas';
const ARCHIVOS = ['index.html', 'pasajeros/index.html'];

const r = await fetch(URL_TARIFAS);
if (!r.ok) throw new Error(`No se pudieron leer las tarifas: ${r.status}`);
const t = {};
for (const [k, v] of Object.entries((await r.json()).fields ?? {})) {
  const n = Number(v.integerValue ?? v.doubleValue);
  if (Number.isFinite(n)) t[k] = n;
}
if (!(t.auto > 0) || !(t.servicio_efectivo >= 0)) throw new Error('Tarifas incompletas: no se toca nada');

// Calculadas (iguales a las de la página en vivo).
const valores = { ...t, primer_km: t.servicio_efectivo + t.auto, ejemplo_3_2km: t.servicio_efectivo + Math.round(3.2 * t.auto) };
const calc = { ejemplo3: 3 * t.auto + t.servicio_efectivo };
const pesos = (n) => '$' + n.toLocaleString('es-AR');

let cambios = 0;
for (const archivo of ARCHIVOS) {
  const antes = fs.readFileSync(archivo, 'utf8');
  const despues = antes
    .replace(/(data-tarifa="([\w-]+)"[^>]*>)\$[\d.,]+(?=<)/g, (todo, inicio, clave) => clave in valores ? inicio + pesos(valores[clave]) : todo)
    .replace(/(data-calc="([\w-]+)"[^>]*>)\$[\d.,]+(?=<)/g, (todo, inicio, clave) => clave in calc ? inicio + pesos(calc[clave]) : todo);
  if (despues !== antes) {
    fs.writeFileSync(archivo, despues);
    cambios++;
    console.log(`Actualizado: ${archivo}`);
  }
}
console.log(cambios ? `${cambios} archivo(s) con tarifas nuevas` : 'Tarifas al día, sin cambios');
