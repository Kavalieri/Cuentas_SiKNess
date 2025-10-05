# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a **CuentasSiK**! Este documento te guiará a través del proceso de contribución.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#-código-de-conducta)
- [¿Cómo Puedo Contribuir?](#-cómo-puedo-contribuir)
- [Proceso de Desarrollo](#-proceso-de-desarrollo)
- [Conventional Commits](#-conventional-commits)
- [Pull Request Process](#-pull-request-process)
- [Estilo de Código](#-estilo-de-código)
- [Testing](#-testing)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta simple:

- **Sé respetuoso**: Trata a todos con respeto y consideración
- **Sé constructivo**: Las críticas deben ser constructivas y orientadas a mejorar
- **Sé colaborativo**: Trabaja en equipo y ayuda a otros cuando puedas
- **Sé inclusivo**: Todos son bienvenidos sin importar su nivel de experiencia

---

## 🎯 ¿Cómo Puedo Contribuir?

### 🐛 Reportar Bugs

Si encuentras un bug:

1. **Verifica** que no exista ya un issue similar
2. **Abre un nuevo issue** con la plantilla de bug
3. **Incluye**:
   - Descripción clara del problema
   - Pasos para reproducirlo
   - Comportamiento esperado vs actual
   - Screenshots/videos (si aplica)
   - Entorno (navegador, OS, versión)

### 💡 Proponer Features

Para sugerir nuevas funcionalidades:

1. **Revisa** los issues existentes para evitar duplicados
2. **Abre un issue** con la etiqueta `enhancement`
3. **Describe**:
   - El problema que resuelve
   - Casos de uso
   - Propuesta de solución
   - Mockups o wireframes (opcional)

### 📝 Mejorar Documentación

La documentación es crucial:

- Corrige typos o errores
- Mejora explicaciones existentes
- Añade ejemplos de código
- Traduce a otros idiomas
- Crea tutoriales o guías

### 💻 Contribuir con Código

Ver [Proceso de Desarrollo](#-proceso-de-desarrollo) más abajo.

---

## 🔧 Proceso de Desarrollo

### 1. **Fork y Clone**

```bash
# Fork en GitHub UI
git clone https://github.com/TU_USUARIO/CuentasSiK.git
cd CuentasSiK
npm install
```

### 2. **Configurar Entorno Local**

```bash
# Copia el archivo de ejemplo
cp .env.example .env.local

# Edita .env.local con tus credenciales de Supabase
```

Ver [Setup Local](./README.md#-setup-local) en el README principal.

### 3. **Crear Rama de Feature**

```bash
# Nomenclatura: tipo/descripcion-corta
git checkout -b feat/add-export-csv
git checkout -b fix/category-selector-bug
git checkout -b docs/update-readme
```

**Tipos válidos**:
- `feat/` - Nueva funcionalidad
- `fix/` - Corrección de bug
- `docs/` - Cambios en documentación
- `refactor/` - Refactorización sin cambio de funcionalidad
- `test/` - Añadir o mejorar tests
- `chore/` - Tareas de mantenimiento

### 4. **Desarrollar**

```bash
# Ejecutar en desarrollo
npm run dev

# Compilar
npm run build

# Linter
npm run lint

# Tests (si aplica)
npm test
```

### 5. **Commit**

Usa **Conventional Commits** (ver sección abajo).

```bash
git add .
git commit -m "feat: add CSV export for transactions"
```

### 6. **Push y Pull Request**

```bash
git push origin feat/add-export-csv
```

Abre un PR en GitHub con:
- Título descriptivo siguiendo Conventional Commits
- Descripción detallada del cambio
- Screenshots/videos (si aplica)
- Referencias a issues (`Closes #123`)

---

## 📏 Conventional Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) para mantener un historial limpio y generar CHANGELOGs automáticos.

### Formato

```
<tipo>(<alcance opcional>): <descripción>

<cuerpo opcional>

<footer opcional>
```

### Tipos

| Tipo | Descripción | Bump Versión |
|------|-------------|--------------|
| `feat` | Nueva funcionalidad | Minor (0.X.0) |
| `fix` | Corrección de bug | Patch (0.0.X) |
| `docs` | Solo documentación | - |
| `chore` | Mantenimiento | - |
| `refactor` | Refactorización | - |
| `test` | Tests | - |
| `perf` | Mejora de performance | Patch |
| `ci` | CI/CD | - |

### Breaking Changes

Para cambios que rompen compatibilidad:

```bash
feat!: cambiar API de contribuciones

BREAKING CHANGE: La función calculateContributions() ahora requiere un parámetro adicional.
```

Esto genera un bump de versión Major (X.0.0).

### Ejemplos

✅ **Buenos ejemplos**:

```bash
feat: add CSV export for transactions
feat(contributions): add custom calculation type
fix: category selector not showing options
fix(auth): handle expired magic link tokens
docs: update setup instructions in README
chore: update dependencies to latest versions
refactor: simplify contribution calculation logic
test: add unit tests for formatCurrency utility
```

❌ **Malos ejemplos**:

```bash
added new feature
fix bug
update
changes
wip
```

---

## 🔄 Pull Request Process

### Checklist Antes de Enviar

- [ ] El código compila sin errores (`npm run build`)
- [ ] El linter pasa sin errores (`npm run lint`)
- [ ] He probado los cambios localmente
- [ ] He actualizado la documentación (si aplica)
- [ ] He añadido tests (si aplica)
- [ ] Mi commit sigue Conventional Commits
- [ ] El PR tiene un título descriptivo
- [ ] El PR incluye descripción detallada

### Qué Esperar

1. **Automated Checks**: GitHub Actions ejecutará CI
   - Linting
   - Type checking
   - Build de producción
   - Tests (si aplica)

2. **Code Review**: Un mantenedor revisará tu código
   - Puede solicitar cambios
   - Puede aprobar directamente

3. **Merge**: Una vez aprobado
   - Se hará **squash and merge** para mantener historial limpio
   - Tu PR aparecerá en el próximo CHANGELOG
   - Release Please creará un PR de release automático

---

## 🎨 Estilo de Código

### TypeScript

- **Strict mode**: El proyecto usa TypeScript estricto
- **No `any`**: Evitar `any`, usar tipos específicos
- **Named exports**: Preferir named exports sobre default exports
- **Import alias**: Usar `@/` en vez de rutas relativas

```typescript
// ✅ Bueno
import { formatCurrency } from '@/lib/format';
export const MyComponent = () => { ... };

// ❌ Malo
import { formatCurrency } from '../../lib/format';
export default MyComponent;
```

### Nombres y Convenciones

```typescript
// Variables y funciones: camelCase
const monthlyTotal = 1000;
function calculateTotal() { ... }

// Componentes y tipos: PascalCase
type UserProfile = { ... };
const AddMovementDialog = () => { ... };

// Constantes globales: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Archivos:
// - Componentes: PascalCase.tsx (AddMovementDialog.tsx)
// - Utils: camelCase.ts (formatCurrency.ts)
// - Server Actions: actions.ts
```

### React y Next.js

- **Server Components**: Por defecto
- **Client Components**: Solo cuando necesario (`'use client'`)
- **Server Actions**: Para mutaciones (`'use server'`)
- **No useState innecesario**: Aprovechar Server Components

```typescript
// ✅ Server Component (por defecto)
export default async function ExpensesPage() {
  const transactions = await getTransactions();
  return <ExpenseList transactions={transactions} />;
}

// ✅ Client Component (solo cuando necesario)
'use client';
export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  // ...
}
```

### CSS

- **Tailwind CSS**: Usar clases de utilidad
- **No CSS-in-JS**: Evitar styled-components o emotion
- **Tokens semánticos**: Usar variables de tema

```tsx
// ✅ Bueno
<div className="bg-background text-foreground dark:bg-gray-900">

// ❌ Malo
<div style={{ backgroundColor: '#fff', color: '#000' }}>
```

---

## 🧪 Testing

### Estrategia Actual

- **Unit Tests**: Utilidades puras (`lib/format.ts`, `lib/date.ts`)
- **Component Tests**: Formularios críticos (con React Testing Library)
- **E2E**: No implementado (futuro)

### Ejecutar Tests

```bash
npm test              # Ejecutar todos los tests
npm run test:watch    # Modo watch
npm run test:coverage # Con coverage
```

### Escribir Tests

```typescript
// lib/__tests__/format.test.ts
import { formatCurrency } from '../format';

describe('formatCurrency', () => {
  it('formats EUR correctly', () => {
    expect(formatCurrency(1500)).toBe('1.500,00 €');
  });
  
  it('handles negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-100,00 €');
  });
});
```

---

## 🛠️ Model Context Protocol (MCPs)

Si tienes MCPs configurados, puedes usarlos para automatizar tareas:

```typescript
// Aplicar migración
await mcp_supabase_apply_migration({
  project_id: "your-project-id",
  name: "add_new_table",
  query: "CREATE TABLE..."
});

// Push con Git MCP
await mcp_gitkraken_bun_git_push({ directory: "..." });
```

Ver [README - MCPs](./README.md#-gestión-del-proyecto-con-mcps) para más detalles.

---

## 📚 Recursos Adicionales

- **Documentación del Proyecto**: [./docs](./docs)
- **Arquitectura**: [README - Arquitectura](./README.md#-arquitectura)
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com/

---

## 🙏 Agradecimientos

Cada contribución, por pequeña que sea, es valiosa. ¡Gracias por ayudar a mejorar CuentasSiK!

---

## 📞 ¿Preguntas?

Si tienes dudas sobre cómo contribuir:

- Abre un [Discussion](https://github.com/Kavalieri/CuentasSiK/discussions)
- Consulta los [Issues existentes](https://github.com/Kavalieri/CuentasSiK/issues)
- Lee la [Documentación](./docs)

---

<div align="center">

**¡Happy Coding! 🚀**

</div>
