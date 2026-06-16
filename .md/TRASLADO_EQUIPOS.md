# 📦📤 Sistema de Ingreso y Salida de Equipos

## 🎯 Descripción General

El módulo `ingreso-mercancia.html` ahora incluye funcionalidad dual:
- **📦 Modo Ingreso**: Registra nuevos equipos al inventario
- **📤 Modo Salida**: Traslada/da de baja equipos existentes

## 🔄 Funcionalidades Implementadas

### 1. **Toggle de Modos**
- Switch visual para cambiar entre Ingreso y Salida
- Cambio dinámico de título y subtítulo
- Interfaz adaptada a cada modo

### 2. **Modo Ingreso (Existente Mejorado)**
✅ Validación IMEI duplicados en tiempo real  
✅ Autocompletado de modelos  
✅ Validación de batería (warnings visuales)  
✅ Checkbox: Registrar movimiento en caja  
✅ Impresión profesional de nota de ingreso  
✅ Panel de resumen con agrupación por modelo  

### 3. **Modo Salida (NUEVO)**

#### 📋 Información del Traslado
- **Destino**: Sede o cliente destino
- **Responsable**: Persona encargada del traslado
- **Notas**: Detalles adicionales del envío

#### 🔍 Buscador Inteligente
- Búsqueda en tiempo real por:
  - Modelo (ej: "13 Pro")
  - Color (ej: "Graphite")
  - IMEI (ej: "123456789012345")
  - Capacidad (ej: "256GB")
- Muestra solo equipos **disponibles** en inventario
- Indicador visual de equipos ya seleccionados

#### ✅ Selección de Equipos
- Click para agregar a lista de salida
- Botón ✕ para quitar de la selección
- Vista detallada: modelo, GB, color, IMEI, batería
- Contador automático en panel de resumen

#### 💾 Guardado con Estado "transferido"
```javascript
await inventarioService.cambiarEstado(equipoId, 'transferido', {
    destino: "Sede Cumbayá",
    responsable: "Juan Pérez",
    notasTraslado: "Para reparación",
    fechaTransferencia: "2026-06-03T10:30:00",
    sedeOrigen: "sede_1"
});
```

#### ✅ Registro de Movimientos (IMPLEMENTADO)
- Checkbox para activar/desactivar registro en caja (marcado por defecto)
- **Modo Ingreso**: Registra movimiento tipo "Ingreso Equipo"
- **Modo Salida**: Registra movimiento tipo "Salida Equipo"
- Incluye todos los datos relevantes: modelo, capacidad, color, IMEI, batería
- Aparecen automáticamente en `cierree.html` (sección Movimientos)
- Formato robusto con manejo de errores

#### 🖨️ Impresión Profesional
- Formato diferenciado para ingreso (verde) y salida (rojo)
- Incluye:
  - Encabezado con fecha y hora
  - Información del traslado
  - Tabla detallada de equipos
  - Espacios para firmas (Entregado/Recibido)
  - Pie de página automático

### 4. **Panel de Resumen Dinámico**

**Modo Ingreso:**
- Total de equipos válidos
- Agrupación por modelo y capacidad
- Alertas de IMEIs duplicados

**Modo Salida:**
- Total de equipos seleccionados
- Agrupación por modelo y capacidad
- Color rojo para diferenciar visualmente

## 🛡️ Seguridad y Validaciones Mantenidas

### ✅ Validaciones IMEI (Modo Ingreso)
1. **Longitud**: Debe ser exactamente 15 dígitos
2. **Duplicados en lote**: No permite IMEIs repetidos en la misma nota
3. **Duplicados en inventario**: Valida contra DB en tiempo real
4. **Feedback visual**: ✅ válido, ❌ incompleto, ⚠️ duplicado

### ✅ Sincronización Garantizada
```javascript
// El inventario se carga completamente antes de permitir operaciones
await inventarioService.esperarListo();
inventarioCargado = true;
```

### ✅ Validación de Disponibilidad (Modo Salida)
- Solo muestra equipos con estado `disponible`
- No permite seleccionar el mismo equipo dos veces
- Verifica existencia antes de guardar

## 📊 Flujo de Trabajo

### Modo Ingreso
```
1. Usuario completa campos: Origen, Notas
2. Agrega equipos fila por fila
3. Validación IMEI en tiempo real
4. Click "Guardar Todo al Inventario"
5. Validación final (duplicados, completitud)
6. Guardado en lote con LoteID único
7. ✅ Registra movimientos en caja (si checkbox marcado)
8. Opcional: Imprime nota de ingreso
```

### Modo Salida
```
1. Usuario completa: Destino, Responsable, Notas
2. Busca equipos disponibles en inventario
3. Selecciona equipos (click en sugerencias)
4. Revisa lista y resumen
5. Click "Confirmar Salida y Dar de Baja"
6. Cambio de estado a "transferido" con metadata
7. ✅ Registra movimientos en caja (si checkbox marcado)
8. Opcional: Imprime nota de salida
```

## 🎨 Diseño Visual

