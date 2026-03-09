/**
 * Servicio de Impresión
 * Maneja la generación de documentos imprimibles (garantías, resúmenes, etc.)
 */

import { formatearMoneda, formatearFecha } from '../utils/formatters.js';

class PrintService {
    /**
     * Calcula el total inicial de una venta (sin equipo recibido)
     */
    calcularTotalInicialVenta(venta) {
        let totalInicial = 0;
        
        if (venta.formaPago === 'mixto' && venta.pagoMixto) {
            // Sumar todos los métodos de pago del mixto
            totalInicial += venta.pagoMixto.efectivo || 0;
            totalInicial += venta.pagoMixto.zelle || 0;
            totalInicial += venta.pagoMixto.binance || 0;
            
            // Para pago móvil y transferencia, usar los dólares
            if (venta.pagoMixto.pagoMovilDetalles) {
                totalInicial += venta.pagoMixto.pagoMovilDetalles.dolares || 0;
            } else {
                totalInicial += venta.pagoMixto.pagoMovil || 0;
            }
            
            if (venta.pagoMixto.transferenciaDetalles) {
                totalInicial += venta.pagoMixto.transferenciaDetalles.dolares || 0;
            } else {
                totalInicial += venta.pagoMixto.transferencia || 0;
            }
        } else {
            // Para pagos simples, el total menos el equipo recibido
            totalInicial = venta.montoTotal ;
        }
        
        return totalInicial + (venta.equipoRecibido ? venta.equipoRecibido.valor : 0);
    }
    
    /**
     * Genera e imprime la garantía de una venta
     */
    imprimirGarantia(venta) {
        const ventanaImpresion = window.open('', '_blank');
        const html = this.generarHTMLGarantia(venta);
        
        ventanaImpresion.document.write(html);
        ventanaImpresion.document.close();
        
        // Imprimir automáticamente después de cargar
        setTimeout(() => {
            ventanaImpresion.print();
        }, 500);
    }
    
    /**
     * Genera el HTML de la garantía
     */
    generarHTMLGarantia(venta) {
        const accesoriosTexto = venta.obtenerResumenAccesorios();
        const modelo = `${venta.equipo.modelo} | ${venta.equipo.almacenamiento} | ${venta.equipo.color} | ${venta.equipo.bateria}%`;
        
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Garantía Equipos Celulares</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <style>
        /* Configuración de impresión */
        @page {
            size: A4;
            margin: 18mm;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        /* Base tipográfica y layout */
        html, body {
            background: #f5f5f5;
        }
        body {
            font-family: "Noto Sans", sans-serif;
            font-optical-sizing: auto;
            font-weight: 400;
            font-style: normal;
            line-height: 1.2;
            margin: 0;
            padding: 0;
        }
        .sheet {
            background: #fff;
        }
        
        /* Encabezado */
        .title-row {
            display: flex;
            flex-direction: column;
            align-items: baseline;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .doc-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.3px;
            text-transform: none;
        }
        .date-block {
            font-size: 15px;
            font-weight: 600;
        }
        .date-line {
            display: inline-block;
            min-width: 20px;
            vertical-align: bottom;
            margin-left: 6px;
        }
        
        /* Figura/Logo simple */
        .figure {
            margin: 0 0 0 5px;
            display: inline-block;
            text-align: center;
            font-weight: 700;
            letter-spacing: 0.8px;
        }
        .figure .line {
            font-size: 18px;
        }
        
        /* Cuerpo del texto */
        .paragraph {
            margin: 0 0 0 0;
            font-size: 13px;
            padding: 1px;
        }
        .bullet {
            margin-left: 4mm;
            text-indent: -4mm;
        }
        .bullet::before {
            content: "•  ";
            font-weight: bold;
            font-size: 15px;
        }
        
        /* Bloque de "Todos nuestros equipos…" */
        .dot-paragraph {
            margin: 0 0 0 0;
            font-size: 13px;
            margin-left: 4mm;
            text-indent: -4mm;
        }
        .paragraph.h {
            margin: 0 0 10px 0;
            font-size: 13px;
        }
        .dot-paragraph::before {
            content: "•  ";
            font-weight: bold;
            font-size: 15px;
        }
        
        /* Nota importante */
        .note {
            font-size: 13px;
            font-weight: 700;
        }
        
        /* Figura inferior con formulario */
        .figure-form {
            margin-left: 10px;
        }
        .form-row {
            display: flex;
            flex-wrap: wrap;
            column-gap: 8mm;
            row-gap: 5px;
        }
        .field {
            min-width: 60mm;
            font-size: 14px;
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
        }
        .field .label {
            display: inline-block;
            min-width: 36mm;
            font-weight: 700;
            flex-shrink: 0;
        }
        .field .line {
            display: inline-block;
            border-bottom: 1px solid #000;
            min-width: 60mm;
            height: auto;
            min-height: 18px;
            vertical-align: bottom;
            word-wrap: break-word;
            word-break: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            max-width: 100%;
        }
        
        /* Campo de accesorios con ancho completo */
        .field.full-width {
            width: 100%;
            min-width: 100%;
        }
        .field.full-width .line {
            flex: 1;
            min-width: auto;
            width: auto;
        }
        
        /* Firma, sello y huella */
        .sign-row {
            display: flex;
            justify-content: space-between;
            align-items: end;
            margin-top: 10px;
            gap: 8mm;
            height: 135px;
        }
        .box {
            flex: 1;
            position: relative;
        }
        .box-label {
            position: absolute;
            top: -6mm;
            left: 6mm;
            background: #fff;
            padding: 0 3mm;
            font-size: 12px;
            font-weight: 700;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 14mm;
            width: 70%;
        }
        .signature-caption {
            font-size: 12px;
            margin-top: 3mm;
            font-weight: 700;
        }
        .fingerprint {
            border: 1px solid #000;
            min-height: 28mm;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.06) 60%, rgba(0,0,0,0.02) 100%);
        }
        
