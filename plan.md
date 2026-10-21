Actúa como un desarrollador Senior experto en TypeScript y React Native (Expo). Necesito construir desde cero un visor y transpositor de grillas de acordes (Lead Sheets) compatible con el formato de exportación de **iReal Pro** (`.html` / `irealb://`).

### 1. Contexto del Formato y Desofuscación (Crítico)
Cuando iReal Pro exporta un archivo HTML, incluye un enlace con el esquema `irealb://` codificado en URL. Al aplicar `decodeURIComponent`, las canciones se separan con `===` y cada canción divide sus campos con `=`:
1. Título
2. Compositor
3. Vacío / Reservado
4. Estilo (ej. `Pop`)
5. Tonalidad original (ej. `G`)
6. Vacío o Tempo
7. **Cadena de Acordes Ofuscada** (empieza con el prefijo `1r34LbKcu7`)
8. Estilo de acompañamiento (ej. `Pop-Rock`)
9. Tempo (ej. `115`)
10. Repeticiones (ej. `3`)

**Algoritmo exacto para desofuscar el campo 7 (Cadena de Acordes):**
1. Elimina el prefijo `1r34LbKcu7` del inicio del string.
2. Toma el string restante y divídelo en bloques de 50 caracteres. Aplica la función `hussle()` a cada bloque completo de 50 caracteres (si el último bloque tiene menos de 50 caracteres, déjalo intacto o aplica las inversiones solo si cumple la longitud mínima según el estándar de iReal).
   - **Función `hussle(block)` (para un bloque de 50 chars):**
     - Invierte el orden de los primeros 5 caracteres (índices 0 al 4) con los últimos 5 caracteres (índices 45 al 49). Es decir: `char[0] <-> char[49]`, `char[1] <-> char[48]`, ..., `char[4] <-> char[45]`.
     - Invierte el orden de los caracteres del índice 10 al 23 con los del 26 al 39. Es decir: `char[10] <-> char[39]`, `char[11] <-> char[38]`, ..., `char[23] <-> char[26]`.
3. Una vez unidos los bloques desofuscados, aplica estos reemplazos secuenciales de tokens internos de iReal Pro:
   - `XyQ` -> `"   "` (3 espacios vacíos)
   - `LZ` -> `" |"` (espacio + barra de compás simple)
   - `Kcl` -> `"|x "` (símbolo de repetición de un compás `%`)

### 2. Gramática del String Desofuscado (Parser)
Diseña un parser robusto en TypeScript que convierta el string limpio en una estructura de datos de Secciones, Filas y Compases teniendo en cuenta estos tokens:
- **Secciones (Rehearsal Marks):** `*A`, `*B`, `*C`, `*i` (Intro), `*v` (Verso).
- **Compás de Tiempo (Time Signature):** `T44` (4/4), `T34` (3/4), `T68` (6/8), etc.
- **Barras de compás:** `[` o `{` (barra de inicio / inicio de repetición), `|` (barra simple), `]` o `}` (barra final / fin de repetición), `Z` (doble barra final).
- **Textos y Comentarios:** Todo lo que esté entre `<` y `>` (ej. `<Intro>`, `<*69Instrumental:>`). Nota: a veces incluyen dos dígitos de desplazamiento vertical al inicio como `*69`, límpialos para mostrar solo el texto.
- **Espacios y Divisiones:** `s` (acordes pequeños/juntos en el mismo pulso), `p` (barra de pulso `/` para rítmica), `l` (tamaño normal), `n` (N.C. / No Chord).
- **Acordes:** Notación estándar (`C`, `D`, `E-` para Em, `F#`, `G`, etc.) e inversiones con bajo tras una barra `/` (ej. `D/F#`, `C/E`, `E-/B`). Nota: en iReal Pro el signo `-` representa acorde menor (`m`).

### 3. Motor de Transposición Musical
Crea un módulo de transposición en TypeScript puro que:
- Reciba el AST/estructura de la canción y el número de semitonos a transportar (`-11` a `+11`) o la nueva tonalidad destino.
- Transponga tanto la raíz del acorde como el bajo en los acordes invertidos (slash chords como `D/F#`).
- **Manejo inteligente de enarmonías:** Si la nueva tonalidad usa bemoles (`F`, `Bb`, `Eb`, `Ab`, `Db`, `Gb` o sus relativas menores), debe usar `Bb, Eb, Ab, Db, Gb`. Si la tonalidad usa sostenidos (`G`, `D`, `A`, `E`, `B`, `F#`), debe usar `F#, C#, G#, D#, A#`.
- Convierta visualmente el `-` de iReal Pro a `m` (ej. `E-` -> `Em`) para que sea más cómodo de leer.

### 4. Interfaz Gráfica (UI en React Native)
Construye una pantalla limpia en modo oscuro (inspirada en el fondo `#1b2730` y texto `#e6e3da` de iReal Pro):
1. **Header:** Título de la canción, artista, estilo, tempo y tonalidad actual.
2. **Controles de Transposición:** Botones `-1` y `+1` semitono, más un selector rápido de tonalidad (C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B) y un botón para importar/pegar un archivo `.html` o URL `irealb://`.
3. **Grilla de Acordes (Lead Sheet Grid):**
   - Usa Flexbox para mostrar estrictamente **4 compases por fila** (como el estándar de iReal Pro).
   - Muestra las etiquetas de sección (`Intro`, `Verso`, `Coro`, `A`, `B`) y textos adicionales arriba o al inicio del compás correspondiente.
   - Dibuja claramente las barras de compás (`|`), barras de repetición (`|:`, `:|`) y el símbolo de repetición de compás (`%`).
   - Si un compás tiene varios acordes, distribúyelos equitativamente dentro del ancho del compás.

### 5. Caso de Prueba Real (Validación)
Usa este HTML exacto exportado de iReal Pro como estado inicial por defecto en la app para probar que el desofuscador, el parser y el transpositor funcionan a la perfección desde el primer render:

```html
<a href="irealb://El%20Dios%20Que%20Adoramos%3DLa%20IBI%20%26%20GSM%3D%3DPop%3DG%3D4%3D1r34LbKcu7osre%2044%3C*6*%7BY%5D%20D%20GZLC%20-EQ%7CyXD%7CQyXG%3Eort%209v%3C*69Ti*%7CYp%7CQyXKcl%20L%20lcKQyXCZL%20lcKyQX-EZL%20lcKQyXDZ%20%7DY%7CCQyXG%3E-EZL%20DXyQKXDZL%20lcKQyXG%3Eoor%2096*%3CC*%7CY%5D%20%20lcyQKclZL-EpyXC%7CQXyQ%7CGL%20lcKQyXDZL%20lcQKyXG%7CQyXD%7CQyXB%2FZE-XyC%7CQyXyX-E%7CyQ%7CD%2FQyXC%3Elatnemurt%20s96*%3Ci*%7CY%5DQyX%23F%7CDXyQX-E%7CQcKQyX*03AlneuP(%20egdir%2096%3C*B*%7BY%5D%20%20%3EortnI%20te)%3EC%3C%20D%7CQOC33*XyQKcY%7D%20%20lcKQyX%23F%2FDLZ%20lcKQyXE%2FCZL%20l%7CXyQ%3CDZL%20lRO%3EXyQ%20LZXyQ%3C*36FINAL%3EXyQ%20%20Z%20%3DPop-Rock%3D115%3D3">El Dios Que Adoramos</a>