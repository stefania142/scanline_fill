/**
 * ============================================================
 * ALGORITMO SCANLINE FILL (RELLENO POR LÍNEAS DE BARRIDO)
 * ============================================================
 *
 * Este algoritmo se utiliza para rellenar polígonos 2D.
 *
 * IDEA GENERAL:
 * ------------------------------------------------------------
 * Imaginemos que una línea horizontal (scanline) recorre
 * la pantalla desde arriba hacia abajo.
 *
 * Para cada línea horizontal:
 *   1. Se calculan las intersecciones de esa línea con
 *      los bordes del polígono.
 *   2. Las intersecciones se ordenan de izquierda a derecha.
 *   3. Se rellenan los píxeles entre pares de intersecciones.
 *
 * EJEMPLO:
 *
 * Intersecciones en Y = 10:
 *
 *      x1------x2     x3------x4
 *
 * Se rellena:
 *      [x1,x2] y [x3,x4]
 *
 * Esto funciona porque un polígono cerrado alterna:
 *   entrar -> salir -> entrar -> salir
 *
 * ============================================================
 * VENTAJAS
 * ============================================================
 * - Mucho más eficiente que flood fill.
 * - Ideal para motores gráficos.
 * - Base de rasterización en GPUs antiguas.
 * - Complejidad relativamente baja.
 *
 * ============================================================
 * ESTRUCTURAS IMPORTANTES
 * ============================================================
 *
 * 1. ET (Edge Table)
 *    Tabla de bordes.
 *    Contiene información de cada arista del polígono.
 *
 * 2. AET (Active Edge Table)
 *    Tabla de bordes activos.
 *    Guarda únicamente las aristas que intersectan
 *    la scanline actual.
 *
 * ============================================================
 * DATOS QUE GUARDAMOS POR ARISTA
 * ============================================================
 *
 * ymax:
 *   Última coordenada Y donde la arista participa.
 *
 * x:
 *   Intersección actual con la scanline.
 *
 * invSlope:
 *   Inverso de la pendiente.
 *
 *      invSlope = dx / dy
 *
 * Se usa para actualizar X incrementalmente:
 *
 *      x += invSlope
 *
 * evitando recalcular ecuaciones completas.
 *
 * ============================================================
 * REPRESENTACIÓN DEL POLÍGONO
 * ============================================================
 *
 * El polígono será un array de puntos:
 *
 * [
 *   {x: 100, y: 100},
 *   {x: 200, y: 150},
 *   {x: 180, y: 250},
 *   ...
 * ]
 *
 * ============================================================
 * IMPLEMENTACIÓN COMPLETA
 * ============================================================
 */

class ScanlineFill {

