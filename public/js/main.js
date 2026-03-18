/**
 * Archivo principal de la aplicación
 * Orquesta la inicialización y coordinación de todos los módulos
 */
import { CambioGarantia } from './models/CambioGarantia.js';
import { Movimiento } from './models/Movimiento.js';
import { ventaService } from './services/VentaService.js';
import { movimientoService } from './services/MovimientoService.js';
import { storageService } from './services/StorageService.js';
import { printService } from './services/PrintService.js';
import { Caja } from './models/Caja.js';
import { 
    MODELOS_IPHONE, 
    COLORES_IPHONE, 
    CAPACIDADES_IPHONE, 
    GARANTIAS,
    FORMAS_PAGO 
} from './config/constants.js';
import { llenarSelect, mostrarAlerta, confirmar } from './utils/domHelpers.js';
import { formatearMoneda, formatearFecha } from './utils/formatters.js';

class App {
    constructor() {
        this.cajaActual = null;
        this.ventaEnEdicion = null;
        this.init();
    }
    
    /**
     * Inicializa la aplicación
     */
    init() {
        console.log('🚀 Iniciando aplicación...');
        
        // Cargar datos iniciales
        this.cargarDatosIniciales();
        
        // Inicializar componentes
        this.inicializarSelectores();
        this.inicializarEventos();
        this.actualizarUI();
        
        console.log('✅ Aplicación iniciada correctamente');
    }
    
    /**
     * Carga los datos iniciales desde el storage
     */
    /* cargarDatosIniciales() {
        this.cajaActual = storageService.obtenerCajaInicial();
        
        // Mostrar caja inicial si existe
        if (this.cajaActual.cajaInicial > 0) {
            document.getElementById('cajaInicial').value = this.cajaActual.cajaInicial;
            document.getElementById('cajaInicialMostrar').textContent = this.cajaActual.cajaInicial.toFixed(2);
            document.getElementById('cajaInicialConfirmacion').classList.remove('hidden');
        }
    } */
    cargarDatosIniciales() {
    this.cajaActual = storageService.obtenerCajaInicial();
    const hoy = new Date().toLocaleDateString('es-ES');

    if (this.cajaActual.cajaInicial > 0 && this.cajaActual.fecha === hoy) {
        // ✅ Ya se configuró la caja HOY → mostrar normalmente
        document.getElementById('cajaInicial').value = this.cajaActual.cajaInicial;
        document.getElementById('cajaInicialMostrar').textContent = this.cajaActual.cajaInicial.toFixed(2);
        document.getElementById('cajaInicialConfirmacion').classList.remove('hidden');

    } else if (this.cajaActual.cajaInicial > 0 && this.cajaActual.fecha !== hoy) {
        // ✅ NUEVO: La caja es de un día ANTERIOR → calcular el cierre de ese día
        const ventas = ventaService.obtenerVentas();
        const movimientos = movimientoService.obtenerMovimientos();
        const desglose = this.cajaActual.obtenerDesglose(ventas, movimientos);
        const cajaFinalAyer = desglose.cajaFinal;
        console.log(desglose, cajaFinalAyer)

        // Pre-rellenar el input con el cierre del día anterior
        document.getElementById('cajaInicial').value = cajaFinalAyer.toFixed(2);

        // Mostrar aviso visual (borde amarillo y tooltip)
        const input = document.getElementById('cajaInicial');
        input.style.borderColor = '#f59e0b';
        input.title = `Cierre del día ${this.cajaActual.fecha}: $${cajaFinalAyer.toFixed(2)}`;

        // Mostrar mensaje informativo en la confirmación
        document.getElementById('cajaInicialMostrar').textContent = cajaFinalAyer.toFixed(2);
        const confirmacion = document.getElementById('cajaInicialConfirmacion');
        confirmacion.classList.remove('hidden');
        confirmacion.querySelector('p').innerHTML = 
            `⚠️ Sugerido del cierre del ${this.cajaActual.fecha}: $<span id="cajaInicialMostrar">${cajaFinalAyer.toFixed(2)}</span> — Presiona 💾 Guardar para confirmar`;
    }
}

    
    /**
     * Inicializa todos los selectores con sus opciones
     */
    inicializarSelectores() {
        // Selectores de venta
        llenarSelect(document.getElementById('modelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('color'), COLORES_IPHONE, 'Seleccionar color');
        llenarSelect(document.getElementById('almacenamiento'), CAPACIDADES_IPHONE, 'Seleccionar capacidad');
        llenarSelect(document.getElementById('equipoGarantia'), GARANTIAS, 'Seleccionar garantía');
        
        // Selectores de equipo recibido
        llenarSelect(document.getElementById('equipoModelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('equipoColor'), COLORES_IPHONE, 'Seleccionar color');
        
        // Selectores de accesorios
        document.querySelectorAll('.accModelo').forEach(select => {
            llenarSelect(select, MODELOS_IPHONE, 'Seleccionar modelo');
        });
        
        llenarSelect(document.getElementById('cajaColorSelect'), COLORES_IPHONE, 'Seleccionar color');
        
        // Selectores de movimientos de inventario
        // Salida de equipo
        llenarSelect(document.getElementById('salidaEquipoModelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('salidaEquipoColor'), COLORES_IPHONE, 'Seleccionar color');
        llenarSelect(document.getElementById('salidaEquipoCapacidad'), CAPACIDADES_IPHONE, 'Seleccionar capacidad');
        
        // Ingreso de equipo
        llenarSelect(document.getElementById('ingresoEquipoModelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('ingresoEquipoColor'), COLORES_IPHONE, 'Seleccionar color');
        llenarSelect(document.getElementById('ingresoEquipoCapacidad'), CAPACIDADES_IPHONE, 'Seleccionar capacidad');
        
        // Compra de equipo
        llenarSelect(document.getElementById('compraEquipoModelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('compraEquipoColor'), COLORES_IPHONE, 'Seleccionar color');
        llenarSelect(document.getElementById('compraEquipoCapacidad'), CAPACIDADES_IPHONE, 'Seleccionar capacidad');
    
        // Selectores de cambio por garantía
        llenarSelect(document.getElementById('defectuosoModelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('defectuosoColor'), COLORES_IPHONE, 'Seleccionar color');
        llenarSelect(document.getElementById('nuevoModelo'), MODELOS_IPHONE, 'Seleccionar modelo');
        llenarSelect(document.getElementById('nuevoColor'), COLORES_IPHONE, 'Seleccionar color');

        const contenedorPago = document.getElementById('formaPagoRadios');
        if (contenedorPago) {
            contenedorPago.innerHTML = FORMAS_PAGO.map(fp => `
                <label class="flex items-center">
                    <input type="radio" name="formaPago" value="${fp.valor}" class="mr-3">
                    <span>${fp.icono} ${fp.etiqueta}</span>
                </label>
            `).join('');
        }
    
    }
    
    /**
     * Inicializa todos los event listeners
     */
    inicializarEventos() {
        // Fecha actual
        this.actualizarFecha();
        
        // Caja inicial
        document.getElementById('guardarCajaInicial').addEventListener('click', () => this.guardarCajaInicial());
        
        // Formulario de venta
        document.getElementById('ventaForm').addEventListener('submit', (e) => this.manejarSubmitVenta(e));
        document.getElementById('limpiarForm').addEventListener('click', () => this.limpiarFormularioVenta());
        
        // Tipo de venta
        document.querySelectorAll('input[name="tipoVenta"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.manejarCambioTipoVenta()
                
            });
        });
        
        // Accesorios
        this.inicializarEventosAccesorios();
        
        // Forma de pago
        document.querySelectorAll('input[name="formaPago"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.manejarCambioFormaPago()
                let methods = ['efectivo','zelle', 'binance', 'pagomovil', 'transferencia']
                let formaPago = methods.some(p => document.querySelector('input[name="formaPago"]:checked')?.value.includes(p))
                //const checkbox = document.getElementById('weppa');
                const montoTotalField = document.getElementById('montoTotal');
                if (formaPago) {
                    montoTotalField.removeAttribute('readonly');
                    montoTotalField.classList.remove('bg-gray-100');
                    montoTotalField.classList.add('bg-white');
                    console.log('i')
                } else{
                    montoTotalField.setAttribute('readonly', true);
                    montoTotalField.classList.add('bg-gray-100');
                    montoTotalField.classList.remove('bg-white');
                    // Recalcular automáticamente
                    //this.calcularTotalMixto();
                    console.log('o')
                }
            });
        });
        
        // Pago mixto
        ['montoEfectivo', 'montoZelle', 'montoBinance', 'montoPagoMovilDolares', 'montoTransferenciaDolares'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.calcularTotalMixto();
                this.calcularYMostrarTotal();
            });
        });
        
        // Event listeners para formularios individuales de pago
        document.getElementById('efectivoMonto')?.addEventListener('input', () => this.calcularYMostrarTotal());
        document.getElementById('zelleMonto')?.addEventListener('input', () => this.calcularYMostrarTotal());
        document.getElementById('binanceMonto')?.addEventListener('input', () => this.calcularYMostrarTotal());
        
        // Cálculo automático de bolívares en Pago Móvil (formulario principal)
        document.getElementById('pagomovilDolares').addEventListener('input', () => {
            this.calcularBolivaresPagoMovil();
            this.calcularYMostrarTotal();
        });
        document.getElementById('pagomovilTasa').addEventListener('input', () => {
            this.calcularBolivaresPagoMovil();
            this.calcularYMostrarTotal();
        });
        document.getElementById('pagomovilBolivares').addEventListener('input', () => {
            this.calcularDolaresPagoMovil();
            this.calcularYMostrarTotal();
        });

        // Cálculo automático de bolívares en Transferencia (formulario principal)
        document.getElementById('transferenciaDolares').addEventListener('input', () => {
            this.calcularBolivaresTransferencia();
            this.calcularYMostrarTotal();
        });
        document.getElementById('transferenciaTasa').addEventListener('input', () => {
            this.calcularBolivaresTransferencia();
            this.calcularYMostrarTotal();
        });
        document.getElementById('transferenciaBolivares').addEventListener('input', () => {
            this.calcularDolaresTransferencia();
            this.calcularYMostrarTotal();
        });

        document.getElementById('paypalMonto').addEventListener('input', () => this.calcularYMostrarTotal());
        
        // Cálculo automático de bolívares en Pago Móvil DENTRO de Pago Mixto
        document.getElementById('montoPagoMovilDolares').addEventListener('input', () => this.calcularBolivaresPagoMovilMixto());
        document.getElementById('montoPagoMovilTasa').addEventListener('input', () => this.calcularBolivaresPagoMovilMixto());
        
        // Cálculo automático de bolívares en Transferencia DENTRO de Pago Mixto
        document.getElementById('montoTransferenciaDolares').addEventListener('input', () => this.calcularBolivaresTransferenciaMixto());
        document.getElementById('montoTransferenciaTasa').addEventListener('input', () => this.calcularBolivaresTransferenciaMixto());
        
        // Equipo recibido
        document.getElementById('recibirEquipo').addEventListener('change', (e) => {
            document.getElementById('equipoRecibidoDetalles').classList.toggle('hidden', !e.target.checked);
            this.calcularYMostrarTotal();
        });
        
        // Diferencia de precio en cambio por garantía
        document.getElementById('tipoDiferencia').addEventListener('change', (e) => {
            const montoInput = document.getElementById('montoDiferencia');
            if (e.target.value === 'ninguna') {
                montoInput.disabled = true;
                montoInput.value = 0;
            } else {
                montoInput.disabled = false;
            }
        });
        
        // Actualizar total cuando cambia el valor del equipo recibido
        document.getElementById('equipoValor').addEventListener('input', () => this.calcularYMostrarTotal());
        
        // Tipo de transacción
        document.querySelectorAll('input[name="tipoTransaccion"]').forEach(radio => {
            radio.addEventListener('change', () => this.manejarCambioTipoTransaccion());
        });
        
        // Nota de venta
        document.getElementById('notaVenta').addEventListener('change', (e) => {
            document.getElementById('notaVentaInfo').classList.toggle('hidden', !e.target.checked);
        });
        
        // Menú
        this.inicializarMenu();
        
        // Movimientos de Inventario
        this.inicializarEventosMovimientos();

        // WEPPA - Permitir edición manual del monto total
        document.getElementById('weppa').addEventListener('change', (e) => {
            const weppaActivo = e.target.checked;
            const campoEditable = document.getElementById('weppaMontoEditable');
            
            if (weppaActivo) {
                // Mostrar campo editable
                campoEditable.classList.remove('hidden');
                // Copiar el inicial calculado al campo manual como sugerencia
                const totalInicial = parseFloat(document.getElementById('montoTotal').value) || 0;
                document.getElementById('montoTotalManual').value = totalInicial.toFixed(2);
                // Actualizar el display del inicial
                document.getElementById('weppaInicial').textContent = totalInicial.toFixed(2);
            } else {
                // Ocultar campo editable
                campoEditable.classList.add('hidden');
                // Recalcular automáticamente
                this.calcularYMostrarTotal();
            }
        });
        
        // Event listener para el campo manual de WEPPA
        document.getElementById('montoTotalManual')?.addEventListener('input', (e) => {
            const montoManual = parseFloat(e.target.value) || 0;
            // Actualizar el campo oculto que se envía
            document.getElementById('montoTotal').value = montoManual.toFixed(2);
            // Actualizar el display
            document.getElementById('montoTotalDisplay').textContent = `$${montoManual.toFixed(2)}`;
        });
    }
    
    /**
     * Inicializa eventos de accesorios
     */
    inicializarEventosAccesorios() {
        const accesorios = ['forro', 'cargador', 'vidrio', 'protectorCamara', 'cubo', 'cableLightning', 'cableCC', 'caja'];
        
        accesorios.forEach(accesorio => {
            const checkbox = document.getElementById(accesorio);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const contenedor = document.getElementById(`${accesorio}${accesorio === 'vidrio' ? 'Modelo' : accesorio === 'forro' ? 'Modelo' : accesorio === 'caja' ? 'Modelo' : 'Cantidad'}`);
                    if (contenedor) {
                        contenedor.classList.toggle('hidden', !e.target.checked);
                        
                        // Auto-seleccionar modelo si es forro, vidrio o caja
                        if (e.target.checked && (accesorio === 'forro' || accesorio === 'vidrio' || accesorio === 'caja')) {
                            this.autoSeleccionarModeloAccesorio(accesorio);
                        }
                    }
                });
            }
        });
        
        // Evento para auto-seleccionar cuando cambia el modelo del iPhone
        const modeloSelect = document.getElementById('modelo');
        if (modeloSelect) {
            modeloSelect.addEventListener('change', () => {
                // Auto-seleccionar en accesorios que estén marcados
                if (document.getElementById('forro').checked) {
                    this.autoSeleccionarModeloAccesorio('forro');
                }
                if (document.getElementById('vidrio').checked) {
                    this.autoSeleccionarModeloAccesorio('vidrio');
                }
                if (document.getElementById('caja').checked) {
                    this.autoSeleccionarModeloAccesorio('caja');
                }
            });
        }
    }
    
