# iReal Free 🎼📱

> **Visor, Reproductor, Transpositor y Gestor de Partituras Lead Sheet para Músicos (100% compatible con iReal Pro)**  
> Desarrollado con **React Native** y **Expo SDK 57**. Compatible con **Android**, **iOS** y **Web**.

---

## 📋 Tabla de Contenidos
- [Características Principales](#-características-principales)
- [Guía de Uso Rápida (Para el Músico en Vivo)](#-guía-de-uso-rápida-para-el-músico-en-vivo)
  - [1. Navegación y Selección de Canciones](#1-navegación-y-selección-de-canciones)
  - [2. Transposición de Tonalidad](#2-transposición-de-tonalidad)
  - [3. Metrónomo y Tap Tempo](#3-metrónomo-y-tap-tempo)
  - [4. Modo Atril / Pantalla Completa y Bloqueo de Pantalla](#4-modo-atril--pantalla-completa-y-bloqueo-de-pantalla)
  - [5. Repertorio & Listas en Vivo (Setlists)](#5-repertorio--listas-en-vivo-setlists)
  - [6. Importación de Canciones (.html o enlaces)](#6-importación-de-canciones-html-o-enlaces)
  - [7. Compartir / Exportar en formato .html auténtico](#7-compartir--exportar-en-formato-html-auténtico)
  - [8. Eliminación de Canciones](#8-eliminación-de-canciones)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Desarrollo y Comandos](#-desarrollo-y-comandos)
- [¿Cómo Generar el APK para Instalar en Android?](#-cómo-generar-el-apk-para-instalar-en-android)

---

## ✨ Características Principales

* 🎼 **Partitura Lead Sheet Auténtica**:
  * Sin bordes rígidos de cuadrícula o tablas estilo Excel; estética de partitura real.
  * Secciones de ensayo (`[IN] tro`, `[V] erso`, `[C] oro`, `[B] ridge (Puente)`, `[D] Final`, etc.) ubicadas en una línea superior para no apretar los compases.
  * Acordes con bajo en diagonal (`C/E`, `E/G#`, `A/C#`, `B/D#`) tipo `%` con color uniforme auténtico.
  * Pulso rítmico (`/ / C#m`), compases de repetición (`%`), barras dobles y de repetición (`:|`, `|:`).
  * Indicaciones centrales musicales (`CORO`, `FINAL`).
* 🔄 **Transposición Instantánea**:
  * Botones rápidos `[-]` y `[+]` por semitono en la barra superior.
  * Selector directo de las 12 tonalidades (`C`, `Db`, `D`, `Eb`, `E`, `F`, `F#`, `G`, `Ab`, `A`, `Bb`, `B`) con enharmónicos correctos.
* ⏱️ **Metrónomo Profesional y Tap Tempo**:
  * **Android / iOS nativo**: clicks audibles con acento en tiempo 1 (PCM WAV generado a 1100 Hz / 680 Hz) mediante `expo-audio` + vibración háptica.
  * **Web**: generador de audio sin latencia vía Web Audio API.
  * Ajuste de BPM fino: toque = **1 BPM**, pulsación prolongada = **5 BPM**.
  * Botón **TAP** para calcular el tempo exacto de la banda en vivo al pulsar sobre él.
* 💾 **Memoria y Persistencia Fija**:
  * Todas las canciones importadas se guardan de forma permanente en `AsyncStorage`.
  * La aplicación recuerda automáticamente la última canción abierta al cerrar o reiniciar la app.
* 📤 **Exportación en Archivo `.html` Genuino**:
  * Exporta el archivo físico `.html` oficial de iReal Pro para compartir directamente por **WhatsApp**, **Telegram**, **Gmail**, **Google Drive** o descarga en web.
* 📁 **Gestor de Setlists & Listas de Canciones**:
  * Crea listas personalizadas para tus servicios de iglesia, ensayos o conciertos.
  * Navegación fluida canción por canción con las flechas `‹` y `›`.
* 📱 **Modo Atril / Immersive Full-Screen**:
  * Oculta todas las barras de control para maximizar el espacio de lectura en atriles de partituras.
  * Activación automática de **Keep Screen Awake** para evitar que la pantalla del teléfono o tablet se apague en vivo.
* 🌓 **Modos Claro y Oscuro**: Paleta de colores optimizada para escenarios oscuros o lectura bajo luz solar.

---

## 📖 Guía de Uso Rápida (Para el Músico en Vivo)

### 1. Navegación y Selección de Canciones
* **Selector Rápido**: En la barra superior, pulsa sobre el título de la canción `[Título ▼]` para desplegar tu lista completa y cambiar de tema inmediatamente.
* **Siguiente / Anterior**: Usa las flechas `‹` y `›` a los lados del título para avanzar o retroceder en el setlist.

### 2. Transposición de Tonalidad
* **Por semitonos**: Pulsa `[-]` o `[+]` junto a la tonalidad actual en la barra superior (ejemplo: `E (G)` indica que estás tocando en `E`, y la original es `G`).
* **Tonalidad Directa**: Abre el menú de ajustes ⚙️ y pulsa directamente sobre cualquiera de las 12 notas para transponer la canción completa en un instante.

### 3. Metrónomo y Tap Tempo
* **Iniciar / Detener**: Pulsa el botón `▶` o `⏸` en la barra inferior del reproductor.
* **Ajustar BPM**:
  * Pulsa `-` o `+` para subir/bajar **1 BPM**.
  * Mantén presionado `-` o `+` para subir/bajar de **5 en 5 BPM**.
* **Tap Tempo**: Pulsa rítmicamente el botón **`TAP`** o el número de BPM 3 o 4 veces al tempo deseado y el metrónomo se sincronizará automáticamente.

### 4. Modo Atril / Pantalla Completa y Bloqueo de Pantalla
* **Pantalla Completa**: Pulsa el botón `⛶` en la barra superior o en el menú ⚙️. La interfaz se limpiará por completo dejando solo la partitura visible.
* **Salir de Pantalla Completa**: Pulsa el botón flotante `✕ Salir Pantalla Completa` en la esquina inferior.
* **Pantalla Siempre Activa**: En el menú ⚙️, asegúrate de tener activada la opción **"Mantener Pantalla Encendida"** para que tu teléfono nunca se suspenda mientras tocas.

### 5. Repertorio & Listas en Vivo (Setlists)
* Pulsa el botón `📋` en la barra superior o en ajustes ⚙️ para abrir el gestor.
* **Crear Lista**: Pulsa **"+ Crear Nueva Lista"** y asígnale un nombre (ej. *Domingo Mañana* o *Concierto Acústico*).
* **Agregar Canciones a una Lista**: En la pestaña **"🎵 Canciones"**, pulsa el botón `+ Lista` junto a cualquier tema y selecciona a qué lista deseas añadirlo.

### 6. Importación de Canciones (.html o enlaces)
1. **Abrir directamente desde Android ("Abrir con iReal Free")**:
   * Cuando recibas o descargues un archivo `.html` (en WhatsApp, Telegram, Gmail, Drive o tu Administrador de Archivos), simplemente tócalo.
   * Android te mostrará el diálogo *"Abrir con"* y podrás elegir **iReal Free**.
   * La aplicación se abrirá, leerá el archivo, guardará la canción permanentemente en tu biblioteca y la mostrará lista para tocar en el atril.
2. **Desde el menú de la aplicación**:
   * Pulsa `⚙️` y selecciona **"Importar Canción / Archivo .html"**.
   * **Abrir archivo(s) (.html)**: Abre el explorador de archivos de tu teléfono y selecciona **uno o varios archivos a la vez** (selección múltiple compatible con Android, iOS y Web).
   * **Pegar enlace o código**: Pega un enlace `irealb://` copiado de un foro o WhatsApp.
3. Si los archivos seleccionados o el enlace contienen múltiples canciones, pulsa **"📥 Importar Todas al Repertorio"** para guardar todas en bloque a tu memoria fija.

### 7. Compartir / Exportar en formato .html auténtico
* **Desde la partitura activa**: Abre `⚙️` y pulsa **"Compartir / Exportar .html"**.
* **Desde la lista de canciones**: En el menú de Repertorio `📋`, pulsa el icono `📤` al lado de cualquier tema.
* En tu móvil se abrirá la ventana oficial de compartir: elige **WhatsApp**, **Telegram**, **Guardar en Archivos** o **Google Drive** para enviar el archivo adjunto `.html` original.

### 8. Eliminación de Canciones
* **Desde la canción abierta**: Abre `⚙️` y pulsa el botón rojo **"🗑️ Eliminar Canción del Repertorio"**.
* **Desde la lista**: En el menú de Repertorio `📋` (pestaña Canciones), pulsa `🗑️` en el tema que deseas borrar.
* Confirma en el diálogo de seguridad para eliminar permanentemente la canción.

---

## 📂 Estructura del Proyecto

```
ireal-free/
├── charts/                     # Partituras .html oficiales de ejemplo
│   ├── Celebraré.html
│   ├── El Cordero Y El León.html
│   ├── El Dios Que Adoramos.html
│   ├── Hay Libertad.html
│   ├── Hosanna.html
│   ├── Tú Eres Digno De Gloria.html
│   └── Venid, Glorificad A Dios.html
├── src/
│   ├── components/             # Componentes visuales modulares
│   │   ├── LeadSheetGrid.tsx   # Grid auténtico de partitura musical
│   │   ├── MeasureCell.tsx     # Renderizado de compases y acordes en diagonal
│   │   ├── MetronomeBar.tsx    # Barra de metrónomo con Tap Tempo
│   │   ├── TopBar.tsx          # Barra superior minimalista
│   │   ├── SheetSettingsModal.tsx # Menú completo de ajustes y transposición
│   │   ├── PlaylistsModal.tsx  # Gestor de listas, repertorio y eliminación
│   │   └── ImportModal.tsx     # Importador de archivos .html y enlaces múltiples
│   ├── core/                   # Algoritmos puros de música y parseo
│   │   ├── deobfuscator.ts     # Decodificador del algoritmo hussle de iReal Pro
│   │   ├── parser.ts           # Parser de tokens musicales y compases
│   │   ├── transposer.ts       # Transpositor enharmónico en 12 tonos
│   │   ├── exporter.ts         # Generador de estructura XHTML oficial iReal
│   │   ├── metronome.ts        # Motor de audio nativo (expo-audio PCM WAV)
│   │   └── metronome.web.ts    # Motor de audio Web Audio API
│   ├── storage/
│   │   └── playlistStorage.ts  # Persistencia permanente en AsyncStorage
│   ├── theme/
│   │   └── theme.ts            # Temas Claro / Oscuro oficiales
│   └── utils/
│       └── fileExporter.ts     # Exportador de archivos con expo-sharing
├── App.tsx                     # Orquestador principal de la aplicación
├── package.json
└── tsconfig.json
```

---

## 💻 Desarrollo y Comandos

### Instalar dependencias
```bash
npm install
```

### Iniciar la aplicación en modo desarrollo
```bash
# Iniciar servidor Expo (escanea el código QR con Expo Go)
npx expo start

# Iniciar directamente en Android
npx expo start --android

# Iniciar en navegador Web
npx expo start --web
```

### Ejecutar pruebas unitarias
```bash
npm test
```
*(17 pruebas unitarias completas verificando algoritmo de desofuscación, parsing de compases, transposición enharmónica y exportación).*

### Verificación estricta de TypeScript
```bash
npx tsc --noEmit
```

---

## 📦 ¿Cómo Generar el APK para Instalar en Android?

Para generar el archivo `.apk` instalable en cualquier teléfono Android sin necesidad de cables ni Android Studio, usamos **EAS Build** (servicio oficial de compilación en la nube de Expo).

### Paso 1: Instalar EAS CLI e iniciar sesión
```bash
npm install -g eas-cli
eas login
```
*(Si no tienes cuenta en expo.dev, puedes crear una gratuita en 1 minuto en [expo.dev/signup](https://expo.dev/signup)).*

### Paso 2: Configurar el proyecto para APK
El proyecto ya cuenta con el archivo `eas.json` configurado para generar un APK directo (`preview` build):
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Paso 3: Mandar a compilar el APK
Ejecuta el siguiente comando en la terminal:
```bash
eas build -p android --profile preview
```

### Paso 4: Descargar e instalar
1. Al finalizar la compilación (tarda de 3 a 5 minutos en los servidores en la nube de Expo), la terminal te mostrará un enlace y un código QR.
2. Abre el enlace en tu navegador o escanea el QR con tu teléfono Android para descargar directamente el archivo `.apk`.
3. Abre el archivo descargado en tu teléfono y pulsa **Instalar**. ¡Listo! Ya tienes **iReal Free** instalado como app nativa en tu dispositivo.

---

### Créditos & Propósito
Proyecto libre y de código abierto desarrollado por **[alejandroch.com](https://alejandroch.com)** exclusivamente con fines de **práctica y aprendizaje** para músicos y programadores.

### Licencia
Proyecto distribuido bajo la licencia MIT.
Disfruta tocando y compartiendo tu música. 🎶
