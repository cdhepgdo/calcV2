/**
* Archivo principal de la aplicación
* Orquesta la inicialización y coordinación de todos los módulos
*/
import { authService } from './services/AuthService.js';
import { CambioGarantia } from './models/CambioGarantia.js';
import { Movimiento } from './models/Movimiento.js';
import { ventaService } from './services/VentaService.js';
import { movimientoService } from './services/MovimientoService.js';
import { storageService } from './services/StorageService.js';
import { inventarioService } from './services/InventarioService.js';
import { EquipoInventario } from './models/EquipoInventario.js';
import { printService } from './services/PrintService.js';
import { Caja } from './models/Caja.js';
import { AccesorioValidator } from './services/AccesorioValidator.js';
import {
    MODELOS_IPHONE,
    COLORES_IPHONE,
    CAPACIDADES_IPHONE,
    GARANTIAS,
    FORMAS_PAGO
} from './config/constants.js';
import { llenarSelect, mostrarAlerta, confirmar } from './utils/domHelpers.js';
import { formatearMoneda, formatearFecha, sanitizar } from './utils/formatters.js';

class App {
    constructor() {
        this.cajaActual = null;
        this.ventaEnEdicion = null;
        // ID del equipo del inventario seleccionado para la venta actual
        this._equipoInventarioId = null;
        // ID del equipo que tenía la venta ANTES de editar (para poder revertirlo)
        this._equipoInventarioIdAnterior = null;
        // IMEI original de la venta antes de editar (para detectar cambios)
        this._equipoImeiOriginal = null;
        // IMEI original del trade-in antes de editar (para permitir editar la misma venta)
        this._tradeInImeiOriginal = null;
        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        console.log('🚀 Iniciando aplicación...');

        // ── StorageService ──────────────────────────────
        storageService.inicializar();
        storageService.onCambio(() => this.actualizarUI());

        // ── InventarioService ──────────────────────────
        // Arranca el listener de inventario disponible para esta sede
        inventarioService.inicializar();
        // Cuando el inventario cambie (ej: se guarda un lote desde otra pestaña)
        // actualizamos el badge de stock disponible
        inventarioService.onCambio(() => this._actualizarBadgeStock());

        // Inicializar componentes (no dependen de datos)
        this.inicializarSelectores();
        this.inicializarEventos();
        this.inicializarBuscadorInventario();

        // Cargar datos iniciales desde Firebase
        await this.cargarDatosIniciales();

        // Actualizar UI con los datos cargados
        await this.actualizarUI();

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
    async cargarDatosIniciales() {
        this.cajaActual = await storageService.obtenerCajaInicial();
        const hoy = new Date().toLocaleDateString('es-ES');
        if (this.cajaActual.cajaInicial > 0 && this.cajaActual.fecha === hoy) {
            // Ya se guardó la caja HOY → mostrar normalmente
            document.getElementById('cajaInicial').value = this.cajaActual.cajaInicial;
            document.getElementById('cajaInicialMostrar').textContent = this.cajaActual.cajaInicial.toFixed(2);
            document.getElementById('cajaInicialConfirmacion').classList.remove('hidden');
        } else {
            const cierreGuardado = await storageService.obtenerCierreCaja();
            if (cierreGuardado) {
                document.getElementById('cajaInicial').value = parseFloat(cierreGuardado.monto).toFixed(2);
                // Borde amarillo para indicar que es un valor sugerido
                document.getElementById('cajaInicial').style.borderColor = '#f59e0b';
            }
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
                let methods = ['efectivo', 'zelle', 'binance', 'pagomovil', 'transferencia']
                let formaPago = methods.some(p => document.querySelector('input[name="formaPago"]:checked')?.value.includes(p))
                //const checkbox = document.getElementById('weppa');
                const montoTotalField = document.getElementById('montoTotal');
                if (formaPago) {
                    montoTotalField.removeAttribute('readonly');
                    montoTotalField.classList.remove('bg-gray-100');
                    montoTotalField.classList.add('bg-white');
                    console.log('i')
                } else {
                    montoTotalField.setAttribute('readonly', true);
                    montoTotalField.classList.add('bg-gray-100');
                    montoTotalField.classList.remove('bg-white');
                    // Recalcular automáticamente
                    //this.calcularTotalMixto();
                    console.log('o')
                }
            });
        });

        /* === NUEVO === */
        // Manejo del checkbox de "Abonos Previos"
        const checkboxAbonos = document.getElementById('tieneAbonosPrevios');
        if (checkboxAbonos) {
            checkboxAbonos.addEventListener('change', (e) => {
                document.getElementById('abonosPreviosDetalles').classList.toggle('hidden', !e.target.checked);
                this.calcularYMostrarTotal();
            });
        }
        // Botones para agregar más abonos
        this.manejarFilasDinamicas('.btn-add-abono-previo', 'listaAbonosPrevios', '.abono-previo-item');
        // Escuchar cambios de importe en los abonos previos
        document.getElementById('listaAbonosPrevios')?.addEventListener('input', (e) => {
            if (e.target.classList.contains('abono-monto')) {
                this.calcularYMostrarTotal();
            }
        });
        /* =========== */
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

        // Validación de IMEI del equipo recibido (trade-in) mientras escribe
        const imeiRecibidoInput = document.getElementById('equipoImeiR');
        if (imeiRecibidoInput) {
            imeiRecibidoInput.addEventListener('input', () => this._revalidarImeiRecibidoActual());
            imeiRecibidoInput.addEventListener('change', () => this._revalidarImeiRecibidoActual());
        }

        // Validación en tiempo real del IMEI del equipo a vender
        const imeiVentaInput = document.getElementById('equipoImei');
        if (imeiVentaInput) {
            imeiVentaInput.addEventListener('input', () => this._actualizarBannerImei());
            imeiVentaInput.addEventListener('paste', () => setTimeout(() => this._actualizarBannerImei(), 0));
        }

        // Botón del banner: seleccionar del inventario
        document.getElementById('imeiInventarioBannerBtn')?.addEventListener('click', () => {
            const imei = (document.getElementById('equipoImei')?.value || '').trim();
            const equipo = inventarioService.buscarPorImei(imei);
            if (equipo && equipo.estado === 'disponible') {
                this._aplicarEquipoDelInventario(equipo);
                this._ocultarBannerImei();
            }
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
        
        // Buscadores de Inventario Estrictos
        this.inicializarBuscadoresInventario();

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
        const accesorios = ['forro', 'cargador', 'vidrio', 'protectorCamara', 'cubo', 'cableLightning', 'cableCC', 'caja', 'otroAccesorio'];

        accesorios.forEach(accesorio => {
            const checkbox = document.getElementById(accesorio);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    let suffix = 'Cantidad';
                    if (['forro', 'vidrio'].includes(accesorio)) suffix = 'Contenedor';
                    else if (accesorio === 'caja') suffix = 'Modelo';
                    else if (accesorio === 'otroAccesorio') suffix = 'Contenedor';

                    const contenedorId = accesorio === 'otroAccesorio' ? 'otroContenedor' : `${accesorio}${suffix}`;
                    const contenedor = document.getElementById(contenedorId);

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

        // Habilitar + / - para dinámicos
        this.manejarFilasDinamicas('.btn-add-forro', 'forroLista', '.forro-item');
        this.manejarFilasDinamicas('.btn-add-vidrio', 'vidrioLista', '.vidrio-item');
        this.manejarFilasDinamicas('.btn-add-otro', 'otroLista', '.otro-item');

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
     * Maneja dinámicamente agregar/quitar filas
     */
    manejarFilasDinamicas(selectorBtnAdd, contenedorPadreId, selectorItem) {
        document.addEventListener('click', e => {
            if (e.target.closest(selectorBtnAdd)) {
                const btn = e.target.closest(selectorBtnAdd);
                const itemOriginal = btn.closest(selectorItem);
                const contenedor = document.getElementById(contenedorPadreId);

                if (!contenedor) return;

                const nuevoItem = itemOriginal.cloneNode(true);

                // Cambiar el botón "+" por uno de "-" (eliminar fila)
                const nuevoBtn = nuevoItem.querySelector(selectorBtnAdd);
                nuevoBtn.className = 'btn-remove-fila bg-red-500 text-white w-8 h-8 rounded font-bold hover:bg-red-600 transition';
                nuevoBtn.textContent = '-';
                nuevoBtn.onclick = () => nuevoItem.remove();

                // Limpiar valores del clon
                const selects = nuevoItem.querySelectorAll('select');
                selects.forEach(s => s.value = '');

                const inputsText = nuevoItem.querySelectorAll('input[type="text"]');
                inputsText.forEach(i => i.value = '');

                const inputsNumber = nuevoItem.querySelectorAll('input[type="number"]');
                inputsNumber.forEach(i => i.value = 1);

                contenedor.appendChild(nuevoItem);
            }
        });
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
            selectAccesorio = document.querySelector('.forro-item:last-child select');
        } else if (tipoAccesorio === 'vidrio') {
            selectAccesorio = document.querySelector('.vidrio-item:last-child select');
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
    async guardarCajaInicial() {
        const valor = parseFloat(document.getElementById('cajaInicial').value) || 0;
        this.cajaActual = new Caja(valor);

        await storageService.guardarCajaInicial(this.cajaActual);

        document.getElementById('cajaInicialConfirmacion').classList.remove('hidden');
        document.getElementById('cajaInicialMostrar').textContent = valor.toFixed(2);

        mostrarAlerta('✅ Caja inicial guardada correctamente', 'success');
        await this.actualizarResumenVentas();
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

        document.getElementById('abonosPreviosForm').style.display = (tipoTransaccion === 'venta') ? 'block' : 'none';

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
        //montoTotalVenta.value = total.toFixed(2);  // ✅ CORRECTO
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

        let subtotalAbonos = 0;
        if (document.getElementById('tieneAbonosPrevios')?.checked) {
            const montos = document.querySelectorAll('.abono-monto');
            montos.forEach(input => {
                subtotalAbonos += parseFloat(input.value) || 0;
            });
            document.getElementById('totalAbonosPreviosDisplay').textContent = subtotalAbonos.toFixed(2);
        }

        // Calcular total (Pago + Equipo + Abonos = Inicial)
        const totalInicial = subtotalPago + subtotalEquipo + subtotalAbonos;

        const abonosLinea = document.getElementById('abonosPreviosLinea');
        if (abonosLinea) {
            document.getElementById('subtotalAbonosPrevios').textContent = `$${subtotalAbonos.toFixed(2)}`;
            abonosLinea.style.display = (subtotalAbonos > 0) ? 'flex' : 'none';
        }

        //const totalInicial = subtotalPago + subtotalEquipo;

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
    async manejarSubmitCambioGarantia() {
        const datos = this.recopilarDatosCambioGarantia();
        const cambio = new CambioGarantia(datos);

        const resultado = await movimientoService.registrarCambioGarantia(cambio);

        if (resultado.exito) {
            // ── INVENTARIO: Procesar Cambio por Garantía ──────────────────
            try {
                // 1. Ingresar el equipo defectuoso al inventario como 'defectuoso'
                const eqDefectuoso = new EquipoInventario({
                    tipoItem: 'equipo',
                    modelo: cambio.equipoDefectuoso.modelo,
                    gb: cambio.equipoDefectuoso.capacidad,
                    color: cambio.equipoDefectuoso.color,
                    bateria: parseInt(cambio.equipoDefectuoso.bateria) || 0,
                    imei: cambio.equipoDefectuoso.imei,
                    detalles: `Garantía: ${cambio.equipoDefectuoso.problema}`,
                    origen: 'Cambio por Garantía',
                    estado: 'defectuoso'
                });
                await inventarioService.ingresarEquipo(eqDefectuoso);

                // 2. Marcar el equipo nuevo como vendido (si proviene del inventario)
                if (cambio.equipoNuevo && cambio.equipoNuevo.imei) {
                    const equipoEnInv = inventarioService.buscarPorImei(cambio.equipoNuevo.imei);
                    if (equipoEnInv) {
                        await inventarioService.marcarVendido(equipoEnInv.id, `garantia-${cambio.id}`);
                    }
                }
            } catch (invError) {
                console.error('⚠️ Error al actualizar inventario en garantía:', invError);
            }
            // ────────────────────────────────────────────────────────────

            mostrarAlerta(resultado.mensaje, 'success');
            this.limpiarFormularioVenta();
            // Actualizar UI en background (fire-and-forget)
            this.actualizarUI().catch(err =>
                console.warn('⚠️ Error actualizando UI después de cambio garantía:', err)
            );

            // Preguntar si desea imprimir la garantía
            if (confirm('¿Desea imprimir la garantía del cambio?')) {
                this.imprimirGarantiaCambio(cambio);
            }
        } else {
            mostrarAlerta(resultado.errores.join('<br>'), 'error');
        }
    }

    /**
     * Maneja el submit del formulario de venta.
     * 
     * DISEÑO CLAVE: El botón se rehabilita INMEDIATAMENTE después de que Firebase
     * confirma la escritura (instantáneo offline gracias a IndexedDB).
     * La actualización visual de la lista (actualizarUI) se ejecuta en background
     * sin bloquear, para que el usuario pueda registrar otra venta de inmediato.
     */
    async manejarSubmitVenta(e) {
        e.preventDefault();

        const tipoTransaccion = document.querySelector('input[name="tipoTransaccion"]:checked').value;

        // Si es cambio por garantía, usar flujo diferente
        if (tipoTransaccion === 'cambio-garantia') {
            await this.manejarSubmitCambioGarantia();
            return;
        }

        // Bloquear botón para evitar doble envío (idempotencia UI)
        const submitBtn = document.querySelector('button[type="submit"]');
        const textoOriginal = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Guardando...';

        try {
            const datosVenta = this.recopilarDatosVenta();

            // ── VALIDACIÓN DE EQUIPO RECIBIDO (TRADE-IN) ───────────────
            if (document.getElementById('recibirEquipo')?.checked) {
                const imeiR     = (document.getElementById('equipoImeiR')?.value || '').trim();
                const imeiVenta = (document.getElementById('equipoImei')?.value  || '').trim();

                // Formato mínimo
                if (imeiR && imeiR.length < 15) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = textoOriginal;
                    mostrarAlerta('❌ El IMEI del equipo recibido debe tener al menos 15 caracteres.', 'error');
                    return;
                }

                // No puede ser el mismo equipo que se vende
                if (imeiR && imeiVenta && imeiR === imeiVenta) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = textoOriginal;
                    mostrarAlerta(`❌ El IMEI del equipo recibido (${imeiR}) es igual al del equipo que se vende. No es posible recibir como parte de pago el mismo equipo.`, 'error');
                    return;
                }

                // Validar contra inventario y ventas existentes
                if (imeiR) {
                    const conflicto = this._obtenerConflictoImeiRecibido(
                        imeiR, 
                        this.ventaEnEdicion,
                        this._tradeInImeiOriginal  // Pasar el IMEI original del trade-in
                    );
                    if (conflicto) {
                        if (conflicto.tipo === 'autocompletar-vendido') {
                            // Estado "vendido" O es el trade-in de esta misma venta: PERMITIR
                            console.log(`ℹ️ Trade-in IMEI ${imeiR} permitido (vendido o de esta venta).`);
                        } else {
                            // Todos los demás casos: BLOQUEAR
                            let msgError = '';
                            const eq = conflicto.equipo;
                            switch (conflicto.tipo) {
                                case 'bloqueado-disponible':
                                    msgError = `✕ El IMEI ${imeiR} pertenece a un iPhone ${eq.modelo} ${eq.gb}GB — ${eq.color} disponible en inventario. No puede recibirse como parte de pago: es stock activo.`;
                                    break;
                                case 'bloqueado-defectuoso':
                                    msgError = `✕ El IMEI ${imeiR} está registrado en inventario como defectuoso (iPhone ${eq.modelo} ${eq.gb}GB). No puede usarse como trade-in.`;
                                    break;
                                case 'bloqueado-otro-estado':
                                    msgError = `✕ El IMEI ${imeiR} ya está en inventario (estado: ${eq.estado}). No puede usarse como trade-in.`;
                                    break;
                                case 'venta-recibido':
                                    msgError = `✕ El IMEI ${imeiR} ya fue registrado como trade-in en otra venta.`;
                                    break;
                                default:
                                    msgError = `✕ El IMEI ${imeiR} no puede usarse como equipo recibido.`;
                            }
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = textoOriginal;
                            mostrarAlerta(msgError, 'error');
                            return;
                        }
                    }
                }
            }

            // ── VALIDACIÓN DE IMEI DEL EQUIPO A VENDER ───────────────
            // Nueva validación centralizada para evitar doble venta
            // SOLO se ejecuta si el equipo NO fue seleccionado del inventario (modo manual)
            const imeiVenta = (document.getElementById('equipoImei')?.value || '').trim();
            const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value;

            if (tipoVenta === 'completa' && imeiVenta && !this._equipoInventarioId) {
                // El usuario escribió el IMEI manualmente (no lo seleccionó del inventario)
                const validacion = this._validarImeiParaVenta(imeiVenta);

                if (validacion.tipo === 'error') {
                    // ERROR: El IMEI ya fue vendido en otra transacción — bloquear siempre
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = textoOriginal;
                    mostrarAlerta(`✕ ${validacion.mensaje}`, 'error');
                    return;
                }

                if (validacion.tipo === 'advertencia' && validacion.equipoSugerido) {
                    // ADVERTENCIA: El IMEI está disponible en inventario.
                    // Bloqueamos la venta y mostramos el error con instrucción clara.
                    // El usuario debe usar el botón del banner para seleccionarlo,
                    // o cambiar el IMEI a uno que no esté en el inventario.
                    const equipo = validacion.equipoSugerido;
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = textoOriginal;
                    mostrarAlerta(
                        `✕ El IMEI ${imeiVenta} pertenece a un iPhone ${equipo.modelo} ${equipo.gb}GB — ${equipo.color} disponible en inventario. ` +
                        `Selecciónalo del buscador (botón "🎯 Seleccionar del inventario") o usa otro IMEI.`,
                        'error'
                    );
                    // Asegurar que el banner esté visible
                    this._actualizarBannerImei();
                    return;
                }
            }

            let resultado;
            if (this.ventaEnEdicion) {
                datosVenta.id = this.ventaEnEdicion;
                resultado = await ventaService.actualizarVenta(datosVenta);
            } else {
                resultado = await ventaService.crearVenta(datosVenta);
            }

            submitBtn.disabled = false;

            if (resultado.exito) {
                const ventaId = resultado.venta?.id || datosVenta.id || '';

                // ── INVENTARIO: Gestión de estado del equipo ────────────────
                // Esta lógica ahora es más robusta gracias a la validación previa de IMEI
                if (this.ventaEnEdicion) {
                    // EDICIÓN DE VENTA
                    const imeiActual = (document.getElementById('equipoImei')?.value || '').trim();
                    
                    if (this._equipoInventarioIdAnterior) {
                        // Caso 1: La venta original tenía un equipo del inventario
                        // Verificar si el usuario cambió a modo manual (no seleccionó nuevo equipo)
                        if (!this._equipoInventarioId && imeiActual !== this._equipoImeiOriginal) {
                            // Usuario fue a modo manual Y cambió el IMEI - liberar el equipo anterior
                            inventarioService.marcarDisponible(this._equipoInventarioIdAnterior)
                                .catch(err => console.warn('⚠️ No se pudo liberar equipo anterior:', err));
                        } 
                        // Caso 2: Seleccionó un equipo diferente del inventario
                        else if (this._equipoInventarioId !== this._equipoInventarioIdAnterior) {
                            // Revertir el equipo anterior y marcar el nuevo
                            inventarioService.marcarDisponible(this._equipoInventarioIdAnterior)
                                .catch(err => console.warn('⚠️ No se pudo revertir equipo anterior:', err));
                            inventarioService.marcarVendido(this._equipoInventarioId, ventaId)
                                .catch(err => console.warn('⚠️ No se pudo marcar equipo nuevo:', err));
                        }
                        // Caso 3: Mantuvo el mismo equipo del inventario - no hacer nada
                    } else if (this._equipoInventarioId) {
                        // Caso 4: La venta original era manual, ahora seleccionó uno del inventario
                        inventarioService.marcarVendido(this._equipoInventarioId, ventaId)
                            .catch(err => console.warn('⚠️ No se pudo marcar equipo como vendido:', err));
                    }
                } else if (this._equipoInventarioId) {
                    // NUEVA VENTA: marcar el equipo seleccionado como vendido
                    inventarioService.marcarVendido(this._equipoInventarioId, ventaId)
                        .catch(err => console.warn('⚠️ No se pudo marcar equipo como vendido:', err));
                }

                // ── INVENTARIO: Sincronización de Trade-In (O4, O5) ───────
                // Ahora funciona tanto para nuevas ventas como para ediciones
                const ventaAnterior = this.ventaEnEdicion 
                    ? await ventaService.obtenerVentaPorId(this.ventaEnEdicion) 
                    : null;
                await this._sincronizarTradeinInventario(datosVenta.equipoRecibido, ventaAnterior);
                // ───────────────────────────────────────────────────────────

                // Restaurar botón y limpiar estado de edición
                submitBtn.innerHTML = '✅ Registrar Venta';
                submitBtn.classList.remove('bg-orange-600', 'hover:bg-orange-700');
                submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');

                const cancelBtn = document.getElementById('cancelarEdicion');
                if (cancelBtn) cancelBtn.remove();

                this.ventaEnEdicion = null;
                this._equipoInventarioIdAnterior = null;
                this._equipoImeiOriginal = null;
                this._tradeInImeiOriginal = null;

                mostrarAlerta(resultado.mensaje, 'success');
                this.limpiarFormularioVenta();

                this.actualizarUI().catch(err =>
                    console.warn('⚠️ Error actualizando UI después de guardar (no bloqueante):', err)
                );
            } else {
                submitBtn.innerHTML = textoOriginal;
                mostrarAlerta(resultado.errores.join('<br>'), 'error');
            }
        } catch (error) {
            console.error('Error al guardar venta:', error);
            mostrarAlerta('❌ Error al guardar la venta. Intente de nuevo.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = textoOriginal;
        }
    }

    /**
     * Valida el IMEI del equipo que se está vendiendo antes de guardar.
     * 
     * LÓGICA:
     * - Si el IMEI no existe en inventario → PERMITIR (equipo manual/nuevo)
     * - Si el IMEI existe en inventario con estado "disponible" → ADVERTENCIA + SUGERIR
     * - Si el IMEI existe en inventario con estado "vendido" → PERMITIR si es de esta venta, BLOQUEAR si es de otra
     * - Si el IMEI existe en inventario con estado "defectuoso" → PERMITIR (ya no es stock)
     * - Si el IMEI existe en otra venta del día → BLOQUEAR
     * 
     * @param {string} imei - El IMEI a validar
     * @returns {object} { esValido: boolean, tipo: 'ok'|'advertencia'|'error', mensaje: string, equipoSugerido: object|null }
     */
    _validarImeiParaVenta(imei) {
        // Validar formato mínimo
        if (!imei || imei.length < 15) {
            return { esValido: true, tipo: 'ok', mensaje: '', equipoSugerido: null };
        }

        const ventaIdActual = this.ventaEnEdicion;
        const fechaHoy = new Date().toLocaleDateString('es-ES');

        // 1. Buscar en inventario
        const equipoEnInventario = inventarioService.buscarPorImei(imei);

        if (equipoEnInventario) {
            const { estado, id: equipoId, modelo, color, gb, ventaAsociadaId } = equipoEnInventario;

            // CASO A: Estado "disponible" → ADVERTENCIA (sugiere seleccionar del inventario)
            if (estado === 'disponible') {
                return {
                    esValido: true,
                    tipo: 'advertencia',
                    mensaje: `El IMEI ${imei} corresponde a un equipo disponible en inventario:\n📱 iPhone ${modelo} ${gb}GB ${color}`,
                    equipoSugerido: equipoEnInventario
                };
            }

            // CASO B: Estado "vendido" → verificar si es de esta venta
            if (estado === 'vendido') {
                // EXCEPCIÓN: Es el equipo de ESTA MISMA venta (doble validación)
                const esEquipoDeEstaVenta = 
                    (ventaAsociadaId === ventaIdActual) ||           // Validación 1: por ID de venta
                    (imei === this._equipoImeiOriginal);              // Validación 2: por IMEI original
                
                if (esEquipoDeEstaVenta) {
                    return { esValido: true, tipo: 'ok', mensaje: '', equipoSugerido: null };
                }
                
                // Si está vendido en otra venta, BLOQUEAR
                return {
                    esValido: false,
                    tipo: 'error',
                    mensaje: `El IMEI ${imei} ya fue vendido (iPhone ${modelo} ${gb}GB ${color})`
                };
            }

            // CASO C: Estado "defectuoso" u otro → PERMITIR (ya no es stock vendible)
            // No bloqueamos porque el equipo ya está marcado como no disponible para venta normal
            return { esValido: true, tipo: 'ok', mensaje: '', equipoSugerido: null };
        }

        // 2. Buscar en ventas del día (por si hay duplicado antes de sincronizar)
        const ventas = storageService.obtenerVentas();
        const ventaConMismoImei = ventas.find(v => 
            v.id !== ventaIdActual && 
            v.fecha === fechaHoy && 
            v.equipo && 
            v.equipo.imei === imei &&
            v.tipoVenta === 'completa'
        );

        if (ventaConMismoImei) {
            return {
                esValido: false,
                tipo: 'error',
                mensaje: `El IMEI ${imei} ya fue vendido hoy en otra transacción`
            };
        }

        // 3. No existe en ningún lado → PERMITIR (equipo nuevo/manual)
        return { esValido: true, tipo: 'ok', mensaje: '', equipoSugerido: null };
    }

    /**
     * Evalúa el IMEI actual del campo y actualiza el banner de advertencia en tiempo real.
     * Se llama en el evento input del campo #equipoImei.
     * Solo actúa si el tipo de venta es "completa" y el campo IMEI no está bloqueado
     * (si está bloqueado significa que ya viene del inventario correctamente).
     */
    _actualizarBannerImei() {
        const imeiInput = document.getElementById('equipoImei');
        if (!imeiInput) return;

        // Si el campo está deshabilitado (equipo seleccionado del inventario), ocultar banner
        if (imeiInput.disabled) {
            this._ocultarBannerImei();
            return;
        }

        const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value;
        if (tipoVenta !== 'completa') {
            this._ocultarBannerImei();
            return;
        }

        const imei = imeiInput.value.trim();
        // Solo validar cuando hay suficientes caracteres
        if (imei.length < 15) {
            this._ocultarBannerImei();
            return;
        }

        // EXCEPCIÓN: Si estamos editando y el IMEI es el mismo que tenía originalmente, no mostrar banner
        if (this.ventaEnEdicion && imei === this._equipoImeiOriginal) {
            this._ocultarBannerImei();
            return;
        }

        const validacion = this._validarImeiParaVenta(imei);

        if (validacion.tipo === 'advertencia' && validacion.equipoSugerido) {
            const equipo = validacion.equipoSugerido;
            const batColor = equipo.bateria < 50 ? 'text-red-600' : equipo.bateria < 80 ? 'text-amber-600' : 'text-green-600';

            const titulo = document.getElementById('imeiInventarioBannerTitulo');
            const detalle = document.getElementById('imeiInventarioBannerDetalle');
            const banner = document.getElementById('imeiInventarioBanner');

            if (titulo) titulo.textContent = 'Este IMEI corresponde a un equipo disponible en inventario';
            if (detalle) detalle.innerHTML =
                `📱 iPhone ${equipo.modelo} ${equipo.gb}GB — ${equipo.color} — ` +
                `<span class="${batColor}">🔋 ${equipo.bateria}%</span> ` +
                `(IMEI: ${equipo.imei})`;
            if (banner) banner.classList.remove('hidden');
        } else {
            this._ocultarBannerImei();
        }
    }

    /**
     * Oculta el banner de advertencia de IMEI.
     */
    _ocultarBannerImei() {
        document.getElementById('imeiInventarioBanner')?.classList.add('hidden');
    }

    /**
     * Determina el estado de un IMEI para usarlo como equipo recibido (trade-in).
     * 
     * REGLAS:
     * - "disponible" en inventario  → BLOQUEADO (no puede recibirse; ya está en stock)
     *   EXCEPCIÓN: Si es el trade-in de ESTA MISMA venta en edición → PERMITIR
     * - "defectuoso" en inventario  → BLOQUEADO (no puede recibirse; ya está registrado)
     * - "vendido" en inventario     → PERMITIDO con autocompletar (ya salió del stock)
     * - Cualquier otro estado       → BLOQUEADO (estado desconocido, precaución)
     * - Ya usado como trade-in en otra venta → BLOQUEADO
     * - No existe en ningún lado    → PERMITIDO (equipo externo normal)
     * 
     * @param {string} imei
     * @param {string|null} ventaIdExcluir - ID de la venta en edición (para no bloquearse a sí misma)
     * @param {string|null} imeiTradeInOriginal - IMEI del trade-in que tenía la venta ANTES de editar
     * @returns {object|null} null = sin conflicto
     *   { tipo: 'bloqueado-disponible', equipo }
     *   { tipo: 'bloqueado-defectuoso', equipo }
     *   { tipo: 'bloqueado-otro-estado', equipo }
     *   { tipo: 'autocompletar-vendido', equipo }
     *   { tipo: 'venta-recibido' }
     */
    _obtenerConflictoImeiRecibido(imei, ventaIdExcluir = null, imeiTradeInOriginal = null) {
        if (!imei || imei.length < 6) return null;

        // 1. Buscar en inventario (todos los estados)
        const equipoEnInventario = inventarioService.buscarPorImei(imei);
        if (equipoEnInventario) {
            const { estado, origen } = equipoEnInventario;

            // ── EXCEPCIÓN CRÍTICA: Si es el trade-in de ESTA MISMA venta ──────
            // Detectar mediante dos validaciones de refuerzo:
            // A) El IMEI es exactamente el mismo que tenía la venta originalmente
            // B) El origen del equipo contiene "Trade-in" Y el ID de la venta actual
            const esTradeInDeEstaVenta = 
                (imei === imeiTradeInOriginal) || 
                (origen && origen.includes('Trade-in') && ventaIdExcluir && origen.includes(ventaIdExcluir));

            if (esTradeInDeEstaVenta) {
                // Es el trade-in de esta venta → permitir con autocompletar
                return { tipo: 'autocompletar-vendido', equipo: equipoEnInventario };
            }
            // ────────────────────────────────────────────────────────────────

            // Validaciones normales (solo si NO es el trade-in de esta venta)
            if (estado === 'disponible') {
                return { tipo: 'bloqueado-disponible', equipo: equipoEnInventario };
            }
            if (estado === 'defectuoso') {
                return { tipo: 'bloqueado-defectuoso', equipo: equipoEnInventario };
            }
            if (estado === 'vendido' || estado === 'eliminado' || estado === 'transferido') {
                // Ya no es stock activo → permitir como trade-in con autocompletar
                return { tipo: 'autocompletar-vendido', equipo: equipoEnInventario };
            }
            // Cualquier otro estado desconocido → bloquear por precaución
            return { tipo: 'bloqueado-otro-estado', equipo: equipoEnInventario };
        }

        // 2. Buscar en otras ventas que ya lo usen como trade-in
        const ventas = storageService.obtenerVentas();
        const conflictoVenta = ventas.find(v =>
            v.id !== ventaIdExcluir &&
            v.equipoRecibido &&
            v.equipoRecibido.imei === imei
        );
        if (conflictoVenta) {
            return { tipo: 'venta-recibido' };
        }

        return null;
    }

    /**
     * Actualiza el banner de validación del IMEI trade-in.
     * Usa el nuevo banner visual consistente con el de ventas.
     * @param {object|null} conflicto - Resultado de _obtenerConflictoImeiRecibido
     */
    _mostrarToastConflictoImeiRecibido(conflicto) {
        const banner      = document.getElementById('imeiTradeInBanner');
        const iconoEl     = document.getElementById('imeiTradeInBannerIcono');
        const tituloEl    = document.getElementById('imeiTradeInBannerTitulo');
        const detalleEl   = document.getElementById('imeiTradeInBannerDetalle');
        const btnWrap     = document.getElementById('imeiTradeInBannerBtnWrap');
        const btn         = document.getElementById('imeiTradeInBannerBtn');

        if (!banner) return;

        // Sin conflicto → ocultar
        if (!conflicto) {
            banner.classList.add('hidden');
            return;
        }

        // Definir apariencia y mensaje según el tipo
        let icono   = '⚠️';
        let titulo  = '';
        let detalle = '';
        let colorClases = 'border-red-300 bg-red-50';           // rojo por defecto (bloqueado)
        let tituloClases = 'text-red-800';
        let detalleClases = 'text-red-700';
        let mostrarBtn = false;

        const eq = conflicto.equipo;

        switch (conflicto.tipo) {
            case 'bloqueado-disponible': {
                const batColor = eq.bateria < 50 ? 'text-red-600' : eq.bateria < 80 ? 'text-amber-600' : 'text-green-700';
                titulo  = 'Este equipo está disponible en inventario';
                detalle = `📱 iPhone ${eq.modelo} ${eq.gb}GB — ${eq.color} — ` +
                          `<span class="${batColor}">🔋 ${eq.bateria}%</span> (IMEI: ${eq.imei}). ` +
                          `No puede recibirse como parte de pago: todavía es stock disponible.`;
                break;
            }
            case 'bloqueado-defectuoso': {
                titulo  = 'Este equipo está registrado como defectuoso';
                detalle = `📱 iPhone ${eq.modelo} ${eq.gb}GB — ${eq.color} (IMEI: ${eq.imei}). ` +
                          `Ya está en inventario como defectuoso y no puede usarse como trade-in.`;
                break;
            }
            case 'bloqueado-otro-estado': {
                titulo  = `Este IMEI ya está en inventario (estado: ${eq.estado})`;
                detalle = `📱 iPhone ${eq.modelo} ${eq.gb}GB — ${eq.color} (IMEI: ${eq.imei}).`;
                break;
            }
            case 'autocompletar-vendido': {
                // Estado vendido → permitir + ofrecer autocompletar
                icono  = 'ℹ️';
                titulo = 'Este IMEI corresponde a un equipo vendido';
                detalle = `📱 iPhone ${eq.modelo} ${eq.gb}GB — ${eq.color} (IMEI: ${eq.imei}). ` +
                          `Puedes autocompletar los datos del equipo.`;
                colorClases   = 'border-blue-300 bg-blue-50';
                tituloClases  = 'text-blue-800';
                detalleClases = 'text-blue-700';
                mostrarBtn = true;
                break;
            }
            case 'venta-recibido': {
                titulo  = 'Este IMEI ya fue usado como trade-in en otra venta';
                detalle = 'No se puede registrar el mismo equipo recibido más de una vez.';
                break;
            }
        }

        // Aplicar estilos
        banner.className = `mt-3 rounded-xl px-4 py-3 border ${colorClases}`;
        if (iconoEl)   iconoEl.textContent = icono;
        if (tituloEl)  { tituloEl.textContent = titulo;          tituloEl.className  = `font-semibold text-sm ${tituloClases}`; }
        if (detalleEl) { detalleEl.innerHTML  = detalle;         detalleEl.className = `text-xs mt-0.5 ${detalleClases}`; }

        // Botón de autocompletar
        if (btnWrap) btnWrap.classList.toggle('hidden', !mostrarBtn);
        if (btn && mostrarBtn) {
            // Reasignar handler limpio (sin acumulación de listeners)
            const nuevoBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(nuevoBtn, btn);
            nuevoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._autocompletarEquipoRecibido(eq.id);
            });
        }

        banner.classList.remove('hidden');
    }

    /**
     * Revisa el IMEI del equipo recibido mientras el usuario escribe
     */
    _revalidarImeiRecibidoActual() {
        const imeiInput = document.getElementById('equipoImeiR');
        if (!imeiInput) return;
        const conflicto = this._obtenerConflictoImeiRecibido(
            imeiInput.value, 
            this.ventaEnEdicion,
            this._tradeInImeiOriginal  // Pasar el IMEI original del trade-in
        );
        this._mostrarToastConflictoImeiRecibido(conflicto);
    }

    /**
     * Autocompleta el formulario de equipo recibido con los datos del inventario
     */
    _autocompletarEquipoRecibido(equipoId) {
        const equipo = inventarioService.obtenerTodos().find(e => e.id === equipoId);
        if (!equipo) {
            mostrarAlerta('❌ Equipo no encontrado en el inventario', 'error');
            return;
        }

        // Modelo: buscar la opción que coincida
        const selectModelo = document.getElementById('equipoModelo');
        if (selectModelo) {
            // Intentar asignar directo (si el valor coincide con alguna option)
            selectModelo.value = equipo.modelo || '';
            // Si no encontró match, intentar buscar por texto
            if (selectModelo.value !== equipo.modelo) {
                const opciones = Array.from(selectModelo.options);
                const match = opciones.find(opt => 
                    opt.value.toLowerCase() === (equipo.modelo || '').toLowerCase() ||
                    opt.text.toLowerCase() === (equipo.modelo || '').toLowerCase()
                );
                if (match) selectModelo.value = match.value;
            }
        }

        // Capacidad
        const selectCapacidad = document.getElementById('equipoCapacidad');
        if (selectCapacidad) selectCapacidad.value = equipo.gb || '';

        // Color
        const selectColor = document.getElementById('equipoColor');
        if (selectColor) selectColor.value = equipo.color || '';

        // Batería
        const inputBateria = document.getElementById('equipoBateria');
        if (inputBateria) inputBateria.value = equipo.bateria || '';

        // IMEI ya está puesto, reconfirmar
        const inputImei = document.getElementById('equipoImeiR');
        if (inputImei) inputImei.value = equipo.imei || '';

        // Ocultar el banner tras autocompletar
        document.getElementById('imeiTradeInBanner')?.classList.add('hidden');
        const toast = document.getElementById('imeiConflictoToastRecibido');
        if (toast) toast.classList.add('hidden');

        mostrarAlerta(`✅ Datos del equipo cargados desde inventario (${equipo.modelo} — Estado: ${equipo.estado})`, 'success');
        this.calcularYMostrarTotal();
    }

    /**
     * Sincroniza el trade-in con el inventario (nuevo, editar, eliminar)
     */
    async _sincronizarTradeinInventario(equipoRecibido, ventaAnterior) {
        const imeiActual = equipoRecibido?.imei || '';
        const imeiAnterior = ventaAnterior?.equipoRecibido?.imei || '';

        // Caso 1: Sin trade-in antes y sin trade-in ahora → Nada
        if (!imeiAnterior && !imeiActual) {
            return;
        }

        // Caso 2: Sin trade-in antes, pero sí hay ahora → Ingresar
        if (!imeiAnterior && imeiActual) {
            const eqRecibido = new EquipoInventario({
                tipoItem: 'equipo',
                modelo: equipoRecibido.modelo,
                gb: equipoRecibido.capacidad,
                color: equipoRecibido.color,
                bateria: parseInt(equipoRecibido.bateria) || 0,
                imei: imeiActual,
                detalles: equipoRecibido.comentarios || '',
                origen: `Trade-in (Venta: ${ventaAnterior?.id || 'Nueva'})`,
                estado: 'disponible'
            });
            await inventarioService.ingresarEquipo(eqRecibido);
            return;
        }

        // Caso 3: Trade-in antes y ahora, mismo IMEI → Actualizar otros campos por si cambiaron
        if (imeiAnterior && imeiActual && imeiAnterior === imeiActual) {
            // Aunque el IMEI no cambió, puede que el usuario haya corregido modelo/color/batería
            const equipoAnterior = inventarioService.buscarPorImei(imeiAnterior);
            if (equipoAnterior) {
                await inventarioService.actualizarEquipo(equipoAnterior.id, {
                    modelo: equipoRecibido.modelo,
                    gb: equipoRecibido.capacidad,
                    color: equipoRecibido.color,
                    bateria: parseInt(equipoRecibido.bateria) || 0,
                    detalles: equipoRecibido.comentarios || ''
                });
            }
            return;
        }

        // Caso 4: Trade-in antes y ahora, pero con cambios → ACTUALIZAR el registro existente
        // (El cliente devolvió el equipo anterior y entregó otro, o se corrigió el IMEI)
        if (imeiAnterior && imeiActual && imeiAnterior !== imeiActual) {
            const equipoAnterior = inventarioService.buscarPorImei(imeiAnterior);
            if (equipoAnterior) {
                // Actualizar el registro existente con los nuevos datos
                await inventarioService.actualizarEquipo(equipoAnterior.id, {
                    modelo: equipoRecibido.modelo,
                    gb: equipoRecibido.capacidad,
                    color: equipoRecibido.color,
                    bateria: parseInt(equipoRecibido.bateria) || 0,
                    imei: imeiActual,  // ← IMEI corregido/nuevo equipo
                    detalles: equipoRecibido.comentarios || ''
                });
            }
            return;
        }

        // Caso 5: Trade-in antes, pero ahora no hay → Eliminar
        if (imeiAnterior && !imeiActual) {
            const equipoAnterior = inventarioService.buscarPorImei(imeiAnterior);
            if (equipoAnterior) {
                await inventarioService.cambiarEstado(equipoAnterior.id, 'eliminado', {
                    motivo: 'Trade-in eliminado de la venta',
                    fechaCambio: new Date().toISOString()
                });
            }
        }
    }

    /**
     * Recopila los datos del formulario de venta
     */
    recopilarDatosVenta() {
        const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked').value;
        const tipoTransaccion = document.querySelector('input[name="tipoTransaccion"]:checked').value;
        const formaPago = document.querySelector('input[name="formaPago"]:checked')?.value;

        let abonosRegistrados = [];
        let totalAbonosP = 0;
        if (document.getElementById('tieneAbonosPrevios')?.checked) {
            const items = document.querySelectorAll('.abono-previo-item');
            items.forEach(item => {
                const fecha = item.querySelector('.abono-fecha').value;
                const monto = parseFloat(item.querySelector('.abono-monto').value) || 0;
                if (monto > 0) {
                    abonosRegistrados.push({ fecha, monto });
                    totalAbonosP += monto;
                }
            });
        }

        const datos = {
            tipoVenta,
            tipoTransaccion,
            formaPago,
            montoTotal: parseFloat(document.getElementById('montoTotal').value) || 0,
            weppa: document.getElementById('weppa').checked,
            notaVentaDetalles: document.getElementById('notaVenta').checked ?
                document.getElementById('notaVentaDetalles').value : null,
            abonosPrevios: abonosRegistrados,
            totalAbonosPrevios: totalAbonosP
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
        // Analizar y recolectar las filas de forro
        const forrosData = [];
        if (document.getElementById('forro').checked) {
            document.querySelectorAll('#forroLista .forro-item').forEach(item => {
                const mod = item.querySelector('.accModelo').value;
                const cant = parseInt(item.querySelector('.forro-cant').value) || 0;
                if (mod && cant > 0) forrosData.push({ modelo: mod, cantidad: cant });
            });
        }

        // Analizar y recolectar las filas de vidrio
        const vidriosData = [];
        if (document.getElementById('vidrio').checked) {
            document.querySelectorAll('#vidrioLista .vidrio-item').forEach(item => {
                const mod = item.querySelector('.accModelo').value;
                const cant = parseInt(item.querySelector('.vidrio-cant').value) || 0;
                if (mod && cant > 0) vidriosData.push({ modelo: mod, cantidad: cant });
            });
        }

        // Analizar y recolectar las filas de otroAccesorio
        const otrosData = [];
        const otroCheckbox = document.getElementById('otroAccesorio');
        if (otroCheckbox && otroCheckbox.checked) {
            document.querySelectorAll('#otroLista .otro-item').forEach(item => {
                const nom = item.querySelector('.otro-nombre').value;
                const cant = parseInt(item.querySelector('.otro-cant').value) || 0;
                if (nom && cant > 0) otrosData.push({ nombre: nom, cantidad: cant });
            });
        }

        return {
            forro: document.getElementById('forro').checked,
            forros: forrosData,

            cargador: document.getElementById('cargador').checked,
            cargadorCantidad: document.getElementById('cargador').checked ?
                parseInt(document.querySelector('#cargadorCantidad input')?.value) || 0 : 0,

            vidrio: document.getElementById('vidrio').checked,
            vidrios: vidriosData,

            otro: !!(otroCheckbox && otroCheckbox.checked),
            otros: otrosData,

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
        document.getElementById('forroContenedor')?.classList.add('hidden');
        document.getElementById('vidrioContenedor')?.classList.add('hidden');
        document.getElementById('otroContenedor')?.classList.add('hidden');

        // Limpiar dinámicos devolviéndolos a una sola fila en blanco
        const listContainerForro = document.getElementById('forroLista');
        if (listContainerForro) {
            const items = listContainerForro.querySelectorAll('.forro-item');
            items.forEach((item, index) => { if (index > 0) item.remove(); });
            if (items[0]) {
                const s = items[0].querySelector('select');
                if (s) s.value = '';
                const i = items[0].querySelector('input.forro-cant');
                if (i) i.value = 1;
            }
        }

        const listContainerVidrio = document.getElementById('vidrioLista');
        if (listContainerVidrio) {
            const items = listContainerVidrio.querySelectorAll('.vidrio-item');
            items.forEach((item, index) => { if (index > 0) item.remove(); });
            if (items[0]) {
                const s = items[0].querySelector('select');
                if (s) s.value = '';
                const i = items[0].querySelector('input.vidrio-cant');
                if (i) i.value = 1;
            }
        }

        const listContainerOtro = document.getElementById('otroLista');
        if (listContainerOtro) {
            const items = listContainerOtro.querySelectorAll('.otro-item');
            items.forEach((item, index) => { if (index > 0) item.remove(); });
            if (items[0]) {
                const s = items[0].querySelector('input.otro-nombre');
                if (s) s.value = '';
                const i = items[0].querySelector('input.otro-cant');
                if (i) i.value = 1;
            }
        }
        // Limpiar abonos previos
        document.getElementById('tieneAbonosPrevios').checked = false;
        document.getElementById('abonosPreviosDetalles').classList.add('hidden');
        const listaAbonosP = document.getElementById('listaAbonosPrevios');
        if (listaAbonosP) {
            const items = listaAbonosP.querySelectorAll('.abono-previo-item');
            items.forEach((item, index) => { if (index > 0) item.remove(); });
            if (items[0]) {
                items[0].querySelector('.abono-fecha').value = '';
                items[0].querySelector('.abono-monto').value = '';
            }
        }

        // Limpiar banners de conflicto de IMEI
        this._mostrarToastConflictoImeiRecibido(null);
        document.getElementById('imeiTradeInBanner')?.classList.add('hidden');
        document.getElementById('totalAbonosPreviosDisplay').textContent = '0.00';

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
        document.querySelector('input[name="tipoTransacción"][value="venta"]') &&
            (document.querySelector('input[name="tipoTransacción"][value="venta"]').checked = true);
        document.querySelector('input[name="tipoTransaccion"][value="venta"]').checked = true;
        this.manejarCambioTipoTransaccion();

        // ── INVENTARIO: limpiar el selector de equipo ───────────────────
        this._limpiarSelectorInventario();
        // ── Ocultar el banner de advertencia de IMEI ────────────────────
        this._ocultarBannerImei();
    }

    /**
     * Actualiza toda la UI
     */
    async actualizarUI() {
        if (!this.cajaActual) return;
        await this.actualizarResumenVentas();
        await this.actualizarResumenMovimientos();
    }

    // ══════════════════════════════════════════════════════════════════
    // BUSCADOR DE INVENTARIO
    // ══════════════════════════════════════════════════════════════════

    /**
     * Actualiza el badge de equipos disponibles en el buscador.
     */
    _actualizarBadgeStock() {
        const badge = document.getElementById('invStockBadge');
        if (!badge) return;
        const n = inventarioService.obtenerDisponibles().length;
        badge.textContent = n === 0
            ? 'Sin stock'
            : `${n} equipo${n === 1 ? '' : 's'} disponible${n === 1 ? '' : 's'}`;
        badge.className = n === 0
            ? 'text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full'
            : 'text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full';
    }

    /**
     * Limpia el selector de inventario y desbloquea los campos del formulario.
     * Se llama al limpiar el formulario o al hacer clic en "Cambiar equipo".
     */
    _limpiarSelectorInventario() {
        this._equipoInventarioId = null;

        const input = document.getElementById('invBuscadorInput');
        const seleccionado = document.getElementById('invEquipoSeleccionado');
        const dropdown = document.getElementById('invDropdown');

        if (input) { input.value = ''; input.disabled = false; }
        if (seleccionado) seleccionado.classList.add('hidden');
        if (dropdown) dropdown.classList.add('hidden');

        // Desbloquear campos del formulario de iPhone
        ['modelo', 'color', 'almacenamiento', 'bateria', 'equipoImei'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = false;
                el.classList.remove('bg-indigo-50', 'border-indigo-300');
            }
        });

        // Ocultar el banner: al cambiar de equipo el IMEI puede ser otro
        this._ocultarBannerImei();
    }

    /**
     * Autorrellena los campos del formulario de venta con los datos del equipo
     * seleccionado del inventario y bloquea los campos para evitar edición accidental.
     */
    _aplicarEquipoDelInventario(equipo) {
        this._equipoInventarioId = equipo.id;

        // ── Autorrellenar campos ──────────────────────────────
        // Modelo: buscar la opción que contenga el modelo corto del equipo
        const modeloSelect = document.getElementById('modelo');
        if (modeloSelect) {
            // Normaliza eliminando espacios, guiones y pasando a minúsculas
            const normalizar = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const modInv = normalizar(equipo.modelo);

            // 1. Intentar coincidencia exacta normalizada
            let opcion = Array.from(modeloSelect.options).find(o =>
                normalizar(o.value) === normalizar('iPhone ' + equipo.modelo) ||
                normalizar(o.value) === modInv
            );

            // 2. Fallback: fuzzy includes (ej: "13" dentro de "iphone13")
            // NOTA: se ordena por longitud para preferir "13" sobre "13pro" si se ingresó "13"
            if (!opcion) {
                opcion = Array.from(modeloSelect.options)
                    .filter(o => normalizar(o.value).includes(modInv))
                    .sort((a, b) => a.value.length - b.value.length)[0];
            }

            if (opcion) modeloSelect.value = opcion.value;
        }

        // Almacenamiento
        const almSelect = document.getElementById('almacenamiento');
        if (almSelect && equipo.gb) {
            const opAlm = Array.from(almSelect.options).find(o => o.value === equipo.gb);
            if (opAlm) almSelect.value = opAlm.value;
        }

        // Color
        const colorSelect = document.getElementById('color');
        if (colorSelect && equipo.color) {
            const opColor = Array.from(colorSelect.options).find(o => o.value === equipo.color);
            if (opColor) colorSelect.value = opColor.value;
        }

        // Batería
        const batInput = document.getElementById('bateria');
        if (batInput && equipo.bateria != null) batInput.value = equipo.bateria;

        // IMEI
        const imeiInput = document.getElementById('equipoImei');
        if (imeiInput && equipo.imei) imeiInput.value = equipo.imei;

        // ── Nota de venta automática (si el equipo tiene detalles) ──
        if (equipo.detalles && equipo.detalles.trim()) {
            const chkNota = document.getElementById('notaVenta');
            const campoNota = document.getElementById('notaVentaInfo');
            const inputNota = document.getElementById('notaVentaDetalles');
            if (chkNota) chkNota.checked = true;
            if (campoNota) campoNota.classList.remove('hidden');
            if (inputNota) inputNota.value = equipo.detalles;
        }

        // ── Bloquear campos (solo lectura) ────────────────────
        ['modelo', 'color', 'almacenamiento', 'bateria', 'equipoImei'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = true;
                el.classList.add('bg-indigo-50', 'border-indigo-300');
            }
        });

        // ── Mostrar panel de equipo seleccionado ─────────────────
        const label = document.getElementById('invEquipoLabel');
        const imeiLabel = document.getElementById('invEquipoImeiLabel');
        const seleccionado = document.getElementById('invEquipoSeleccionado');
        const buscadorInput = document.getElementById('invBuscadorInput');
        const dropdown = document.getElementById('invDropdown');

        if (label) label.textContent = `📱 iPhone ${equipo.modelo} ${equipo.gb} — ${equipo.color} — 🔋${equipo.bateria}%`;
        if (imeiLabel) imeiLabel.textContent = `IMEI: ${equipo.imei}`;
        if (seleccionado) seleccionado.classList.remove('hidden');
        if (buscadorInput) { buscadorInput.value = ''; buscadorInput.disabled = true; }
        if (dropdown) dropdown.classList.add('hidden');

        // Disparar el evento change en modelo para que los accesorios se auto-seleccionen
        document.getElementById('modelo')?.dispatchEvent(new Event('change'));

        // Ocultar el banner de advertencia de IMEI (el equipo ya está bien seleccionado)
        this._ocultarBannerImei();
    }

    /**
     * Inicializa el panel de búsqueda de inventario en cierree.html.
     * Conecta el input de búsqueda con el caché del InventarioService.
     */
    inicializarBuscadorInventario() {
        const input = document.getElementById('invBuscadorInput');
        const dropdown = document.getElementById('invDropdown');
        const btnLimpiar = document.getElementById('invLimpiarEquipo');
        const btnModoManual = document.getElementById('invModoManual');

        // Si el widget no está en el DOM (otra página), salir sin error
        if (!input) return;

        // Actualizar badge de stock inicial (el inventario puede tardar unos ms en cargar)
        this._actualizarBadgeStock();

        // ── Input: filtrar equipos al escribir ────────────────────
        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            dropdown.innerHTML = '';
            dropdown.classList.add('hidden');

            if (q.length < 1) return;

            const disponibles = inventarioService.obtenerDisponibles();
            const resultados = disponibles.filter(e =>
                e.modelo.toLowerCase().includes(q) ||
                (e.color && e.color.toLowerCase().includes(q)) ||
                (e.gb && e.gb.toLowerCase().includes(q)) ||
                (e.imei && e.imei.includes(q))
            ).slice(0, 10);

            if (!resultados.length) {
                dropdown.innerHTML = `<li class="px-4 py-3 text-gray-400 text-sm italic">Sin resultados para "${q}"</li>`;
                dropdown.classList.remove('hidden');
                return;
            }

            resultados.forEach(equipo => {
                const li = document.createElement('li');
                const batColor = equipo.bateria < 50 ? 'text-red-500' : equipo.bateria < 80 ? 'text-orange-500' : 'text-green-600';
                li.className = 'px-4 py-2 cursor-pointer hover:bg-indigo-50 border-b border-gray-100 last:border-0';
                li.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold text-gray-800 text-sm">📱 iPhone ${equipo.modelo} ${equipo.gb}</span>
                        <span class="text-xs text-gray-500">${equipo.color}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-0.5">
                        <span class="text-xs ${batColor}">🔋 ${equipo.bateria}%</span>
                        <span class="text-xs font-mono text-gray-400">${equipo.imei}</span>
                        ${equipo.detalles ? `<span class="text-xs text-amber-600">⚠️ ${equipo.detalles}</span>` : ''}
                    </div>
                `;
                li.addEventListener('mousedown', e => {
                    e.preventDefault(); // evita que el input pierda foco antes
                    this._aplicarEquipoDelInventario(equipo);
                });
                dropdown.appendChild(li);
            });

            dropdown.classList.remove('hidden');
        });

        // Cerrar dropdown al perder foco
        input.addEventListener('blur', () => {
            setTimeout(() => dropdown.classList.add('hidden'), 200);
        });

        // ── Botón "Cambiar equipo" ────────────────────────────
        btnLimpiar?.addEventListener('click', () => {
            this._limpiarSelectorInventario();
            input.focus();
        });

        // ── Botón "Ingresar manualmente" ────────────────────
        btnModoManual?.addEventListener('click', () => {
            this._limpiarSelectorInventario();
            // Ocultar el buscador temporalmente para que el usuario entienda que está en modo manual
            const buscadorSection = document.getElementById('inventarioBuscadorSection');
            if (buscadorSection) {
                buscadorSection.style.opacity = '0.4';
                buscadorSection.title = 'Modo manual activo. Los campos del equipo están desbloqueados.';
            }
            document.getElementById('modelo')?.focus();
        });
    }

    /**
     * Actualiza el resumen de ventas
     */
    async actualizarResumenVentas() {
        const fechaHoy = new Date().toLocaleDateString('es-ES'); // 1. Obtenemos la fecha

        // 2. Filtramos al instante por la fecha de hoy
        const ventas = (await ventaService.obtenerVentas()).filter(v => v.fecha === fechaHoy);
        const movimientos = (await movimientoService.obtenerMovimientos()).filter(m => m.fecha === fechaHoy);
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
        const totalDia = await ventaService.calcularTotalDia();
        const equiposVendidos = await ventaService.contarEquiposVendidos();
        const desgloseCaja = this.cajaActual.obtenerDesglose(ventas, movimientos);
        console.log(ventas)
        console.log(movimientos)

        this.animarNumero('totalDia', totalDia);
        this.animarNumero('equiposVendidos', equiposVendidos, false);
        this.animarNumero('cajaFinal', desgloseCaja.cajaFinal);

        // Guardar la caja final actual para el próximo día
        /* localStorage.setItem('caja_cierre_iphone', JSON.stringify({
            monto: desgloseCaja.cajaFinal,
            fecha: new Date().toLocaleDateString('es-ES')
        })); */
        await storageService.guardarCierreCaja(desgloseCaja.cajaFinal);
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
                        <p><strong>Imei:</strong> ${sanitizar(venta.equipo.imei)}</p>
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
                        <p><strong>IMEI:</strong> ${sanitizar(venta.equipoRecibido.imei) || 'N/A'}</p>
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
            const pagoReal = (venta.montoPago !== null && venta.montoPago !== undefined)
                ? venta.montoPago
                : (venta.montoTotal - (venta.equipoRecibido ? venta.equipoRecibido.valor : 0) - (venta.totalAbonosPrevios || 0));
            detallesPago.push(`<p class="bg-blue-100 px-2 py-1 rounded">${venta.formaPago.toUpperCase()}: ${formatearMoneda(pagoReal)}</p>`);
        }

        if (venta.equipoRecibido) {
            detallesPago.push(`<p class="bg-orange-100 px-2 py-1 rounded">Equipo recibido: ${venta.equipoRecibido.modelo} (${formatearMoneda(venta.equipoRecibido.valor)})</p>`);
        }

        if (venta.abonosPrevios && venta.abonosPrevios.length > 0) {
            venta.abonosPrevios.forEach(ab => {
                const fechaText = ab.fecha ? ` (${ab.fecha})` : '';
                detallesPago.push(`<p class="bg-green-100 px-2 py-1 rounded">Abono Precargado${fechaText}: ${formatearMoneda(ab.monto)}</p>`);
            });
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
                        ${venta.tipoVenta === 'completa' ? `<p class="text-xs text-gray-600 mt-1">${sanitizar(venta.cliente.nombre)} (${sanitizar(venta.cliente.cedula)})</p>` : '<p class="text-xs text-gray-600 mt-1">Solo Accesorios</p>'}
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
                        <strong>📝 Nota:</strong> ${sanitizar(venta.notaVentaDetalles)}
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
    async actualizarResumenMovimientos() {
        const resumenElement = document.getElementById('resumenMovimientos');
        if (!resumenElement) {
            console.warn('Elemento resumenMovimientos no encontrado');
            return;
        }

        const fechaHoy = new Date().toLocaleDateString('es-ES'); // 1. Obtenemos la fecha

        // 2. Filtramos los movimientos al instante
        const movimientos = (await movimientoService.obtenerMovimientos()).filter(m => m.fecha === fechaHoy);
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
     * Edita una venta.
     * 
     * Envuelto en try-catch para que si la lectura de Firebase se cuelga
     * o falla offline, el usuario reciba un mensaje de error en vez de
     * quedarse viendo una pantalla congelada indefinidamente.
     */
    async editarVenta(ventaId) {
        try {
            const venta = await ventaService.obtenerVentaPorId(ventaId);

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
            // Asegurar que el botón esté habilitado (podría haber quedado
            // deshabilitado de una operación previa)
            submitBtn.disabled = false;
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
        } catch (error) {
            console.error('Error al cargar venta para edición:', error);
            mostrarAlerta('❌ No se pudo cargar la venta para editar. Intente de nuevo.', 'error');
        }
    }

    /**
     * Cancela la edición y restaura el formulario
     */
    cancelarEdicion() {
        this.ventaEnEdicion = null;
        this._equipoImeiOriginal = null;
        this._tradeInImeiOriginal = null;

        // Restaurar botón de submit
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = false; // Asegurar que esté habilitado
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

        // ── INVENTARIO: recordar el IMEI original para detectar cambios
        this._equipoImeiOriginal = venta.equipo?.imei || null;
        
        // ── TRADE-IN: recordar el IMEI original del trade-in (si existía)
        this._tradeInImeiOriginal = venta.equipoRecibido?.imei || null;
        
        // ── INVENTARIO: recordar qué equipo del inventario está asociado a
        // esta venta ANTES de la edición, para poder revertirlo a "disponible"
        // si el usuario elige otro en el buscador.
        // Se hace ANTES de tocar el formulario para no perder la referencia.
        this._equipoInventarioIdAnterior = null;
        this._equipoInventarioId = null;
        
        if (venta.tipoVenta === 'completa' && venta.equipo && venta.equipo.imei) {
            const equipoPrevio = inventarioService.buscarPorImei(venta.equipo.imei);
            
            // Si el equipo existe en el inventario, guardar su ID como "anterior"
            // Esto nos permite:
            // 1. Revertirlo a "disponible" si el usuario cambia a modo manual
            // 2. Marcarlo correctamente si el usuario selecciona otro equipo del inventario
            if (equipoPrevio) {
                this._equipoInventarioIdAnterior = equipoPrevio.id;
                console.log(`📦 Equipo del inventario detectado en edición: ${equipoPrevio.id} (IMEI: ${equipoPrevio.imei}, estado: ${equipoPrevio.estado})`);
            }
        }

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
            // ── INVENTARIO: si la venta editada provenía del inventario,
            // reaplicar la UI del buscador y bloquear los campos del equipo,
            // igual que cuando se selecciona desde el buscador en una venta nueva.
            // Esto mantiene coherente el flujo de submit (revierte-vs-marca).
            if (this._equipoInventarioIdAnterior) {
                const equipoPrevio = inventarioService.buscarPorImei(venta.equipo.imei);
                if (equipoPrevio) {
                    this._aplicarEquipoDelInventario(equipoPrevio);
                }
            }
            // Helper para recalcular selectores al inyectar HTML de forma síncrona
            const renderizarListaDinamica = (arr, contenedorPadreId, tipo, checkId) => {
                if (arr && arr.length > 0) {
                    document.getElementById(checkId).checked = true;
                    document.getElementById(checkId).dispatchEvent(new Event('change'));

                    const listaContenedor = document.getElementById(contenedorPadreId);
                    if (!listaContenedor) return;
                    listaContenedor.innerHTML = ''; // limpiar default

                    arr.forEach((item, idx) => {
                        const isFirst = idx === 0;
                        const btnClass = isFirst ? `btn-add-${tipo} bg-green-500` : 'btn-remove-fila bg-red-500';
                        const btnText = isFirst ? '+' : '-';
                        const btnAction = isFirst ? '' : 'onclick="this.parentElement.remove()"';

                        let htmlFila = '';
                        if (tipo === 'otro') {
                            htmlFila = `
                            <div class="otro-item grid grid-cols-[52px,auto,auto] gap-2 items-center">
                                <input type="text" value="${item.nombre || ''}" class="p-2 border rounded-lg flex-1 otro-nombre" placeholder="¿Qué es?">
                                <input type="number" min="1" value="${item.cantidad}" class="p-2 border rounded-lg w-20 otro-cant" placeholder="Cant.">
                                <button type="button" class="${btnClass} text-white w-8 h-8 rounded font-bold" ${btnAction}>${btnText}</button>
                            </div>`;
                        } else {
                            htmlFila = `
                            <div class="${tipo}-item grid grid-cols-[52px,auto,auto] gap-2 items-center">
                                <select class="p-2 border rounded-lg accModelo flex-1"></select>
                                <input type="number" min="1" value="${item.cantidad}" class="p-2 border rounded-lg w-20 ${tipo}-cant" placeholder="Cant.">
                                <button type="button" class="${btnClass} text-white w-8 h-8 rounded font-bold" ${btnAction}>${btnText}</button>
                            </div>`;
                        }
                        listaContenedor.insertAdjacentHTML('beforeend', htmlFila);
                    });

                    // Poblar options en los select (si the type is forro/vidrio)
                    if (tipo !== 'otro') {
                        const selects = listaContenedor.querySelectorAll('.accModelo');
                        selects.forEach((select, i) => {
                            // Helper importado `llenarSelect` ya no está expuesto aquí fácilmente, 
                            // copiamos de Constants usando window o global? Wait, en class App podemos leer MODELOS_IPHONE.
                            // Mejor clonamos las options del select original que existe en #salidaEquipoModelo etc., 
                            // o llamamos this.inicializarSelectores() si no rellenamos options? No, hay que rellenar options.
                            const optionsCloneRef = document.getElementById('modelo');
                            if (optionsCloneRef) {
                                select.innerHTML = optionsCloneRef.innerHTML; // easy clone
                                select.options[0].textContent = 'Seleccionar modelo';
                            }
                            select.value = arr[i].modelo || '';
                        });
                    }
                }
            };

            renderizarListaDinamica(venta.accesorios.forros, 'forroLista', 'forro', 'forro');
            renderizarListaDinamica(venta.accesorios.vidrios, 'vidrioLista', 'vidrio', 'vidrio');
            renderizarListaDinamica(venta.accesorios.otros, 'otroLista', 'otro', 'otroAccesorio');

            // Migración compatibilidad hacia atrás: si `forroModelo` está definido y no hay `forros` array
            if (venta.accesorios.forro && (!venta.accesorios.forros || !venta.accesorios.forros.length)) {
                renderizarListaDinamica([{ modelo: venta.accesorios.forroModelo, cantidad: venta.accesorios.forroCantidad || 1 }], 'forroLista', 'forro', 'forro');
            }
            if (venta.accesorios.vidrio && (!venta.accesorios.vidrios || !venta.accesorios.vidrios.length)) {
                renderizarListaDinamica([{ modelo: venta.accesorios.vidrioModelo, cantidad: venta.accesorios.vidrioCantidad || 1 }], 'vidrioLista', 'vidrio', 'vidrio');
            }

            // protector camara
            if (venta.accesorios.protectorCamara) {
                document.getElementById('protectorCamara').checked = true;
                document.getElementById('protectorCamara').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    const protectorCantidad = document.querySelector('#protectorCantidad input');
                    if (protectorCantidad) protectorCantidad.value = venta.accesorios.protectorCantidad || 1;
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
                document.getElementById('efectivoMonto').value = venta.montoPago || 0;
            } else if (venta.formaPago === 'zelle') {
                document.getElementById('zelleMonto').value = venta.montoPago || 0;
            } else if (venta.formaPago === 'binance') {
                document.getElementById('binanceMonto').value = venta.montoPago || 0;
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
                document.getElementById('equipoImeiR').value = venta.equipoRecibido.imei || '';
                document.getElementById('equipoValor').value = venta.equipoRecibido.valor || 0;
                document.getElementById('equipoComentarios').value = venta.equipoRecibido.comentarios || '';
            }, 150);
        }

        // Monto total
        document.getElementById('montoTotal').value = venta.montoTotal;

        // Tipo de transacción
        document.querySelector(`input[name="tipoTransaccion"][value="${venta.tipoTransaccion}"]`).checked = true;
        this.manejarCambioTipoTransaccion();

        // Abonos previos
        if (venta.abonosPrevios && venta.abonosPrevios.length > 0) {
            document.getElementById('tieneAbonosPrevios').checked = true;
            document.getElementById('tieneAbonosPrevios').dispatchEvent(new Event('change'));

            setTimeout(() => {
                const listaAbonosP = document.getElementById('listaAbonosPrevios');
                if (listaAbonosP) {
                    listaAbonosP.innerHTML = '';
                    venta.abonosPrevios.forEach((abono, idx) => {
                        const isFirst = idx === 0;
                        const btnClass = isFirst ? 'btn-add-abono-previo bg-green-500 hover:bg-green-600' : 'btn-remove-fila bg-red-500 hover:bg-red-600';
                        const btnText = isFirst ? '+' : '-';
                        const btnAction = isFirst ? '' : 'onclick="this.parentElement.remove()"';

                        const htmlFila = `
                            <div class="abono-previo-item grid grid-cols-[1fr,1fr,auto] gap-2 items-center">
                                <input type="date" value="${abono.fecha || ''}" class="p-2 border rounded-lg abono-fecha" title="Fecha del Abono">
                                <input type="number" min="0" step="0.01" value="${abono.monto || 0}" class="p-2 border rounded-lg abono-monto" placeholder="Monto ($)">
                                <button type="button" class="${btnClass} text-white w-8 h-8 rounded font-bold transition" ${btnAction}>${btnText}</button>
                            </div>
                        `;
                        listaAbonosP.insertAdjacentHTML('beforeend', htmlFila);
                    });
                }
            }, 50);
        }

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
    async imprimirGarantia(ventaId) {
        const venta = await ventaService.obtenerVentaPorId(ventaId);

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
    async imprimirResumenDia() {
        const fechaHoy = new Date().toLocaleDateString('es-ES'); // 1. Obtenemos la fecha

        // 2. Filtramos al instante por la fecha de hoy
        const ventas = (await ventaService.obtenerVentas()).filter(v => v.fecha === fechaHoy);
        const movimientos = (await movimientoService.obtenerMovimientos()).filter(m => m.fecha === fechaHoy);

        printService.imprimirResumenDia(ventas, movimientos, this.cajaActual);
    }

    /**
     * Elimina una venta.
     * 
     * La eliminación offline es manejada por StorageService._deletedVentaIds:
     * el documento eliminado se filtra de las lecturas aunque Firebase aún
     * lo tenga en su caché IndexedDB. La UI se actualiza en background.
     */
    async eliminarVenta(ventaId) {
        if (confirmar('¿Estás seguro de que quieres eliminar esta venta?')) {
            const resultado = await ventaService.eliminarVenta(ventaId);

            if (resultado.exito) {
                mostrarAlerta(resultado.mensaje, 'success');
                // Actualizar UI en background (fire-and-forget) para no bloquear
                this.actualizarUI().catch(err =>
                    console.warn('⚠️ Error actualizando UI después de eliminar:', err)
                );
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

        // Validaciones en tiempo real de IMEI en Movimientos
        const inputsImeiMovimientos = [
            { id: 'salidaEquipoImei', tipo: 'Salida Equipo', bannerPrefix: 'imeiSalidaBanner' },
            { id: 'ingresoEquipoImei', tipo: 'Ingreso Equipo', bannerPrefix: 'imeiIngresoBanner' },
            { id: 'compraEquipoImei', tipo: 'Compra Equipo', bannerPrefix: 'imeiCompraBanner' }
        ];

        inputsImeiMovimientos.forEach(config => {
            const input = document.getElementById(config.id);
            if (input) {
                input.addEventListener('input', () => this._revalidarImeiMovimiento(config));
                input.addEventListener('change', () => this._revalidarImeiMovimiento(config));
            }
        });
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

        // Limpiar inputs al cambiar de form
        if (formSeleccionado) {
            formSeleccionado.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.type === 'number') {
                    input.value = input.min || '';
                } else {
                    input.value = '';
                }
            });
        }
        
        // Limpiar banners al cambiar de form
        ['imeiSalidaBanner', 'imeiIngresoBanner', 'imeiCompraBanner'].forEach(id => {
            const banner = document.getElementById(id);
            if (banner) banner.classList.add('hidden');
        });
    }

    /**
     * Valida en tiempo real el IMEI en los formularios de Movimientos
     */
    _revalidarImeiMovimiento(config) {
        const input = document.getElementById(config.id);
        const banner = document.getElementById(config.bannerPrefix);
        const titulo = document.getElementById(config.bannerPrefix + 'Titulo');
        const detalle = document.getElementById(config.bannerPrefix + 'Detalle');
        const icono = document.getElementById(config.bannerPrefix + 'Icono');

        if (!input || !banner || !titulo || !detalle || !icono) return;

        const imei = (input.value || '').trim();

        // 1. Ocultar si está vacío o muy corto
        if (imei.length < 15) {
            banner.classList.add('hidden');
            return;
        }

        // 2. Si tiene más de 15, no es válido
        if (imei.length > 15 || !/^\d{15}$/.test(imei)) {
            banner.classList.remove('hidden', 'bg-blue-50', 'border-blue-200', 'bg-green-50', 'border-green-200');
            banner.classList.add('bg-red-50', 'border-red-200');
            icono.textContent = '❌';
            titulo.textContent = 'IMEI Inválido';
            titulo.className = 'font-semibold text-xs text-red-800';
            detalle.textContent = 'El IMEI debe tener exactamente 15 dígitos numéricos.';
            detalle.className = 'text-[10px] mt-0.5 leading-tight text-red-600';
            return;
        }

        // Buscar en inventario
        const equipo = inventarioService.buscarPorImei(imei);

        // 3. Lógica según tipo de formulario
        if (config.tipo === 'Salida Equipo') {
            if (!equipo) {
                banner.classList.remove('hidden', 'bg-blue-50', 'border-blue-200', 'bg-green-50', 'border-green-200');
                banner.classList.add('bg-red-50', 'border-red-200');
                icono.textContent = '❌';
                titulo.textContent = 'IMEI No Encontrado';
                titulo.className = 'font-semibold text-xs text-red-800';
                detalle.textContent = 'Este equipo no existe en el inventario actual de la sede.';
                detalle.className = 'text-[10px] mt-0.5 leading-tight text-red-600';
            } else if (equipo.estado !== 'disponible') {
                const estadosTexto = {
                    vendido: 'VENDIDO',
                    transferido: 'TRANSFERIDO',
                    defectuoso: 'DEFECTUOSO',
                    eliminado: 'ELIMINADO'
                };
                banner.classList.remove('hidden', 'bg-blue-50', 'border-blue-200', 'bg-green-50', 'border-green-200');
                banner.classList.add('bg-red-50', 'border-red-200');
                icono.textContent = '❌';
                titulo.textContent = `Equipo ${estadosTexto[equipo.estado] || equipo.estado.toUpperCase()}`;
                titulo.className = 'font-semibold text-xs text-red-800';
                detalle.textContent = 'Solo puedes dar salida a equipos que estén disponibles en inventario.';
                detalle.className = 'text-[10px] mt-0.5 leading-tight text-red-600';
            } else {
                // Éxito: autocompletar!
                banner.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'bg-green-50', 'border-green-200');
                banner.classList.add('bg-blue-50', 'border-blue-200');
                icono.textContent = 'ℹ️';
                titulo.textContent = 'Equipo Encontrado';
                titulo.className = 'font-semibold text-xs text-blue-800';
                detalle.textContent = `📱 ${equipo.modelo} ${equipo.gb} ${equipo.color} - Autocompletando datos...`;
                detalle.className = 'text-[10px] mt-0.5 leading-tight text-blue-600';

                // Autocompletar form
                const selectModelo = document.getElementById('salidaEquipoModelo');
                if (selectModelo) selectModelo.value = equipo.modelo;
                
                const selectCapacidad = document.getElementById('salidaEquipoCapacidad');
                if (selectCapacidad) selectCapacidad.value = equipo.gb;

                // Forzar trigger de evento change en modelo para que llene los colores, y luego elegir el color
                if (selectModelo) {
                    const evt = new Event('change');
                    selectModelo.dispatchEvent(evt);
                    setTimeout(() => {
                        const selectColor = document.getElementById('salidaEquipoColor');
                        if (selectColor) selectColor.value = equipo.color;
                    }, 50);
                }

                const inputBateria = document.getElementById('salidaEquipoBateria');
                if (inputBateria && equipo.bateria) inputBateria.value = parseInt(equipo.bateria);
            }

        } else if (config.tipo === 'Ingreso Equipo' || config.tipo === 'Compra Equipo') {
            if (equipo && equipo.estado === 'disponible') {
                banner.classList.remove('hidden', 'bg-blue-50', 'border-blue-200', 'bg-green-50', 'border-green-200');
                banner.classList.add('bg-red-50', 'border-red-200');
                icono.textContent = '❌';
                titulo.textContent = 'Equipo Ya Disponible';
                titulo.className = 'font-semibold text-xs text-red-800';
                detalle.textContent = `Ya tienes un ${equipo.modelo} ${equipo.gb} ${equipo.color} DISPONIBLE con este IMEI.`;
                detalle.className = 'text-[10px] mt-0.5 leading-tight text-red-600';
            } else if (equipo) {
                // Existe pero no está disponible (vendido, transferido, eliminado, etc.)
                // Lo informamos pero lo permitimos (el guardado ya lo permitía, creando uno nuevo o regrabando si se acepta, pero en realidad crea otro registro o lo sobreescribe).
                banner.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'bg-green-50', 'border-green-200');
                banner.classList.add('bg-blue-50', 'border-blue-200');
                icono.textContent = 'ℹ️';
                titulo.textContent = `Equipo ${equipo.estado.toUpperCase()}`;
                titulo.className = 'font-semibold text-xs text-blue-800';
                detalle.textContent = `Este IMEI pertenece a un ${equipo.modelo} que fue ${equipo.estado}. Se registrará su reingreso.`;
                detalle.className = 'text-[10px] mt-0.5 leading-tight text-blue-600';
            } else {
                // Nuevo IMEI, perfecto para ingreso
                banner.classList.remove('hidden', 'bg-red-50', 'border-red-200', 'bg-blue-50', 'border-blue-200');
                banner.classList.add('bg-green-50', 'border-green-200');
                icono.textContent = '✅';
                titulo.textContent = 'IMEI Libre';
                titulo.className = 'font-semibold text-xs text-green-800';
                detalle.textContent = 'El equipo se registrará como nuevo ingreso en el inventario.';
                detalle.className = 'text-[10px] mt-0.5 leading-tight text-green-600';
            }
        }
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
     * Inicializa eventos para checkboxes de accesorios
     */
    inicializarTiposAccesorios() {
        // ═══════════════════════════════════════════════
        // SALIDA DE ACCESORIOS - CHECKBOXES
        // ═══════════════════════════════════════════════
        
        // Forro Salida
        const salidaForroCheckbox = document.getElementById('salidaForro');
        if (salidaForroCheckbox) {
            salidaForroCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('salidaForroContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                        this._inicializarModeloSelects('salidaForroLista');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // Vidrio Salida
        const salidaVidrioCheckbox = document.getElementById('salidaVidrio');
        if (salidaVidrioCheckbox) {
            salidaVidrioCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('salidaVidrioContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                        this._inicializarModeloSelects('salidaVidrioLista');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // Caja Salida
        const salidaCajaCheckbox = document.getElementById('salidaCaja');
        if (salidaCajaCheckbox) {
            salidaCajaCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('salidaCajaContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                        this._inicializarModeloSelects('salidaCajaLista');
                        this._inicializarColorSelects('salidaCajaLista');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // Accesorios simples - Salida
        ['Cargador', 'ProtectorCamara', 'Cubo', 'CableLightning', 'CableCC'].forEach(tipo => {
            const checkbox = document.getElementById(`salida${tipo}`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const contenedor = document.getElementById(`salida${tipo}Cantidad`);
                    if (contenedor) {
                        contenedor.classList.toggle('hidden', !e.target.checked);
                    }
                });
            }
        });

        // Otro Accesorio - Salida
        const salidaOtroCheckbox = document.getElementById('salidaOtroAccesorio');
        if (salidaOtroCheckbox) {
            salidaOtroCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('salidaOtroContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // ═══════════════════════════════════════════════
        // INGRESO DE ACCESORIOS - CHECKBOXES
        // ═══════════════════════════════════════════════
        
        // Forro Ingreso
        const ingresoForroCheckbox = document.getElementById('ingresoForro');
        if (ingresoForroCheckbox) {
            ingresoForroCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('ingresoForroContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                        this._inicializarModeloSelects('ingresoForroLista');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // Vidrio Ingreso
        const ingresoVidrioCheckbox = document.getElementById('ingresoVidrio');
        if (ingresoVidrioCheckbox) {
            ingresoVidrioCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('ingresoVidrioContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                        this._inicializarModeloSelects('ingresoVidrioLista');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // Caja Ingreso
        const ingresoCajaCheckbox = document.getElementById('ingresoCaja');
        if (ingresoCajaCheckbox) {
            ingresoCajaCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('ingresoCajaContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                        this._inicializarModeloSelects('ingresoCajaLista');
                        this._inicializarColorSelects('ingresoCajaLista');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // Accesorios simples - Ingreso
        ['Cargador', 'ProtectorCamara', 'Cubo', 'CableLightning', 'CableCC'].forEach(tipo => {
            const checkbox = document.getElementById(`ingreso${tipo}`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const contenedor = document.getElementById(`ingreso${tipo}Cantidad`);
                    if (contenedor) {
                        contenedor.classList.toggle('hidden', !e.target.checked);
                    }
                });
            }
        });

        // Otro Accesorio - Ingreso
        const ingresoOtroCheckbox = document.getElementById('ingresoOtroAccesorio');
        if (ingresoOtroCheckbox) {
            ingresoOtroCheckbox.addEventListener('change', (e) => {
                const contenedor = document.getElementById('ingresoOtroContenedor');
                if (contenedor) {
                    if (e.target.checked) {
                        contenedor.classList.remove('hidden');
                        contenedor.classList.add('flex');
                    } else {
                        contenedor.classList.add('hidden');
                        contenedor.classList.remove('flex');
                    }
                }
            });
        }

        // ═══════════════════════════════════════════════
        // BOTONES "+" para agregar filas dinámicas
        // ═══════════════════════════════════════════════
        this._inicializarBotonesAgregarFila();
    }

    /**
     * Inicializa los selects de modelo con opciones de iPhone
     * @private
     */
    _inicializarModeloSelects(contenedorId) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        const selects = contenedor.querySelectorAll('.accModelo');
        selects.forEach(select => {
            if (select.options.length === 0) {
                select.innerHTML = '<option value="">Seleccionar</option>';
                MODELOS_IPHONE.forEach(modelo => {
                    const option = document.createElement('option');
                    option.value = modelo.valor;
                    option.textContent = modelo.etiqueta;
                    select.appendChild(option);
                });
            }
        });
    }

    /**
     * Inicializa un select de colores con opciones de iPhone
     * @private
     */
    _inicializarColorSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select || select.options.length > 0) return;

        select.innerHTML = '<option value="">Seleccionar</option>';
        COLORES_IPHONE.forEach(color => {
            const option = document.createElement('option');
            option.value = color.valor;
            option.textContent = color.etiqueta;
            select.appendChild(option);
        });
    }

    /**
     * Inicializa todos los selects de color dentro de un contenedor
     * @private
     */
    _inicializarColorSelects(contenedorId) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        const selects = contenedor.querySelectorAll('.caja-color');
        selects.forEach(select => {
            if (select.options.length === 0) {
                select.innerHTML = '<option value="">Seleccionar</option>';
                COLORES_IPHONE.forEach(color => {
                    const option = document.createElement('option');
                    option.value = color.valor;
                    option.textContent = color.etiqueta;
                    select.appendChild(option);
                });
            }
        });
    }

    /**
     * Inicializa botones "+" para agregar filas dinámicas y "-" para eliminar
     * @private
     */
    _inicializarBotonesAgregarFila() {
        // Usar delegación de eventos para manejar botones dinámicos
        document.addEventListener('click', (e) => {
            // ═══════════════════════════════════════════════
            // BOTONES "+" - AGREGAR FILA (verde)
            // ═══════════════════════════════════════════════
            
            // Botones de Forro (salida/ingreso)
            if (e.target.classList.contains('btn-add-salida-forro') || e.target.classList.contains('btn-add-ingreso-forro')) {
                const prefijo = e.target.classList.contains('btn-add-salida-forro') ? 'salida' : 'ingreso';
                const lista = document.getElementById(`${prefijo}ForroLista`);
                if (lista) {
                    const nuevaFila = document.createElement('div');
                    nuevaFila.className = 'forro-item grid grid-cols-[1fr,auto,auto] gap-2 items-center';
                    nuevaFila.innerHTML = `
                        <select class="p-2 border rounded-lg accModelo text-sm"></select>
                        <input type="number" min="1" value="1" class="p-2 border rounded-lg w-16 forro-cant text-sm" placeholder="Cant.">
                        <button type="button" class="btn-remove-${prefijo}-forro bg-red-500 text-white w-8 h-8 rounded font-bold hover:bg-red-600 transition">-</button>
                    `;
                    lista.appendChild(nuevaFila);
                    this._inicializarModeloSelects(`${prefijo}ForroLista`);
                }
            }

            // Botones de Vidrio (salida/ingreso)
            if (e.target.classList.contains('btn-add-salida-vidrio') || e.target.classList.contains('btn-add-ingreso-vidrio')) {
                const prefijo = e.target.classList.contains('btn-add-salida-vidrio') ? 'salida' : 'ingreso';
                const lista = document.getElementById(`${prefijo}VidrioLista`);
                if (lista) {
                    const nuevaFila = document.createElement('div');
                    nuevaFila.className = 'vidrio-item grid grid-cols-[1fr,auto,auto] gap-2 items-center';
                    nuevaFila.innerHTML = `
                        <select class="p-2 border rounded-lg accModelo text-sm"></select>
                        <input type="number" min="1" value="1" class="p-2 border rounded-lg w-16 vidrio-cant text-sm" placeholder="Cant.">
                        <button type="button" class="btn-remove-${prefijo}-vidrio bg-red-500 text-white w-8 h-8 rounded font-bold hover:bg-red-600 transition">-</button>
                    `;
                    lista.appendChild(nuevaFila);
                    this._inicializarModeloSelects(`${prefijo}VidrioLista`);
                }
            }

            // Botones de Caja (salida/ingreso)
            if (e.target.classList.contains('btn-add-salida-caja') || e.target.classList.contains('btn-add-ingreso-caja')) {
                const prefijo = e.target.classList.contains('btn-add-salida-caja') ? 'salida' : 'ingreso';
                const lista = document.getElementById(`${prefijo}CajaLista`);
                if (lista) {
                    const nuevaFila = document.createElement('div');
                    nuevaFila.className = 'caja-item flex flex-col gap-2';
                    nuevaFila.innerHTML = `
                        <select class="p-2 border rounded-lg accModelo text-sm w-full"></select>
                        <div class="grid grid-cols-[1fr,auto,auto] gap-2">
                            <select class="p-2 border rounded-lg caja-color text-sm"></select>
                            <input type="number" min="1" value="1" class="p-2 border rounded-lg w-16 caja-cant text-sm" placeholder="Cant.">
                            <button type="button" class="btn-remove-${prefijo}-caja bg-red-500 text-white w-8 h-8 rounded font-bold hover:bg-red-600 transition">-</button>
                        </div>
                    `;
                    lista.appendChild(nuevaFila);
                    this._inicializarModeloSelects(`${prefijo}CajaLista`);
                    this._inicializarColorSelects(`${prefijo}CajaLista`);
                }
            }

            // Botones de Otro (salida/ingreso)
            if (e.target.classList.contains('btn-add-salida-otro') || e.target.classList.contains('btn-add-ingreso-otro')) {
                const prefijo = e.target.classList.contains('btn-add-salida-otro') ? 'salida' : 'ingreso';
                const lista = document.getElementById(`${prefijo}OtroLista`);
                if (lista) {
                    const nuevaFila = document.createElement('div');
                    nuevaFila.className = 'otro-item grid grid-cols-[1fr,auto,auto] gap-2 items-center';
                    nuevaFila.innerHTML = `
                        <input type="text" class="p-2 border rounded-lg flex-1 otro-nombre text-sm" placeholder="¿Qué es?">
                        <input type="number" min="1" value="1" class="p-2 border rounded-lg w-16 otro-cant text-sm" placeholder="Cant.">
                        <button type="button" class="btn-remove-${prefijo}-otro bg-red-500 text-white w-8 h-8 rounded font-bold hover:bg-red-600 transition">-</button>
                    `;
                    lista.appendChild(nuevaFila);
                }
            }

            // ═══════════════════════════════════════════════
            // BOTONES "-" - ELIMINAR FILA (rojo)
            // ═══════════════════════════════════════════════
            
            // Eliminar Forro
            if (e.target.classList.contains('btn-remove-salida-forro') || e.target.classList.contains('btn-remove-ingreso-forro')) {
                const fila = e.target.closest('.forro-item');
                if (fila) fila.remove();
            }

            // Eliminar Vidrio
            if (e.target.classList.contains('btn-remove-salida-vidrio') || e.target.classList.contains('btn-remove-ingreso-vidrio')) {
                const fila = e.target.closest('.vidrio-item');
                if (fila) fila.remove();
            }

            // Eliminar Caja
            if (e.target.classList.contains('btn-remove-salida-caja') || e.target.classList.contains('btn-remove-ingreso-caja')) {
                const fila = e.target.closest('.caja-item');
                if (fila) fila.remove();
            }

            // Eliminar Otro
            if (e.target.classList.contains('btn-remove-salida-otro') || e.target.classList.contains('btn-remove-ingreso-otro')) {
                const fila = e.target.closest('.otro-item');
                if (fila) fila.remove();
            }
        });
    }



    /**
     * Guarda el movimiento de inventario
     */
    async guardarMovimiento() {
        if (this._guardandoMovimiento) return; // Guard contra doble-click
        this._guardandoMovimiento = true;

        try {
            const datos = this.recopilarDatosMovimiento();
            console.log('📝 Datos recopilados:', datos);

            if (!datos) {
                alert('Por favor complete todos los campos requeridos');
                return;
            }

            const sedeId = localStorage.getItem('usuario_sede_id') || 'sede_1';

            // ══════════════════════════════════════════
            // CASO ESPECIAL: ACCESORIOS MÚLTIPLES
            // ══════════════════════════════════════════
            if (datos.esMultipleAccesorios) {
                // ── Defensa: descartar entradas inválidas ──
                const accesoriosValidos = (datos.accesorios || []).filter(
                    acc => acc && typeof acc === 'object' && acc.tipo
                );

                if (accesoriosValidos.length === 0) {
                    alert('❌ No hay accesorios válidos para guardar. Revisa los datos del formulario.');
                    return;
                }

                // Guardar cada accesorio como movimiento separado
                for (const acc of accesoriosValidos) {
                    const datosMovimiento = {
                        tipo: acc.tipo,
                        modelos: acc.modelos || [],
                        cantidad: acc.cantidad || 0,
                        descripcion: acc.descripcion || '',
                        destino: datos.destino,
                        proveedor: datos.proveedor
                    };

                    try {
                        const resultado = await movimientoService.crearMovimiento({
                            tipo: datos.tipo,
                            datos: datosMovimiento
                        });

                        if (!resultado.exito) {
                            const errores = resultado.errores ? resultado.errores.join('\n') : 'Error desconocido';
                            alert(`❌ Error al guardar ${acc.tipo}:\n${errores}`);
                            return;
                        }
                    } catch (errAcc) {
                        console.error(`Error guardando accesorio ${acc.tipo}:`, errAcc);
                        alert(`❌ Error inesperado al guardar ${acc.tipo}: ${errAcc.message}`);
                        return;
                    }
                }

                alert(`✅ ${accesoriosValidos.length} movimiento(s) de accesorios registrado(s) correctamente`);
                this.cancelarMovimiento();
                await this.actualizarResumenMovimientos();
                await this.actualizarResumenVentas();
                return;
            }

            // ── INGRESO EQUIPO o COMPRA EQUIPO: sincronizar con inventario ──
            if (datos.tipo === 'Ingreso Equipo' || datos.tipo === 'Compra Equipo') {
                const imei = (datos.datos.imei || '').trim();

                // Validación 1: IMEI obligatorio y de 15 dígitos
                if (!imei || imei.length !== 15 || !/^\d{15}$/.test(imei)) {
                    alert(`❌ El IMEI "${imei}" no es válido. Debe tener exactamente 15 dígitos numéricos.`);
                    return;
                }

                // Validación 2: No existe ya como disponible
                const existente = inventarioService.buscarPorImei(imei);
                if (existente && existente.estado === 'disponible') {
                    alert(`❌ El IMEI ${imei} ya está registrado en el inventario como DISPONIBLE.\n📱 ${existente.modelo} ${existente.gb} ${existente.color}\n\nNo se puede ingresar el mismo equipo dos veces.`);
                    return;
                }

                // Validación 3: Campos de equipo completos
                if (!datos.datos.modelo || !datos.datos.capacidad || !datos.datos.color) {
                    alert('❌ Debes completar el Modelo, Capacidad y Color del equipo para registrar el ingreso en inventario.');
                    return;
                }

                // Crear equipo en inventario
                const origen = datos.datos.origen || datos.datos.proveedor || 'Caja';
                const nuevoEquipo = new EquipoInventario({
                    modelo: datos.datos.modelo,
                    gb: datos.datos.capacidad,
                    color: datos.datos.color,
                    bateria: parseInt(datos.datos.bateria) || 100,
                    imei: imei,
                    origen: origen,
                    detalles: datos.datos.nota || '',
                    estado: 'disponible',
                    creadoPor: sedeId
                });

                const resultadoInv = await inventarioService.guardarLote([nuevoEquipo], origen);
                if (!resultadoInv.exito) {
                    alert(`❌ Error al agregar al inventario: ${resultadoInv.error}`);
                    return;
                }
                console.log(`✅ Equipo IMEI ${imei} agregado al inventario por movimiento de Caja.`);
            }

            // ── SALIDA EQUIPO: sincronizar con inventario ──
            if (datos.tipo === 'Salida Equipo') {
                const imei = (datos.datos.imei || '').trim();

                // Validación 1: IMEI obligatorio y de 15 dígitos
                if (!imei || imei.length !== 15 || !/^\d{15}$/.test(imei)) {
                    alert(`❌ El IMEI "${imei}" no es válido. Debe tener exactamente 15 dígitos numéricos para poder dar salida.`);
                    return;
                }

                // Validación 2: Equipo existe en el inventario
                const equipo = inventarioService.buscarPorImei(imei);
                if (!equipo) {
                    alert(`❌ El IMEI ${imei} no existe en el inventario de esta sede.\n\nVerifica el número e intenta de nuevo.`);
                    return;
                }

                // Validación 3: Debe estar disponible (no vendido, no transferido, etc.)
                if (equipo.estado !== 'disponible') {
                    const estadosTexto = {
                        vendido: 'ya fue VENDIDO',
                        transferido: 'fue TRANSFERIDO a otra sede',
                        defectuoso: 'está marcado como DEFECTUOSO',
                        eliminado: 'fue ELIMINADO del sistema'
                    };
                    const desc = estadosTexto[equipo.estado] || `tiene estado "${equipo.estado}"`;
                    alert(`❌ El equipo con IMEI ${imei} (${equipo.modelo} ${equipo.gb} ${equipo.color}) no se puede dar salida porque ${desc}.\n\nSolo se pueden dar salida a equipos DISPONIBLES.`);
                    return;
                }

                // Validación 4: Pertenece a la sede actual
                if (equipo.creadoPor && equipo.creadoPor !== sedeId) {
                    // Advertencia blanda — no bloquea si fue ingresado desde otra sede por algún traslado
                    console.warn(`⚠️ El equipo ${imei} fue creado por ${equipo.creadoPor} pero se está dando salida desde ${sedeId}.`);
                }

                // Marcar como transferido en inventario
                const resultadoSalida = await inventarioService.procesarSalidaLote(
                    [equipo.id],
                    'transferido',
                    { 
                        destinoSalida: datos.datos.destino || 'No especificado',
                        personaRetiro: datos.datos.persona || 'No especificado',
                        fechaSalida: new Date().toISOString()
                    }
                );

                if (!resultadoSalida.exito) {
                    alert(`❌ Error al actualizar el inventario: ${resultadoSalida.error}`);
                    return;
                }
                console.log(`✅ Equipo IMEI ${imei} marcado como 'transferido' por movimiento de Caja.`);
            }

            // Guardar usando el servicio de movimientos
            const resultado = await movimientoService.crearMovimiento(datos);
            console.log('💾 Resultado del guardado:', resultado);

            if (resultado.exito) {
                alert('✅ Movimiento registrado correctamente');
                this.cancelarMovimiento();

                // Actualizar resumen con manejo de errores separado
                try {
                    await this.actualizarResumenMovimientos();
                    await this.actualizarResumenVentas();
                } catch (errorResumen) {
                    console.error('Error al actualizar resumen:', errorResumen);
                }
            } else {
                const errores = resultado.errores ? resultado.errores.join('\n') : 'Error desconocido';
                alert('❌ Error al guardar el movimiento:\n' + errores);
            }
        } catch (error) {
            console.error('Error al guardar movimiento:', error);
            alert('❌ Error al guardar el movimiento: ' + error.message);
        } finally {
            this._guardandoMovimiento = false;
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
                
                tipo = esSalida ? 'Salida Accesorio' : 'Ingreso Accesorio';
                
                // ✨ VALIDACIÓN USANDO AccesorioValidator
                const validacionAccesorios = AccesorioValidator.validarYRecopilar(prefijo);
                
                if (!validacionAccesorios.valido) {
                    const mensajeError = validacionAccesorios.errores.join('\n\n');
                    alert(`⚠️ Por favor corrija los siguientes errores:\n\n${mensajeError}`);
                    return null;
                }
                
                // Validar campos comunes (destino/proveedor)
                const validacionCampos = AccesorioValidator.validarCamposComunes(prefijo, esSalida);
                if (!validacionCampos.valido) {
                    alert(validacionCampos.errores.join('\n'));
                    return null;
                }
                
                // Retornar estructura especial para accesorios
                return {
                    tipo: tipo,
                    esMultipleAccesorios: true,
                    accesorios: validacionAccesorios.accesorios,
                    destino: esSalida ? document.getElementById('salidaAccesorioDestino')?.value : undefined,
                    proveedor: !esSalida ? document.getElementById('ingresoAccesorioProveedor')?.value : undefined
                };
                break;
        }
        console.log(datosMovimiento, tipo);
        // Retornar en el formato que espera el modelo Movimiento
        return {
            tipo: tipo,
            datos: datosMovimiento
        };
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

    // ==========================================
    // BUSCADOR ESTRICTO DE INVENTARIO
    // ==========================================

    inicializarBuscadoresInventario() {
        const buscadores = [
            { tipo: 'Venta', input: 'inputBuscadorVenta', resultados: 'resultadosBuscadorVenta' },
            { tipo: 'Salida', input: 'inputBuscadorSalida', resultados: 'resultadosBuscadorSalida' },
            { tipo: 'Garantia', input: 'inputBuscadorGarantia', resultados: 'resultadosBuscadorGarantia' }
        ];

        buscadores.forEach(b => {
            const input = document.getElementById(b.input);
            const resultados = document.getElementById(b.resultados);
            
            // Botón de quitar
            const btnQuitar = document.getElementById(`btnQuitarEquipo${b.tipo}`);
            if (btnQuitar) {
                btnQuitar.addEventListener('click', () => this._limpiarBuscador(b.tipo));
            }

            if (!input || !resultados) return;

            // Evento input para buscar
            input.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (query.length < 2) {
                    resultados.classList.add('hidden');
                    return;
                }

                // Obtener todos los disponibles y filtrar
                const equipos = inventarioService.obtenerDisponibles();
                const filtrados = equipos.filter(eq => 
                    (eq.imei && eq.imei.toLowerCase().includes(query)) ||
                    (eq.modelo && eq.modelo.toLowerCase().includes(query))
                );

                this._renderizarResultadosBuscador(b.tipo, filtrados, resultados);
            });

            // Ocultar resultados si se hace click afuera
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !resultados.contains(e.target)) {
                    resultados.classList.add('hidden');
                }
            });
            
            // Mostrar de nuevo si hace focus y tiene texto
            input.addEventListener('focus', () => {
                if (input.value.trim().length >= 2) {
                    resultados.classList.remove('hidden');
                }
            });
        });
    }

    _renderizarResultadosBuscador(tipo, equipos, contenedor) {
        if (equipos.length === 0) {
            contenedor.innerHTML = '<div class="p-3 text-sm text-gray-500 text-center">No se encontraron equipos disponibles con ese dato.</div>';
            contenedor.classList.remove('hidden');
            return;
        }

        const html = equipos.slice(0, 10).map(eq => `
            <div class="p-3 border-b hover:bg-blue-50 cursor-pointer flex items-center justify-between" data-imei="${eq.imei}">
                <div>
                    <p class="font-semibold text-gray-800 text-sm">📱 ${eq.modelo}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        <span class="bg-gray-100 px-1 rounded">${eq.gb}</span> • 
                        <span class="bg-gray-100 px-1 rounded">${eq.color}</span> • 
                        <span class="bg-gray-100 px-1 rounded">Batería: ${eq.bateria}%</span>
                    </p>
                </div>
                <div class="text-xs text-gray-400 font-mono">${eq.imei}</div>
            </div>
        `).join('');

        contenedor.innerHTML = html;
        contenedor.classList.remove('hidden');

        // Agregar eventos de click
        contenedor.querySelectorAll('div[data-imei]').forEach(div => {
            div.addEventListener('click', () => {
                const imei = div.dataset.imei;
                const equipo = inventarioService.buscarPorImei(imei);
                if (equipo) {
                    this._seleccionarEquipoDesdeBuscador(tipo, equipo);
                    contenedor.classList.add('hidden');
                }
            });
        });
    }

    _seleccionarEquipoDesdeBuscador(tipo, equipo) {
        // 1. Ocultar el contenedor del buscador
        document.getElementById(`buscador${tipo === 'Venta' ? 'Venta' : tipo}Container`).classList.add('hidden');
        
        // 2. Mostrar la tarjeta
        document.getElementById(`tarjetaEquipo${tipo}`).classList.remove('hidden');
        document.getElementById(`btnQuitarEquipo${tipo}`).classList.remove('hidden');

        // 3. Llenar los datos visuales de la tarjeta
        document.getElementById(`tarjeta${tipo}Modelo`).textContent = equipo.modelo;
        document.getElementById(`tarjeta${tipo}Capacidad`).textContent = equipo.gb;
        document.getElementById(`tarjeta${tipo}Color`).textContent = equipo.color;
        document.getElementById(`tarjeta${tipo}Bateria`).textContent = `🔋 ${equipo.bateria}%`;
        document.getElementById(`tarjeta${tipo}Imei`).textContent = `IMEI: ${equipo.imei}`;

        // 4. Llenar los campos ocultos subyacentes para no romper main.js
        if (tipo === 'Venta') {
            document.getElementById('modelo').value = equipo.modelo;
            document.getElementById('color').value = equipo.color;
            document.getElementById('almacenamiento').value = equipo.gb;
            document.getElementById('bateria').value = equipo.bateria;
            document.getElementById('equipoImei').value = equipo.imei;
            
            // Disparar eventos change si es necesario (ej: accesorios o validación)
            document.getElementById('modelo').dispatchEvent(new Event('change'));
            
            // Si hay un banner de IMEI existente para la venta normal, lo ocultamos
            if (this._ocultarBannerImei) {
                this._ocultarBannerImei();
            }

        } else if (tipo === 'Salida') {
            document.getElementById('salidaEquipoModelo').value = equipo.modelo;
            document.getElementById('salidaEquipoCapacidad').value = equipo.gb;
            document.getElementById('salidaEquipoColor').value = equipo.color;
            document.getElementById('salidaEquipoBateria').value = equipo.bateria;
            document.getElementById('salidaEquipoImei').value = equipo.imei;
            
        } else if (tipo === 'Garantia') {
            document.getElementById('nuevoModelo').value = equipo.modelo;
            document.getElementById('nuevoCapacidad').value = equipo.gb;
            document.getElementById('nuevoColor').value = equipo.color;
            document.getElementById('nuevoBateria').value = equipo.bateria;
            document.getElementById('nuevoImei').value = equipo.imei;
        }
    }

    _limpiarBuscador(tipo) {
        // 1. Mostrar buscador y limpiar input
        const container = document.getElementById(`buscador${tipo === 'Venta' ? 'Venta' : tipo}Container`);
        if (container) container.classList.remove('hidden');
        const inputBuscador = document.getElementById(`inputBuscador${tipo}`);
        if (inputBuscador) inputBuscador.value = '';
        
        // 2. Ocultar tarjeta
        const tarjeta = document.getElementById(`tarjetaEquipo${tipo}`);
        if (tarjeta) tarjeta.classList.add('hidden');
        const btn = document.getElementById(`btnQuitarEquipo${tipo}`);
        if (btn) btn.classList.add('hidden');

        // 3. Limpiar campos ocultos
        if (tipo === 'Venta') {
            document.getElementById('modelo').value = '';
            document.getElementById('color').value = '';
            document.getElementById('almacenamiento').value = '';
            document.getElementById('bateria').value = '';
            document.getElementById('equipoImei').value = '';
            document.getElementById('modelo').dispatchEvent(new Event('change'));
        } else if (tipo === 'Salida') {
            document.getElementById('salidaEquipoModelo').value = '';
            document.getElementById('salidaEquipoCapacidad').value = '';
            document.getElementById('salidaEquipoColor').value = '';
            document.getElementById('salidaEquipoBateria').value = '';
            document.getElementById('salidaEquipoImei').value = '';
        } else if (tipo === 'Garantia') {
            document.getElementById('nuevoModelo').value = '';
            document.getElementById('nuevoCapacidad').value = '';
            document.getElementById('nuevoColor').value = '';
            document.getElementById('nuevoBateria').value = '';
            document.getElementById('nuevoImei').value = '';
        }
    }

}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    authService.onAuthChange((user) => {
        if (!user) {
            window.location.replace('login.html');
        } else {
            if (!window.app) {
                window.app = new App();
                const btnLogout = document.getElementById('btnLogout');
                if (btnLogout) btnLogout.addEventListener('click', () => authService.logout());
                const btnLogoutMobile = document.getElementById('btnLogoutMobile');
                if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', () => authService.logout());
            }
        }
    });
});


