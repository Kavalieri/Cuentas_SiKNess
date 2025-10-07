# Changelog

## [0.3.0-alpha] - 2025-10-08

### ✨ Added - v2 UX Refactor Complete (FASE 4-6)

#### **FASE 4: Credits Management System** (commit b60d4e5)
- **ManageCreditDialog refactored** with server actions pattern
  * Apply credit to next month with automatic month detection
  * Transfer credit to household savings fund
  * Validation of next month contribution existence
  * Descriptive notes with credit origin tracking
- **Server actions integrated**: `applyCreditToContribution()`, `transferCreditToSavings()`
- **Eliminated TODOs**: All placeholder code replaced with functional implementations

#### **FASE 5: Savings Module Validation** (no changes needed)
- ✅ **Complete functionality verified** from previous session
  * DepositModal.tsx (264 lines) - React Hook Form + Zod validation
  * WithdrawModal.tsx (286 lines) - Balance validation + optional transaction creation
  * SavingsTab.tsx - Complete transaction history with privacy mode

#### **FASE 6: Reports & Analytics Module** (commits 14c2ac2, 2da9dfd)
- **New route**: `/app/reports` (30th route in application)
- **4 Interactive Recharts Visualizations**:
  * **TrendChart.tsx** (150 lines): LineChart showing income/expense trends (last 6 months)
  * **CategoryPieChart.tsx** (120 lines): PieChart with top 5 categories and percentages
  * **ContributionsBarChart.tsx** (140 lines): BarChart comparing member contributions (expected vs paid)
  * **TopCategoriesTable.tsx** (110 lines): Ranking table of top 10 spending categories
- **4 Server Actions** with optimized SQL queries:
  * `getMonthlyTrends()`: Aggregates income/expense by month (6 months history)
  * `getCategoryDistribution()`: Calculates top 5 categories with percentages
  * `getContributionsComparison()`: Compares expected vs paid per member
  * `getTopCategories()`: Ranks categories by total amount (top 10)
- **ReportsContent.tsx** (200 lines): Client component orchestrating all visualizations
- **Features**:
  * Privacy mode integrated in all charts
  * Responsive grid layout (1 col mobile, 2 col tablet/desktop)
  * Empty states for each visualization
  * Date range filter UI prepared (not yet functional)
  * Loading skeletons during SSR

#### **Navigation Improvements**
- **MobileBottomNav updated**: Reports replaced "Más" (Settings) in 3rd position
  * Reason: Reports is core functionality, deserves direct access
  * Categories moved to 5th position
  * New icons: BarChart3 for Reports

#### **FASE 7: Testing & Polish** (in progress)
- **TESTING_CHECKLIST_FASE_7.md** created (400+ lines)
  * Comprehensive validation checklist with 110+ points
  * Covers: Navigation, Responsive, Accessibility, Performance, Documentation, Bugs, Final validation
- **README.md updated** with new features section
  * Added: Credits System, Savings Module, Reports & Analytics, Periods Management
  * All new features marked with ⭐ NEW indicator

### 🔧 Changed

- **Credits workflow simplified**: Automatic next month detection (no manual selector)
- **Mobile navigation prioritization**: Reports elevated to direct access (vs overflow menu)
- **Transaction editing**: Locked transactions (closed periods) strictly non-editable until reopened

### 🐛 Fixed

- **Type inference error**: Cast via `unknown` for Supabase join queries
- **ESLint no-explicit-any**: Replaced all `any` types with specific types or `unknown` casts
- **Recharts formatter types**: Explicit cast to `number` for currency formatting
- **undefined monthNum**: Fixed variable reference in SQL query

### 📈 Performance

- **Build**: ✅ 30 routes compiled (0 errors, 0 warnings)
- **First Load JS**: <105 kB per route (optimal)
- **TypeScript**: Strict mode with 0 errors
- **ESLint**: 0 warnings, no `any` types in codebase

### 📚 Documentation

- `SESSION_SUMMARY_2025-10-08_FASES_4-5.md` - Credits + Savings validation
- `SESSION_SUMMARY_2025-10-08_FASE_6.md` - Reports module complete
- `TESTING_CHECKLIST_FASE_7.md` - Systematic validation checklist
- `README.md` - Features section updated with new modules
- `.github/copilot-instructions.md` - Updated with v2 refactor details

---

## [0.2.0-alpha](https://github.com/Kavalieri/CuentasSiK/compare/cuentas-sik-v0.1.0-alpha...cuentas-sik-v0.2.0-alpha) (2025-10-05)


### ⚠ BREAKING CHANGES

