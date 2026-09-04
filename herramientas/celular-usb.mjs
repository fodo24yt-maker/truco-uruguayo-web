/**
 * El celular de verdad, enchufado por USB.
 *
 *     node herramientas/celular-usb.mjs            → vista previa EN VIVO en el celular
 *     node herramientas/celular-usb.mjs --apk      → compila el APK, lo instala y lo abre
 *     node herramientas/celular-usb.mjs --compilar → sólo deja el .apk, sin instalar
 *     node herramientas/celular-usb.mjs --foto     → una foto del celular, sin pérdida
 *     node herramientas/celular-usb.mjs --vigilar  → 5 fotos seguidas y las compara
 *
 * ── El problema que resuelve ──────────────────────────────────────────────
 *
 * Esta máquina es WSL2, o sea una máquina virtual de Linux adentro de Windows.
 * **WSL2 no ve los puertos USB.** Enchufás el celular y del lado de Linux no
 * existe: para que existiera habría que instalar `usbipd-win`, cargar módulos
 * del kernel y ceder el dispositivo a mano cada vez que lo enchufás.
 *
 * No hace falta pelear con eso. Windows SÍ ve el USB y ya tiene el `adb.exe`
 * que instaló Android Studio, y WSL puede ejecutar programas de Windows
 * directamente (el "interop"). Entonces el reparto queda así:
 *
 *     Linux compila  ·  Windows enchufa
 *
 * Todo lo que es compilar —Node, Next, Gradle, el JDK— pasa de este lado, que
 * es donde vive el código y es el mismo sistema que usa GitHub Actions. Lo
 * único que cruza a Windows es hablarle al teléfono.
 *
 * ── Los dos modos, y cuándo usar cada uno ─────────────────────────────────
 *
 * **En vivo** (sin argumentos) es para MIRAR. `adb reverse` hace que el
 * `localhost:3000` del celular apunte al servidor de desarrollo de la
 * computadora, así que abrís el navegador del teléfono y ves el proyecto con
 * recarga automática: tocás el código, mirás la pantalla, sin compilar nada.
 * Es el bucle rápido y es el que sirve para corregir diseño.
 *
 * Lo que NO ves en vivo: es una pestaña de Chrome, no la app. No tiene el
 * botón físico de atrás, ni la pantalla de arranque, ni la barra del sistema
 * encima del contenido. Para eso está el otro modo.
 *
 * **`--apk`** compila la app de verdad y te la instala. Tarda minutos, no
 * segundos, y es lo único que prueba lo que sólo existe adentro de un APK.
 *
 * **`--foto` y `--vigilar`** son para MEDIR, y nacieron de un error caro.
 *
 * El 4/9/2026 se diagnosticaron dos veces seguidas unas manchitas de la mesa
 * mirando capturas que habían pasado por el espejo de pantalla de Windows. La
 * segunda vez se midió: en el recorte del mapa, el 100% de los píxeles de
 * color imposible estaba pegado a un borde de mucho contraste, que es la firma
 * de un compresor de imagen y no la de un fallo de dibujo. O sea que parte de
 * lo que se estaba arreglando **lo había inventado el espejo**.
 *
 * `adb exec-out screencap -p` saca la imagen del framebuffer del teléfono, sin
 * pérdida y a resolución real: no pasa por ningún códec ni por ningún
 * reescalado. Es la única foto sobre la que vale la pena decidir algo.
 *
 * `--vigilar` saca varias seguidas de una pantalla quieta y las compara con
 * `herramientas/motas.mjs`. En una pantalla quieta, todo píxel que cambia es
 * basura: es un detector que no necesita saber nada del diseño, y por eso no
 * se puede engañar solo.
 *
 * ── Qué hace falta tener ──────────────────────────────────────────────────
 *
 * En el celular: Opciones de desarrollador → Depuración por USB. Y aceptar el
 * cartel de "¿Permitir depuración USB?" que aparece al enchufarlo.
 *
 * En esta máquina: el JDK y el SDK, que viven en `~/herramientas-android/`
 * (fuera del repositorio, porque son 1,5 GB y no son código nuestro).
 */

