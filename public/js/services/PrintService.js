/**
 * Servicio de Impresión
 * Maneja la generación de documentos imprimibles (garantías, resúmenes, etc.)
 */

import { formatearMoneda, formatearFecha } from '../utils/formatters.js';
import logoUrl from '/width_200.webp';
class PrintService {
    /**
     * Calcula el total inicial de una venta (sin equipo recibido)
     */
    calcularTotalInicialVenta(venta) {
        let totalPago = 0;

        // Calcular el pago según la forma de pago
        if (venta.formaPago === 'mixto' && venta.pagoMixto) {
            // Sumar todos los métodos de pago del mixto
            totalPago += venta.pagoMixto.efectivo || 0;
            totalPago += venta.pagoMixto.zelle || 0;
            totalPago += venta.pagoMixto.binance || 0;
            totalPago += venta.pagoMixto.pagoMovil || 0;
            totalPago += venta.pagoMixto.transferencia || 0;
        } else if (venta.formaPago === 'pagomovil' && venta.pagoMovilDetalles) {
            // Para pago móvil, usar los dólares
            totalPago = venta.pagoMovilDetalles.dolares || 0;
        } else if (venta.formaPago === 'transferencia' && venta.transferenciaDetalles) {
            // Para transferencia, usar los dólares
            totalPago = venta.transferenciaDetalles.dolares || 0;
        } else if (venta.montoPago !== undefined && venta.montoPago !== null) {
            // Si tiene montoPago guardado (efectivo/zelle/binance con WEPPA)
            totalPago = venta.montoPago;
        } else {
            // Fallback: Si no hay WEPPA, el monto total es el pago
            // Si hay WEPPA pero no tiene montoPago, calcular: Total - suma de TODOS los trade-ins
            if (venta.weppa) {
                const totalRecibidosCalc = (venta.equiposRecibidos && venta.equiposRecibidos.length > 0)
                    ? venta.equiposRecibidos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0)
                    : (venta.equipoRecibido ? (parseFloat(venta.equipoRecibido.valor) || 0) : 0);
                totalPago = venta.montoTotal - totalRecibidosCalc;
            } else {
                totalPago = venta.montoTotal;
            }
        }