* Tabla pre_payments eliminada y sistema unificado
* Complete migration from user_id to profile_id throughout the application
* calculate_monthly_contributions function signature changed
* Remove StatusTab, HistoryTab, ConfigurationTab components

### Features

* add multiple calculation types for contributions (proportional, equal, custom) ([a81c681](https://github.com/Kavalieri/CuentasSiK/commit/a81c68104e78cc9c7f9845d816c4acc0eda47ddc))
* add pre-payments system and flexible payment amounts ([dccbdc4](https://github.com/Kavalieri/CuentasSiK/commit/dccbdc4eb979cf5d43f6c17a080aac871ae42e3b))
* add profile auto-creation trigger and fallback ([7ecb8d6](https://github.com/Kavalieri/CuentasSiK/commit/7ecb8d6ef5362894b27ac8955924e93afb327863))
* agregar atribución de miembro en movimientos auto-generados ([222b468](https://github.com/Kavalieri/CuentasSiK/commit/222b468b263fb717ff4839c4c865ed641597919c))
* agregar componente ContributionAdjustmentsSection ([6cbf1d5](https://github.com/Kavalieri/CuentasSiK/commit/6cbf1d5e4d0f8801d2adcfc2e9cf85d8ffa920e5))
* crear movimientos automáticos de gasto e ingreso virtual para pre-pagos ([4267ad2](https://github.com/Kavalieri/CuentasSiK/commit/4267ad2ac5b309523b06e1c1167cb05778d0b68a))
* dashboard improvements and balance system ([16bc36a](https://github.com/Kavalieri/CuentasSiK/commit/16bc36a27bf53baf89e73b5ca0c02e7c7cfc4808))
* dashboard profesional con gráficos Recharts ([f43e70a](https://github.com/Kavalieri/CuentasSiK/commit/f43e70a30884899e3f5f522c4064ae64f0ee36b3))
* endpoint temporal recalculo + scripts SQL simplificados ([fc8f3f5](https://github.com/Kavalieri/CuentasSiK/commit/fc8f3f5e0c3c73221a214b5ecf84ce2ba1bd7b18))
* fix invitation system + implement multi-household improvements ([c72d68a](https://github.com/Kavalieri/CuentasSiK/commit/c72d68a0482664238e6681efcecca8d818dca099))
* formularios de pre-pago e ingreso extra (PASO 2) ([7e1f13e](https://github.com/Kavalieri/CuentasSiK/commit/7e1f13e83c630b6672da996d583e3e0e48d6cffe))
* implement invitation cleanup system with orphaned detection ([a342064](https://github.com/Kavalieri/CuentasSiK/commit/a34206460c918c0da9357d20f40122f277e3cdfa))
* implement professional accounting system with monthly periods ([08e9673](https://github.com/Kavalieri/CuentasSiK/commit/08e967347a9d2ad5ecb68decf6960ccbb12fbc60))
* improve dashboard and UI enhancements ([5b62787](https://github.com/Kavalieri/CuentasSiK/commit/5b627870d91c29976490145b3103815e202e8913))
* incluir pre-pagos en total recaudado del hogar y mejorar HeroContribution ([2442f76](https://github.com/Kavalieri/CuentasSiK/commit/2442f764a56f760750e2487a2aa3303f08ad3d38))
* launch CuentasSiK alpha version ([531deb0](https://github.com/Kavalieri/CuentasSiK/commit/531deb0504f03348dd1f4e5b6603956fbd968556))
* mejoras UX en sistema de ajustes con aprobación ([b9742eb](https://github.com/Kavalieri/CuentasSiK/commit/b9742eb94d3772d15e1904e9511cf497510b0b95))
* nuevo panel de ajustes visible para todos + fix cálculo solo approved ([d714e55](https://github.com/Kavalieri/CuentasSiK/commit/d714e55c6f6b94a884ceaed9a4014153983146e6))
* panel de aprobaciones para owners (PASO 1) ([7979373](https://github.com/Kavalieri/CuentasSiK/commit/7979373a9b82a926b6f907e65425f9394b5ab0f0))
* resumen hogar mejorado con lógica correcta de fondo ([7273f8d](https://github.com/Kavalieri/CuentasSiK/commit/7273f8d66c656540f74fce46d3b7249ad057836d))
* selector categoría ingreso + fix temporal check owner ([076801d](https://github.com/Kavalieri/CuentasSiK/commit/076801dbe70276f9f70ece44727aaa7bb74c7a61))
* simplify contributions system with single-page UI and role-based permissions ([f9ecf93](https://github.com/Kavalieri/CuentasSiK/commit/f9ecf9307ea216dffabbcfe75e8ee02a204101aa))
* sistema completo de edición de movimientos con historial automático ([f6962db](https://github.com/Kavalieri/CuentasSiK/commit/f6962db7df1cde33d8b6cf10e19c5f87f42f7a3b))
* sistema completo de wipes configurables con opciones selectivas ([e83d1e2](https://github.com/Kavalieri/CuentasSiK/commit/e83d1e28d3323e66c637e15d1a0f98ade9686964))
* sistema de aprobación de ajustes completo (Fase 1+2) ([fbf9eb0](https://github.com/Kavalieri/CuentasSiK/commit/fbf9eb0406456cf695b0c960e0ec1757f1c08d65))
* sistema de ocultación de cantidades y wipe selectivo de datos ([60bd0f4](https://github.com/Kavalieri/CuentasSiK/commit/60bd0f4d791de60d8d76d2b23eb62fcd0200d79e))
* unificar pre-pagos y ajustes en sistema único ([7482efc](https://github.com/Kavalieri/CuentasSiK/commit/7482efc52bc28144e65937c26da87fcc5de0af0f))
* update ContributionMembersList with pre-payments display ([83c7f7a](https://github.com/Kavalieri/CuentasSiK/commit/83c7f7a661d79b526400cff9d89add2ffea59af8))
* update HeroContribution with payment options and pre-payments display ([31468ca](https://github.com/Kavalieri/CuentasSiK/commit/31468ca56b5496dd55f94a428cf827168034bb3b))
* versión 0.1.0-alpha con footer profesional ([5b7d028](https://github.com/Kavalieri/CuentasSiK/commit/5b7d0280aba4a0c67bf08bf8078597b20ea01946))


### Bug Fixes

* actualizar todas las referencias user_id → profile_id en queries ([6189039](https://github.com/Kavalieri/CuentasSiK/commit/6189039d95ee657b054a4b6531cfe9ffce0d6a72))
* add get_household_members function and dynamic redirect URLs for magic links ([6e96299](https://github.com/Kavalieri/CuentasSiK/commit/6e96299bcd524a0630b52bdf377cf199329581d3))
* añadir política RLS INSERT para household_settings ([502a81d](https://github.com/Kavalieri/CuentasSiK/commit/502a81d52dc2078d9da2fccf51f3dafd3e92fc11))
* calcular total pagado correctamente incluyendo gastos directos con movement_id ([cd14e57](https://github.com/Kavalieri/CuentasSiK/commit/cd14e576ccc40d0b506735781441fba0ef90b03a))
* cambiar terminología de 'sobrepago' a 'aporte extra' ([492d508](https://github.com/Kavalieri/CuentasSiK/commit/492d508cbdd3625fa9acef665f9474377d595a31))
* campo description en AddMovementDialog + docs completas con MCPs ([a08028a](https://github.com/Kavalieri/CuentasSiK/commit/a08028a5fd11c9ef0330d00a74ab23d63aea730f))
* contador duplicado en últimos movimientos ([20a6ce9](https://github.com/Kavalieri/CuentasSiK/commit/20a6ce9272894c4d7ad7b7c2426092cafb46fe9c))
* correct TypeScript types in auth callback and fix middleware profile_id lookup ([6c5d202](https://github.com/Kavalieri/CuentasSiK/commit/6c5d2024f2f7a8424071ab05ff63bed54cb0e888))
* corregir error al resetear formulario y actualizar UI dinámicamente ([05cd994](https://github.com/Kavalieri/CuentasSiK/commit/05cd9940d38576c4e4b43b77881eca3af2f472f8))
* corregir errores de build para despliegue en Vercel ([4d95292](https://github.com/Kavalieri/CuentasSiK/commit/4d95292dc8cf458c5b0d4a6970d3962882f73416))
* corregir funciones wipe para usar transactions y profile_id ([b3558a6](https://github.com/Kavalieri/CuentasSiK/commit/b3558a697515ebb96e8e7cfe4b73d42bb2cf5439))
* corregir permisos de miembros para crear pre-pagos + eliminar QuickActions obsoleto ([d7b8bb5](https://github.com/Kavalieri/CuentasSiK/commit/d7b8bb568ac7c145d87c483b0b6c2399107011ee))
* corregir query de categories y constraint problemático ([013ba26](https://github.com/Kavalieri/CuentasSiK/commit/013ba268b0b1441da916a47c7837c7213e112241))
* **critical:** corregir FK de created_by/approved_by/rejected_by a profiles.id ([eb32e3b](https://github.com/Kavalieri/CuentasSiK/commit/eb32e3b32ffaf58bb27f2cdad30212de736f758c))
* eliminar try-catch innecesario que oculta errores reales ([4836125](https://github.com/Kavalieri/CuentasSiK/commit/4836125b81dadab31725ed602c1a776dfb239bce))
* handle OTP expired errors and add token_hash flow support in auth callback ([6a183ec](https://github.com/Kavalieri/CuentasSiK/commit/6a183ecea93dd32c79ac9c80a968ff01ec3985ce))
* improve invitation flow and contributions UI in Overview tab ([947d595](https://github.com/Kavalieri/CuentasSiK/commit/947d595c2254db1b2339f839f412d60ac9266632))
* invitations system - cookies error, real-time updates, profile visibility ([d4eb086](https://github.com/Kavalieri/CuentasSiK/commit/d4eb086cd512a1afba26276140dc1786bb842c0e))
* mejorar eliminación de ajustes con limpieza de movimientos y refresh automático ([105f974](https://github.com/Kavalieri/CuentasSiK/commit/105f974a967a0456a4dc983902f1f3aced97b181))
* mejorar visualización de ajustes en contribuciones ([1d1e2b1](https://github.com/Kavalieri/CuentasSiK/commit/1d1e2b109c57bcfff651c3ad9a9801b0efa382b7))
* pre-pagos con profile_id y cálculo automático de contribuciones ([0a411eb](https://github.com/Kavalieri/CuentasSiK/commit/0a411eb373e9ba7e06e4b77aaaa6953bafa4103b))
* recalcular status localmente en HeroContribution ([691d7d8](https://github.com/Kavalieri/CuentasSiK/commit/691d7d887591ad0a9dafc05cb91a2cadc1bc13a6))
* RLS policies + UI tema coherente ([8d4f470](https://github.com/Kavalieri/CuentasSiK/commit/8d4f47086ea0ca7456f57161c320ea233bd3aa51))
* RLS policies correctas + check owner activo + cleanup políticas ([ff50f9d](https://github.com/Kavalieri/CuentasSiK/commit/ff50f9dce824f84b010a064a6da71e66385c791e))
* robust invitation system with constraint fix and cookie cleanup ([aba0f91](https://github.com/Kavalieri/CuentasSiK/commit/aba0f91872f5ee79eb3596a6ed07fc86831e3388))
* seguridad wipes + dashboard admin mejorado + bug duplicación keys ([0e3733c](https://github.com/Kavalieri/CuentasSiK/commit/0e3733cfaf8c6381bd00f0092e1ef78595571361))
* selector categoría ingreso sin valor vacío (SelectItem error) ([bb0e9bb](https://github.com/Kavalieri/CuentasSiK/commit/bb0e9bb52869fa9d437d425c975ed4e24e87be2a))
* selector de categorías en EditMovementDialog + incluir category_id en query ([310ad78](https://github.com/Kavalieri/CuentasSiK/commit/310ad78832b13502deac3257ff1ee038c7b247fe))
* show pending invitations in onboarding for users without household ([27f4240](https://github.com/Kavalieri/CuentasSiK/commit/27f4240bcf299dbe10128530ff4cce85ec4e784e))
* simplificar lógica de ajustes y mejorar visualización ([fcfed70](https://github.com/Kavalieri/CuentasSiK/commit/fcfed70757ccd02d977613396e5bd7c36e0d4ddb))
* solo ajustes approved afectan cálculo + eliminar duplicado Resumen del Hogar ([5b79c51](https://github.com/Kavalieri/CuentasSiK/commit/5b79c51c0410e6da43ffc2020fa1b29f0d538de5))
* update adminCheck.ts to use profile_id instead of user_id ([7c5f9b7](https://github.com/Kavalieri/CuentasSiK/commit/7c5f9b729bac4a5a6b39993f87c729a1efc10d64))
* update household creation to use profile_id ([f2efe9e](https://github.com/Kavalieri/CuentasSiK/commit/f2efe9e7bb4b2916c2ac147309e7113fe8769558))
* use profile_id instead of user_id in pre-payment creation ([ac9f28d](https://github.com/Kavalieri/CuentasSiK/commit/ac9f28d2f50bba6992e0795a8b0a439d0b809278))


### Code Refactoring

* complete database architecture refactoring with profile_id migration ([d4e4698](https://github.com/Kavalieri/CuentasSiK/commit/d4e4698cad4f4de560267bf9d373b83c97eb362c))