import { existsSync, copyFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const PAQUETE = "uy.trucouruguayo.app";
const ACTIVIDAD = `${PAQUETE}/.MainActivity`;
const APK = "android/app/build/outputs/apk/debug/app-debug.apk";

const args = process.argv.slice(2);
const soloCompilar = args.includes("--compilar");
const desinstalar = args.includes("--desinstalar");
const unaFoto = args.includes("--foto");
const vigilar = args.includes("--vigilar");
const j = args.indexOf("--vigilar");
/* Cinco fotos alcanzan: con dos ya se ve si algo se mueve, y cinco dan cuatro
   comparaciones sin que la espera se vuelva molesta. */
const cuantasFotos = j === -1 ? 5 : Number(args[j + 1]) || 5;
const conApk = args.includes("--apk") || soloCompilar;
const i = args.indexOf("--puerto");
const puerto = i === -1 ? 3000 : Number(args[i + 1]) || 3000;

/* Dónde están el JDK y el SDK. Se respeta lo que ya haya en el entorno —si
   algún día se instalan con el gestor de paquetes, esto no estorba— y si no,
   se usa la carpeta donde los dejó la instalación de este proyecto.

   NO se escriben en `android/local.properties` ni en `gradle.properties`: esos
   archivos tendrían la ruta de una máquina concreta adentro, y este repo es
   público. Se pasan como variables de entorno, que no dejan rastro. */
const CASA = os.homedir();
const JAVA_HOME = process.env.JAVA_HOME || path.join(CASA, "herramientas-android/jdk");
const ANDROID_HOME = process.env.ANDROID_HOME || path.join(CASA, "herramientas-android/sdk");

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };

// ── Windows, desde acá ──────────────────────────────────────────────────────

/** Lee una variable de entorno de WINDOWS (no de Linux) preguntándole a `cmd`. */
function variableDeWindows(nombre) {
  const r = spawnSync("/mnt/c/Windows/System32/cmd.exe", ["/c", `echo %${nombre}%`], { encoding: "utf8" });
  const v = (r.stdout || "").trim();
  return v && v !== `%${nombre}%` ? v : null;
}

/** Traduce una ruta de Linux a la que ve Windows (`/mnt/c/x` → `C:\x`). */
const aWindows = (p) => spawnSync("wslpath", ["-w", p], { encoding: "utf8" }).stdout.trim();
/** Y al revés. */
const aLinux = (p) => spawnSync("wslpath", ["-u", p], { encoding: "utf8" }).stdout.trim();

/* Buscar `adb.exe`. La ruta depende del nombre de usuario de Windows, así que
   NO se puede escribir a mano: en un repo público eso sería publicar el nombre
   de quien trabaja acá. Se deduce de %LOCALAPPDATA%, que es donde Android
   Studio instala el SDK por defecto. */
function buscarAdb() {
  const candidatos = [];
  for (const v of ["LOCALAPPDATA", "USERPROFILE"]) {
    const w = variableDeWindows(v);
    if (!w) continue;
    const base = aLinux(w);
    candidatos.push(path.join(base, "Android/Sdk/platform-tools/adb.exe"));
    candidatos.push(path.join(base, "AppData/Local/Android/Sdk/platform-tools/adb.exe"));
  }
  const hallado = candidatos.find((c) => existsSync(c));
  if (!hallado) {
    morir(
      "No encuentro `adb.exe` en Windows.\n",
      " Lo instala Android Studio: abrilo → More Actions → SDK Manager →\n",
      " pestaña SDK Tools → tildá 'Android SDK Platform-Tools' → Apply.",
    );
  }
  return hallado;
}

const ADB = buscarAdb();
const adb = (...a) => spawnSync(ADB, a, { encoding: "utf8" });

// ── El celular ──────────────────────────────────────────────────────────────