        // Agregar suma de TODOS los equipos recibidos al pago para obtener el inicial
        const totalRecibidos = (venta.equiposRecibidos && venta.equiposRecibidos.length > 0)
            ? venta.equiposRecibidos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0)
            : (venta.equipoRecibido ? (parseFloat(venta.equipoRecibido.valor) || 0) : 0);
        return totalPago + totalRecibidos;
    }

    /**
     * Genera e imprime la garantía de una venta.
     * @param {object} venta
     * @param {number} [equipoIdx=0] - índice del equipo vendido. Default 0 (primero).
     *        Permite imprimir 1 garantía por equipo cuando la venta tiene N.
     */
    imprimirGarantia(venta, equipoIdx = 0) {
        const ventanaImpresion = window.open('', '_blank');
        const html = this.generarHTMLGarantia(venta, equipoIdx);

        ventanaImpresion.document.write(html);
        ventanaImpresion.document.close();

        // Imprimir automáticamente después de cargar
        setTimeout(() => {
            ventanaImpresion.print();
        }, 500);
    }


    /**
     * Genera el HTML de la garantía de un equipo específico de la venta.
     * @param {object} venta
     * @param {number} [equipoIdx=0] - índice del equipo vendido dentro de venta.equipos.
     *        Si no se pasa, usa venta.equipos[0] o el singular venta.equipo (compat).
     * @param {string} [logoBase64=''] - Logo en Base64 para embeber en el HTML.
     */
    generarHTMLGarantia(venta, equipoIdx = 0, logoBase64 = '') {
        const accesoriosTexto = venta.obtenerResumenAccesorios();

        // Resolver el equipo específico para esta garantía.
        // Si la venta tiene N equipos, elegir el del índice; si no, fallback al singular.
        let equipo;
        if (venta.equipos && venta.equipos.length > 0) {
            equipo = venta.equipos[equipoIdx] || venta.equipos[0];
        } else {
            equipo = venta.equipo;
        }

        // Precio del equipo (si está disponible); si no, usar el total de la venta
        const precioEquipo = (equipo && equipo.precio != null && equipo.precio !== '')
            ? equipo.precio
            : venta.montoTotal;

        // Si la venta tiene N equipos, indicarlo en el documento
        const totalEquipos = (venta.equipos && venta.equipos.length > 0)
            ? venta.equipos.length
            : 1;
        const subtituloEquipo = totalEquipos > 1
            ? ` <span style="font-size:13px;font-weight:600;color:#1e40af;">(Equipo ${equipoIdx + 1} de ${totalEquipos})</span>`
            : '';

        const modelo = `${equipo.modelo} | ${equipo.almacenamiento} | ${equipo.color} | ${equipo.bateria}`;

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Garantía Equipos Celulares</title>
    <base href="${window.location.origin}/">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 13mm 16mm 13mm 16mm; }
        @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        html, body { background: #f5f5f5; }
        body {
            font-family: "Noto Sans", sans-serif;
            font-optical-sizing: auto;
            font-weight: 400;
            font-style: normal;
            line-height: 1.25;
            margin: 0; padding: 0;
            font-size: 11.8px;
            color: #111;
        }
        .sheet { background: #fff; }

        /* ── TÍTULO DEL DOCUMENTO ── */
        .doc-title {
            font-size: 13px;
            font-weight: 400;
            margin: 0 0 3px 0;
        }

        /* ── FILA: "Fecha ___" izquierda + logo derecha ── */
        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
        }
        .fecha-block {
            font-size: 14px;
            font-weight: 800;
            line-height: 1.4;
        }
        .fecha-value {
            display: inline-block;
            border-bottom: 1px solid #000;
            min-width: 55mm;
            margin-left: 4px;
            vertical-align: bottom;
        }
        .logo-block img { height: 62px; width: auto; }

        /* ── INTRO: texto izquierda + logo derecha ── */
        .intro-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 3px;
        }
        .intro-text {
            flex: 1;
            font-size: 11.8px;
            margin: 0;
            line-height: 1.3;
        }

        /* ── PÁRRAFOS Y BULLETS ── */
        .paragraph { margin: 0; font-size: 11.8px; padding: 1px 0; line-height: 1.3; }
        .bullet {
            margin: 2px 0 2px 4mm;
            text-indent: -4mm;
            font-size: 11.8px;
            line-height: 1.28;
        }
        .bullet::before { content: "•  "; font-weight: bold; font-size: 13px; }
        .dot-paragraph {
            margin: 2px 0 2px 4mm;
            text-indent: -4mm;
            font-size: 11.8px;
            line-height: 1.28;
        }
        .dot-paragraph::before { content: "•  "; font-weight: bold; font-size: 13px; }
        .note { font-size: 11.8px; font-weight: 400; margin: 3px 0; }
        .note strong { font-weight: 700; }

        /* ── TABLA DE CHECKBOXES ── */
        .check-table {
            border-collapse: collapse;
            width: 55%;
            margin: 6px 0 4px 0;
        }
        .check-table td {
            font-size: 12px;
            padding: 2px 6px 2px 0;
            vertical-align: middle;
            white-space: nowrap;
        }
        .check-box {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1px solid #000;
            vertical-align: middle;
            margin-left: 4px;
        }
        .check-label { font-weight: 400; }
        .check-label-color { color: #c0392b; font-style: italic; font-weight: 400; }

        /* ── SECCIÓN FORMULARIO ── */
        .form-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            margin-top: 4px;
        }
        .form-fields { flex: 1; }
        .field-row {
            display: flex;
            align-items: baseline;
            margin: 2px 0;
            font-size: 12px;
        }
        .field-label {
            font-weight: 700;
            white-space: nowrap;
            margin-right: 3px;
        }
        .field-underline {
            display: inline-block;
            border-bottom: 1px solid #000;
            min-width: 45mm;
            min-height: 15px;
            flex: 1;
            word-break: break-word;
            overflow-wrap: break-word;
            font-size: 11.5px;
        }
        .field-gap { margin-top: 5px; }

        /* ── BLOQUE CONTACTO (azul oscuro) ── */
        .contact-block {
            background-color: #1a2e5c;
            color: #fff;
            border-radius: 3px;
            padding: 7px 10px;
            font-size: 11.5px;
            font-weight: 700;
            line-height: 1.7;
            white-space: nowrap;
        }
        .contact-block .contact-line { display: block; }

        /* ── SECCIÓN DE FIRMAS ── */
        .sign-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 10px;
            gap: 8mm;
        }
        .sign-box { flex: 1; display: flex; flex-direction: column; align-items: center; }
        .sign-box-inner { width: 100%; height: 26mm; border: 1px solid #000; box-sizing: border-box; }
        .sign-caption {
            font-size: 11.5px;
            font-weight: 700;
            text-decoration: underline;
            margin-top: 3px;
            text-align: center;
            font-style: italic;
        }

        /* ── BOTÓN ── */
        .actions { padding: 10px 18mm; text-align: right; }
        .btn { display: inline-block; background: #111; color: #fff; border: none; padding: 8px 14px; font-size: 14px; cursor: pointer; border-radius: 4px; }
        .btn:active { transform: translateY(1px); }
    </style>
</head>
<body>
    <div class="actions no-print">
        <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>

    <div class="sheet">
        <div class="content">

            <!-- ── TÍTULO ── -->
            <div class="doc-title">Garantía Equipos Celulares.</div>

            <!-- ── FECHA + LOGO ── -->
            <div class="header-row">
                <div class="fecha-block">
                    Fecha&nbsp;<span class="fecha-value">${new Date().toLocaleDateString('es-ES')}</span>
                </div>
                <div class="logo-block">
                    <img src="${logoUrl}" alt="USA IMPORT logo">
                </div>
            </div>

            <!-- ── INTRO: texto a ancho completo ── -->
            <p class="intro-text" style="margin-bottom:3px;">
                Nuestros equipos condición <strong><u>Like New (usado poco uso)</u></strong> cuentan con una
                garantía de <strong><span style="display:inline-block;border-bottom:1px solid #000;min-width:18mm;vertical-align:bottom;">${equipo.garantia}</span> días continuos por tienda</strong> estrictamente desde la fecha.
                Dicha garantía no será válida en caso de que el equipo presente mal estado
                <strong>(rayones, manchas en la pantalla, rasguños, desgaste en alguna de sus piezas ocasionadas por el cliente,
                sulfatación o humedad, indicios de caída, violación a los tornillos de seguridad),</strong> perdiendo la garantía.
            </p>

            <!-- ── BULLETS ── -->
            <p class="paragraph" style="margin-bottom:2px;">
                No se cubre garantía por defectos de pantalla ni por defectos causados por que se moje el teléfono.
                La empresa cubre los <u>${equipo.garantia}</u> días haciéndose únicamente responsable por equipos
                que presenten defectos de fábrica y estén dentro del periodo de tiempo establecido, siempre y cuando no se
                violen las condiciones anteriormente mencionadas mas no se devolverá el dinero; en caso extremo se le hará
                un cambio de equipo por otro que no presente falla alguna.
            </p>

            <p class="bullet">
                No se cubre garantía por disminución del porcentaje de batería ya que las causas que lo disminuyen <u>va</u>
                a depender del uso del cliente <strong>EJEMPLO:</strong> Cargar el teléfono toda la noche, usar un cargador no
                recomendado, usar el teléfono mientras <u><strong>esta</strong></u> cargando. Ya que para nosotros es incierto saber el uso
                que le da el cliente a su equipo.
            </p>

            <p class="bullet">
                No se cubrirá la garantía si el equipo posee vidrio templado astillado o quebrado. Esto indicaría que
                dicho equipo sufrió un daño por parte del cliente.
            </p>

            <p class="dot-paragraph" style="font-weight:700; text-decoration:underline;">
                Todos nuestros equipos son inspeccionados antes de ser entregados al cliente para asegurarnos
                de que estén en perfectas condiciones tanto físicas como operativas. No obstante,
                recomendamos que el cliente inspeccione y verifique el funcionamiento del equipo al momento
                de la entrega, confirmando también la presencia y funcionamiento de todos los accesorios
                incluidos en la compra.
            </p>

            <p class="bullet">
                Para acceder a la garantía todos los equipos deberán ser enviados dentro de su empaque original y
                estos no deberán estar en mal estado.
            </p>

            <p class="bullet">
                Nuestros equipos incluyen Caja Original Apple <strong>sin Imei</strong>, para dar a entender que el equipo ya fue
                usado. El <u>imei</u> del equipo iría en la hoja de garantía en caso de poder reportarlo por robo o extravío.
            </p>

            <p class="paragraph" style="margin: 3px 0;">
                Dicho documento deberá ser presentado para poder acceder a la garantía, de lo contrario, no se podrá dar la misma.
            </p>

            <p class="note">
                NOTA <strong><u>IMPORTANTE</u></strong> : Las Garantías serán atendidas de Lunes a Jueves de 10Am a 3pm.
            </p>

            <!-- ── TABLA DE CHECKBOXES ── -->
            <table class="check-table">
                <tr>
                    <td><span class="check-label">True Tone</span><span class="check-box"></span></td>
                    <td style="padding-left:12px;"><span class="check-label">Auricular</span><span class="check-box"></span></td>
                </tr>
                <tr>
                    <td><span class="check-label-color">Face ID</span><span class="check-box"></span></td>
                    <td style="padding-left:12px;"><span class="check-label-color">Micrófono</span><span class="check-box"></span></td>
                </tr>
                <tr>
                    <td><span class="check-label">Botones</span><span class="check-box"></span></td>
                    <td style="padding-left:12px;"><span class="check-label">Señal</span><span class="check-box"></span></td>
                </tr>
            </table>

            <!-- ── FORMULARIO: campos izquierda + logo + contacto derecha ── -->
            <div class="form-section">
                <div class="form-fields">
                    <div class="field-row">
                        <span class="field-label">•&nbsp;Cedula:</span>
                        <span class="field-underline">${venta.cliente.cedula}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">•&nbsp;Nombre y <u>Apellido</u>:</span>
                        <span class="field-underline">${venta.cliente.nombre}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">•&nbsp;Teléfono contacto:</span>
                        <span class="field-underline">${venta.cliente.telefono}</span>
                    </div>
                    <div class="field-row field-gap">
                        <span class="field-label">•&nbsp;Modelo del equipo:</span>
                        <span class="field-underline">${modelo}${subtituloEquipo}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">•&nbsp;Accesorio:</span>
                        <span class="field-underline">${accesoriosTexto.length > 0 ? accesoriosTexto.join(' | ') : ''}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">•&nbsp;<u>Imei</u>:</span>
                        <span class="field-underline">${equipo.imei || ''}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">•&nbsp;Precio del <u>Equipo</u>:</span>
                        <span class="field-underline">${formatearMoneda(precioEquipo)}</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">•&nbsp;<strong>Total venta</strong>:</span>
                        <span class="field-underline">${formatearMoneda(venta.montoTotal)}</span>
                    </div>
                </div>

                <!-- Logo + bloque contacto -->
                <div style="display:flex; flex-direction:column; align-items:center; gap:6px; padding-top:2px;">
                    <div class="logo-block">
                        <img src="${logoUrl}" alt="USA IMPORT logo">
                    </div>
                    <div class="contact-block">
                        <span class="contact-line">Contacto: 0412-4864028</span>
                        <span class="contact-line">Instagram: @usaimports.ve</span>
                    </div>
                </div>
            </div>

            <!-- ── FIRMAS ── -->
            <div class="sign-section">
                <div class="sign-box">
                    <div class="sign-box-inner"></div>
                    <div class="sign-caption">Sello del Establecimiento</div>
                </div>
                <div class="sign-box">
                    <div class="sign-box-inner"></div>
                    <div class="sign-caption">Firma del Cliente</div>
                </div>
                <div class="sign-box">
                    <div class="sign-box-inner"></div>
                    <div class="sign-caption">Huella del Cliente</div>
                </div>
            </div>

        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Genera e imprime el resumen del día
     */
    imprimirResumenDia(ventas, movimientos, caja) {
        const ventanaImpresion = window.open('', '_blank');
        const html = this.generarHTMLResumen(ventas, movimientos, caja);

        ventanaImpresion.document.write(html);
        ventanaImpresion.document.close();

        setTimeout(() => {
            ventanaImpresion.print();
        }, 500);
    }

    /**
     * Genera el HTML del resumen del día
     */
    generarHTMLResumen(ventas, movimientos, caja) {
        const desglose = caja.obtenerDesglose(ventas, movimientos);

        let totalVentas = 0;
        let equiposVendidos = 0;

        ventas.forEach(venta => {
            if (venta.tipoTransaccion !== 'abono') {
                totalVentas += venta.montoTotal;
            }
            if (venta.tipoVenta === 'completa' && venta.tipoTransaccion !== 'abono') {
                // Contar equipos REALES vendidos (soporte multi-equipo: 1 venta puede tener N equipos)
                equiposVendidos += (venta.equipos && venta.equipos.length) || (venta.equipo ? 1 : 0);
            }
        });

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Resumen del Día - ${new Date().toLocaleDateString('es-ES')}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 15px;
            font-size: 11px;
            line-height: 1.3;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 10px;
        }
        
        .header h1 {
            margin: 0;
            color: #1e40af;
            font-size: 22px;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        
        .card {
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid;
        }
        
        .card-green {
            background: #d1fae5;
            border-color: #10b981;
        }
        
        .card-blue {
            background: #dbeafe;
            border-color: #3b82f6;
        }
        
        .card-purple {
            background: #e9d5ff;
            border-color: #a855f7;
        }
        
        .card-value {
            font-size: 24px;
            font-weight: bold;
            margin: 5px 0;
        }
        
        .card-label {
            font-size: 12px;
            color: #374151;
        }
        
        .section {
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        .section-title {
            background: #1e40af;
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .venta-item {
            border: 1px solid #e5e7eb;
            margin: 15px 0;
            border-radius: 8px;
            background: #ffffff;
            page-break-inside: avoid;
        }
        .venta-item.abono {
            border-color: #fbd38d;
            background-color: #fffaf0;
        }
        .venta-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding: 10px 15px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 12px;
            color: #1f2937;
        }
        .venta-header-title { display: flex; flex-direction: column; }
        .weppa-badge { background: #fef08a; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #854d0e; margin-left: 8px; font-weight: bold; }
        .venta-cliente { font-size: 10px; color: #4b5563; font-weight: normal; margin-top: 4px; }
        .venta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 12px 15px;
        }
        .venta-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
        .venta-box { padding: 10px; border-radius: 6px; font-size: 10px; }
        .venta-box h5 { margin: 0 0 8px 0; font-size: 11px; }
        .box-blue { background: #eff6ff; } .box-blue h5 { color: #1e40af; }
        .box-green { background: #f0fdf4; } .box-green h5 { color: #166534; }
        .box-orange { background: #fff7ed; } .box-orange h5 { color: #9a3412; }
        .box-purple { background: #faf5ff; } .box-purple h5 { color: #6b21a8; }
        .venta-box p { margin: 4px 0; color: #374151; }
        .pago-tag { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 3px; }
        .total-pago { margin-top: 8px !important; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); font-weight: bold; font-size: 11px; }
        .nota-box { margin: 0 15px 15px 15px; padding: 8px 12px; background: #f3e8ff; border-radius: 4px; font-size: 10px; color: #581c87; }

        /* Lista de N equipos vendidos / recibidos (multi-equipo) */
        .equipo-lista { margin: 0; padding: 0; list-style: none; }
        .equipo-lista-item {
            padding: 6px 8px;
            margin-bottom: 4px;
            background: rgba(255,255,255,0.55);
            border-left: 3px solid #1e40af;
            border-radius: 3px;
            font-size: 10px;
            line-height: 1.4;
        }
        .equipo-lista-item .eq-num {
            display: inline-block;
            background: #1e40af;
            color: white;
            font-weight: bold;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            text-align: center;
            line-height: 16px;
            font-size: 9px;
            margin-right: 6px;
        }
        .equipo-lista-item .eq-precio {
            color: #047857;
            font-weight: bold;
            margin-left: 4px;
        }
        .equipo-lista-item .eq-dato { color: #374151; }
        .equipo-lista-item .eq-dato strong { color: #1f2937; }
        .equipo-lista-vacio { font-size: 10px; color: #6b7280; font-style: italic; }
        
        .totales-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
        }
        
        .totales-table td {
            padding: 8px;
            border-bottom: 1px solid #d1d5db;
        }
        
        .totales-table .label {
            font-weight: bold;
            width: 60%;
        }
        
        .totales-table .value {
            text-align: right;
            font-size: 13px;
        }
        
        .total-final {
            background: #10b981;
            color: white;
            font-size: 16px;
            font-weight: bold;
        }
        
        .btn {
            background: #1e40af;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .actions {
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="actions no-print">
        <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    </div>
    
    <div class="header">
        <h1>📊 RESUMEN DE VENTAS DIARIO</h1>
        <p>${formatearFecha(new Date())}</p>
    </div>
    
    <div class="summary-cards">
        <div class="card card-green">
            <div class="card-label">💰 Total del Día</div>
            <div class="card-value">${formatearMoneda(totalVentas)}</div>
        </div>
        <div class="card card-blue">
            <div class="card-label">📱 Equipos Vendidos</div>
            <div class="card-value">${equiposVendidos}</div>
        </div>
        <div class="card card-purple">
            <div class="card-label">🏦 Caja Final</div>
            <div class="card-value">${formatearMoneda(desglose.cajaFinal)}</div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">📱 VENTAS DEL DÍA (${ventas.length})</div>
        ${ventas.length === 0 ? '<p style="text-align: center; color: #6b7280;">No hay ventas registradas</p>' :
                ventas.map((venta, index) => this.generarItemVenta(venta, index + 1)).join('')
            }
    </div>
    
    <div class="section">
        <div class="section-title">📦 MOVIMIENTOS DEL DÍA (${movimientos.length})</div>
        ${movimientos.length === 0 ? '<p style="text-align: center; color: #6b7280;">No hay movimientos registrados</p>' :
                movimientos.map(mov => this.generarItemMovimiento(mov)).join('')
            }
    </div>
    
    <div class="section">
        <div class="section-title">💰 RESUMEN FINANCIERO</div>
        <table class="totales-table">
            <tr>
                <td class="label">🏦 Caja Inicial:</td>
                <td class="value">${formatearMoneda(desglose.cajaInicial)}</td>
            </tr>
            <tr>
                <td class="label">💵 Efectivo de Ventas:</td>
                <td class="value">${formatearMoneda(desglose.efectivoVentas)}</td>
            </tr>
            <tr>
                <td class="label">➕ Ingresos de Efectivo:</td>
                <td class="value">${formatearMoneda(desglose.ingresosEfectivo)}</td>
            </tr>
            <tr>
                <td class="label">➖ Salidas de Efectivo:</td>
                <td class="value">-${formatearMoneda(desglose.salidasEfectivo)}</td>
            </tr>
            <tr>
                <td class="label">➖ Compras de Equipos:</td>
                <td class="value">-${formatearMoneda(desglose.comprasEquipos)}</td>
            </tr>
            <tr class="total-final">
                <td class="label">🏦 CAJA FINAL:</td>
                <td class="value">${formatearMoneda(desglose.cajaFinal)}</td>
            </tr>
        </table>
    </div>
    
    <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #6b7280;">
        <p>Documento generado el ${new Date().toLocaleString('es-ES')}</p>
    </div>
</body>
</html>
        `;
    }

    /**
 * Genera el HTML de un item de venta
 */
    generarItemVenta(venta, numero) {
        const accesorios = venta.obtenerResumenAccesorios();

        const formatearBs = (monto) => {
            const numeroStr = typeof monto === 'string' ? parseFloat(monto) : monto;
            if (isNaN(numeroStr)) return monto + ' Bs';
            return numeroStr.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Bs';
        };

        // Calcular HTML del WEPPA
        let weppaHtml = '';
        if (venta.weppa) {
            weppaHtml = `<span class="weppa-badge">WEPPA (Inicial $${this.calcularTotalInicialVenta(venta).toFixed(2)})</span>`;
        }

        // Construir secciones solo si hay datos
        let seccionEquipo = '';
        let seccionAccesorios = '';
        let seccionEquipoRecibido = '';
        let seccionPago = '';

        // Sección Equipo(s) — soporta multi-equipo
        if (venta.tipoVenta === 'completa') {
            const equipos = (venta.equipos && venta.equipos.length > 0)
                ? venta.equipos
                : (venta.equipo ? [venta.equipo] : []);

            if (equipos.length === 0) {
                seccionEquipo = `
                    <div class="venta-box box-blue">
                        <h5>📱 Equipo</h5>
                        <p class="equipo-lista-vacio">Sin equipo registrado</p>
                    </div>
                `;
            } else if (equipos.length === 1) {
                // Formato compacto (compat con layout 3/4 columnas)
                const eq = equipos[0];
                seccionEquipo = `
                    <div class="venta-box box-blue">
                        <h5>📱 Equipo</h5>
                        <p><strong>Modelo:</strong> ${eq.modelo || '—'}</p>
                        <p><strong>Cap:</strong> ${eq.almacenamiento || '—'}</p>
                        <p><strong>Color:</strong> ${eq.color || '—'}</p>
                        <p><strong>Bat:</strong> ${eq.bateria || '—'}</p>
                        <p><strong>IMEI:</strong> ${eq.imei || '—'}</p>
                        <p><strong>Precio:</strong> ${formatearMoneda(eq.precio || 0)}</p>
                    </div>
                `;
            } else {
                // N equipos → lista numerada dentro de la misma caja
                seccionEquipo = `
                    <div class="venta-box box-blue">
                        <h5>📱 Equipos Vendidos (${equipos.length})</h5>
                        <ul class="equipo-lista">
                            ${equipos.map((eq, idx) => `
                                <li class="equipo-lista-item">
                                    <span class="eq-num">${idx + 1}</span>
                                    <span class="eq-dato"><strong>${eq.modelo || '—'}</strong> ${eq.almacenamiento || ''} — ${eq.color || '—'}</span><br>
                                    <span class="eq-dato" style="margin-left:22px">🔋 ${eq.bateria || '—'} | IMEI: <span style="font-family:monospace">${eq.imei || '—'}</span></span>
                                    <span class="eq-precio">${formatearMoneda(eq.precio || 0)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        // Sección Accesorios
        if (accesorios.length > 0) {
            seccionAccesorios = `
                <div class="venta-box box-green">
                    <h5>🛡️ Accesorios</h5>
                    ${accesorios.map(acc => `<p>• ${acc}</p>`).join('')}
                </div>
            `;
        }

        // Sección Equipo(s) Recibido(s) — soporta multi-trade-in
        const recibidos = (venta.equiposRecibidos && venta.equiposRecibidos.length > 0)
            ? venta.equiposRecibidos
            : (venta.equipoRecibido ? [venta.equipoRecibido] : []);

        if (recibidos.length === 1) {
            const r = recibidos[0];
            seccionEquipoRecibido = `
                <div class="venta-box box-orange">
                    <h5>📱⬅️ Eq. Recibido</h5>
                    <p><strong>Mod:</strong> ${r.modelo || '—'}</p>
                    <p><strong>Cap:</strong> ${r.capacidad || '—'}</p>
                    <p><strong>Color:</strong> ${r.color || '—'}</p>
                    <p><strong>Bat:</strong> ${r.bateria || '—'}</p>
                    <p><strong>IMEI:</strong> ${r.imei || 'N/A'}</p>
                    <p><strong>Valor:</strong> ${formatearMoneda(r.valor || 0)}</p>
                </div>
            `;
        } else if (recibidos.length > 1) {
            const totalRecibido = recibidos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
            seccionEquipoRecibido = `
                <div class="venta-box box-orange">
                    <h5>📱⬅️ Equipos Recibidos (${recibidos.length}) — ${formatearMoneda(totalRecibido)}</h5>
                    <ul class="equipo-lista">
                        ${recibidos.map((r, idx) => `
                            <li class="equipo-lista-item">
                                <span class="eq-num">${idx + 1}</span>
                                <span class="eq-dato"><strong>${r.modelo || '—'}</strong> ${r.capacidad || ''} — ${r.color || '—'}</span><br>
                                <span class="eq-dato" style="margin-left:22px">🔋 ${r.bateria || '—'} | IMEI: <span style="font-family:monospace">${r.imei || 'N/A'}</span></span>
                                <span class="eq-precio">${formatearMoneda(r.valor || 0)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        // Sección Pago
        let detallesPago = [];
        if (venta.formaPago === 'mixto' && venta.pagoMixto) {
            if (venta.pagoMixto.efectivo > 0) {
                detallesPago.push(`<span class="pago-tag">Efectivo: ${formatearMoneda(venta.pagoMixto.efectivo)}</span>`);
            }
            if (venta.pagoMixto.zelle > 0) {
                detallesPago.push(`<span class="pago-tag">Zelle: ${formatearMoneda(venta.pagoMixto.zelle)}</span>`);
            }
            if (venta.pagoMixto.binance > 0) {
                detallesPago.push(`<span class="pago-tag">Binance: ${formatearMoneda(venta.pagoMixto.binance)}</span>`);
            }
            if (venta.pagoMixto.pagoMovil > 0) {
                if (venta.pagoMixto.pagoMovilDetalles) {
                    detallesPago.push(`<span class="pago-tag">Pago Movil: ${formatearMoneda(venta.pagoMixto.pagoMovilDetalles.dolares)} = ${formatearBs(venta.pagoMixto.pagoMovilDetalles.bolivares)} (${venta.pagoMixto.pagoMovilDetalles.tasa})</span>`);
                } else {
                    detallesPago.push(`<span class="pago-tag">Pago Movil: ${formatearMoneda(venta.pagoMixto.pagoMovil)}</span>`);
                }
            }
            if (venta.pagoMixto.transferencia > 0) {
                if (venta.pagoMixto.transferenciaDetalles) {
                    detallesPago.push(`<span class="pago-tag">Transferencia: ${formatearMoneda(venta.pagoMixto.transferenciaDetalles.dolares)} = ${formatearBs(venta.pagoMixto.transferenciaDetalles.bolivares)} (${venta.pagoMixto.transferenciaDetalles.tasa})</span>`);
                } else {
                    detallesPago.push(`<span class="pago-tag">Transferencia: ${formatearMoneda(venta.pagoMixto.transferencia)}</span>`);
                }
            }
        } else if (venta.formaPago === 'pagomovil' && venta.pagoMovilDetalles) {
            detallesPago.push(`<span class="pago-tag">Pago Movil: ${formatearMoneda(venta.pagoMovilDetalles.dolares)} = ${formatearBs(venta.pagoMovilDetalles.bolivares)} (${venta.pagoMovilDetalles.tasa})</span>`);
        } else if (venta.formaPago === 'transferencia' && venta.transferenciaDetalles) {
            detallesPago.push(`<span class="pago-tag">Transferencia: ${formatearMoneda(venta.transferenciaDetalles.dolares)} = ${formatearBs(venta.transferenciaDetalles.bolivares)} (${venta.transferenciaDetalles.tasa})</span>`);
        } else {
            // pagoReal = montoTotal - suma de TODOS los trade-ins - abonos previos
            const totalRecibidosCalc = recibidos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
            const pagoReal = (venta.montoPago !== null && venta.montoPago !== undefined)
                ? venta.montoPago
                : (venta.montoTotal - totalRecibidosCalc - (venta.totalAbonosPrevios || 0));
            detallesPago.push(`<span class="pago-tag">${venta.formaPago.toUpperCase()}: ${formatearMoneda(pagoReal)}</span>`);
        }

        if (recibidos.length > 0) {
            if (recibidos.length === 1) {
                detallesPago.push(`<span class="pago-tag">Equipo Recibido: ${recibidos[0].modelo} (${formatearMoneda(recibidos[0].valor)})</span>`);
            } else {
                const totalRecibido = recibidos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
                detallesPago.push(`<span class="pago-tag">Equipos Recibidos (${recibidos.length}): ${formatearMoneda(totalRecibido)}</span>`);
            }
        }

        if (venta.abonosPrevios && venta.abonosPrevios.length > 0) {
            venta.abonosPrevios.forEach(ab => {
                const fechaText = ab.fecha ? ` (${ab.fecha})` : '';
                detallesPago.push(`<span class="pago-tag" style="background:#dcfce7;color:#166534">Abono Precargado${fechaText}: ${formatearMoneda(ab.monto)}</span>`);
            });
        }

        seccionPago = `
            <div class="venta-box box-purple">
                <h5>💳 Pago</h5>
                ${detallesPago.map(d => `<p>${d}</p>`).join('')}
                <p class="total-pago">Total: ${formatearMoneda(venta.montoTotal)}</p>
            </div>
        `;

        const esAbono = venta.tipoTransaccion === 'abono';

        return `
            <div class="venta-item ${esAbono ? 'abono' : ''}">
                <div class="venta-header">
                    <div class="venta-header-title">
                        <div>
                            <span>#${numero} - ${esAbono ? '💰 ABONO' : '💳 VENTA'}</span>
                            ${weppaHtml}
                        </div>
                        <span class="venta-cliente">${venta.tipoVenta === 'completa' ? `${venta.cliente.nombre} (${venta.cliente.cedula})` : 'Solo Accesorios'}</span>
                    </div>
                    <span>${venta.hora}</span>
                </div>
                
                <div class="venta-grid ${recibidos.length > 0 ? 'cols-4' : ''}">
                    ${seccionEquipo}
                    ${seccionAccesorios}
                    ${seccionEquipoRecibido}
                    ${seccionPago}
                </div>
                
                ${venta.notaVentaDetalles ? `
                    <div class="nota-box">
                        <strong>📝 Nota:</strong> ${venta.notaVentaDetalles}
                    </div>
                ` : ''}
            </div>
        `;
    }
    /**
     * Genera el HTML de un item de movimiento
     */
    generarItemMovimiento(movimiento) {
        return `
            <div class="venta-item">
                <div class="venta-header">
                    <div class="venta-header-title">
                        <span>📦 ${movimiento.obtenerTitulo()}</span>
                    </div>
                    <span>${movimiento.hora}</span>
                </div>
                <div style="padding: 15px; font-size: 11px; color: #374151;">
                    <p>${movimiento.obtenerDetalles()}</p>
                </div>
            </div>
        `;
    }

    /**
     * Genera e imprime la garantía de un cambio por garantía
     */
    imprimirGarantiaCambio(cambio) {
        const contenido = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Garantía - Cambio de Equipo</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 20px auto;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .section {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 18px;
                        margin-bottom: 10px;
                        color: #333;
                    }
                    .info-row {
                        display: flex;
                        margin: 8px 0;
                    }
                    .info-label {
                        font-weight: bold;
                        width: 150px;
                    }
                    .defectuoso {
                        background-color: #fee;
                    }
                    .nuevo {
                        background-color: #efe;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🔄 GARANTÍA - CAMBIO DE EQUIPO</h1>
                    <p>Fecha: ${cambio.fecha} | Hora: ${cambio.hora}</p>
                </div>
                
                <div class="section">
                    <div class="section-title">👤 Datos del Cliente</div>
                    <div class="info-row">
                        <span class="info-label">Nombre:</span>
                        <span>${cambio.cliente.nombre}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Cédula:</span>
                        <span>${cambio.cliente.cedula}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Teléfono:</span>
                        <span>${cambio.cliente.telefono}</span>
                    </div>
                </div>
                
                <div class="section defectuoso">
                    <div class="section-title">📱❌ Equipo Defectuoso (Recibido)</div>
                    <div class="info-row">
                        <span class="info-label">Modelo:</span>
                        <span>${cambio.equipoDefectuoso.modelo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Color:</span>
                        <span>${cambio.equipoDefectuoso.color}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Capacidad:</span>
                        <span>${cambio.equipoDefectuoso.capacidad}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Batería:</span>
                        <span>${cambio.equipoDefectuoso.bateria}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">IMEI:</span>
                        <span>${cambio.equipoDefectuoso.imei}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Problema:</span>
                        <span>${cambio.equipoDefectuoso.problema}</span>
                    </div>
                </div>
                
                <div class="section nuevo">
                    <div class="section-title">📱✅ Equipo Nuevo (Entregado)</div>
                    <div class="info-row">
                        <span class="info-label">Modelo:</span>
                        <span>${cambio.equipoNuevo.modelo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Color:</span>
                        <span>${cambio.equipoNuevo.color}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Capacidad:</span>
                        <span>${cambio.equipoNuevo.capacidad}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">IMEI:</span>
                        <span>${cambio.equipoNuevo.imei}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Batería:</span>
                        <span>${cambio.equipoNuevo.bateria}</span>
                    </div>
                </div>
                
                ${cambio.diferencia && cambio.diferencia.tipo !== 'ninguna' ? `
                    <div class="section" style="background-color: #fef3c7; border-color: #fbbf24;">
                        <div class="section-title">💵 Diferencia de Precio</div>
                        <div class="info-row">
                            <span class="info-label">Tipo:</span>
                            <span>${cambio.diferencia.tipo === 'favor-cliente' ? 'A favor del cliente (devuelto)' : 'A favor de la tienda (cobrado)'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Monto:</span>
                            <span>$${cambio.diferencia.monto.toFixed(2)}</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="footer">
                    <p><strong>CONDICIONES DE GARANTÍA</strong></p>
                    <p>Este equipo cuenta con garantía según los términos establecidos.</p>
                    <p>Conserve este documento como comprobante del cambio.</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        const ventana = window.open('', '_blank');
        ventana.document.write(contenido);
        ventana.document.close();
    }
}

// Exportar una instancia única (Singleton)
export const printService = new PrintService();