    /**
     * Auto-selecciona el modelo del accesorio basándose en el iPhone seleccionado
     */
    autoSeleccionarModeloAccesorio(tipoAccesorio) {
        const modeloIphone = document.getElementById('modelo').value;
        
        if (!modeloIphone) return; // Si no hay modelo seleccionado, no hacer nada
        
        let selectAccesorio;
        
        // Obtener el select correcto según el tipo de accesorio
        if (tipoAccesorio === 'forro') {
            selectAccesorio = document.querySelector('#forroModelo select');
        } else if (tipoAccesorio === 'vidrio') {
            selectAccesorio = document.querySelector('#vidrioModelo select');
        } else if (tipoAccesorio === 'caja') {
            selectAccesorio = document.querySelector('#cajaModelo select:first-child');
        }
        
        if (selectAccesorio) {
            // Buscar si existe una opción que coincida exactamente con el modelo del iPhone
            const opciones = Array.from(selectAccesorio.options);
            const opcionCoincidente = opciones.find(option => option.value === modeloIphone);
            
            if (opcionCoincidente) {
                selectAccesorio.value = modeloIphone;
                console.log(`✅ Auto-seleccionado ${tipoAccesorio}: ${modeloIphone}`);
            } else {
                console.log(`ℹ️ No se encontró coincidencia exacta para ${tipoAccesorio}`);
            }
        }
    }
    
    /**
     * Inicializa el menú de navegación
     */
    inicializarMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const floatingMenu = document.getElementById('floatingMenu');
        
