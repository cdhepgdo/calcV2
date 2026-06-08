# 🧪 Guía de Pruebas: Sistema de Accesorios con Checkboxes

## 📋 Lista de Verificación Rápida

### ✅ Pruebas Básicas

#### 1. Interfaz Visual
- [ ] Abrir página `cierree.html`
- [ ] Hacer clic en "🛡️➡️ Salida de Accesorio"
- [ ] Verificar que aparece el formulario con checkboxes
- [ ] Verificar que hay 9 tipos de accesorios disponibles:
  - Forro
  - Vidrio
  - Caja
  - Cargador
  - Protector Cámara
  - Cubo
  - Cable Lightning
  - Cable C+C
  - Otro Accesorio

#### 2. Funcionalidad de Checkboxes
- [ ] Marcar checkbox "Forro" → Debe aparecer selector de modelo + cantidad + botón "+"
- [ ] Marcar checkbox "Caja" → Debe aparecer selector de modelo + color + cantidad
- [ ] Marcar checkbox "Cargador" → Debe aparecer solo campo de cantidad
- [ ] Desmarcar checkbox → El contenedor debe ocultarse

#### 3. Botones "+" para Filas Dinámicas
- [ ] Marcar checkbox "Forro"
- [ ] Hacer clic en botón "+" → Debe agregar nueva fila
- [ ] Verificar que la nueva fila también tiene selector de modelo + cantidad + botón "+"
- [ ] Repetir para "Vidrio" y "Otro Accesorio"

---

## 🔥 Casos de Prueba Críticos

### Test 1: Validación - Checkbox marcado sin datos
```
Pasos:
1. Marcar checkbox "Forro"
2. NO seleccionar modelo ni cantidad
3. Seleccionar destino: "Aviadores"
4. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
❌ Error: "Forro: Debe seleccionar al menos un modelo y cantidad válida"
```

### Test 2: Validación - Caja sin color
```
Pasos:
1. Marcar checkbox "Caja"
2. Seleccionar modelo: "iPhone 15"
3. NO seleccionar color
4. Cantidad: 1
5. Seleccionar destino: "Aviadores"
6. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
❌ Error: "Caja: Debe completar color"
```

### Test 3: Validación - Sin destino
```
Pasos:
1. Marcar checkbox "Cargador"
2. Cantidad: 5
3. NO seleccionar destino
4. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
❌ Error: "Debe seleccionar un destino"
```

### Test 4: Validación - Ningún checkbox marcado
```
Pasos:
1. NO marcar ningún checkbox
2. Seleccionar destino: "Aviadores"
3. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
❌ Error: "⚠️ Debe seleccionar y completar al menos un accesorio"
```

### Test 5: Registro exitoso - UN accesorio
```
Pasos:
1. Marcar checkbox "Cargador"
2. Cantidad: 5
3. Destino: "Aviadores"
4. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
✅ "1 movimiento(s) de accesorios registrado(s) correctamente"
Formulario se limpia y cierra
```

### Test 6: Registro exitoso - MÚLTIPLES accesorios
```
Pasos:
1. Marcar checkbox "Forro"
   - Modelo: iPhone 15, Cantidad: 2
2. Marcar checkbox "Caja"
   - Modelo: iPhone 14, Color: Negro, Cantidad: 1
3. Marcar checkbox "Cargador"
   - Cantidad: 3
4. Destino: "Aviadores"
5. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
✅ "3 movimiento(s) de accesorios registrado(s) correctamente"
Formulario se limpia y cierra
```

### Test 7: Forro con múltiples modelos
```
Pasos:
1. Marcar checkbox "Forro"
2. Fila 1: iPhone 15, Cantidad: 2
3. Hacer clic en botón "+" para agregar fila
4. Fila 2: iPhone 14, Cantidad: 3
5. Destino: "Aviadores"
6. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
✅ "1 movimiento(s) de accesorios registrado(s) correctamente"
El movimiento debe contener:
- tipo: "Forro"
- modelos: [
    { modelo: "iPhone 15", cantidad: 2 },
    { modelo: "iPhone 14", cantidad: 3 }
  ]
```

### Test 8: Otro Accesorio con múltiples items
```
Pasos:
1. Marcar checkbox "Otro Accesorio"
2. Fila 1: Nombre: "Auriculares", Cantidad: 5
3. Hacer clic en botón "+" para agregar fila
4. Fila 2: Nombre: "PopSocket", Cantidad: 10
5. Destino: "Aviadores"
6. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
✅ "2 movimiento(s) de accesorios registrado(s) correctamente"
Deben crearse 2 movimientos separados:
- Movimiento 1: tipo "Otro", descripcion "Auriculares", cantidad 5
- Movimiento 2: tipo "Otro", descripcion "PopSocket", cantidad 10
```