/* `adb devices -l` devuelve una línea por teléfono: "<serie> <estado> ...".
   Los tres estados que importan se tratan distinto porque se arreglan distinto:
   sin teléfono es un cable, `unauthorized` es un cartel sin aceptar en la
   pantalla del celular, y `offline` casi siempre se arregla desenchufando. */
function elCelular() {
  const salida = adb("devices", "-l").stdout || "";
  const filas = salida.split("\n").slice(1)
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => ({ serie: l.split(/\s+/)[0], estado: l.split(/\s+/)[1], linea: l }));

  const listos = filas.filter((f) => f.estado === "device");
  if (listos.length === 1) return listos[0];
  if (listos.length > 1) {
    morir("Hay más de un teléfono enchufado. Dejá uno solo:\n ", filas.map((f) => f.linea).join("\n  "));
  }
  if (filas.some((f) => f.estado === "unauthorized")) {
    morir(
      "El celular está enchufado pero no dio permiso.\n",
      " Mirá la pantalla del teléfono: hay un cartel '¿Permitir depuración USB?'.\n",
      " Aceptalo (y tildá 'Siempre permitir') y volvé a correr esto.",
    );
  }
  if (filas.some((f) => f.estado === "offline")) {
    morir("El celular figura 'offline'. Desenchufalo y volvé a enchufarlo.");
  }
  morir(
    "No veo ningún celular.\n",
    " 1. Enchufalo por USB (con un cable de DATOS: los de sólo carga no sirven).\n",
    " 2. En el celular: Ajustes → Información del teléfono → tocá 7 veces\n",
    "    'Número de compilación' para habilitar Opciones de desarrollador.\n",
    " 3. Ajustes → Sistema → Opciones de desarrollador → Depuración por USB.\n",
    " 4. En el aviso de la barra de notificaciones, poné el USB en\n",
    "    'Transferencia de archivos' y no en 'Sólo carga'.",
  );
}

// ── Compilar ────────────────────────────────────────────────────────────────

