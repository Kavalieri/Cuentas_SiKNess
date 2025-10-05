# Bug Fix: Select de Categorías Vacío en EditMovementDialog

**Fecha**: 5 de octubre de 2025  
**Commits**: Por hacer

## 🐛 Problema

El Select de categorías en `EditMovementDialog` se abría pero estaba **completamente vacío** (sin elementos). No mostraba:
1. La lista de categorías disponibles del tipo correcto
2. La categoría actual del movimiento

### Síntomas
- Al abrir el diálogo de editar movimiento, el Select decía "Sin categoría"
- Al hacer click en el Select, el dropdown se abría pero **sin ningún elemento** visible
- La consola mostraba `filteredCategories: []` en los logs de debug

## 🔍 Causa Raíz

**Dos problemas combinados**:

### 1. Controlled vs Uncontrolled Component (BUG SECUNDARIO)

El Select estaba usando `value={categoryId}` (controlled component), lo que causaba problemas de renderizado en shadcn/ui Select. El componente tiene un bug conocido donde los SelectItem no se renderizan correctamente cuando se usa controlled state.

```tsx
// ❌ PROBLEMÁTICO
<Select value={categoryId} onValueChange={setCategoryId}>
  <SelectValue>{displayValue}</SelectValue>
  <SelectContent>
    {filteredCategories.map(...)} // No se renderiza
  </SelectContent>
</Select>
```

### 2. Categories Prop Vacío (BUG PRINCIPAL) ⭐

**El problema crítico**: `DashboardContent` NO estaba pasando el prop `categories` a `MovementsList`, por lo que este recibía `categories=[]` (array vacío por defecto).

```tsx
// ❌ INCORRECTO (DashboardContent.tsx)
<MovementsList movements={recentMovements} />
// categories=[] por defecto en MovementsList

// EditMovementDialog recibía:
categories={[]} // Array vacío!
```

**Resultado**: `filteredCategories` siempre era `[]` porque filtraba un array vacío.

## ✅ Solución

### Fix 1: Pasar Categories en DashboardContent ⭐

```tsx
// ✅ CORRECTO (DashboardContent.tsx)
<MovementsList movements={recentMovements} categories={initialCategories} />
<MovementsList movements={recentIncome} categories={initialCategories} />
<MovementsList movements={recentExpenses} categories={initialCategories} />
```

### Fix 2: Usar Uncontrolled Select con Key

```tsx
// ✅ CORRECTO (EditMovementDialog.tsx)
<Select
  key={movement.id}           // Forzar re-render al cambiar movimiento
  defaultValue={selectedCategoryId}  // Uncontrolled con defaultValue
  onValueChange={setSelectedCategoryId}  // Rastrear cambios
>
  <SelectTrigger>
    <SelectValue placeholder="Sin categoría" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Sin categoría</SelectItem>
    {filteredCategories.map((cat) => (
      <SelectItem key={cat.id} value={cat.id}>
        {cat.icon} {cat.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Por qué `key={movement.id}` funciona**:
- Cuando cambia `movement.id`, React desmonta y re-monta el Select
- El `defaultValue` se aplica en el nuevo mount con el valor correcto
- Evita el bug de controlled component de shadcn/ui Select

## 📝 Archivos Modificados

1. **`app/app/components/DashboardContent.tsx`** ⭐ CRÍTICO
   - Agregar `categories={initialCategories}` en 3 instancias de `<MovementsList>`

2. **`app/app/components/EditMovementDialog.tsx`**
   - Cambiar `value` a `defaultValue` en Select
   - Agregar `key={movement.id}` para forzar re-render
   - Remover lógica `displayValue` (ya no necesaria)
   - Renombrar `categoryId` a `selectedCategoryId` (claridad)

## 🧪 Testing

**Pasos para verificar el fix**:

1. Abrir dashboard (`/app`)
2. Click en editar (✏️) en cualquier movimiento con categoría
3. Verificar que el Select muestre:
   - La categoría actual del movimiento (ej: "🏠 Vivienda")
   - Dropdown con todas las categorías del tipo correcto al desplegarlo
4. Cambiar categoría y guardar
5. Verificar que el cambio se aplica correctamente

**Comportamiento esperado**:
- ✅ Select muestra categoría actual
- ✅ Dropdown tiene lista completa de categorías
- ✅ Al cambiar de movimiento, el Select actualiza correctamente
- ✅ "Sin categoría" aparece como primera opción
- ✅ Solo categorías del tipo correcto (expense/income)

## 📚 Lecciones Aprendidas

### 1. Props por Defecto Ocultan Bugs
```tsx
// ⚠️ PELIGROSO
categories: Category[] = []  // Parece que funciona pero oculta el bug
```

**Mejor approach**:
```tsx
categories: Category[]  // Requerido, falla rápido si falta
```

### 2. shadcn/ui Select Bug Conocido
El Select de Radix UI (usado por shadcn/ui) tiene problemas con controlled components. **Solución**:
- Usar `defaultValue` en lugar de `value`
- Agregar `key` para forzar re-render cuando cambian los datos
- Rastrear cambios con `onValueChange` si necesitas el estado

### 3. Debug Sistemático
Cuando un map no renderiza:
1. ✅ Verificar que el array no esté vacío (console.log)
2. ✅ Verificar que el prop llegue correctamente desde el padre
3. ✅ Buscar componente de referencia que funcione (AddMovementDialog)
4. ✅ Comparar implementaciones línea por línea

### 4. AddMovementDialog como Referencia
`AddMovementDialog` usa el mismo Select pero funciona porque:
- No tiene el problema de categories vacío (le llegan directamente)
- Usa `defaultValue="none"` desde el inicio
- No necesita re-render (siempre crea movimiento nuevo)

## 🔗 Referencias

- Commit anterior: `ff913ed` - Fix SelectItem value=""
- Documentación previa: `docs/FIX_SELECT_EMPTY_VALUE.md`
- Componente de referencia: `app/app/expenses/components/AddMovementDialog.tsx`
- shadcn/ui Select: https://ui.shadcn.com/docs/components/select
- Radix UI Select (upstream): https://www.radix-ui.com/primitives/docs/components/select

## ⚠️ Breaking Changes

Ninguno. El fix es totalmente retrocompatible.

## 🎯 Próximos Pasos

1. ✅ Test funcional completo en dev
2. ⏳ Build de producción
3. ⏳ Commit con mensaje descriptivo
4. ⏳ Push a main
5. ⏳ Verificar en producción (Vercel)
6. ⏳ Eliminar logs de debug de EditMovementDialog

---

**Nota**: Este bug existía desde la implementación inicial de EditMovementDialog pero se manifestó después del fix de SelectItem value="". El fix de value="" era correcto pero expuso este problema subyacente de categories vacío.
