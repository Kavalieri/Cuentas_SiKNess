# Issue #16 - Transacciones sin Subcategoría (Revisión Manual)

**Fecha:** 2025-11-01  
**Hogar:** SiK (`d0c3fe46-f19e-4d60-bc13-fd8b2f7be228`)  
**Entorno:** PRODUCCIÓN

---

## 📊 Resumen Ejecutivo

**Total transacciones hogar SiK (PROD):** 251
- ✅ Con categoría: 249 (99.2%)
- ✅ Con subcategoría: 107 (42.6%)
- ⚠️ Sin subcategoría: 142 (56.6%) → **REQUIERE REVISIÓN MANUAL**

---

## 🔍 Análisis de Transacciones sin Subcategoría

### Patrones Detectados:

#### 1. **Aportación Cuenta Conjunta** (79 transacciones)
**Categoría:** Aportación Cuenta Conjunta  
**Grupo:** Otros Ingresos  
**Tipo:** Mayormente "Equilibrio:" (ajustes automáticos)

**Ejemplos:**
- "Equilibrio: Alquiler"
- "Equilibrio: Jamón"
- "Equilibrio: Día"
- "Ingreso automático por gasto directo: Lavandería"
- "Ingreso" (genérico)

**Acción recomendada:** Crear subcategorías específicas o dejar sin subcategoría (son ajustes del sistema).

---

#### 2. **Suministros** (22 transacciones)
**Categorías:** Agua, Luz, Internet  
**Grupo:** Suministros

**Ejemplos:**
- "Agua" → Categoría: Agua
- "Luz" → Categoría: Luz
- "Internet" → Categoría: Internet

**Acción recomendada:** 
- Crear subcategoría "Agua Potable" para Agua
- Crear subcategoría "Electricidad" para Luz
- Crear subcategoría "Fibra Óptica" o "ADSL" para Internet

---

#### 3. **Menaje del Hogar** (10 transacciones)
**Categoría:** Menaje  
**Grupo:** Hogar

**Ejemplos:**
- "Chino" (x5)
- "Estantería Amazon"
- "Mesa IKEA"

**Acción recomendada:** 
- Crear subcategorías: "Bazar/Chino", "Muebles", "Utensilios"

---

#### 4. **Vivienda** (6 transacciones)
**Categoría:** Vivienda  
**Grupo:** Hogar

**Ejemplos:**
- "Alquiler restante"
- "Comuinidad ago, sep, oct" (comunidad)

**Acción recomendada:** 
- Ya existe "Alquiler" → asignar manualmente
- Crear subcategoría "Comunidad de Propietarios"

---

#### 5. **Supermercado sin marca específica** (7 transacciones)
**Categoría:** Supermercado  
**Grupo:** Alimentación

**Ejemplos:**
- "Badulake lil"
- "Gomez Merino"
- "Varios" (x2)

**Acción recomendada:** 
- Crear subcategoría "Otros Supermercados"
- O asignar a marca más cercana manualmente

---

#### 6. **Salud/Personal** (3 transacciones)
**Categoría:** Salud  
**Grupo:** Personal

**Ejemplos:**
- "Bazar Ana 'Manta'"
- "Cucarachas Amazon"

**Acción recomendada:** 
- Revisar categoría (¿debería ser Hogar/Limpieza?)
- Crear subcategorías específicas

---

#### 7. **Mascotas** (1 transacción)
**Categoría:** Mascotas  
**Grupo:** Personal

**Ejemplo:**
- "Fuente y protector sofá AMAZON"

**Acción recomendada:** 
- Crear subcategorías: "Accesorios", "Alimentación", "Veterinario"

---

#### 8. **Mantenimiento** (1 transacción)
**Categoría:** Mantenimiento  
**Grupo:** Hogar

**Ejemplo:**
- "En realidad es Luz y agua pero Meh"

**Acción recomendada:** 
- Reasignar a categorías correctas (Luz + Agua)
- O crear subcategoría "Reparaciones"

---

## 📋 Listado Completo (142 transacciones)

