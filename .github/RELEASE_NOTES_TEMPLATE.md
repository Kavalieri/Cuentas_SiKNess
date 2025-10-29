# 🚀 Cuentas SiK vX.Y.Z

> **🎉 RELEASE ESTABLE** - Sistema completo de gestión de gastos compartidos para parejas

---

## 🌐 Prueba la Aplicación

**¿Quieres usar CuentasSiK inmediatamente sin instalar nada?**

### 🚀 [**Accede a cuentas.sikwow.com**](https://cuentas.sikwow.com)

Tenemos una instancia de producción completamente funcional y abierta al público:

✨ **Características:**
- ✅ Completamente gratuito y funcional
- ✅ Sin instalación local requerida
- ✅ Registro simple con email (magic links)
- ✅ Todas las funcionalidades de la release disponibles
- ✅ Entorno de producción seguro y estable

**Perfecto para:**
- 👥 Usuarios finales que solo quieren gestionar sus gastos
- 🔍 Desarrolladores que quieren evaluar la aplicación antes de clonar
- 🎓 Probar todas las características en un entorno real

> 💡 **Para desarrolladores**: Si prefieres control total de tus datos o personalizar el código, consulta la sección [Instalación para Desarrolladores](#para-desarrolladores) más abajo.

---

## 📚 Enlaces de Documentación

- **📖 README**: [Documentación Principal](https://github.com/Kavalieri/CuentasSiK#readme)
- **🛠 Troubleshooting**: [Guía de Solución de Problemas](https://github.com/Kavalieri/CuentasSiK/blob/main/docs/TROUBLESHOOTING.md)
- **🔐 JWT**: [Configuración de Autenticación](https://github.com/Kavalieri/CuentasSiK/blob/main/docs/JWT.md)
- **🐛 Reportar Issues**: [GitHub Issues](https://github.com/Kavalieri/CuentasSiK/issues)
- **💬 Discusiones**: [GitHub Discussions](https://github.com/Kavalieri/CuentasSiK/discussions)
- **📖 Contribuir**: [Guía de Contribución](https://github.com/Kavalieri/CuentasSiK/blob/main/CONTRIBUTING.md)
- **📜 Licencia**: [MIT License](https://github.com/Kavalieri/CuentasSiK/blob/main/LICENSE)

---

## 🏷️ Git Tags

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 🎯 ¿Qué es Cuentas SiK?

**Cuentas SiK** es una aplicación web profesional para gestionar gastos compartidos entre parejas o compañeros de piso, con un enfoque en contribuciones proporcionales según los ingresos de cada miembro.

### ✨ Características Principales

- ✅ **Gestión de Gastos e Ingresos**: Registro completo de transacciones con categorías personalizables
- ✅ **Contribuciones Proporcionales**: Sistema que calcula automáticamente cuánto debe aportar cada miembro según sus ingresos
- ✅ **Múltiples Hogares**: Un usuario puede crear o unirse a varios hogares con selector de contexto
- ✅ **Dashboard Profesional**: Visualización con gráficos interactivos y resúmenes mensuales
- ✅ **Sistema de Créditos**: Gestión de créditos mensuales con decisiones automáticas
- ✅ **Sistema de Ahorro**: Cuenta conjunta para ahorros del hogar con transferencias
- ✅ **Privacy Mode**: Ocultar cantidades con un clic para usar en lugares públicos
- ✅ **Dark/Light Mode**: Tema adaptable con persistencia y detección automática del sistema
- ✅ **Sistema de Ajustes**: Workflow completo para registrar y aprobar ajustes de contribuciones
- ✅ **Panel de Administración**: Gestión completa del hogar, miembros e invitaciones
- ✅ **Autenticación Segura**: Magic links por email sin contraseñas
- ✅ **PostgreSQL Nativo**: Base de datos profesional con sistema de migraciones

---

## 🚀 Cómo Empezar

### Para Usuarios Finales

**¡Empieza a usar CuentasSiK ahora mismo!**

1. **Accede a**: [https://cuentas.sikwow.com](https://cuentas.sikwow.com)
2. **Regístrate** con tu email (recibirás un magic link)
3. **Crea tu hogar** o acepta una invitación de tu pareja/compañero
4. **Configura contribuciones** (ingresos mensuales y meta del hogar)
5. **Empieza a registrar gastos** y visualiza el balance en tiempo real

### Para Desarrolladores (Auto-Hosting)

Si prefieres desplegar tu propia instancia:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Kavalieri/CuentasSiK.git
cd CuentasSiK

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales de PostgreSQL

# 4. Configurar base de datos PostgreSQL
# Ver database/README.md para instrucciones completas

# 5. Ejecutar en desarrollo
npm run dev

# 6. Abrir en el navegador
# http://localhost:3001
```

Ver [CONTRIBUTING.md](https://github.com/Kavalieri/CuentasSiK/blob/main/CONTRIBUTING.md) para guía completa de desarrollo.

---

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14+ (App Router, Server Actions)
- **Lenguaje**: TypeScript estricto
- **Base de datos**: PostgreSQL nativo (migrado de Supabase)
- **UI**: Tailwind CSS + shadcn/ui
- **Gráficos**: Recharts
- **Deploy**: PM2 en servidor propio (migrado de Vercel)
- **CI/CD**: GitHub Actions + Release Please
- **Gestión de procesos**: PM2 con ecosystem.config.js

---

## 📊 Estadísticas de la Release v1.0.0

- **50+ Features** implementadas
- **45+ Bug Fixes** resueltos
- **15 Tablas** en base de datos PostgreSQL
- **100% Migración** de Supabase a PostgreSQL nativo
- **Sistema completo** de migraciones y scripts
- **30+ Páginas** compiladas
- **25+ Tasks de VSCode** para desarrollo
- **Infraestructura propia** completamente funcional

---

## 🔐 Seguridad y Privacidad

- ✅ **Row Level Security (RLS)** habilitado en todas las tablas
- ✅ **Sin datos sensibles** hardcodeados en el código
- ✅ **Variables de entorno** seguras y documentadas
- ✅ **Auditoría de seguridad** completa pre-release
- ✅ **Autenticación sin contraseña** con magic links
- ✅ **Privacy Mode** para ocultar cantidades

Ver [SECURITY_AUDIT_RELEASE_1.0.0.md](https://github.com/Kavalieri/CuentasSiK/blob/main/SECURITY_AUDIT_RELEASE_1.0.0.md) para detalles completos.

---

## 🎉 Notas Importantes - Release 1.0.0 Estable

Esta es la **primera versión estable** (1.0.0), marcando varios hitos importantes:

- ✅ **Todas las características principales** están implementadas, testeadas y estables
- 🏠 **Migración completa** de Supabase a PostgreSQL nativo en infraestructura propia
- 🚀 **Deploy en producción** con PM2 en servidor dedicado (cuentas.sikwow.com)
- 📋 **Sistema de migraciones** robusto con scripts de desarrollo y producción
- 🔧 **Herramientas de desarrollo** completas con VSCode tasks y MCPs
- � **Documentación actualizada** reflejando la nueva arquitectura
- 🛡️ **Sistema de seguridad** mejorado sin dependencias de servicios externos
- 🔄 **Workflow de CI/CD** optimizado para infraestructura propia

### 🔥 Migración de Infraestructura Completada

**Infraestructura Independiente:**

- ✅ Base de datos migrada a PostgreSQL 15 nativo
- ✅ Sistema de autenticación integrado con JWT
- ✅ Compatible con gestores de procesos estándar (systemd, Docker, etc.)
- ✅ Scripts de backup y sincronización
- ✅ Sistema de migraciones bidireccional (dev ↔ prod)
- ✅ Sin dependencias de plataformas cloud específicas
- ✅ Configuración de desarrollo mejorada con Docker opcional

**¿Encontraste un bug?** Por favor [abre un issue](https://github.com/Kavalieri/CuentasSiK/issues/new) con detalles.

---

## 📝 Changelog Completo v1.0.0

### 🎯 NUEVAS CARACTERÍSTICAS PRINCIPALES

- **PostgreSQL nativo con sistema de migraciones robusto**
- **Desarrollo y producción separados**
- **Herramientas de automatización para desarrollo y deploy**
- **MCPs (Model Context Protocol)** configurados para desarrollo eficiente
- **Sistema de créditos mensual** con decisiones automáticas
- **Sistema de ahorro conjunto** con transferencias entre cuentas
- **Dashboard profesional** con gráficos interactivos mejorados
- **Sistema de ajustes completo** con plantillas y workflow de aprobación

### ⚠️ BREAKING CHANGES

- Migración completa de Supabase a PostgreSQL nativo
- URLs de producción cambiadas de Vercel a servidor propio
- Sistema de autenticación migrado de Supabase Auth a JWT propio
- Base de datos restructurada con 15 tablas optimizadas

### Features

- add multiple calculation types for contributions (proportional, equal, custom) ([a81c681](https://github.com/Kavalieri/CuentasSiK/commit/a81c68104e78cc9c7f9845d816c4acc0eda47ddc))
- add pre-payments system and flexible payment amounts ([dccbdc4](https://github.com/Kavalieri/CuentasSiK/commit/dccbdc4eb979cf5d43f6c17a080aac871ae42e3b))
- add profile auto-creation trigger and fallback ([7ecb8d6](https://github.com/Kavalieri/CuentasSiK/commit/7ecb8d6ef5362894b27ac8955924e93afb327863))
- agregar atribución de miembro en movimientos auto-generados ([222b468](https://github.com/Kavalieri/CuentasSiK/commit/222b468b263fb717ff4839c4c865ed641597919c))
- agregar componente ContributionAdjustmentsSection ([6cbf1d5](https://github.com/Kavalieri/CuentasSiK/commit/6cbf1d5e4d0f8801d2adcfc2e9cf85d8ffa920e5))
- crear movimientos automáticos de gasto e ingreso virtual para pre-pagos ([4267ad2](https://github.com/Kavalieri/CuentasSiK/commit/4267ad2ac5b309523b06e1c1167cb05778d0b68a))
- dashboard improvements and balance system ([16bc36a](https://github.com/Kavalieri/CuentasSiK/commit/16bc36a27bf53baf89e73b5ca0c02e7c7cfc4808))
- dashboard profesional con gráficos Recharts ([f43e70a](https://github.com/Kavalieri/CuentasSiK/commit/f43e70a30884899e3f5f522c4064ae64f0ee36b3))
- endpoint temporal recalculo + scripts SQL simplificados ([fc8f3f5](https://github.com/Kavalieri/CuentasSiK/commit/fc8f3f5e0c3c73221a214b5ecf84ce2ba1bd7b18))
- fix invitation system + implement multi-household improvements ([c72d68a](https://github.com/Kavalieri/CuentasSiK/commit/c72d68a0482664238e6681efcecca8d818dca099))
- formularios de pre-pago e ingreso extra (PASO 2) ([7e1f13e](https://github.com/Kavalieri/CuentasSiK/commit/7e1f13e83c630b6672da996d583e3e0e48d6cffe))
- implement invitation cleanup system with orphaned detection ([a342064](https://github.com/Kavalieri/CuentasSiK/commit/a34206460c918c0da9357d20f40122f277e3cdfa))
- implement professional accounting system with monthly periods ([08e9673](https://github.com/Kavalieri/CuentasSiK/commit/08e967347a9d2ad5ecb68decf6960ccbb12fbc60))
- improve dashboard and UI enhancements ([5b62787](https://github.com/Kavalieri/CuentasSiK/commit/5b627870d91c29976490145b3103815e202e8913))
- incluir pre-pagos en total recaudado del hogar y mejorar HeroContribution ([2442f76](https://github.com/Kavalieri/CuentasSiK/commit/2442f764a56f760750e2487a2aa3303f08ad3d38))
- launch CuentasSiK alpha version ([531deb0](https://github.com/Kavalieri/CuentasSiK/commit/531deb0504f03348dd1f4e5b6603956fbd968556))
- mejoras UX en sistema de ajustes con aprobación ([b9742eb](https://github.com/Kavalieri/CuentasSiK/commit/b9742eb94d3772d15e1904e9511cf497510b0b95))
- nuevo panel de ajustes visible para todos + fix cálculo solo approved ([d714e55](https://github.com/Kavalieri/CuentasSiK/commit/d714e55c6f6b94a884ceaed9a4014153983146e6))
- panel de aprobaciones para owners (PASO 1) ([7979373](https://github.com/Kavalieri/CuentasSiK/commit/7979373a9b82a926b6f907e65425f9394b5ab0f0))
- resumen hogar mejorado con lógica correcta de fondo ([7273f8d](https://github.com/Kavalieri/CuentasSiK/commit/7273f8d66c656540f74fce46d3b7249ad057836d))
- selector categoría ingreso + fix temporal check owner ([076801d](https://github.com/Kavalieri/CuentasSiK/commit/076801dbe70276f9f70ece44727aaa7bb74c7a61))
- simplify contributions system with single-page UI and role-based permissions ([f9ecf93](https://github.com/Kavalieri/CuentasSiK/commit/f9ecf9307ea216dffabbcfe75e8ee02a204101aa))
- sistema completo de edición de movimientos con historial automático ([f6962db](https://github.com/Kavalieri/CuentasSiK/commit/f6962db7df1cde33d8b6cf10e19c5f87f42f7a3b))
- sistema completo de wipes configurables con opciones selectivas ([e83d1e2](https://github.com/Kavalieri/CuentasSiK/commit/e83d1e28d3323e66c637e15d1a0f98ade9686964))
- sistema de aprobación de ajustes completo (Fase 1+2) ([fbf9eb0](https://github.com/Kavalieri/CuentasSiK/commit/fbf9eb0406456cf695b0c960e0ec1757f1c08d65))
- sistema de ocultación de cantidades y wipe selectivo de datos ([60bd0f4](https://github.com/Kavalieri/CuentasSiK/commit/60bd0f4d791de60d8d76d2b23eb62fcd0200d79e))
- unificar pre-pagos y ajustes en sistema único ([7482efc](https://github.com/Kavalieri/CuentasSiK/commit/7482efc52bc28144e65937c26da87fcc5de0af0f))
- update ContributionMembersList with pre-payments display ([83c7f7a](https://github.com/Kavalieri/CuentasSiK/commit/83c7f7a661d79b526400cff9d89add2ffea59af8))
- update HeroContribution with payment options and pre-payments display ([31468ca](https://github.com/Kavalieri/CuentasSiK/commit/31468ca56b5496dd55f94a428cf827168034bb3b))
- versión 0.1.0-alpha con footer profesional ([5b7d028](https://github.com/Kavalieri/CuentasSiK/commit/5b7d0280aba4a0c67bf08bf8078597b20ea01946))

### Bug Fixes

- actualizar todas las referencias user_id → profile_id en queries ([6189039](https://github.com/Kavalieri/CuentasSiK/commit/6189039d95ee657b054a4b6531cfe9ffce0d6a72))
- add get_household_members function and dynamic redirect URLs for magic links ([6e96299](https://github.com/Kavalieri/CuentasSiK/commit/6e96299bcd524a0630b52bdf377cf199329581d3))
- añadir política RLS INSERT para household_settings ([502a81d](https://github.com/Kavalieri/CuentasSiK/commit/502a81d52dc2078d9da2fccf51f3dafd3e92fc11))
- calcular total pagado correctamente incluyendo gastos directos con movement_id ([cd14e57](https://github.com/Kavalieri/CuentasSiK/commit/cd14e576ccc40d0b506735781441fba0ef90b03a))
- cambiar terminología de 'sobrepago' a 'aporte extra' ([492d508](https://github.com/Kavalieri/CuentasSiK/commit/492d508cbdd3625fa9acef665f9474377d595a31))
- campo description en AddMovementDialog + docs completas con MCPs ([a08028a](https://github.com/Kavalieri/CuentasSiK/commit/a08028a5fd11c9ef0330d00a74ab23d63aea730f))
- contador duplicado en últimos movimientos ([20a6ce9](https://github.com/Kavalieri/CuentasSiK/commit/20a6ce9272894c4d7ad7b7c2426092cafb46fe9c))
- correct TypeScript types in auth callback and fix middleware profile_id lookup ([6c5d202](https://github.com/Kavalieri/CuentasSiK/commit/6c5d2024f2f7a8424071ab05ff63bed54cb0e888))
- corregir error al resetear formulario y actualizar UI dinámicamente ([05cd994](https://github.com/Kavalieri/CuentasSiK/commit/05cd9940d38576c4e4b43b77881eca3af2f472f8))
- corregir errores de build para despliegue en Vercel ([4d95292](https://github.com/Kavalieri/CuentasSiK/commit/4d95292dc8cf458c5b0d4a6970d3962882f73416))
- corregir funciones wipe para usar transactions y profile_id ([b3558a6](https://github.com/Kavalieri/CuentasSiK/commit/b3558a697515ebb96e8e7cfe4b73d42bb2cf5439))
- corregir permisos de miembros para crear pre-pagos + eliminar QuickActions obsoleto ([d7b8bb5](https://github.com/Kavalieri/CuentasSiK/commit/d7b8bb568ac7c145d87c483b0b6c2399107011ee))
- corregir query de categories y constraint problemático ([013ba26](https://github.com/Kavalieri/CuentasSiK/commit/013ba268b0b1441da916a47c7837c7213e112241))
- **critical:** corregir FK de created_by/approved_by/rejected_by a profiles.id ([eb32e3b](https://github.com/Kavalieri/CuentasSiK/commit/eb32e3b32ffaf58bb27f2cdad30212de736f758c))
- eliminar try-catch innecesario que oculta errores reales ([4836125](https://github.com/Kavalieri/CuentasSiK/commit/4836125b81dadab31725ed602c1a776dfb239bce))
- handle OTP expired errors and add token_hash flow support in auth callback ([6a183ec](https://github.com/Kavalieri/CuentasSiK/commit/6a183ecea93dd32c79ac9c80a968ff01ec3985ce))
- improve invitation flow and contributions UI in Overview tab ([947d595](https://github.com/Kavalieri/CuentasSiK/commit/947d595c2254db1b2339f839f412d60ac9266632))
- invitations system - cookies error, real-time updates, profile visibility ([d4eb086](https://github.com/Kavalieri/CuentasSiK/commit/d4eb086cd512a1afba26276140dc1786bb842c0e))
- mejorar eliminación de ajustes con limpieza de movimientos y refresh automático ([105f974](https://github.com/Kavalieri/CuentasSiK/commit/105f974a967a0456a4dc983902f1f3aced97b181))
- mejorar visualización de ajustes en contribuciones ([1d1e2b1](https://github.com/Kavalieri/CuentasSiK/commit/1d1e2b109c57bcfff651c3ad9a9801b0efa382b7))
- pre-pagos con profile_id y cálculo automático de contribuciones ([0a411eb](https://github.com/Kavalieri/CuentasSiK/commit/0a411eb373e9ba7e06e4b77aaaa6953bafa4103b))
- recalcular status localmente en HeroContribution ([691d7d8](https://github.com/Kavalieri/CuentasSiK/commit/691d7d887591ad0a9dafc05cb91a2cadc1bc13a6))
- RLS policies + UI tema coherente ([8d4f470](https://github.com/Kavalieri/CuentasSiK/commit/8d4f47086ea0ca7456f57161c320ea233bd3aa51))
- RLS policies correctas + check owner activo + cleanup políticas ([ff50f9d](https://github.com/Kavalieri/CuentasSiK/commit/ff50f9dce824f84b010a064a6da71e66385c791e))
- robust invitation system with constraint fix and cookie cleanup ([aba0f91](https://github.com/Kavalieri/CuentasSiK/commit/aba0f91872f5ee79eb3596a6ed07fc86831e3388))
- seguridad wipes + dashboard admin mejorado + bug duplicación keys ([0e3733c](https://github.com/Kavalieri/CuentasSiK/commit/0e3733cfaf8c6381bd00f0092e1ef78595571361))
- selector categoría ingreso sin valor vacío (SelectItem error) ([bb0e9bb](https://github.com/Kavalieri/CuentasSiK/commit/bb0e9bb52869fa9d437d425c975ed4e24e87be2a))
- selector de categorías en EditMovementDialog + incluir category_id en query ([310ad78](https://github.com/Kavalieri/CuentasSiK/commit/310ad78832b13502deac3257ff1ee038c7b247fe))
- show pending invitations in onboarding for users without household ([27f4240](https://github.com/Kavalieri/CuentasSiK/commit/27f4240bcf299dbe10128530ff4cce85ec4e784e))
- simplificar lógica de ajustes y mejorar visualización ([fcfed70](https://github.com/Kavalieri/CuentasSiK/commit/fcfed70757ccd02d977613396e5bd7c36e0d4ddb))
- solo ajustes approved afectan cálculo + eliminar duplicado Resumen del Hogar ([5b79c51](https://github.com/Kavalieri/CuentasSiK/commit/5b79c51c0410e6da43ffc2020fa1b29f0d538de5))
- update adminCheck.ts to use profile_id instead of user_id ([7c5f9b7](https://github.com/Kavalieri/CuentasSiK/commit/7c5f9b729bac4a5a6b39993f87c729a1efc10d64))
- update household creation to use profile_id ([f2efe9e](https://github.com/Kavalieri/CuentasSiK/commit/f2efe9e7bb4b2916c2ac147309e7113fe8769558))
- use profile_id instead of user_id in pre-payment creation ([ac9f28d](https://github.com/Kavalieri/CuentasSiK/commit/ac9f28d2f50bba6992e0795a8b0a439d0b809278))

### Code Refactoring

- complete database architecture refactoring with profile_id migration ([d4e4698](https://github.com/Kavalieri/CuentasSiK/commit/d4e4698cad4f4de560267bf9d373b83c97eb362c))

---

## 🙏 Agradecimientos

Gracias por probar **CuentasSiK v0.2.0-alpha**. Tu feedback es invaluable para mejorar el proyecto.

**Desarrollado por**: SiK ([@Kavalieri](https://github.com/Kavalieri))
**Licencia**: MIT
**Powered by**: Supabase • Vercel • Next.js • TypeScript

---

## 📬 Contacto y Soporte

- 🐛 **Reportar Bugs**: [Abrir Issue](https://github.com/Kavalieri/CuentasSiK/issues/new?template=bug_report.md)
- 💡 **Sugerir Features**: [Abrir Issue](https://github.com/Kavalieri/CuentasSiK/issues/new?template=feature_request.md)
- 💬 **Discusiones**: [GitHub Discussions](https://github.com/Kavalieri/CuentasSiK/discussions)
- 📧 **Email**: Ver perfil de GitHub

---

**¿Te gusta el proyecto?** ⭐ Dale una estrella en GitHub para mostrar tu apoyo!