function paso(titulo, cmd, cmdArgs, opciones = {}) {
  console.log(`\n── ${titulo}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: false, ...opciones });
  if (r.status !== 0) morir(`Falló: ${titulo}`);
}

function compilar() {
  if (!existsSync(JAVA_HOME)) morir(`No está el JDK en ${JAVA_HOME}`);
  if (!existsSync(ANDROID_HOME)) morir(`No está el SDK de Android en ${ANDROID_HOME}`);

  const entorno = { ...process.env, JAVA_HOME, ANDROID_HOME, ANDROID_SDK_ROOT: ANDROID_HOME };

  // Los mismos tres pasos, en el mismo orden, que `.github/workflows/apk.yml`.
  paso("La web de la app (out-app/)", "npm", ["run", "build:app"]);
  paso("Meterla adentro del proyecto Android", "npx", ["cap", "sync", "android"], { env: entorno });

  /* Acá va CON demonio, al revés que el CI, y es a propósito: en la nube el
     proceso arranca de cero cada vez y un demonio sólo gastaría memoria; en la
     máquina, el demonio es lo que hace que la segunda compilación tarde
     segundos en vez de minutos, que es todo el punto de compilar en casa. */
  paso("Compilar el APK", "./gradlew", ["assembleDebug"], { cwd: "android", env: entorno });

  if (!existsSync(APK)) morir(`Gradle terminó bien pero no está ${APK}`);
  console.log(`\n✓ APK listo: ${APK}`);
}

// ── Instalar ────────────────────────────────────────────────────────────────

function instalar(celular) {
  /* El APK vive en el disco de Linux. `adb.exe` es un programa de Windows y
     leerlo por `\\wsl.localhost\...` es un sistema de archivos de red que a
     veces le cuesta. Copiarlo primero al temporal de Windows son 10 MB y saca
     del medio una clase entera de fallas raras. Se borra después. */
  const temp = variableDeWindows("TEMP");
  if (!temp) morir("No pude leer %TEMP% de Windows.");
  const destinoLinux = path.join(aLinux(temp), "truco-uruguayo-debug.apk");
  copyFileSync(APK, destinoLinux);

  console.log(`\n── Instalando en ${celular.serie}`);
  const r = adb("install", "-r", aWindows(destinoLinux));
  const texto = (r.stdout || "") + (r.stderr || "");
  rmSync(destinoLinux, { force: true });

  if (!/Success/i.test(texto)) {
    /* La falla más común y la que más desconcierta: ya hay instalada una app
       con el mismo `applicationId` firmada con otra clave —típicamente la que
       compiló GitHub Actions—. Android no deja reemplazarla y hay que
       desinstalar. Desinstalar BORRA el progreso guardado, así que no lo hago
       yo solo. */
    if (/UPDATE_INCOMPATIBLE|VERSION_DOWNGRADE|signatures do not match/i.test(texto)) {
      morir(
        "Ya hay instalada una versión firmada con OTRA clave —típicamente la que\n",
        " compiló GitHub Actions—. Android no deja reemplazarla: para él son dos\n",
        " apps distintas que se pelean por el mismo nombre.\n\n",
        " Para seguir hay que desinstalar la vieja, y eso BORRA el progreso de la\n",
        " gira que haya en el teléfono, porque se va con los datos de la app:\n\n",
        "   node herramientas/celular-usb.mjs --desinstalar\n\n",
        " Después de eso, elegí una sola fuente de APK y quedate con ella.",
      );
    }
    morir("No se pudo instalar:\n", texto.trim());
  }
  console.log("✓ instalada");

  adb("shell", "am", "start", "-n", ACTIVIDAD);
  console.log("✓ abierta en el celular");
}

// ── Vista previa en vivo ────────────────────────────────────────────────────

function enVivo(celular) {
  /* `adb reverse` abre un túnel al revés: lo que el CELULAR pida a su propio
     localhost:3000 sale por el cable y lo atiende la computadora. Es mejor que
     poner la IP de la red porque no depende del wifi, funciona con datos
     apagados, y —clave acá— no hace falta que WSL sea alcanzable desde afuera.

     El túnel muere solo cuando desenchufás el cable. */
  const r = adb("reverse", `tcp:${puerto}`, `tcp:${puerto}`);
  if (r.status !== 0) morir("No pude abrir el túnel:\n", (r.stderr || "").trim());
  console.log(`✓ túnel abierto: localhost:${puerto} del celular → esta computadora`);

  /* El servidor de desarrollo corre en Linux, pero quien atiende el túnel es
     Windows. WSL2 reenvía el localhost de Windows hacia adentro, así que la
     cadena cierra sola... siempre que Next escuche en todas las interfaces.
     Si no, `next dev` sólo escucha en 127.0.0.1 de Linux y Windows no llega. */
  /* Sin `bash -c`: el puerto ya pasó por Number(), pero armar una cadena de
     shell con algo que viene de la línea de comandos es un patrón que no vale
     la pena dejar escrito ni cuando es seguro. `ss` con argumentos sueltos y el
     filtro en JavaScript hace lo mismo sin intérprete de por medio. */
  const escucha = spawnSync("ss", ["-ltn"], { encoding: "utf8" });
  const hayServidor = (escucha.stdout || "").split("\n").some((l) => /LISTEN/.test(l) && l.includes(`:${puerto} `));
  if (escucha.status === 0 && !hayServidor) {
    console.log(`\n⚠ No hay nada escuchando en el puerto ${puerto} de esta máquina.`);
    console.log(`  Arrancá el servidor en otra terminal:  npm run dev -- -H 0.0.0.0\n`);
  }

  adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", `http://localhost:${puerto}`);
  console.log(`✓ abierto en el navegador del celular\n`);
  console.log("  Ahora tocá el código y recargá: se actualiza solo.");
  console.log("  Esto es el sitio en una pestaña, NO la app: no tiene botón");
  console.log("  físico de atrás ni pantalla de arranque. Para eso, --apk.");
}

/* ── Fotos del framebuffer ─────────────────────────────────────────────────
   `exec-out` y no `shell`: `adb shell` pasa la salida por una consola que en
   Windows le cambia los saltos de línea, y un PNG con los bytes cambiados no
   se abre. `exec-out` entrega los bytes crudos.

   Y sin `encoding`, para que `spawnSync` devuelva un Buffer y no un texto: un
   PNG interpretado como UTF-8 se corrompe sin avisar. */
function sacarFoto(destino) {
  const r = spawnSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 * 1024 * 1024 });
  const png = r.stdout;
  if (!png || png.length < 1000 || png[0] !== 0x89 || png[1] !== 0x50)
    morir("El celular no devolvió una foto.", (r.stderr || "").toString().trim());
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, png);
  return png.length;
}