### Colores por Modo
- **Ingreso**: Verde (`#059669`, `#10b981`)
- **Salida**: Rojo (`#d32f2f`, `#ef4444`)

### Animaciones
- `slideIn`: Filas nuevas y equipos seleccionados
- `fadeIn`: Cambio de secciones
- `hover`: Estados interactivos

## 🔧 Integración con MovimientoService (✅ COMPLETADA)

### 1. Registro de Movimientos de Ingreso
```javascript
// Modo Ingreso - Al guardar lote
if (registrarMovimiento) {
    for (const equipo of equipos) {
        await movimientoService.crearMovimiento({
            tipo: 'Ingreso Equipo',
            datos: {
                modelo: equipo.modelo,
                capacidad: equipo.gb,
                color: equipo.color,
                imei: equipo.imei,
                origen: origenLote || 'No especificado',
                bateria: equipo.bateria,
                notas: notasLote || ''
            }
        });
    }
}
```

### 2. Registro de Movimientos de Salida
```javascript
// Modo Salida - Al confirmar traslado
if (registrarMovimiento) {
    for (const equipo of equiposParaMovimiento) {
        await movimientoService.crearMovimiento({
            tipo: 'Salida Equipo',
            datos: {
                modelo: equipo.modelo,
                capacidad: equipo.gb,
                color: equipo.color,
                imei: equipo.imei,
                destino: destino,
                persona: responsable || 'No especificado',
                bateria: equipo.bateria,
                notas: notas || ''
            }
        });
    }
}
```

### 3. Visualización en cierree.html
Los movimientos registrados aparecen automáticamente en:
- Sección "Movimientos del Día"
- Con detalles completos de cada equipo
- Icono 📱➡️ para Salida Equipo
- Icono 📱⬅️ para Ingreso Equipo

### 4. Estado "transferido" en InventarioService
Ya implementado con metadata completa:
- `destino`
- `responsable`
- `notasTraslado`
- `fechaTransferencia`
- `sedeOrigen`

## 📱 Responsive Design

✅ Desktop: Layout de 3 columnas  
✅ Tablet: Layout adaptativo  
✅ Mobile: Stack vertical con menú hamburguesa  

## 🖨️ Formato de Impresión

### Nota de Ingreso
```
┌─────────────────────────────────────┐
│  📦 NOTA DE INGRESO DE MERCANCÍA   │
│  Fecha: miércoles, 3 de junio...    │
│  Sede: sede_1                        │
├─────────────────────────────────────┤
│  Origen: USA Import                  │
│  Total: 5 equipos                    │
│  Notas: Lote de mayo                 │
├──┬────────┬────┬────────┬─────┬─────┤
│# │Modelo  │ GB │ Color  │Bat% │IMEI │
├──┼────────┼────┼────────┼─────┼─────┤
│1 │13 Pro  │256 │Graphite│ 95% │...  │
└──┴────────┴────┴────────┴─────┴─────┘
```

### Nota de Salida
```
┌─────────────────────────────────────┐
│   📤 NOTA DE SALIDA DE EQUIPOS      │
│  Fecha: miércoles, 3 de junio...    │
│  Origen: sede_1                      │
├─────────────────────────────────────┤
│  Destino: Sede Cumbayá               │
│  Responsable: Juan Pérez             │
│  Total: 3 equipos                    │
│  Notas: Traslado para reparación    │
├──┬────────┬────┬────────┬─────┬─────┤
│# │Modelo  │ GB │ Color  │Bat% │IMEI │
└──┴────────┴────┴────────┴─────┴─────┘
```

## 🐛 Debugging

### Logs Importantes
```javascript
console.log('✅ Inventario listo para validaciones en tiempo real');
console.log(`✅ ${equipos.length} movimiento(s) de ingreso registrado(s)`);
console.log(`✅ ${equiposParaMovimiento.length} movimiento(s) de salida registrado(s)`);
console.log(`✅ ${equipos.length} equipo(s) guardados correctamente`);
```

### Variables Globales Expuestas
```javascript
window.agregarEquipoSalida = agregarEquipoSalida;
window.quitarEquipoSalida = quitarEquipoSalida;
```

## 🚀 Estado del Proyecto

### ✅ Completado
1. ✅ Estado "transferido" implementado
2. ✅ Impresión profesional implementada
3. ✅ Integración con MovimientoService
4. ✅ Registro automático en cierree.html
5. ✅ Checkboxes para control de registro
6. ✅ Validación IMEI en tiempo real
7. ✅ Búsqueda inteligente de equipos

### ⏳ Próximas Mejoras
1. ⏳ Historial de traslados (vista dedicada)
2. ⏳ Notificaciones email/SMS al responsable
3. ⏳ QR codes en notas impresas
4. ⏳ Firma digital en dispositivos móviles
5. ⏳ Exportación a PDF de notas
6. ⏳ Estadísticas de traslados por sede

## 📞 Soporte

Para reportar bugs o sugerir mejoras:
- Archivo: `ingreso-mercancia.html`
- Servicio: `InventarioService.js`
- Documentación: Este archivo