    /**
     * Constructor
     *
     * @param {CanvasRenderingContext2D} ctx
     *        Contexto 2D del canvas donde se dibujará.
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * --------------------------------------------------------
     * MÉTODO PRINCIPAL
     * --------------------------------------------------------
     *
     * Ejecuta el algoritmo scanline fill.
     *
     * @param {Array} polygon
     *        Array de vértices del polígono.
     *
     * @param {String} color
     *        Color de relleno.
     */
    fill(polygon, color = "black") {

        // ====================================================
        // 1. CONSTRUIR EDGE TABLE (ET)
        // ====================================================
        //
        // La Edge Table organiza las aristas según
        // la coordenada Y mínima de cada una.
        //
        // ET[y] = lista de aristas que comienzan en y
        //
        // Cada arista guarda:
        //   - ymax
        //   - x inicial
        //   - invSlope
        //
        // ====================================================

        const edgeTable = {};

        const n = polygon.length;

        for (let i = 0; i < n; i++) {

            // Punto actual
            const p1 = polygon[i];

            // Siguiente punto (cerrando el polígono)
            const p2 = polygon[(i + 1) % n];

            // ------------------------------------------------
            // IGNORAR LÍNEAS HORIZONTALES
            // ------------------------------------------------
            //
            // Las líneas horizontales no generan
            // intersecciones útiles para scanline fill.
            //
            // Además producen duplicados ambiguos.
            //
            // ------------------------------------------------
            if (p1.y === p2.y) {
                continue;
            }

            // ------------------------------------------------
            // IDENTIFICAR:
            //   ymin
            //   ymax
            //
            // La arista se procesa desde abajo hacia arriba.
            // ------------------------------------------------
            let ymin, ymax, xAtYmin, invSlope;

            if (p1.y < p2.y) {

                ymin = p1.y;
                ymax = p2.y;

                xAtYmin = p1.x;

                // dx/dy
                invSlope = (p2.x - p1.x) / (p2.y - p1.y);

            } else {

                ymin = p2.y;
                ymax = p1.y;

                xAtYmin = p2.x;

                invSlope = (p1.x - p2.x) / (p1.y - p2.y);
            }

            // Crear bucket si no existe
            if (!edgeTable[ymin]) {
                edgeTable[ymin] = [];
            }

            // Insertar arista
            edgeTable[ymin].push({
                ymax,
                x: xAtYmin,
                invSlope
            });
        }

        // ====================================================
        // 2. OBTENER RANGO VERTICAL TOTAL
        // ====================================================

        const ys = polygon.map(p => p.y);

        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        // ====================================================
        // 3. ACTIVE EDGE TABLE (AET)
        // ====================================================
        //
        // Contendrá SOLO las aristas activas
        // para la scanline actual.
        //
        // ====================================================

        let activeEdgeTable = [];

        // Color de dibujo
        this.ctx.fillStyle = color;

        // ====================================================
        // 4. RECORRER SCANLINES
        // ====================================================
        //
        // Se procesa línea por línea.
        //
        // ====================================================

        for (let y = minY; y <= maxY; y++) {

            // ------------------------------------------------
            // 4.1 AGREGAR NUEVAS ARISTAS ACTIVAS
            // ------------------------------------------------
            //
            // Si alguna arista comienza en esta Y,
            // se agrega a la AET.
            //
            // ------------------------------------------------

            if (edgeTable[y]) {
                activeEdgeTable.push(...edgeTable[y]);
            }

            // ------------------------------------------------
            // 4.2 ELIMINAR ARISTAS TERMINADAS
            // ------------------------------------------------
            //
            // Una arista deja de ser activa cuando
            // llegamos a ymax.
            //
            // ------------------------------------------------

            activeEdgeTable = activeEdgeTable.filter(
                edge => edge.ymax > y
            );

            // ------------------------------------------------
            // 4.3 ORDENAR POR X
            // ------------------------------------------------
            //
            // Necesitamos las intersecciones de izquierda
            // a derecha.
            //
            // ------------------------------------------------

            activeEdgeTable.sort((a, b) => a.x - b.x);

            // ------------------------------------------------
            // 4.4 RELLENAR ENTRE PARES
            // ------------------------------------------------
            //
            // Tomamos:
            //
            //   [0] con [1]
            //   [2] con [3]
            //   etc.
            //
            // ------------------------------------------------

            for (let i = 0; i < activeEdgeTable.length; i += 2) {

                // Seguridad ante polígonos inválidos
                if (i + 1 >= activeEdgeTable.length) {
                    break;
                }

                // Intersección izquierda
                const xStart = Math.ceil(activeEdgeTable[i].x);

                // Intersección derecha
                const xEnd = Math.floor(activeEdgeTable[i + 1].x);

                // --------------------------------------------
                // Dibujar línea horizontal
                // --------------------------------------------
                //
                // fillRect(x, y, width, height)
                //
                // Altura = 1 píxel
                //
                // --------------------------------------------

                this.ctx.fillRect(
                    xStart,
                    y,
                    xEnd - xStart + 1,
                    1
                );
            }

            // ------------------------------------------------
            // 4.5 ACTUALIZAR INTERSECCIONES X
            // ------------------------------------------------
            //
            // La scanline baja 1 unidad en Y.
            //
            // Entonces:
            //
            //      x += dx/dy
            //
            // Esto evita recalcular:
            //
            //      x = x0 + m(y-y0)
            //
            // haciendo el algoritmo MUCHO más rápido.
            //
            // ------------------------------------------------

            for (const edge of activeEdgeTable) {
                edge.x += edge.invSlope;
            }
        }
    }
}

/**
 * ============================================================
 * EJEMPLO DE USO
 * ============================================================
 */

// Obtener canvas
const canvas = document.getElementById("canvas");

// Contexto 2D
const ctx = canvas.getContext("2d");

// Crear instancia
const scanline = new ScanlineFill(ctx);

// ============================================================
// DEFINIR POLÍGONO
// ============================================================
//
// Puede ser convexo o cóncavo.
//
// ============================================================

const polygon = [
    { x: 100, y: 100 },
    { x: 300, y: 120 },
    { x: 350, y: 250 },
    { x: 250, y: 350 },
    { x: 120, y: 300 }
];

// ============================================================
// DIBUJAR CONTORNO
// ============================================================

ctx.beginPath();

ctx.moveTo(polygon[0].x, polygon[0].y);

for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
}

ctx.closePath();

ctx.strokeStyle = "red";
ctx.lineWidth = 2;
ctx.stroke();

// ============================================================
// APLICAR SCANLINE FILL
// ============================================================

scanline.fill(polygon, "skyblue");

/**
 * ============================================================
 * COMPLEJIDAD TEMPORAL
 * ============================================================
 *
 * Construcción ET:
 *      O(n)
 *
 * Procesamiento scanlines:
 *      Aproximadamente O(h + k)
 *
 * donde:
 *      h = altura del polígono
 *      k = número de intersecciones
 *
 * ============================================================
 * PROBLEMAS CLÁSICOS
 * ============================================================
 *
 * 1. VÉRTICES COMPARTIDOS
 * ------------------------------------------------------------
 * Un vértice puede producir doble conteo.
 *
 * La solución clásica:
 *   incluir ymax excluyente.
 *
 * Por eso usamos:
 *
 *      edge.ymax > y
 *
 * y NO:
 *
 *      edge.ymax >= y
 *
 * ============================================================
 *
 * 2. LÍNEAS HORIZONTALES
 * ------------------------------------------------------------
 * Se ignoran para evitar ambigüedades.
 *
 * ============================================================
 *
 * 3. POLÍGONOS AUTOINTERSECTADOS
 * ------------------------------------------------------------
 * El algoritmo estándar puede producir resultados
 * inesperados.
 *
 * ============================================================
 * USOS REALES
 * ============================================================
 *
 * - Rasterización de polígonos
 * - Motores gráficos
 * - OpenGL clásico
 * - Renderizado 2D
 * - CAD
 * - Videojuegos retro
 *
 * ============================================================
 */