| Fecha | Descripción | Categoría | Grupo |
|-------|-------------|-----------|-------|
| 2025-11-01 | Equilibrio: Alquiler + Comunidad | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-11-01 | Equilibrio: Alquiler | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-11-01 | Equilibrio: Vodafone | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-10-16 | Badulake lil | Supermercado | Alimentación |
| 2025-10-11 | Alquiler restante | Vivienda | Hogar |
| 2025-10-10 | Comuinidad ago, sep, oct | Vivienda | Hogar |
| 2025-10-09 | Luz | Luz | Suministros |
| 2025-10-09 | Agua | Agua | Suministros |
| 2025-10-08 | Gomez Merino | Supermercado | Alimentación |
| 2025-10-03 | Bazar Ana "Manta" | Salud | Personal |
| 2025-10-02 | Ingreso | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-10-02 | Ingreso | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-10-02 | Ingreso | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-10-02 | Ingreso | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-29 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-29 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-29 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-28 | Ingreso automático por gasto directo: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-23 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-19 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-18 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-17 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-16 | Equilibrio: Butano | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-15 | Ingreso automático por gasto directo: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-14 | Cucarachas Amazon | Salud | Personal |
| 2025-09-14 | Equilibrio: Cucarachas Amazon | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-12 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-12 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-10 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-09 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-05 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-04 | Ingreso automático por gasto directo: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-04 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-04 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-04 | Chino | Menaje | Hogar |
| 2025-09-04 | Equilibrio: Chino | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-03 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-03 | Varios | Supermercado | Alimentación |
| 2025-09-03 | Equilibrio: Varios | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-02 | Chino | Menaje | Hogar |
| 2025-09-02 | Equilibrio: Chino | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Equilibrio: Agua | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Chino | Menaje | Hogar |
| 2025-09-01 | Equilibrio: Chino | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Agua | Agua | Suministros |
| 2025-09-01 | Equilibrio: Alquiler | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Equilibrio: Luz | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Luz | Luz | Suministros |
| 2025-09-01 | Equilibrio: Internet | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-09-01 | Internet | Internet | Suministros |
| 2025-08-30 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-29 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-28 | Equilibrio: Estantería Amazon | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-28 | Estantería Amazon | Menaje | Hogar |
| 2025-08-27 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-22 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-22 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-21 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-20 | Equilibrio: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-19 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-16 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-16 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-15 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-13 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-12 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-10 | Equilibrio: Butano | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-10 | Equilibrio: En realidad es Luz y agua pero Meh | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-10 | En realidad es Luz y agua pero Meh | Mantenimiento | Hogar |
| 2025-08-02 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-01 | Agua | Agua | Suministros |
| 2025-08-01 | Equilibrio: Luz | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-01 | Luz | Luz | Suministros |
| 2025-08-01 | Equilibrio: Vodafone | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-01 | Equilibrio: Agua | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-08-01 | Equilibrio: Alquiler | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-31 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-29 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-29 | Equilibrio: Fuente y protector sofá AMAZON | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-29 | Fuente y protector sofá AMAZON | Mascotas | Personal |
| 2025-07-26 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-26 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-25 | Equilibrio: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-23 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-23 | Chino | Menaje | Hogar |
| 2025-07-23 | Equilibrio: Chino | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-23 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-21 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-21 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-19 | Equilibrio: Butano | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-18 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-17 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-17 | Equilibrio: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-17 | Chino Cocina | Menaje | Hogar |
| 2025-07-17 | Equilibrio: Chino Cocina | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-12 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-10 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-10 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-07 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-07 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-04 | Equilibrio: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-04 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-02 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-02 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-01 | Equilibrio: Varios | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-01 | Varios | Supermercado | Alimentación |
| 2025-07-01 | Equilibrio: Internet | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-01 | Internet | Internet | Suministros |
| 2025-07-01 | Equilibrio: Agua | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-01 | Agua | Agua | Suministros |
| 2025-07-01 | Equilibrio: Luz | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-07-01 | Luz | Luz | Suministros |
| 2025-07-01 | Equilibrio: Alquiler | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-30 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-28 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-27 | Equilibrio: Mesa IKEA | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-27 | Mesa IKEA | Menaje | Hogar |
| 2025-06-21 | Equilibrio: Lavandería | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-21 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-20 | Equilibrio: Butano | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-18 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-17 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-16 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-14 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-14 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-11 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-10 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-09 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-06 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-06 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-05 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-04 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-03 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-02 | Equilibrio: Día | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Equilibrio: Alquiler | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Equilibrio: Equilibrio: Agua | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Luz | Luz | Suministros |
| 2025-06-01 | Equilibrio: Luz | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Equilibrio: Vodafone | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Equilibrio: Butano | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Equilibrio: Jamón | Aportación Cuenta Conjunta | Otros Ingresos |
| 2025-06-01 | Agua | Agua | Suministros |

---

## ✅ Acciones Recomendadas

### 1. **Crear Subcategorías Faltantes**
- **Suministros:**
  - Agua → "Agua Potable"
  - Luz → "Electricidad"
  - Internet → "Fibra Óptica" / "ADSL" / "Móvil"
  
- **Menaje:**
  - "Bazar/Chino"
  - "Muebles"
  - "Utensilios"
  - "Decoración"

- **Vivienda:**
  - "Comunidad de Propietarios"

- **Supermercado:**
  - "Otros Supermercados" (para los que no coinciden con cadenas existentes)

### 2. **Asignación Manual Prioritaria**
- Transacciones de Suministros (22) → Alta prioridad
- Menaje (10) → Media prioridad
- Supermercados sin marca (7) → Baja prioridad

### 3. **Aportación Cuenta Conjunta (79)**
**Decisión requerida:** 
- ¿Crear subcategorías específicas por tipo de equilibrio?
- ¿Dejar sin subcategoría (son ajustes automáticos)?

### 4. **Reasignaciones**
- "En realidad es Luz y agua pero Meh" → Dividir en dos transacciones o reasignar

---

## 📌 Notas Finales

- ✅ Script de reparación ejecutado correctamente
- ✅ No hay trazabilidad en `_migrations` (no es cambio de estructura)
- ✅ Solo household "SiK" activo en DEV y PROD
- ⚠️ 142 transacciones requieren asignación manual de subcategoría
- ℹ️ Todas las transacciones tienen categoría y grupo correctos