        /* Pie de página */
        .footer {
            border-top: 1px solid #000;
            margin-top: 10px;
            padding-top: 4mm;
            font-size: 12px;
        }
        
        /* Botón de impresión */
        .actions {
            padding: 10px 18mm;
            text-align: right;
        }
        .btn {
            display: inline-block;
            background: #111;
            color: #fff;
            border: none;
            padding: 8px 14px;
            font-size: 14px;
            cursor: pointer;
            border-radius: 4px;
        }
        .btn:active {
            transform: translateY(1px);
        }
        .juntos {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .text-logo {
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>
    <div class="actions no-print">
        <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
    
    <div class="sheet">
        <div class="content" style="position: relative;">
            <!-- Encabezado -->
            <div class="title-row">
                <div class="doc-title">Garantía Equipos Celulares.</div>
                <div class="date-block">
                    Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <span class="date-line"></span>
                </div>
            </div>
            
            <div class="juntos">
                <!-- Cuerpo -->
                <p class="paragraph">
                    Nuestros equipos condición <strong>Like New (usado poco uso)</strong> cuentan con una garantía de 
                    <strong>${venta.equipo.garantia} continuos por tienda</strong> estrictamente desde la fecha. 
                    Dicha garantía no será válida en caso de que el equipo presente mal estado 
                    <strong>(rayones, manchas en la pantalla, rasguños, desgaste en alguna de sus piezas ocasionadas por el cliente, 
                    sulfatación o humedad, indicios de caída, violación a los tornillos de seguridad),</strong> perdiendo la garantía.
                </p>
                
                <!-- Figura superior -->
                <div class="figure" style="right: 79px;">
                    <img src="width_200.webp" alt="logo">
                </div>
            </div>
            
            <p class="paragraph bullet">
                No se cubre garantía por defectos de pantalla ni por defectos causados por que se moje el teléfono. 
                La empresa cubre los <strong>${venta.equipo.garantia}</strong> haciéndose únicamente responsable por equipos 
                que presenten defectos de fábrica y estén dentro del periodo de tiempo establecido, siempre y cuando no se violen 
                las condiciones anteriormente mencionadas, mas no se devolverá dinero; en caso extremo se le hará un cambio de 
                equipo por otro que no presente falla alguna.
            </p>
            
            <p class="paragraph bullet">
                No se cubre garantía por disminución del porcentaje de batería ya que las causas que lo disminuyen va a depender 
                del uso del cliente EJEMPLO: Cargar el teléfono toda la noche, usar un cargador no recomendado, usar el teléfono 
                mientras está cargando. Ya que para nosotros es incierto saber el uso que le da el cliente a su equipo.
            </p>
            
            <p class="paragraph bullet">
                No se cubrirá la garantía si el equipo posee vidrio templado astillado o quebrado. Esto indicaría que dicho 
                equipo sufrió un daño por parte del cliente.
            </p>
            
            <p class="dot-paragraph">
                Todos nuestros equipos son inspeccionados antes de ser entregados al cliente para asegurarnos de que estén en 
                perfectas condiciones tanto físicas como operativas. No obstante, recomendamos que el cliente inspeccione y 
                verifique el funcionamiento del equipo al momento de la entrega, confirmando también la presencia y funcionamiento 
                de todos los accesorios incluidos en la compra.
            </p>
            
            <p class="paragraph bullet">
                Para acceder a la garantía todos los equipos deberán ser enviados dentro de su empaque original y estos no 
                deberán estar en mal estado.
            </p>
            
            <p class="paragraph h">
                Nuestros equipos incluyen Caja Original Apple sin Imei, para dar a entender que el equipo ya fue usado. 
                El imei del equipo iría en la hoja de garantía en caso de poder reportarlo por robo o extravío.
            </p>
            
            <p class="paragraph">
                Dicho documento deberá ser presentado para poder acceder a la garantía, de lo contrario, no se podrá dar la misma.
            </p>
            
            <p class="note">
                NOTA IMPORTANTE: Las Garantías serán atendidas de Lunes a Jueves de 10am a 3pm.
            </p>
            
            <!-- Figura/formulario inferior -->
            <div class="figure-form">
                <div class="text-logo">
                    <div class="form-row">
                        <div class="field">
                            <span class="label">•  Cedula:</span> 
                            <span class="line">${venta.cliente.cedula}</span>
                        </div>
                        <div class="field">
                            <span class="label">•  Nombre y Apellido:</span> 
                            <span class="line">${venta.cliente.nombre}</span>
                        </div>
                        <div class="field">
                            <span class="label">•  Teléfono contacto:</span> 
                            <span class="line">${venta.cliente.telefono}</span>
                        </div>
                    </div>
                    
                    <div class="figure" style="right: 79px;">
                        <img src="width_200.webp" alt="logo">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="field">
                        <span class="label">•  Modelo del equipo:</span> 
                        <span class="line">${modelo}</span>
                    </div>
                    <div class="field">
                        <span class="label">•  Imei:</span> 
                        <span class="line">${venta.equipo.imei || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="field full-width">
                        <span class="label">•  Accesorio:</span> 
                        <span class="line">
                            ${accesoriosTexto.length > 0 ? accesoriosTexto.join(' | ') : 'Sin accesorios'}
                        </span>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="field">
                        <span class="label">•  Precio del Equipo:</span> 
                        <span class="line">${formatearMoneda(venta.montoTotal)}</span>
                    </div>
                    <div class="field">
                        <span class="label">•  Total venta:</span> 
                        <span class="line">${formatearMoneda(venta.montoTotal)}</span>
                    </div>
                </div>
                
                <div class="sign-row">
                    <div class="box">
                        <div class="box-label">· Sello del Establecimiento</div>
                    </div>
                    <div class="box" style="flex:1.2">
                        <div class="signature-line"></div>
                        <div class="signature-caption">Firma del Cliente</div>
                    </div>
                    <div class="box fingerprint" style="flex:0.8">
                        <div class="box-label">Huella del Cliente</div>
                    </div>
                </div>
            </div>
            
            <!-- Pie de página -->
            <div class="footer">
                Instagram: @usaimports.ve &nbsp;&nbsp;&nbsp; Contacto: 0424-3445840
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
                equiposVendidos++;
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
            border: 1px solid #d1d5db;
            padding: 10px;
            margin: 8px 0;
            border-radius: 5px;
            background: #f9fafb;
        }
        
        .venta-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 5px;
            color: #1e40af;
        }
        
        .venta-details {
            font-size: 10px;
            color: #4b5563;
        }
        
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
        
        return `
            <div class="venta-item">
                <div class="venta-header">
                    <span>#${numero} - ${venta.tipoTransaccion === 'abono' ? '💰 ABONO' : '💳 VENTA'} - ${venta.hora}</span>
                    <span>${formatearMoneda(venta.montoTotal)}</span>
                </div>
                <div class="venta-details">
                    ${venta.tipoVenta === 'completa' ? 
                        `<p><strong>📱 Equipo:</strong> ${venta.equipo.modelo} ${venta.equipo.almacenamiento} ${venta.equipo.color}</p>` : 
                        '<p><strong>🛡️ Solo Accesorios</strong></p>'
                    }
                    ${accesorios.length > 0 ? `<p><strong>Accesorios:</strong> ${accesorios.join(', ')}</p>` : ''}
                    <p><strong>Pago:</strong> ${venta.formaPago.toUpperCase()}</p>
                    ${venta.weppa ? `<p style="background: yellow; display: inline-block; padding: 2px 5px; border-radius: 3px;"><strong>WEPPA (Inicial $${this.calcularTotalInicialVenta(venta).toFixed(2)})</strong></p>` : ''}
                </div>
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
                    <span>${movimiento.obtenerTitulo()}</span>
                    <span>${movimiento.hora}</span>
                </div>
                <div class="venta-details">
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