        if (menuToggle && floatingMenu) {
            menuToggle.addEventListener('click', () => {
                floatingMenu.classList.toggle('hidden');
            });
        }
    }
    
    /**
     * Actualiza la fecha actual
     */
    actualizarFecha() {
        const fechaElement = document.getElementById('fecha-actual');
        if (fechaElement) {
            fechaElement.textContent = formatearFecha(new Date());
        }
    }
    
    /**
     * Guarda la caja inicial
     */
    guardarCajaInicial() {
        const valor = parseFloat(document.getElementById('cajaInicial').value) || 0;
        this.cajaActual = new Caja(valor);
        
        storageService.guardarCajaInicial(this.cajaActual);
        
        document.getElementById('cajaInicialConfirmacion').classList.remove('hidden');
        document.getElementById('cajaInicialMostrar').textContent = valor.toFixed(2);
        
        mostrarAlerta('✅ Caja inicial guardada correctamente', 'success');
        this.actualizarResumenVentas();
    }
    
    /**
     * Maneja el cambio de tipo de venta
     */
    manejarCambioTipoVenta() {
        const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked').value;
        const infoIphone = document.getElementById('infoIphone');
        const datosCliente = document.getElementById('datosClienteSection');
        
        if (tipoVenta === 'accesorios') {
            infoIphone.style.display = 'none';
            datosCliente.style.display = 'none';
        } else {
            infoIphone.style.display = 'block';
            datosCliente.style.display = 'block';
        }
    }
    
    /**
     * Maneja el cambio de forma de pago
     */
    manejarCambioFormaPago() {
        const formaPago = document.querySelector('input[name="formaPago"]:checked')?.value;
        
        // Ocultar todos los formularios primero
        document.getElementById('efectivo-form')?.classList.add('hidden');
        document.getElementById('zelle-form')?.classList.add('hidden');
        document.getElementById('binance-form')?.classList.add('hidden');
        document.getElementById('pagomovil-detalles')?.classList.add('hidden');
        document.getElementById('transferencia-detalles')?.classList.add('hidden');
        document.getElementById('pagoMixto')?.classList.add('hidden');
        // Agregar esta línea al bloque de "ocultar todos"
        document.getElementById('paypal-form')?.classList.add('hidden');
        
        // Mostrar el formulario correspondiente
        if (formaPago === 'efectivo') {
            document.getElementById('efectivo-form')?.classList.remove('hidden');
        } else if (formaPago === 'zelle') {
            document.getElementById('zelle-form')?.classList.remove('hidden');
        } else if (formaPago === 'binance') {
            document.getElementById('binance-form')?.classList.remove('hidden');
        } else if (formaPago === 'pagomovil') {
            document.getElementById('pagomovil-detalles')?.classList.remove('hidden');
        } else if (formaPago === 'transferencia') {
            document.getElementById('transferencia-detalles')?.classList.remove('hidden');
        } else if (formaPago === 'mixto') {
            document.getElementById('pagoMixto')?.classList.remove('hidden');
        }
        // Agregar esta condición al final del bloque
        else if (formaPago === 'paypal') {
            document.getElementById('paypal-form')?.classList.remove('hidden');
        }
        
        // Recalcular total
        this.calcularYMostrarTotal();
    }
    
    /**
     * Maneja el cambio de tipo de transacción
     */
    manejarCambioTipoTransaccion() {
        /* const tipoTransaccion = document.querySelector('input[name="tipoTransaccion"]:checked').value;
        document.getElementById('abonoInfo').classList.toggle('hidden', tipoTransaccion !== 'abono'); */

        const tipoTransaccion = document.querySelector('input[name="tipoTransaccion"]:checked').value;
    
        // Mostrar/ocultar sección de abono
        document.getElementById('abonoInfo').classList.toggle('hidden', tipoTransaccion !== 'abono');
        
        // Mostrar/ocultar sección de cambio por garantía
        const esCambioGarantia = tipoTransaccion === 'cambio-garantia';
        document.getElementById('cambioGarantiaForm').classList.toggle('hidden', !esCambioGarantia);
        
        // Si es cambio por garantía, ocultar secciones innecesarias
        if (esCambioGarantia) {
            document.getElementById('accesoriosSection').style.display = 'none';
            document.getElementById('formaPagoSection').style.display = 'none';
            document.getElementById('recibirEquipo').checked = false;
            document.getElementById('equipoRecibidoForm').classList.add('hidden');
            document.getElementById('equipoRecibidoDetalles').classList.add('hidden');
            document.getElementById('infoIphone').style.display = 'none';
            document.getElementById('montoTotalSection').classList.add('hidden');
        } else {
            document.getElementById('accesoriosSection').style.display = 'block';
            document.getElementById('formaPagoSection').style.display = 'block';
            document.getElementById('equipoRecibidoForm').classList.remove('hidden');
            document.getElementById('infoIphone').style.display = 'block';
            document.getElementById('montoTotalSection').classList.remove('hidden');
        }
    }
    
    /**
     * Calcula el total del pago mixto
     */
    calcularTotalMixto() {
        /* let venta = this.recopilarDatosVenta()
        const efectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
        const zelle = parseFloat(document.getElementById('montoZelle').value) || 0;
        const binance = parseFloat(document.getElementById('montoBinance').value) || 0;
        const pagoMovil = parseFloat(document.getElementById('montoPagoMovilDolares').value) || 0;
        const transferencia = parseFloat(document.getElementById('montoTransferenciaDolares').value) || 0;

        const montoTotalVenta = document.getElementById('montoTotal');
        const montoTotalMixto = document.getElementById('totalMixto');
        
        const total = efectivo + zelle + binance + pagoMovil + transferencia;
        
        // Agregar valor del equipo recibido si existe
        if (document.getElementById('recibirEquipo').checked) {
            const valorEquipo = parseFloat(document.getElementById('equipoValor').value) || 0;
            montoTotalMixto.textContent = total.toFixed(2);
            montoTotalVenta.value = (total + valorEquipo).toFixed(2);
        } else {
            montoTotalMixto.textContent = total.toFixed(2);
            montoTotalVenta.value = total.toFixed(2);
        }
        //montoTotalVenta = document.getElementById('montoTotal').value + valorEquipo? valorEquipo : 0;
                const diferencia = Math.abs(total - montoTotalVenta);
                
                // Permitir una diferencia de hasta 0.01 por redondeo
                if (diferencia > 0.01 && !venta.weppa) {
                    //alert(`⚠️ ERROR: El total del pago mixto ($${totalPagoMixto.toFixed(2)}) no coincide con el monto total de la venta ($${montoTotalVenta.toFixed(2)}).\n\nDiferencia: $${diferencia.toFixed(2)}\n\nPor favor ajusta los montos antes de continuar.`);
                    alert(`⚠️ ERROR: Asegurate de marcar la casilla de 'WEPPA' para pago mixto distinto del monto total de la venta.`);
                    return;
                } */

        const efectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
        const zelle = parseFloat(document.getElementById('montoZelle').value) || 0;
        const binance = parseFloat(document.getElementById('montoBinance').value) || 0;
        const pagoMovil = parseFloat(document.getElementById('montoPagoMovilDolares').value) || 0;
        const transferencia = parseFloat(document.getElementById('montoTransferenciaDolares').value) || 0;

        const montoTotalVenta = document.getElementById('montoTotal');
        const montoTotalMixto = document.getElementById('totalMixto');
        
        const total = efectivo + zelle + binance + pagoMovil + transferencia;
        
        // El monto total es solo el pago en efectivo/digital, NO incluye equipo recibido
        montoTotalMixto.textContent = total.toFixed(2);
        montoTotalVenta.value = total.toFixed(2);  // ✅ CORRECTO
    }
    
    /**
     * Calcula y muestra el total de la venta
     * Incluye el pago en efectivo/digital + equipo recibido
     */
    calcularYMostrarTotal() {
        const formaPago = document.querySelector('input[name="formaPago"]:checked')?.value;
        let subtotalPago = 0;
        
        // Calcular subtotal según forma de pago
        if (formaPago === 'efectivo') {
            subtotalPago = parseFloat(document.getElementById('efectivoMonto')?.value) || 0;
        } else if (formaPago === 'zelle') {
            subtotalPago = parseFloat(document.getElementById('zelleMonto')?.value) || 0;
        } else if (formaPago === 'binance') {
            subtotalPago = parseFloat(document.getElementById('binanceMonto')?.value) || 0;
        } else if (formaPago === 'pagomovil') {
            subtotalPago = parseFloat(document.getElementById('pagomovilDolares')?.value) || 0;
        } else if (formaPago === 'transferencia') {
            subtotalPago = parseFloat(document.getElementById('transferenciaDolares')?.value) || 0;
        } else if (formaPago === 'mixto') {
            const efectivo = parseFloat(document.getElementById('montoEfectivo')?.value) || 0;
            const zelle = parseFloat(document.getElementById('montoZelle')?.value) || 0;
            const binance = parseFloat(document.getElementById('montoBinance')?.value) || 0;
            const pagoMovil = parseFloat(document.getElementById('montoPagoMovilDolares')?.value) || 0;
            const transferencia = parseFloat(document.getElementById('montoTransferenciaDolares')?.value) || 0;
            subtotalPago = efectivo + zelle + binance + pagoMovil + transferencia;
        } else if (formaPago === 'paypal') {
            subtotalPago = parseFloat(document.getElementById('paypalMonto')?.value) || 0;
        }
        
        // Agregar equipo recibido si existe
        let subtotalEquipo = 0;
        if (document.getElementById('recibirEquipo')?.checked) {
            subtotalEquipo = parseFloat(document.getElementById('equipoValor')?.value) || 0;
        }
        
        // Calcular total (Pago + Equipo = Inicial)
        const totalInicial = subtotalPago + subtotalEquipo;
        
        // Verificar si WEPPA está activo
        const weppaActivo = document.getElementById('weppa')?.checked;
        
        // Mostrar en la interfaz
        document.getElementById('subtotalPago').textContent = `$${subtotalPago.toFixed(2)}`;
        document.getElementById('subtotalEquipo').textContent = `$${subtotalEquipo.toFixed(2)}`;
        
        if (weppaActivo) {
            // Si WEPPA está activo, mostrar el inicial y mantener el total manual
            document.getElementById('weppaInicial').textContent = totalInicial.toFixed(2);
            // No sobrescribir montoTotalDisplay ni montoTotal, el usuario los edita manualmente
        } else {
            // Si WEPPA no está activo, el total es el inicial
            document.getElementById('montoTotalDisplay').textContent = `$${totalInicial.toFixed(2)}`;
            document.getElementById('montoTotal').value = totalInicial.toFixed(2);
        }
        
        // Mostrar/ocultar línea de equipo recibido
        const equipoLinea = document.getElementById('equipoRecibidoLinea');
        if (subtotalEquipo > 0) {
            equipoLinea.style.display = 'flex';
        } else {
            equipoLinea.style.display = 'none';
        }
    }
    
    /**
     * Calcula bolívares desde dólares en Pago Móvil
     */
    calcularBolivaresPagoMovil() {
        const dolares = parseFloat(document.getElementById('pagomovilDolares').value) || 0;
        const tasa = parseFloat(document.getElementById('pagomovilTasa').value) || 0;
        
        if (dolares > 0 && tasa > 0) {
            const bolivares = dolares * tasa;
            document.getElementById('pagomovilBolivares').value = bolivares.toFixed(2);
        }
    }
    
    /**
     * Calcula dólares desde bolívares en Pago Móvil
     */
    calcularDolaresPagoMovil() {
        const bolivares = parseFloat(document.getElementById('pagomovilBolivares').value) || 0;
        const tasa = parseFloat(document.getElementById('pagomovilTasa').value) || 0;
        
        if (bolivares > 0 && tasa > 0) {
            const dolares = bolivares / tasa;
            document.getElementById('pagomovilDolares').value = dolares.toFixed(2);
            document.getElementById('montoTotal').value = dolares.toFixed(2);
        }
    }
    
    /**
     * Calcula bolívares desde dólares en Transferencia
     */
    calcularBolivaresTransferencia() {
        const dolares = parseFloat(document.getElementById('transferenciaDolares').value) || 0;
        const tasa = parseFloat(document.getElementById('transferenciaTasa').value) || 0;
        
        if (dolares > 0 && tasa > 0) {
            const bolivares = dolares * tasa;
            document.getElementById('transferenciaBolivares').value = bolivares.toFixed(2);
        }
    }
    
    /**
     * Calcula dólares desde bolívares en Transferencia
     */
    calcularDolaresTransferencia() {
        const bolivares = parseFloat(document.getElementById('transferenciaBolivares').value) || 0;
        const tasa = parseFloat(document.getElementById('transferenciaTasa').value) || 0;
        
        if (bolivares > 0 && tasa > 0) {
            const dolares = bolivares / tasa;
            document.getElementById('transferenciaDolares').value = dolares.toFixed(2);
            document.getElementById('montoTotal').value = dolares.toFixed(2);
        }
    }
    
    /**
     * Calcula el total incluyendo el equipo recibido
     * NOTA: Esta función ahora solo llama a calcularYMostrarTotal()
     */
    calcularTotalConEquipoRecibido() {
        // Redirigir a la nueva función centralizada
        this.calcularYMostrarTotal();
    }
    
    /**
     * Calcula bolívares desde dólares en Pago Móvil DENTRO de Pago Mixto
     */
    calcularBolivaresPagoMovilMixto() {
        const dolares = parseFloat(document.getElementById('montoPagoMovilDolares').value) || 0;
        const tasa = parseFloat(document.getElementById('montoPagoMovilTasa').value) || 0;
        
        if (dolares > 0 && tasa > 0) {
            const bolivares = dolares * tasa;
            document.getElementById('montoPagoMovilBolivares').value = bolivares.toFixed(2);
        } else {
            document.getElementById('montoPagoMovilBolivares').value = '';
        }
        
        // Recalcular el total mixto
        this.calcularTotalMixto();
    }
    
    /**
     * Calcula bolívares desde dólares en Transferencia DENTRO de Pago Mixto
     */
    calcularBolivaresTransferenciaMixto() {
        const dolares = parseFloat(document.getElementById('montoTransferenciaDolares').value) || 0;
        const tasa = parseFloat(document.getElementById('montoTransferenciaTasa').value) || 0;
        
        if (dolares > 0 && tasa > 0) {
            const bolivares = dolares * tasa;
            document.getElementById('montoTransferenciaBolivares').value = bolivares.toFixed(2);
        } else {
            document.getElementById('montoTransferenciaBolivares').value = '';
        }
        
        // Recalcular el total mixto
        this.calcularTotalMixto();
    }

    /**
     * Calcula el monto total basado en la forma de pago seleccionada
     */
    calcularMontoTotal() {
        const formaPago = document.querySelector('input[name="formaPago"]:checked');
        if (!formaPago) return 0;
        
        let total = 0;
        
        if (formaPago.value === 'mixto') {
            const efectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
            const zelle = parseFloat(document.getElementById('montoZelle').value) || 0;
            const binance = parseFloat(document.getElementById('montoBinance').value) || 0;
            const pagoMovil = parseFloat(document.getElementById('montoPagoMovilDolares').value) || 0;
            const transferencia = parseFloat(document.getElementById('montoTransferenciaDolares').value) || 0;
            
            total = efectivo + zelle + binance + pagoMovil + transferencia;
        } else if (formaPago.value === 'pagomovil') {
            total = parseFloat(document.getElementById('pagomovilDolares').value) || 0;
        } else if (formaPago.value === 'transferencia') {
            total = parseFloat(document.getElementById('transferenciaDolares').value) || 0;
        } else {
            // Para efectivo, zelle, binance
            const campoId = formaPago.value === 'efectivo' ? 'montoEfectivo' : 
                        formaPago.value === 'zelle' ? 'montoZelle' : 'montoBinance';
            total = parseFloat(document.getElementById(campoId).value) || 0;
        }
        
        // Agregar equipo recibido si existe
        if (document.getElementById('recibirEquipo').checked) {
            const valorEquipo = parseFloat(document.getElementById('equipoValor').value) || 0;
            total += valorEquipo;
        }
        
        return total;
    }


    /**
     * Recopila los datos del formulario de cambio por garantía
     */
    recopilarDatosCambioGarantia() {
        const tipoDiferencia = document.getElementById('tipoDiferencia').value;
        const montoDiferencia = parseFloat(document.getElementById('montoDiferencia').value) || 0;
        
        return {
            cliente: {
                nombre: document.getElementById('clienteNombre').value,
                cedula: document.getElementById('clienteCedula').value,
                telefono: document.getElementById('clienteTelefono').value
            },
            equipoDefectuoso: {
                modelo: document.getElementById('defectuosoModelo').value,
                color: document.getElementById('defectuosoColor').value,
                capacidad: document.getElementById('defectuosoCapacidad').value,
                bateria: document.getElementById('defectuosoBateria').value + '%',
                imei: document.getElementById('defectuosoImei').value,
                problema: document.getElementById('defectuosoProblema').value
            },
            equipoNuevo: {
                modelo: document.getElementById('nuevoModelo').value,
                color: document.getElementById('nuevoColor').value,
                capacidad: document.getElementById('nuevoCapacidad').value,
                bateria: document.getElementById('nuevoBateria').value + '%',
                imei: document.getElementById('nuevoImei').value
            },
            diferencia: {
                tipo: tipoDiferencia,
                monto: montoDiferencia
            }
        };
    }

    /**
     * Maneja el submit del formulario de cambio por garantía
     */
    manejarSubmitCambioGarantia() {
        const datos = this.recopilarDatosCambioGarantia();
        const cambio = new CambioGarantia(datos);
        
        const resultado = movimientoService.registrarCambioGarantia(cambio);
        
        if (resultado.exito) {
            mostrarAlerta(resultado.mensaje, 'success');
            this.limpiarFormularioVenta();
            this.actualizarUI();
            
            // Preguntar si desea imprimir la garantía
            if (confirm('¿Desea imprimir la garantía del cambio?')) {
                this.imprimirGarantiaCambio(cambio);
            }
        } else {
            mostrarAlerta(resultado.errores.join('<br>'), 'error');
        }
    }
    
    /**
     * Maneja el submit del formulario de venta
     */
    manejarSubmitVenta(e) {
        e.preventDefault();
    
        const tipoTransaccion = document.querySelector('input[name="tipoTransaccion"]:checked').value;
        
        // Si es cambio por garantía, usar flujo diferente
        if (tipoTransaccion === 'cambio-garantia') {
            this.manejarSubmitCambioGarantia();
            return;
        }
        
        const datosVenta = this.recopilarDatosVenta();
        console.log(datosVenta.formaPago)
        
        let resultado;
        if (this.ventaEnEdicion) {
            datosVenta.id = this.ventaEnEdicion;
            resultado = ventaService.actualizarVenta(datosVenta);
            
            
        } else {
            /* const montoCalculado = this.calcularMontoTotal();
            const montoIngresado = parseFloat(document.getElementById('montoTotal').value);

            // Solo permitir monto mayor si WEPPA está marcado
            const weppaChecked = document.getElementById('weppa').checked;

            if (!weppaChecked && Math.abs(montoCalculado - montoIngresado) > 0.01) {
                alert('❌ El monto total no puede ser modificado manualmente a menos que WEPPA esté marcado');
                return;
            }

            if (weppaChecked && montoIngresado < montoCalculado) {
                alert('❌ Con WEPPA marcado, el monto total no puede ser menor al calculado automáticamente');
                return;
            } */
            resultado = ventaService.crearVenta(datosVenta);
        }
        
        if (resultado.exito) {

            // Restaurar botón y limpiar estado de edición
            const submitBtn = document.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '✅ Registrar Venta';
            submitBtn.classList.remove('bg-orange-600', 'hover:bg-orange-700');
            submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            
            // Eliminar botón de cancelar
            const cancelBtn = document.getElementById('cancelarEdicion');
            if (cancelBtn) {
                cancelBtn.remove();
            }
            
            this.ventaEnEdicion = null;

            mostrarAlerta(resultado.mensaje, 'success');
            this.limpiarFormularioVenta();
            this.actualizarUI();
        } else {
            mostrarAlerta(resultado.errores.join('<br>'), 'error');
        }
    }
    
    /**
     * Recopila los datos del formulario de venta
     */
    recopilarDatosVenta() {
        const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked').value;
        const tipoTransaccion = document.querySelector('input[name="tipoTransaccion"]:checked').value;
        const formaPago = document.querySelector('input[name="formaPago"]:checked')?.value;
        
        const datos = {
            tipoVenta,
            tipoTransaccion,
            formaPago,
            montoTotal: parseFloat(document.getElementById('montoTotal').value) || 0,
            weppa: document.getElementById('weppa').checked,
            notaVentaDetalles: document.getElementById('notaVenta').checked ? 
                document.getElementById('notaVentaDetalles').value : null
        };
        
        // Cliente y equipo (solo si es venta completa)
        if (tipoVenta === 'completa') {
            datos.cliente = {
                nombre: document.getElementById('clienteNombre').value,
                cedula: document.getElementById('clienteCedula').value,
                telefono: document.getElementById('clienteTelefono').value
            };
            
            datos.equipo = {
                modelo: document.getElementById('modelo').value,
                color: document.getElementById('color').value,
                almacenamiento: document.getElementById('almacenamiento').value,
                bateria: document.getElementById('bateria').value + '%',
                imei: document.getElementById('equipoImei').value,
                garantia: document.getElementById('equipoGarantia').value
            };
        }
        
        // Accesorios
        datos.accesorios = this.recopilarAccesorios();
        
        if (formaPago === 'mixto') {
            // PAGO MIXTO
            datos.pagoMixto = {
                efectivo: parseFloat(document.getElementById('montoEfectivo').value) || 0,
                zelle: parseFloat(document.getElementById('montoZelle').value) || 0,
                binance: parseFloat(document.getElementById('montoBinance').value) || 0,
                pagoMovil: parseFloat(document.getElementById('montoPagoMovilDolares').value) || 0,
                transferencia: parseFloat(document.getElementById('montoTransferenciaDolares').value) || 0
            };
            
            // Guardar detalles de Pago Móvil si tiene tasa y bolívares
            const pagoMovilTasaMixto = parseFloat(document.getElementById('montoPagoMovilTasa').value) || 0;
            const pagoMovilBolivaresMixto = parseFloat(document.getElementById('montoPagoMovilBolivares').value) || 0;
            if (datos.pagoMixto.pagoMovil > 0 && pagoMovilTasaMixto > 0 && pagoMovilBolivaresMixto > 0) {
                datos.pagoMixto.pagoMovilDetalles = {
                    dolares: datos.pagoMixto.pagoMovil,
                    bolivares: pagoMovilBolivaresMixto,
                    tasa: pagoMovilTasaMixto
                };
            }
            
            // Guardar detalles de Transferencia si tiene tasa y bolívares
            const transferenciaTasaMixto = parseFloat(document.getElementById('montoTransferenciaTasa').value) || 0;
            const transferenciaBolivaresMixto = parseFloat(document.getElementById('montoTransferenciaBolivares').value) || 0;
            if (datos.pagoMixto.transferencia > 0 && transferenciaTasaMixto > 0 && transferenciaBolivaresMixto > 0) {
                datos.pagoMixto.transferenciaDetalles = {
                    dolares: datos.pagoMixto.transferencia,
                    bolivares: transferenciaBolivaresMixto,
                    tasa: transferenciaTasaMixto
                };
            }
            
        } else if (formaPago === 'pagomovil') {
            // PAGO MÓVIL SIMPLE
            const dolares = parseFloat(document.getElementById('pagomovilDolares').value) || 0;
            const bolivares = parseFloat(document.getElementById('pagomovilBolivares').value) || 0;
            const tasa = parseFloat(document.getElementById('pagomovilTasa').value) || 0;
            
            if (dolares > 0 && bolivares > 0 && tasa > 0) {
                datos.pagoMovilDetalles = {
                    dolares: dolares,
                    bolivares: bolivares,
                    tasa: tasa
                };
            }
            
        } else if (formaPago === 'transferencia') {
            // TRANSFERENCIA SIMPLE
            const dolares = parseFloat(document.getElementById('transferenciaDolares').value) || 0;
            const bolivares = parseFloat(document.getElementById('transferenciaBolivares').value) || 0;
            const tasa = parseFloat(document.getElementById('transferenciaTasa').value) || 0;
            
            if (dolares > 0 && bolivares > 0 && tasa > 0) {
                datos.transferenciaDetalles = {
                    dolares: dolares,
                    bolivares: bolivares,
                    tasa: tasa
                };
            }
        } else if (formaPago === 'efectivo') {
            // EFECTIVO SIMPLE - Guardar el monto del pago
            const montoPago = parseFloat(document.getElementById('efectivoMonto').value) || 0;
            datos.montoPago = montoPago;
        } else if (formaPago === 'zelle') {
            // ZELLE SIMPLE - Guardar el monto del pago
            const montoPago = parseFloat(document.getElementById('zelleMonto').value) || 0;
            datos.montoPago = montoPago;
        } else if (formaPago === 'binance') {
            // BINANCE SIMPLE - Guardar el monto del pago
            const montoPago = parseFloat(document.getElementById('binanceMonto').value) || 0;
            datos.montoPago = montoPago;
        } else if (formaPago === 'paypal') {
            // Capturar el monto
            const montoPago = parseFloat(document.getElementById('paypalMonto').value) || 0;
            datos.montoPago = montoPago;
            
            // Capturar datos adicionales específicos de PayPal
            datos.paypalDetalles = {
                email: document.getElementById('paypalEmail').value,
                monto: montoPago
            };
        }
        
        // Equipo recibido (si aplica)
        if (document.getElementById('recibirEquipo').checked) {
            datos.equipoRecibido = {
                modelo: document.getElementById('equipoModelo').value,
                capacidad: document.getElementById('equipoCapacidad').value,
                color: document.getElementById('equipoColor').value,
                bateria: document.getElementById('equipoBateria').value,
                imei: document.getElementById('equipoImeiR').value,
                valor: parseFloat(document.getElementById('equipoValor').value) || 0,
                comentarios: document.getElementById('equipoComentarios').value
            };
        }
        
        return datos;
    }
    
    /**
     * Recopila los datos de accesorios
     */
    recopilarAccesorios() {
        return {
            forro: document.getElementById('forro').checked,
            forroModelo: document.getElementById('forro').checked ? 
                document.querySelector('#forroModelo select')?.value : null,
            forroCantidad: document.getElementById('forro').checked ? 
                parseInt(document.querySelector('#forroModelo input')?.value) || 0 : 0,
            
            cargador: document.getElementById('cargador').checked,
            cargadorCantidad: document.getElementById('cargador').checked ? 
                parseInt(document.querySelector('#cargadorCantidad input')?.value) || 0 : 0,
            
            vidrio: document.getElementById('vidrio').checked,
            vidrioModelo: document.getElementById('vidrio').checked ? 
                document.querySelector('#vidrioModelo select')?.value : null,
            vidrioCantidad: document.getElementById('vidrio').checked ? 
                parseInt(document.querySelector('#vidrioModelo input')?.value) || 0 : 0,
            
            protectorCamara: document.getElementById('protectorCamara').checked,
            protectorCantidad: document.getElementById('protectorCamara').checked ? 
                parseInt(document.querySelector('#protectorCantidad input')?.value) || 0 : 0,
            
            cubo: document.getElementById('cubo').checked,
            cuboCantidad: document.getElementById('cubo').checked ? 
                parseInt(document.querySelector('#cuboCantidad input')?.value) || 0 : 0,
            
            cableLightning: document.getElementById('cableLightning').checked,
            cableLightningCantidad: document.getElementById('cableLightning').checked ? 
                parseInt(document.querySelector('#cableLightningCantidad input')?.value) || 0 : 0,
            
            cableCC: document.getElementById('cableCC').checked,
            cableCCCantidad: document.getElementById('cableCC').checked ? 
                parseInt(document.querySelector('#cableCCCantidad input')?.value) || 0 : 0,
            
            caja: document.getElementById('caja').checked,
            cajaModelo: document.getElementById('caja').checked ? 
                document.querySelector('#cajaModelo select:first-child')?.value : null,
            cajaColor: document.getElementById('caja').checked ? 
                document.getElementById('cajaColorSelect')?.value : null,
            cajaCantidad: document.getElementById('caja').checked ? 
                parseInt(document.querySelector('#cajaModelo input')?.value) || 0 : 0
        };
    }
    
    /**
     * Limpia el formulario de venta
     */
    limpiarFormularioVenta() {
        document.getElementById('ventaForm').reset();
        
        // Ocultar campos condicionales
        document.getElementById('forroModelo').classList.add('hidden');
        document.getElementById('vidrioModelo').classList.add('hidden');
        document.getElementById('cargadorCantidad').classList.add('hidden');
        document.getElementById('protectorCantidad').classList.add('hidden');
        document.getElementById('cuboCantidad').classList.add('hidden');
        document.getElementById('cableLightningCantidad').classList.add('hidden');
        document.getElementById('cableCCCantidad').classList.add('hidden');
        document.getElementById('cajaModelo').classList.add('hidden');
        document.getElementById('pagoMixto').classList.add('hidden');
        document.getElementById('pagomovil-detalles').classList.add('hidden');
        document.getElementById('transferencia-detalles').classList.add('hidden');
        document.getElementById('equipoRecibidoDetalles').classList.add('hidden');
        document.getElementById('abonoInfo').classList.add('hidden');
        document.getElementById('notaVentaInfo').classList.add('hidden');
        document.getElementById('paypal-form')?.classList.add('hidden');
        
        // Ocultar formularios de pago individuales
        document.getElementById('efectivo-form')?.classList.add('hidden');
        document.getElementById('zelle-form')?.classList.add('hidden');
        document.getElementById('binance-form')?.classList.add('hidden');
        
        // Ocultar formulario de cambio por garantía
        document.getElementById('cambioGarantiaForm').classList.add('hidden');
        
        // Mostrar secciones por defecto (que se ocultan en cambio garantía)
        document.getElementById('infoIphone').style.display = 'block';
        document.getElementById('datosClienteSection').style.display = 'block';
        document.getElementById('accesoriosSection').style.display = 'block';
        document.getElementById('formaPagoSection').style.display = 'block';
        
        // Resetear displays de totales
        document.getElementById('subtotalPago').textContent = '$0.00';
        document.getElementById('subtotalEquipo').textContent = '$0.00';
        document.getElementById('montoTotalDisplay').textContent = '$0.00';
        document.getElementById('montoTotal').value = '';
        document.getElementById('totalMixto').textContent = '0.00';
        document.getElementById('equipoRecibidoLinea').style.display = 'none';
        
        // Resetear WEPPA
        document.getElementById('weppa').checked = false;
        document.getElementById('weppaMontoEditable')?.classList.add('hidden');
        document.getElementById('montoTotalManual').value = '';
        document.getElementById('weppaInicial').textContent = '0.00';
        
        // Resetear tipo de transacción a "venta"
        document.querySelector('input[name="tipoTransaccion"][value="venta"]').checked = true;
        this.manejarCambioTipoTransaccion();
    }
    
    /**
     * Actualiza toda la UI
     */
    actualizarUI() {
        this.actualizarResumenVentas();
        this.actualizarResumenMovimientos();
    }
    
    /**
     * Actualiza el resumen de ventas
     */
    actualizarResumenVentas() {
        const fechaHoy = new Date().toLocaleDateString('es-ES'); // 1. Obtenemos la fecha
        
        // 2. Filtramos al instante por la fecha de hoy
        const ventas = ventaService.obtenerVentas().filter(v => v.fecha === fechaHoy);
        const movimientos = movimientoService.obtenerMovimientos().filter(m => m.fecha === fechaHoy);
        const resumenElement = document.getElementById('resumenVentas');
        
        if (ventas.length === 0) {
            resumenElement.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-400 text-lg">📭</p>
                    <p class="text-gray-600">No hay ventas registradas hoy.</p>
                    <p class="text-sm text-gray-500 mt-2">Las ventas aparecerán aquí automáticamente</p>
                </div>
            `;
        } else {
            // Agrupar ventas por tipo
            const ventasCompletas = ventas.filter(v => v.tipoVenta === 'completa' && v.tipoTransaccion !== 'abono');
            const abonos = ventas.filter(v => v.tipoTransaccion === 'abono');
            const soloAccesorios = ventas.filter(v => v.tipoVenta === 'accesorios');
            
            let html = '';
            
            if (ventasCompletas.length > 0) {
                html += `
                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">📱 ${ventasCompletas.length}</span>
                            Ventas Completas
                        </h3>
                        <div class="space-y-2">
                            ${ventasCompletas.map((venta, index) => this.renderizarVenta(venta, index)).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (soloAccesorios.length > 0) {
                html += `
                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">🛡️ ${soloAccesorios.length}</span>
                            Solo Accesorios
                        </h3>
                        <div class="space-y-2">
                            ${soloAccesorios.map((venta, index) => this.renderizarVenta(venta, index)).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (abonos.length > 0) {
                html += `
                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded mr-2">💰 ${abonos.length}</span>
                            Abonos
                        </h3>
                        <div class="space-y-2">
                            ${abonos.map((venta, index) => this.renderizarVenta(venta, index)).join('')}
                        </div>
                    </div>
                `;
            }
            
            resumenElement.innerHTML = html;
        }
        
        // Actualizar totales con animación
        const totalDia = ventaService.calcularTotalDia();
        const equiposVendidos = ventaService.contarEquiposVendidos();
        const desgloseCaja = this.cajaActual.obtenerDesglose(ventas, movimientos);
        console.log(ventas)
        console.log(movimientos)
        
        this.animarNumero('totalDia', totalDia);
        this.animarNumero('equiposVendidos', equiposVendidos, false);
        this.animarNumero('cajaFinal', desgloseCaja.cajaFinal);
    }
    
    /**
     * Anima un número al cambiar
     */
    animarNumero(elementId, valorFinal, esMoneda = true) {
        const element = document.getElementById(elementId);
        const valorActual = parseFloat(element.textContent) || 0;
        
        if (valorActual === valorFinal) return;
        
        const duracion = 500; // ms
        const pasos = 20;
        const incremento = (valorFinal - valorActual) / pasos;
        let paso = 0;
        
        const intervalo = setInterval(() => {
            paso++;
            const nuevoValor = valorActual + (incremento * paso);
            
            if (paso >= pasos) {
                element.textContent = esMoneda ? valorFinal.toFixed(2) : Math.round(valorFinal);
                clearInterval(intervalo);
            } else {
                element.textContent = esMoneda ? nuevoValor.toFixed(2) : Math.round(nuevoValor);
            }
        }, duracion / pasos);
    }
    
    /**
     * Calcula el total inicial de una venta WEPPA (lo que pagó HOY)
     * Inicial = Pago en efectivo/digital + Equipo recibido
     */
    calcularTotalInicial(venta) {
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
        } else if (venta.montoPago !== undefined) {
            // Si tiene montoPago guardado (efectivo/zelle/binance con WEPPA)
            totalPago = venta.montoPago;
        } else {
            // Fallback: Si no hay WEPPA, el monto total es el pago
            // Si hay WEPPA pero no tiene montoPago, calcular: Total - Equipo
            if (venta.weppa && venta.equipoRecibido) {
                totalPago = venta.montoTotal - venta.equipoRecibido.valor;
            } else {
                totalPago = venta.montoTotal;
            }
        }
        
        // Agregar equipo recibido al pago para obtener el inicial
        const equipoRecibido = venta.equipoRecibido ? venta.equipoRecibido.valor : 0;
        const totalInicial = totalPago + equipoRecibido;
        
        return totalInicial;
    }
    
    /**
     * Renderiza una venta en HTML con diseño mejorado tipo tarjeta
     */
    renderizarVenta(venta, index) {
        const accesorios = venta.obtenerResumenAccesorios();
        
        // Calcular HTML del WEPPA con inicial si aplica
        let weppaHtml = '';
        if (venta.weppa) {
            const totalInicial = this.calcularTotalInicial(venta);
            weppaHtml = `<span class="bg-yellow-200 px-2 py-1 rounded text-xs font-bold ml-2">WEPPA (Inicial $${totalInicial.toFixed(2)})</span>`;
        }
        
        // Construir secciones solo si hay datos
        let seccionEquipo = '';
        let seccionAccesorios = '';
        let seccionEquipoRecibido = '';
        let seccionPago = '';
        
        // Sección Equipo (solo si es venta completa)
        if (venta.tipoVenta === 'completa') {
            seccionEquipo = `
                <div class="bg-blue-50 p-3 rounded-lg">
                    <h5 class="font-semibold text-blue-800 text-xs mb-2 flex items-center">
                        <span class="mr-1">📱</span> Equipo
                    </h5>
                    <div class="text-xs space-y-1">
                        <p><strong>Modelo:</strong> ${venta.equipo.modelo}</p>
                        <p><strong>Capacidad:</strong> ${venta.equipo.almacenamiento}</p>
                        <p><strong>Color:</strong> ${venta.equipo.color}</p>
                        <p><strong>Batería:</strong> ${venta.equipo.bateria}</p>
                        <p><strong>Imei:</strong> ${venta.equipo.imei}</p>
                    </div>
                </div>
            `;
        }
        
        // Sección Accesorios (solo si hay accesorios)
        if (accesorios.length > 0) {
            seccionAccesorios = `
                <div class="bg-green-50 p-3 rounded-lg">
                    <h5 class="font-semibold text-green-800 text-xs mb-2 flex items-center">
                        <span class="mr-1">🛡️</span> Accesorios
                    </h5>
                    <div class="text-xs space-y-1">
                        ${accesorios.map(acc => `<p>• ${acc}</p>`).join('')}
                    </div>
                </div>
            `;
        }
        
        // Sección Equipo Recibido (solo si existe)
        if (venta.equipoRecibido) {
            seccionEquipoRecibido = `
                <div class="bg-orange-50 p-3 rounded-lg">
                    <h5 class="font-semibold text-orange-800 text-xs mb-2 flex items-center">
                        <span class="mr-1">📱⬅️</span> Equipo Recibido
                    </h5>
                    <div class="text-xs space-y-1">
                        <p><strong>Modelo:</strong> ${venta.equipoRecibido.modelo}</p>
                        <p><strong>Capacidad:</strong> ${venta.equipoRecibido.capacidad}</p>
                        <p><strong>Color:</strong> ${venta.equipoRecibido.color}</p>
                        <p><strong>Batería:</strong> ${venta.equipoRecibido.bateria}</p>
                        <p><strong>IMEI:</strong> ${venta.equipoRecibido.imei || 'N/A'}</p>
                        <p><strong>Valor:</strong> ${formatearMoneda(venta.equipoRecibido.valor)}</p>
                    </div>
                </div>
            `;
        }
        
        // Sección Pago (siempre presente)
        let detallesPago = [];
        
        if (venta.formaPago === 'mixto' && venta.pagoMixto) {
            if (venta.pagoMixto.efectivo > 0) {
                detallesPago.push(`<p class="bg-green-100 px-2 py-1 rounded">Efectivo: ${formatearMoneda(venta.pagoMixto.efectivo)}</p>`);
            }
            if (venta.pagoMixto.zelle > 0) {
                detallesPago.push(`<p class="bg-blue-100 px-2 py-1 rounded">Zelle: ${formatearMoneda(venta.pagoMixto.zelle)}</p>`);
            }
            if (venta.pagoMixto.binance > 0) {
                detallesPago.push(`<p class="bg-yellow-100 px-2 py-1 rounded">Binance: ${formatearMoneda(venta.pagoMixto.binance)}</p>`);
            }
            if (venta.pagoMixto.pagoMovil > 0) {
                if (venta.pagoMixto.pagoMovilDetalles) {
                    detallesPago.push(`<p class="bg-purple-100 px-2 py-1 rounded">Pago Móvil: ${formatearMoneda(venta.pagoMixto.pagoMovilDetalles.dolares)} = ${venta.pagoMixto.pagoMovilDetalles.bolivares}Bs (${venta.pagoMixto.pagoMovilDetalles.tasa})</p>`);
                } else {
                    detallesPago.push(`<p class="bg-purple-100 px-2 py-1 rounded">Pago Móvil: ${formatearMoneda(venta.pagoMixto.pagoMovil)}</p>`);
                }
            }
            if (venta.pagoMixto.transferencia > 0) {
                if (venta.pagoMixto.transferenciaDetalles) {
                    detallesPago.push(`<p class="bg-indigo-100 px-2 py-1 rounded">Transferencia: ${formatearMoneda(venta.pagoMixto.transferenciaDetalles.dolares)} = ${venta.pagoMixto.transferenciaDetalles.bolivares}Bs (${venta.pagoMixto.transferenciaDetalles.tasa})</p>`);
                } else {
                    detallesPago.push(`<p class="bg-indigo-100 px-2 py-1 rounded">Transferencia: ${formatearMoneda(venta.pagoMixto.transferencia)}</p>`);
                }
            }
        } else if (venta.formaPago === 'pagomovil' && venta.pagoMovilDetalles) {
            detallesPago.push(`<p class="bg-purple-100 px-2 py-1 rounded">Pago Móvil: ${formatearMoneda(venta.pagoMovilDetalles.dolares)} = ${venta.pagoMovilDetalles.bolivares}Bs (${venta.pagoMovilDetalles.tasa})</p>`);
        } else if (venta.formaPago === 'transferencia' && venta.transferenciaDetalles) {
            detallesPago.push(`<p class="bg-indigo-100 px-2 py-1 rounded">Transferencia: ${formatearMoneda(venta.transferenciaDetalles.dolares)} = ${venta.transferenciaDetalles.bolivares}Bs (${venta.transferenciaDetalles.tasa})</p>`);
        } else {
            detallesPago.push(`<p class="bg-blue-100 px-2 py-1 rounded">${venta.formaPago.toUpperCase()}: ${formatearMoneda(venta.montoTotal - (venta.equipoRecibido ? venta.equipoRecibido.valor : 0))}</p>`);
        }
        
        if (venta.equipoRecibido) {
            detallesPago.push(`<p class="bg-orange-100 px-2 py-1 rounded">Equipo recibido: ${venta.equipoRecibido.modelo} (${formatearMoneda(venta.equipoRecibido.valor)})</p>`);
        }
        
        seccionPago = `
            <div class="bg-purple-50 p-3 rounded-lg">
                <h5 class="font-semibold text-purple-800 text-xs mb-2 flex items-center">
                    <span class="mr-1">💳</span> Pago
                </h5>
                <div class="text-xs space-y-1">
                    ${detallesPago.join('')}
                    <p class="mt-2 pt-2 border-t border-purple-200 font-bold text-sm">Total: ${formatearMoneda(venta.montoTotal)}</p>
                </div>
            </div>
        `;
        
        return `
            <div class="border-2 ${venta.tipoTransaccion === 'abono' ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'} rounded-xl p-4 shadow-md mb-4 fade-in hover-lift">
                <!-- Header -->
                <div class="flex justify-between items-start mb-3 pb-2 border-b">
                    <div>
                        <h4 class="font-bold text-gray-800 text-sm">
                            ${venta.tipoTransaccion === 'abono' ? '💰 ABONO' : '💳 VENTA'}
                            ${weppaHtml}
                        </h4>
                        ${venta.tipoVenta === 'completa' ? `<p class="text-xs text-gray-600 mt-1">${venta.cliente.nombre} (${venta.cliente.cedula})</p>` : '<p class="text-xs text-gray-600 mt-1">Solo Accesorios</p>'}
                    </div>
                    <span class="text-xs text-gray-500">${venta.hora}</span>
                </div>
                
                <!-- Grid de secciones -->
                <div class="grid grid-cols-1 md:grid-cols-${venta.equipoRecibido ? '4' : '3'} gap-3 mb-3">
                    ${seccionEquipo}
                    ${seccionAccesorios}
                    ${seccionEquipoRecibido}
                    ${seccionPago}
                </div>
                
                ${venta.notaVentaDetalles ? `
                    <div class="bg-purple-100 p-2 rounded text-xs mb-3">
                        <strong>📝 Nota:</strong> ${venta.notaVentaDetalles}
                    </div>
                ` : ''}
                
                <!-- Botones de acción -->
                <div class="flex gap-2 flex-wrap pt-2 border-t">
                    <button onclick="app.editarVenta('${venta.id}')" class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded transition flex items-center gap-1">
                        <span>✏️</span> Editar
                    </button>
                    ${venta.tipoVenta === 'completa' ? `
                        <button onclick="app.imprimirGarantia('${venta.id}')" class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded transition flex items-center gap-1">
                            <span>🖨️</span> Garantía
                        </button>
                    ` : ''}
                    <button onclick="app.eliminarVenta('${venta.id}')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition flex items-center gap-1">
                        <span>🗑️</span> Eliminar
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Actualiza el resumen de movimientos
     */
    actualizarResumenMovimientos() {
        const resumenElement = document.getElementById('resumenMovimientos');
        if (!resumenElement) {
            console.warn('Elemento resumenMovimientos no encontrado');
            return;
        }
        
        const fechaHoy = new Date().toLocaleDateString('es-ES'); // 1. Obtenemos la fecha
        
        // 2. Filtramos los movimientos al instante
        const movimientos = movimientoService.obtenerMovimientos().filter(m => m.fecha === fechaHoy);
        console.log('📦 Movimientos obtenidos:', movimientos.length, movimientos);
        
        if (movimientos.length === 0) {
            resumenElement.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-400 text-lg">📦</p>
                    <p class="text-gray-600">No hay movimientos registrados hoy.</p>
                    <p class="text-sm text-gray-500 mt-2">Los movimientos de inventario aparecerán aquí</p>
                </div>
            `;
        } else {
            // Agrupar movimientos por tipo (case insensitive)
            const ingresos = movimientos.filter(m => 
                m.tipo.toLowerCase().includes('ingreso') || 
                m.tipo.toLowerCase().includes('compra')
            );
            const salidas = movimientos.filter(m => 
                m.tipo.toLowerCase().includes('salida')
            );
            
            // Línea 1291 (después de definir salidas)
            const cambiosGarantia = movimientos.filter(m => 
                m.tipo.toLowerCase().includes('cambio') && 
                m.tipo.toLowerCase().includes('garantía')
            );
            let html = '';
            
            if (ingresos.length > 0) {
                html += `
                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">⬅️ ${ingresos.length}</span>
                            Ingresos
                        </h3>
                        <div class="space-y-2">
                            ${ingresos.map(mov => this.renderizarMovimiento(mov)).join('')}
                        </div>
                    </div>
                `;
            }
            
            if (salidas.length > 0) {
                html += `
                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span class="bg-red-100 text-red-800 px-2 py-1 rounded mr-2">➡️ ${salidas.length}</span>
                            Salidas
                        </h3>
                        <div class="space-y-2">
                            ${salidas.map(mov => this.renderizarMovimiento(mov)).join('')}
                        </div>
                    </div>
                `;
            }
            if (cambiosGarantia.length > 0) {
                html += `
                    <div class="mb-4">
                        <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">🔄 ${cambiosGarantia.length}</span>
                            Cambios por Garantía
                        </h3>
                        <div class="space-y-2">
                            ${cambiosGarantia.map(mov => this.renderizarMovimiento(mov)).join('')}
                        </div>
                    </div>
                `;
            }
            
            resumenElement.innerHTML = html;
        }
    }
    
    /**
     * Renderiza un movimiento en HTML
     */
    renderizarMovimiento(movimientoData) {
        // Asegurar que sea una instancia de Movimiento
        const movimiento = movimientoData instanceof Movimiento 
            ? movimientoData 
            : Movimiento.fromJSON(movimientoData);
        
        // Determinar color según tipo
        let colorClass = 'bg-white border-gray-200';
        const tipoLower = movimiento.tipo.toLowerCase();
        
        if (tipoLower.includes('cambio') && tipoLower.includes('garantía')) {
            colorClass = 'bg-blue-50 border-blue-300';
        } else if (tipoLower.includes('ingreso') || tipoLower.includes('compra')) {
            colorClass = 'bg-green-50 border-green-200';
        } else if (tipoLower.includes('salida')) {
            colorClass = 'bg-red-50 border-red-200';
        }
        
        // Obtener título y detalles (ahora sí funcionan los métodos)
        let titulo = movimiento.tipo;
        let detalles = '';
        
        try {
            titulo = movimiento.obtenerTitulo();
            detalles = movimiento.obtenerDetalles();
        } catch (error) {
            console.error('Error al renderizar movimiento:', error, movimiento);
            detalles = 'Error al cargar detalles';
        }
        
        return `
            <div class="border rounded-lg p-3 ${colorClass} shadow-sm fade-in">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h5 class="font-semibold text-sm mb-1">${titulo}</h5>
                        <p class="text-xs text-gray-600">${detalles}</p>
                    </div>
                    <span class="text-xs text-gray-500 ml-2">${movimiento.hora || ''}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Edita una venta
     */
    editarVenta(ventaId) {
        const venta = ventaService.obtenerVentaPorId(ventaId);
        
        if (!venta) {
            mostrarAlerta('Venta no encontrada', 'error');
            return;
        }
        
        // Marcar que estamos editando
        this.ventaEnEdicion = ventaId;
        
        // Llenar el formulario con los datos de la venta
        this.llenarFormularioConVenta(venta);
        
        // Cambiar el botón de submit
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '✏️ Actualizar Venta';
        submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        submitBtn.classList.add('bg-orange-600', 'hover:bg-orange-700');
        
        // Agregar botón de cancelar si no existe
        let cancelBtn = document.getElementById('cancelarEdicion');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'cancelarEdicion';
            cancelBtn.className = 'bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition';
            cancelBtn.innerHTML = '❌ Cancelar Edición';
            cancelBtn.onclick = () => this.cancelarEdicion();
            
            // Insertar después del botón de submit
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
        }
        
        // Scroll al formulario
        document.getElementById('ventaForm').scrollIntoView({ behavior: 'smooth' });
        
        mostrarAlerta('Editando venta. Modifica los campos y guarda los cambios.', 'info');
    }
    
    /**
     * Cancela la edición y restaura el formulario
     */
    cancelarEdicion() {
        this.ventaEnEdicion = null;
        
        // Restaurar botón de submit
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '✅ Registrar Venta';
        submitBtn.classList.remove('bg-orange-600', 'hover:bg-orange-700');
        submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        
        // Eliminar botón de cancelar
        const cancelBtn = document.getElementById('cancelarEdicion');
        if (cancelBtn) {
            cancelBtn.remove();
        }
        
        // Limpiar formulario
        this.limpiarFormularioVenta();
        
        mostrarAlerta('Edición cancelada', 'info');
    }
    
    /**
     * Llena el formulario con los datos de una venta
     */
    llenarFormularioConVenta(venta) {
        // Tipo de venta
        document.querySelector(`input[name="tipoVenta"][value="${venta.tipoVenta}"]`).checked = true;
        this.manejarCambioTipoVenta();
        
        // Cliente y Equipo (si es venta completa)
        if (venta.tipoVenta === 'completa') {
            document.getElementById('clienteNombre').value = venta.cliente.nombre || '';
            document.getElementById('clienteCedula').value = venta.cliente.cedula || '';
            document.getElementById('clienteTelefono').value = venta.cliente.telefono || '';
            
            document.getElementById('modelo').value = venta.equipo.modelo || '';
            document.getElementById('color').value = venta.equipo.color || '';
            document.getElementById('almacenamiento').value = venta.equipo.almacenamiento || '';
            document.getElementById('bateria').value = venta.equipo.bateria.replace('%', '') || '';
            document.getElementById('equipoImei').value = venta.equipo.imei || '';
            document.getElementById('equipoGarantia').value = venta.equipo.garantia || '';
        }
        
        // Accesorios - Usar setTimeout para asegurar que los elementos estén visibles
        setTimeout(() => {
            // Forro
            if (venta.accesorios.forro) {
                document.getElementById('forro').checked = true;
                document.getElementById('forro').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const forroSelect = document.querySelector('#forroModelo select');
                    const forroCantidad = document.querySelector('#forroModelo input');
                    if (forroSelect) forroSelect.value = venta.accesorios.forroModelo || '';
                    if (forroCantidad) forroCantidad.value = venta.accesorios.forroCantidad || 1;
                }, 50);
            }
            
            // Cargador
            if (venta.accesorios.cargador) {
                document.getElementById('cargador').checked = true;
                document.getElementById('cargador').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const cargadorCantidad = document.querySelector('#cargadorCantidad input');
                    if (cargadorCantidad) cargadorCantidad.value = venta.accesorios.cargadorCantidad || 1;
                }, 50);
            }
            
            // Vidrio
            if (venta.accesorios.vidrio) {
                document.getElementById('vidrio').checked = true;
                document.getElementById('vidrio').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const vidrioSelect = document.querySelector('#vidrioModelo select');
                    const vidrioCantidad = document.querySelector('#vidrioModelo input');
                    if (vidrioSelect) vidrioSelect.value = venta.accesorios.vidrioModelo || '';
                    if (vidrioCantidad) vidrioCantidad.value = venta.accesorios.vidrioCantidad || 1;
                }, 50);
            }
            
            // Protector de cámara
            if (venta.accesorios.protectorCamara) {
                document.getElementById('protectorCamara').checked = true;
                document.getElementById('protectorCamara').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const protectorCantidad = document.querySelector('#protectorCantidad input');
                    if (protectorCantidad) protectorCantidad.value = venta.accesorios.protectorCantidad || 1;
                }, 50);
            }
            
            // Cubo
            if (venta.accesorios.cubo) {
                document.getElementById('cubo').checked = true;
                document.getElementById('cubo').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const cuboCantidad = document.querySelector('#cuboCantidad input');
                    if (cuboCantidad) cuboCantidad.value = venta.accesorios.cuboCantidad || 1;
                }, 50);
            }
            
            // Cable Lightning
            if (venta.accesorios.cableLightning) {
                document.getElementById('cableLightning').checked = true;
                document.getElementById('cableLightning').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const cableLightningCantidad = document.querySelector('#cableLightningCantidad input');
                    if (cableLightningCantidad) cableLightningCantidad.value = venta.accesorios.cableLightningCantidad || 1;
                }, 50);
            }
            
            // Cable C+C
            if (venta.accesorios.cableCC) {
                document.getElementById('cableCC').checked = true;
                document.getElementById('cableCC').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const cableCCCantidad = document.querySelector('#cableCCCantidad input');
                    if (cableCCCantidad) cableCCCantidad.value = venta.accesorios.cableCCCantidad || 1;
                }, 50);
            }
            
            // Caja
            if (venta.accesorios.caja) {
                document.getElementById('caja').checked = true;
                document.getElementById('caja').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const cajaModelo = document.querySelector('#cajaModelo select:first-child');
                    const cajaColor = document.getElementById('cajaColorSelect');
                    const cajaCantidad = document.querySelector('#cajaModelo input');
                    if (cajaModelo) cajaModelo.value = venta.accesorios.cajaModelo || '';
                    if (cajaColor) cajaColor.value = venta.accesorios.cajaColor || '';
                    if (cajaCantidad) cajaCantidad.value = venta.accesorios.cajaCantidad || 1;
                }, 50);
            }
        }, 100);
        
        // Forma de pago
        document.querySelector(`input[name="formaPago"][value="${venta.formaPago}"]`).checked = true;
        this.manejarCambioFormaPago();
        
        // Detalles de pago según tipo
        setTimeout(() => {
            if (venta.formaPago === 'efectivo') {
                document.getElementById('efectivoMonto').value = venta.montoTotal || 0;
            } else if (venta.formaPago === 'zelle') {
                document.getElementById('zelleMonto').value = venta.montoTotal || 0;
            } else if (venta.formaPago === 'binance') {
                document.getElementById('binanceMonto').value = venta.montoTotal || 0;
            } else if (venta.formaPago === 'mixto' && venta.pagoMixto) {
                document.getElementById('montoEfectivo').value = venta.pagoMixto.efectivo || 0;
                document.getElementById('montoZelle').value = venta.pagoMixto.zelle || 0;
                document.getElementById('montoBinance').value = venta.pagoMixto.binance || 0;
                document.getElementById('montoPagoMovilDolares').value = venta.pagoMixto.pagoMovil || 0;
                document.getElementById('montoTransferenciaDolares').value = venta.pagoMixto.transferencia || 0;
                this.calcularTotalMixto();
            } else if (venta.formaPago === 'pagomovil' && venta.pagoMovilDetalles) {
                document.getElementById('pagomovilDolares').value = venta.pagoMovilDetalles.dolares || 0;
                document.getElementById('pagomovilBolivares').value = venta.pagoMovilDetalles.bolivares || 0;
                document.getElementById('pagomovilTasa').value = venta.pagoMovilDetalles.tasa || 0;
            } else if (venta.formaPago === 'transferencia' && venta.transferenciaDetalles) {
                document.getElementById('transferenciaDolares').value = venta.transferenciaDetalles.dolares || 0;
                document.getElementById('transferenciaBolivares').value = venta.transferenciaDetalles.bolivares || 0;
                document.getElementById('transferenciaTasa').value = venta.transferenciaDetalles.tasa || 0;
            }
        }, 150);
        
        // Equipo recibido
        if (venta.equipoRecibido) {
            document.getElementById('recibirEquipo').checked = true;
            document.getElementById('recibirEquipo').dispatchEvent(new Event('change'));
            setTimeout(() => {
                document.getElementById('equipoModelo').value = venta.equipoRecibido.modelo || '';
                document.getElementById('equipoCapacidad').value = venta.equipoRecibido.capacidad || '';
                document.getElementById('equipoColor').value = venta.equipoRecibido.color || '';
                document.getElementById('equipoBateria').value = venta.equipoRecibido.bateria.replace('%', '') || '';
                document.getElementById('equipoImei').value = venta.equipoRecibido.imei || '';
                document.getElementById('equipoValor').value = venta.equipoRecibido.valor || 0;
                document.getElementById('equipoComentarios').value = venta.equipoRecibido.comentarios || '';
            }, 150);
        }
        
        // Monto total
        document.getElementById('montoTotal').value = venta.montoTotal;
        
        // Tipo de transacción
        document.querySelector(`input[name="tipoTransaccion"][value="${venta.tipoTransaccion}"]`).checked = true;
        this.manejarCambioTipoTransaccion();
        
        // WEPPA
        document.getElementById('weppa').checked = venta.weppa || false;
        if (venta.weppa) {
            document.getElementById('weppa').dispatchEvent(new Event('change'));
            setTimeout(() => {
                document.getElementById('montoTotalManual').value = venta.montoTotal;
            }, 200);
        }
        
        // Nota de venta
        if (venta.notaVentaDetalles) {
            document.getElementById('notaVenta').checked = true;
            document.getElementById('notaVenta').dispatchEvent(new Event('change'));
            setTimeout(() => {
                document.getElementById('notaVentaDetalles').value = venta.notaVentaDetalles;
            }, 100);
        }
        
        // Recalcular y mostrar totales después de cargar todo
        setTimeout(() => {
            this.calcularYMostrarTotal();
        }, 250);
    }
    
    /**
     * Imprime la garantía de una venta
     */
    imprimirGarantia(ventaId) {
        const venta = ventaService.obtenerVentaPorId(ventaId);
        
        if (!venta) {
            mostrarAlerta('Venta no encontrada', 'error');
            return;
        }
        
        if (venta.tipoVenta !== 'completa') {
            mostrarAlerta('Solo se pueden imprimir garantías de ventas completas', 'warning');
            return;
        }
        
        printService.imprimirGarantia(venta);
    }
    
    /**
     * Imprime la garantía de un cambio por garantía
     */
    imprimirGarantiaCambio(cambio) {
        printService.imprimirGarantiaCambio(cambio);
    }
    
    /**
     * Imprime el resumen del día
     */
    imprimirResumenDia() {
        const fechaHoy = new Date().toLocaleDateString('es-ES'); // 1. Obtenemos la fecha
        
        // 2. Filtramos al instante por la fecha de hoy
        const ventas = ventaService.obtenerVentas().filter(v => v.fecha === fechaHoy);
        const movimientos = movimientoService.obtenerMovimientos().filter(m => m.fecha === fechaHoy);
        
        printService.imprimirResumenDia(ventas, movimientos, this.cajaActual);
    }
    
    /**
     * Elimina una venta
     */
    eliminarVenta(ventaId) {
        if (confirmar('¿Estás seguro de que quieres eliminar esta venta?')) {
            const resultado = ventaService.eliminarVenta(ventaId);
            
            if (resultado.exito) {
                mostrarAlerta(resultado.mensaje, 'success');
                this.actualizarUI();
            } else {
                mostrarAlerta(resultado.errores.join('<br>'), 'error');
            }
        }
    }
    /**
     * Inicializa eventos de movimientos de inventario
     */
    inicializarEventosMovimientos() {
        // Botones de tipo de movimiento
        const botones = {
            'btnSalidaEfectivo': 'formSalidaEfectivo',
            'btnIngresoEfectivo': 'formIngresoEfectivo',
            'btnSalidaEquipo': 'formSalidaEquipo',
            'btnIngresoEquipo': 'formIngresoEquipo',
            'btnSalidaAccesorio': 'formSalidaAccesorio',
            'btnIngresoAccesorio': 'formIngresoAccesorio',
            'btnCompraEquipo': 'formCompraEquipo'
        };

        Object.entries(botones).forEach(([btnId, formId]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this.mostrarFormularioMovimiento(btnId, formId));
            }
        });

        // Botones de acción
        const btnGuardar = document.getElementById('guardarMovimiento');
        const btnCancelar = document.getElementById('cancelarMovimiento');

        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.guardarMovimiento());
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarMovimiento());
        }

        // Eventos para destinos/orígenes personalizados
        this.inicializarDestinosPersonalizados();
        
        // Eventos para tipos de accesorios
        this.inicializarTiposAccesorios();
    }

    /**
     * Muestra el formulario de movimiento seleccionado
     */
    mostrarFormularioMovimiento(btnId, formId) {
        // Remover selección de todos los botones
        document.querySelectorAll('.movimiento-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-200');
        });

        // Marcar botón seleccionado
        const btnSeleccionado = document.getElementById(btnId);
        if (btnSeleccionado) {
            btnSeleccionado.classList.add('border-blue-500', 'bg-blue-200');
        }

        // Ocultar todos los formularios
        document.querySelectorAll('.movimiento-form').forEach(form => {
            form.classList.add('hidden');
        });

        // Mostrar formulario seleccionado
        const formSeleccionado = document.getElementById(formId);
        if (formSeleccionado) {
            formSeleccionado.classList.remove('hidden');
        }

        // Mostrar contenedor de formularios
        const contenedor = document.getElementById('movimientoForms');
        if (contenedor) {
            contenedor.classList.remove('hidden');
        }

        // Guardar tipo de movimiento actual
        this.tipoMovimientoActual = formId;
    }

    /**
     * Inicializa eventos para destinos/orígenes personalizados
     */
    inicializarDestinosPersonalizados() {
        // Salida de equipo
        const salidaEquipoDestino = document.getElementById('salidaEquipoDestino');
        if (salidaEquipoDestino) {
            salidaEquipoDestino.addEventListener('change', (e) => {
                const div = document.getElementById('salidaEquipoDestinoPersonalizadoDiv');
                if (div) {
                    div.classList.toggle('hidden', e.target.value !== 'Otro');
                }
            });
        }

        // Ingreso de equipo
        const ingresoEquipoOrigen = document.getElementById('ingresoEquipoOrigen');
        if (ingresoEquipoOrigen) {
            ingresoEquipoOrigen.addEventListener('change', (e) => {
                const div = document.getElementById('ingresoEquipoOrigenPersonalizadoDiv');
                if (div) {
                    div.classList.toggle('hidden', e.target.value !== 'Otro');
                }
            });
        }

        // Salida de accesorio
        const salidaAccesorioDestino = document.getElementById('salidaAccesorioDestino');
        if (salidaAccesorioDestino) {
            salidaAccesorioDestino.addEventListener('change', (e) => {
                const div = document.getElementById('salidaAccesorioDestinoPersonalizadoDiv');
                if (div) {
                    div.classList.toggle('hidden', e.target.value !== 'Otro');
                }
            });
        }
    }

    /**
     * Inicializa eventos para tipos de accesorios
     */
    inicializarTiposAccesorios() {
        // Salida de accesorio
        const salidaTipo = document.getElementById('salidaAccesorioTipo');
        if (salidaTipo) {
            salidaTipo.addEventListener('change', (e) => {
                this.mostrarDetallesAccesorio('salida', e.target.value);
            });
        }

        // Ingreso de accesorio
        const ingresoTipo = document.getElementById('ingresoAccesorioTipo');
        if (ingresoTipo) {
            ingresoTipo.addEventListener('change', (e) => {
                this.mostrarDetallesAccesorio('ingreso', e.target.value);
            });
        }
    }

    /**
     * Muestra detalles específicos según el tipo de accesorio
     */
    mostrarDetallesAccesorio(tipo, tipoAccesorio) {
        const contenedor = document.getElementById(`${tipo}AccesorioDetalles`);
        if (!contenedor) return;

        contenedor.innerHTML = '';

        if (!tipoAccesorio) return;

        let html = '<div class="bg-white p-4 rounded-lg border mt-4">';
        html += `<h4 class="font-medium text-gray-800 mb-3">Detalles del ${tipoAccesorio}</h4>`;

        switch (tipoAccesorio) {
            case 'Forro':
            case 'Vidrio Templado':
            case 'Caja':
            case 'Protector de Cámara':
                html += this.generarFormularioMultiModelo(tipo, tipoAccesorio);
                break;
            case 'Cargador':
                html += this.generarFormularioCargador(tipo);
                break;
            case 'Cable':
                html += this.generarFormularioCable(tipo);
                break;
            case 'Cubo':
                html += this.generarFormularioCubo(tipo);
                break;
            case 'Otro':
                html += this.generarFormularioOtro(tipo);
                break;
        }

        html += '</div>';
        contenedor.innerHTML = html;

        // Si es multi-modelo, inicializar evento de cantidad
        if (['Forro', 'Vidrio Templado', 'Caja', 'Protector de Cámara'].includes(tipoAccesorio)) {
            this.inicializarCantidadModelos(tipo, tipoAccesorio);
        }
    }

    /**
     * Genera formulario para accesorios con múltiples modelos
     */
    generarFormularioMultiModelo(tipo, tipoAccesorio) {
        const maxModelos = tipoAccesorio === 'Forro' ? 5 : 10;
        let html = '<div class="mb-3">';
        html += '<label class="block text-sm font-medium text-gray-700 mb-1">¿Cuántos modelos diferentes?</label>';
        html += `<select id="${tipo}${tipoAccesorio.replace(/ /g, '')}CantidadModelos" class="w-full p-2 border rounded-lg">`;
        for (let i = 1; i <= maxModelos; i++) {
            html += `<option value="${i}">${i} modelo${i > 1 ? 's' : ''}</option>`;
        }
        html += '</select></div>';
        html += `<div id="${tipo}${tipoAccesorio.replace(/ /g, '')}Modelos"></div>`;
        return html;
    }

    /**
     * Genera formulario para cargador
     */
    generarFormularioCargador(tipo) {
        return `
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input type="number" id="${tipo}CargadorCantidad" min="1" value="1" class="w-full p-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Modelo/Descripción</label>
                    <input type="text" id="${tipo}CargadorModelo" class="w-full p-2 border rounded-lg" placeholder="Ej: 20W USB-C">
                </div>
            </div>
        `;
    }

    /**
     * Genera formulario para cable
     */
    generarFormularioCable(tipo) {
        return `
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Cable</label>
                    <select id="${tipo}CableTipo" class="w-full p-2 border rounded-lg">
                        <option value="">Seleccionar</option>
                        <option value="USB-C a USB-C">USB-C a USB-C</option>
                        <option value="Lightning">Lightning</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input type="number" id="${tipo}CableCantidad" min="1" value="1" class="w-full p-2 border rounded-lg">
                </div>
            </div>
        `;
    }

    /**
     * Genera formulario para cubo
     */
    generarFormularioCubo(tipo) {
        return `
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input type="number" id="${tipo}CuboCantidad" min="1" value="1" class="w-full p-2 border rounded-lg">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descripción adicional</label>
                    <textarea id="${tipo}CuboDescripcion" rows="2" class="w-full p-2 border rounded-lg" placeholder="Especificaciones, potencia, etc."></textarea>
                </div>
            </div>
        `;
    }

    /**
     * Genera formulario para otro accesorio
     */
    generarFormularioOtro(tipo) {
        return `
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input type="number" id="${tipo}OtroCantidad" min="1" value="1" class="w-full p-2 border rounded-lg">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descripción completa</label>
                    <textarea id="${tipo}OtroDescripcion" rows="3" class="w-full p-2 border rounded-lg" placeholder="Descripción detallada del accesorio"></textarea>
                </div>
            </div>
        `;
    }

    /**
     * Inicializa evento de cambio de cantidad de modelos
     */
    inicializarCantidadModelos(tipo, tipoAccesorio) {
        const selectId = `${tipo}${tipoAccesorio.replace(/ /g, '')}CantidadModelos`;
        const select = document.getElementById(selectId);
        
        if (select) {
            select.addEventListener('change', (e) => {
                this.generarCamposModelos(tipo, tipoAccesorio, parseInt(e.target.value));
            });
            
            // Generar campos iniciales
            this.generarCamposModelos(tipo, tipoAccesorio, 1);
        }
    }

    /**
     * Genera campos para cada modelo
     */
    generarCamposModelos(tipo, tipoAccesorio, cantidad) {
        const contenedorId = `${tipo}${tipoAccesorio.replace(/ /g, '')}Modelos`;
        const contenedor = document.getElementById(contenedorId);
        
        if (!contenedor) return;

        let html = '';
        for (let i = 1; i <= cantidad; i++) {
            html += '<div class="bg-gray-50 p-3 rounded-lg mb-3">';
            html += `<p class="text-sm font-medium text-gray-700 mb-2">Modelo ${i}</p>`;
            html += '<div class="grid md:grid-cols-2 gap-3">';
            
            // Modelo de iPhone
            html += '<div>';
            html += '<label class="block text-xs text-gray-600 mb-1">Modelo iPhone</label>';
            html += `<select class="w-full p-2 border rounded-lg text-sm" data-modelo="${i}">`;
            html += '<option value="">Seleccionar</option>';
            MODELOS_IPHONE.forEach(modelo => {
                html += `<option value="${modelo.valor}">${modelo.etiqueta}</option>`;
            });
            html += '</select></div>';
            
            // Cantidad
            html += '<div>';
            html += '<label class="block text-xs text-gray-600 mb-1">Cantidad</label>';
            html += `<input type="number" min="1" value="1" class="w-full p-2 border rounded-lg text-sm" data-cantidad="${i}">`;
            html += '</div>';
            
            // Si es Caja, agregar color
            if (tipoAccesorio === 'Caja') {
                html += '<div class="md:col-span-2">';
                html += '<label class="block text-xs text-gray-600 mb-1">Color</label>';
                html += `<select class="w-full p-2 border rounded-lg text-sm" data-color="${i}">`;
                html += '<option value="">Seleccionar</option>';
                COLORES_IPHONE.forEach(color => {
                    html += `<option value="${color.valor}">${color.etiqueta}</option>`;
                });
                html += '</select></div>';
            }
            
            html += '</div></div>';
        }
        
        contenedor.innerHTML = html;
    }

    /**
     * Guarda el movimiento de inventario
     */
    guardarMovimiento() {
        try {
            const datos = this.recopilarDatosMovimiento();
            console.log('📝 Datos recopilados:', datos);
            
            if (!datos) {
                alert('Por favor complete todos los campos requeridos');
                return;
            }


            // Guardar usando el servicio
            const resultado = movimientoService.crearMovimiento(datos);
            console.log('💾 Resultado del guardado:', resultado);
            
            if (resultado.exito) {
                alert('✅ Movimiento registrado correctamente');
                this.cancelarMovimiento();
                
                // Actualizar resumen con manejo de errores separado
                try {
                    this.actualizarResumenMovimientos();
                    this.actualizarResumenVentas();  // ⭐ AGREGAR ESTA LÍNEA
                } catch (errorResumen) {
                    console.error('Error al actualizar resumen:', errorResumen);
                    // No mostrar alert aquí, el movimiento ya se guardó correctamente
                }
            } else {
                const errores = resultado.errores ? resultado.errores.join('\n') : 'Error desconocido';
                alert('❌ Error al guardar el movimiento:\n' + errores);
            }
        } catch (error) {
            console.error('Error al guardar movimiento:', error);
            alert('❌ Error al guardar el movimiento: ' + error.message);
        }
    }

    /**
     * Recopila datos del formulario de movimiento activo
     */
    recopilarDatosMovimiento() {
        if (!this.tipoMovimientoActual) return null;

        let tipo = '';
        let datosMovimiento = {};

        switch (this.tipoMovimientoActual) {
            case 'formSalidaEfectivo':
                tipo = 'Salida Efectivo';
                datosMovimiento.monto = parseFloat(document.getElementById('salidaEfectivoMonto')?.value || 0);
                datosMovimiento.persona = document.getElementById('salidaEfectivoPersona')?.value || '';
                datosMovimiento.nota = document.getElementById('salidaEfectivoNota')?.value || '';
                break;

            case 'formIngresoEfectivo':
                tipo = 'Ingreso Efectivo';
                datosMovimiento.monto = parseFloat(document.getElementById('ingresoEfectivoMonto')?.value || 0);
                datosMovimiento.nota = document.getElementById('ingresoEfectivoNota')?.value || '';
                break;

            case 'formSalidaEquipo':
                tipo = 'Salida Equipo';
                datosMovimiento.modelo = document.getElementById('salidaEquipoModelo')?.value || '';
                datosMovimiento.capacidad = document.getElementById('salidaEquipoCapacidad')?.value || '';
                datosMovimiento.color = document.getElementById('salidaEquipoColor')?.value || '';
                datosMovimiento.bateria = document.getElementById('salidaEquipoBateria')?.value || '';
                datosMovimiento.imei = document.getElementById('salidaEquipoImei')?.value || '';
                datosMovimiento.destino = document.getElementById('salidaEquipoDestino')?.value || '';
                if (datosMovimiento.destino === 'Otro') {
                    datosMovimiento.destino = document.getElementById('salidaEquipoDestinoPersonalizado')?.value || '';
                }
                datosMovimiento.persona = document.getElementById('salidaEquipoPersona')?.value || '';
                datosMovimiento.nota = document.getElementById('salidaEquipoNota')?.value || '';
                break;

            case 'formIngresoEquipo':
                tipo = 'Ingreso Equipo';
                datosMovimiento.modelo = document.getElementById('ingresoEquipoModelo')?.value || '';
                datosMovimiento.capacidad = document.getElementById('ingresoEquipoCapacidad')?.value || '';
                datosMovimiento.color = document.getElementById('ingresoEquipoColor')?.value || '';
                datosMovimiento.bateria = document.getElementById('ingresoEquipoBateria')?.value || '';
                datosMovimiento.imei = document.getElementById('ingresoEquipoImei')?.value || '';
                datosMovimiento.origen = document.getElementById('ingresoEquipoOrigen')?.value || '';
                if (datosMovimiento.origen === 'Otro') {
                    datosMovimiento.origen = document.getElementById('ingresoEquipoOrigenPersonalizado')?.value || '';
                }
                datosMovimiento.nota = document.getElementById('ingresoEquipoNota')?.value || '';
                break;

            case 'formCompraEquipo':
                tipo = 'Compra Equipo';
                datosMovimiento.modelo = document.getElementById('compraEquipoModelo')?.value || '';
                datosMovimiento.capacidad = document.getElementById('compraEquipoCapacidad')?.value || '';
                datosMovimiento.color = document.getElementById('compraEquipoColor')?.value || '';
                datosMovimiento.bateria = document.getElementById('compraEquipoBateria')?.value || '';
                datosMovimiento.imei = document.getElementById('compraEquipoImei')?.value || '';
                datosMovimiento.precio = parseFloat(document.getElementById('compraEquipoPrecio')?.value || 0);
                datosMovimiento.proveedor = document.getElementById('compraEquipoProveedor')?.value || '';
                datosMovimiento.estado = document.getElementById('compraEquipoEstado')?.value || '';
                datosMovimiento.nota = document.getElementById('compraEquipoNota')?.value || '';
                break;

            case 'formSalidaAccesorio':
            case 'formIngresoAccesorio':
                const esSalida = this.tipoMovimientoActual === 'formSalidaAccesorio';
                const prefijo = esSalida ? 'salida' : 'ingreso';
                console.log(this.tipoMovimientoActual)
                tipo = esSalida ? 'Salida Accesorio' : 'Ingreso Accesorio';
                datosMovimiento.tipo = document.getElementById(`${prefijo}AccesorioTipo`)?.value || '';
                
                if (esSalida) {
                    datosMovimiento.destino = document.getElementById('salidaAccesorioDestino')?.value || '';
                    if (datosMovimiento.destino === 'Otro') {
                        datosMovimiento.destino = document.getElementById('salidaAccesorioDestinoPersonalizado')?.value || '';
                    }
                } else {
                    datosMovimiento.proveedor = document.getElementById('ingresoAccesorioProveedor')?.value || '';
                }
                
                // Recopilar detalles específicos del accesorio
                const detalles = this.recopilarDetallesAccesorio(prefijo, datosMovimiento.tipo);
                Object.assign(datosMovimiento, detalles);
                break;
        }

        // Retornar en el formato que espera el modelo Movimiento
        return {
            tipo: tipo,
            datos: datosMovimiento
        };
    }

    /**
     * Recopila detalles específicos del accesorio
     */
    recopilarDetallesAccesorio(prefijo, tipoAccesorio) {
        const detalles = {};
        const tipoSinEspacios = tipoAccesorio.replace(/ /g, '');

        switch (tipoAccesorio) {
            case 'Forro':
            case 'Vidrio Templado':
            case 'Caja':
            case 'Protector de Cámara':
                const cantidadModelos = document.getElementById(`${prefijo}${tipoSinEspacios}CantidadModelos`)?.value || 1;
                detalles.modelos = [];
                
                const contenedor = document.getElementById(`${prefijo}${tipoSinEspacios}Modelos`);
                if (contenedor) {
                    for (let i = 1; i <= cantidadModelos; i++) {
                        const modelo = contenedor.querySelector(`[data-modelo="${i}"]`)?.value || '';
                        const cantidad = contenedor.querySelector(`[data-cantidad="${i}"]`)?.value || 1;
                        const color = tipoAccesorio === 'Caja' ? 
                            (contenedor.querySelector(`[data-color="${i}"]`)?.value || '') : '';
                        
                        if (modelo) {
                            detalles.modelos.push({ modelo, cantidad: parseInt(cantidad), color });
                        }
                    }
                }
                break;

            case 'Cargador':
                detalles.cantidad = document.getElementById(`${prefijo}CargadorCantidad`)?.value || 1;
                detalles.modelo = document.getElementById(`${prefijo}CargadorModelo`)?.value || '';
                break;

            case 'Cable':
                detalles.tipo = document.getElementById(`${prefijo}CableTipo`)?.value || '';
                detalles.cantidad = document.getElementById(`${prefijo}CableCantidad`)?.value || 1;
                break;

            case 'Cubo':
                detalles.cantidad = document.getElementById(`${prefijo}CuboCantidad`)?.value || 1;
                detalles.descripcion = document.getElementById(`${prefijo}CuboDescripcion`)?.value || '';
                break;

            case 'Otro':
                detalles.cantidad = document.getElementById(`${prefijo}OtroCantidad`)?.value || 1;
                detalles.descripcion = document.getElementById(`${prefijo}OtroDescripcion`)?.value || '';
                break;
        }

        return detalles;
    }

    /**
     * Cancela el movimiento actual
     */
    cancelarMovimiento() {
        // Limpiar formularios
        document.querySelectorAll('.movimiento-form').forEach(form => {
            form.classList.add('hidden');
            // Limpiar inputs
            form.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.type === 'number') {
                    input.value = input.min || '';
                } else {
                    input.value = '';
                }
            });
        });

        // Ocultar contenedor
        const contenedor = document.getElementById('movimientoForms');
        if (contenedor) {
            contenedor.classList.add('hidden');
        }

        // Remover selección de botones
        document.querySelectorAll('.movimiento-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-200');
        });

        this.tipoMovimientoActual = null;
    }


}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});