async function fotos(celular, cuantas) {
  const modelo = /model:(\S+)/.exec(celular.linea)?.[1] ?? celular.serie;
  console.log(`✓ celular: ${modelo}`);
  const carpeta = path.join("capturas/celular", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
  const hechas = [];
  for (let i = 1; i <= cuantas; i++) {
    const destino = path.join(carpeta, `foto-${i}.png`);
    const bytes = sacarFoto(destino);
    hechas.push(destino);
    console.log(`  ${i}/${cuantas}  ${destino}  (${(bytes / 1024).toFixed(0)} kB)`);
    /* Un respiro entre foto y foto: sin él salen tan pegadas que ni las
       animaciones de verdad alcanzan a moverse, y la comparación no dice nada. */
    if (i < cuantas) spawnSync("sleep", ["0.7"]);
  }
  if (cuantas === 1) {
    console.log(`\n  Para contarle las motas:  node herramientas/motas.mjs ${hechas[0]}\n`);
    return;
  }
  console.log("\n── medido ────────────────────────────────────────────────────");
  const { motasDe, movimiento, pintarCambios } = await import("./motas.mjs");
  for (const f of hechas) {
    const m = await motasDe(f);
    console.log(`  ${path.basename(f)}  ${m.ancho}x${m.alto}  ${String(m.motas).padStart(4)} motas`);
  }
  let sospechosas = 0;
  for (let i = 1; i < hechas.length; i++) {
    const r = await movimiento(hechas[i - 1], hechas[i]);
    sospechosas += r.motas;
    const mapa = path.join(carpeta, `cambios-${i}.png`);
    await pintarCambios(hechas[i], r.marca, mapa);
    console.log(`  ${i}→${i + 1}: ${r.cambiados} px cambiados · ${r.motas} motas sueltas · ${r.grandes.length} manchas grandes → ${mapa}`);
  }
  console.log("");
  if (sospechosas === 0) {
    console.log("  ✓ Ningún puntito suelto cambió de lugar. Lo que dibuja el");
    console.log("    teléfono es estable: si en una captura se veía sucio, la");
    console.log("    suciedad la puso el espejo de pantalla, no la app.\n");
  } else {
    console.log(`  ⚠ ${sospechosas} motas sueltas cambiaron de lugar entre fotos.`);
    console.log("    En una pantalla quieta eso es basura de dibujo: mirá los");
    console.log("    mapas de cambios para ver alrededor de qué elemento cae.\n");
  }
}

// ── Andar ───────────────────────────────────────────────────────────────────

if (desinstalar) {
  const celular = elCelular();
  console.log(`✓ celular: ${celular.serie}`);
  console.log(`\n⚠ Esto borra la app Y el progreso de la gira guardado en ella.`);
  const r = adb("uninstall", PAQUETE);
  console.log((r.stdout || r.stderr || "").trim());
} else if (unaFoto || vigilar) {
  await fotos(elCelular(), vigilar ? cuantasFotos : 1);
} else if (soloCompilar) {
  compilar();
  console.log(`\nPara instalarlo:  node herramientas/celular-usb.mjs --apk\n`);
} else {
  const celular = elCelular();
  const modelo = /model:(\S+)/.exec(celular.linea)?.[1] ?? celular.serie;
  console.log(`✓ celular: ${modelo}`);
  if (conApk) { compilar(); instalar(celular); }
  else enVivo(celular);
}