### Test 9: Ingreso de Accesorio
```
Pasos:
1. Hacer clic en "🛡️⬅️ Ingreso de Accesorio"
2. Proveedor: "Proveedor XYZ"
3. Marcar checkbox "Vidrio"
   - Modelo: iPhone 15 Pro, Cantidad: 10
4. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
✅ "1 movimiento(s) de accesorios registrado(s) correctamente"
El movimiento debe tener:
- tipo: "Ingreso Accesorio"
- proveedor: "Proveedor XYZ"
- datos.tipo: "Vidrio Templado"
```

### Test 10: Validación - Ingreso sin proveedor
```
Pasos:
1. Hacer clic en "🛡️⬅️ Ingreso de Accesorio"
2. NO completar proveedor
3. Marcar checkbox "Cubo"
4. Cantidad: 2
5. Hacer clic en "Registrar Movimiento"

Resultado Esperado:
❌ Error: "Debe especificar el proveedor"
```

---

## 🔍 Verificación en Base de Datos

Después de cada registro exitoso, verificar en Firebase:

### Estructura esperada de un movimiento de accesorio:

```javascript
{
  id: "mov_1234567890_xyz",
  tipo: "Salida Accesorio", // o "Ingreso Accesorio"
  fecha: "07/06/2026",
  hora: "14:30",
  datos: {
    tipo: "Forro",           // Tipo específico del accesorio
    modelos: [               // Para Forro, Vidrio, Caja
      {
        modelo: "iPhone 15",
        cantidad: 2,
        color: ""            // Solo para Caja
      }
    ],
    cantidad: 0,             // Para accesorios simples (Cargador, Cubo, etc.)
    descripcion: "",         // Para "Otro"
    destino: "Aviadores",    // Para salida
    proveedor: ""            // Para ingreso
  }
}
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: Los selects de modelo aparecen vacíos
**Causa**: `MODELOS_IPHONE` no está cargado
**Solución**: Verificar que `constants.js` esté correctamente importado en `main.js`

### Problema 2: Error "AccesorioValidator is not defined"
**Causa**: Import no está correcto
**Solución**: Verificar que la línea existe en `main.js`:
```javascript
import { AccesorioValidator } from './services/AccesorioValidator.js';
```

### Problema 3: No se guardan múltiples movimientos
**Causa**: El flag `esMultipleAccesorios` no está siendo detectado
**Solución**: Verificar que `recopilarDatosMovimiento()` retorna la estructura correcta

### Problema 4: Botón "+" no funciona
**Causa**: Event listener no está registrado
**Solución**: Verificar que `_inicializarBotonesAgregarFila()` se llama en `inicializarTiposAccesorios()`

### Problema 5: Checkboxes no muestran/ocultan contenedores
**Causa**: IDs no coinciden entre HTML y JavaScript
**Solución**: Verificar que los IDs en HTML y en `inicializarTiposAccesorios()` coinciden exactamente

---

## ✅ Checklist Final

Antes de dar por completadas las pruebas:

- [ ] Todos los checkboxes muestran/ocultan correctamente
- [ ] Botones "+" agregan filas dinámicas
- [ ] Selects de modelo se llenan automáticamente
- [ ] Validaciones rechazan datos incompletos
- [ ] Mensajes de error son claros y específicos
- [ ] Registro exitoso de UN accesorio
- [ ] Registro exitoso de MÚLTIPLES accesorios
- [ ] Los datos se guardan correctamente en Firebase
- [ ] Estructura de datos es compatible con código existente
- [ ] Formulario se limpia después de guardar
- [ ] Funciona tanto para Salida como para Ingreso

---

## 📊 Reporte de Bugs

Si encuentras algún problema durante las pruebas, documéntalo aquí:

### Bug Template
```markdown
### Bug #X: [Título corto]

**Pasos para reproducir:**
1. ...
2. ...
3. ...

**Resultado esperado:**
...

**Resultado actual:**
...

**Consola (si hay errores):**
```
[Copiar mensaje de error]
```

**Archivos relacionados:**
- ...
```

---

## 🎉 ¡Pruebas Completadas!

Una vez que todos los tests pasen, el sistema está listo para producción.

**Documentación relacionada:**
- `IMPLEMENTACION_ACCESORIOS_CHECKBOX.md` - Detalles de implementación
- `ARQUITECTURA_VALIDACION_ACCESORIOS.md` - Decisiones de arquitectura
- `VALIDACION_ACCESORIOS_DETALLADA.md` - Especificación de validaciones
