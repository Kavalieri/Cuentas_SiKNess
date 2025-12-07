# Changelog

## [3.0.0](https://github.com/Kavalieri/Cuentas_SiKNess/compare/cuentas-sik-v2.0.0...cuentas-sik-v3.0.0) (2025-12-07)


### ⚠ BREAKING CHANGES

* **loans:** Complete redesign of loan system architecture
* **database:** Renombrado conceptual en toda la app
* **docs:** docs/TO-DO/ eliminado del repositorio
* **database:** Sistema de roles simplificado y migraciones reseteadas

### Features

* **api:** agregar información completa de pagador en transacciones ([fd21082](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fd21082e6d536f97524445f0d581265563345c57)), closes [#17](https://github.com/Kavalieri/Cuentas_SiKNess/issues/17)
* **api:** añadir performed_by_display_name a endpoint global de transacciones - Phase 3 ([fdba4c3](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fdba4c3fa7e27845c73d42bdbb709159e42e4868))
* **backend:** implementar sistema dual-field en Server Actions - Phase 2 ([a193a7a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/a193a7a1ecc806e7a132715ece96d09952b732a8))
* **balance:** cargar categorías correctamente + selector pagador en gastos directos (Issue [#12](https://github.com/Kavalieri/Cuentas_SiKNess/issues/12)) ([2e3507d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/2e3507dec5c35352f06d8bc71f2294f45c3ca6a6))
* **balance:** crear página historial detallado por miembro ([c2134a6](https://github.com/Kavalieri/Cuentas_SiKNess/commit/c2134a66f9d6c7b65630960fcf229d7a92eb6603))
* **balance:** implement 3-tier category hierarchy in edit forms ([c42aac3](https://github.com/Kavalieri/Cuentas_SiKNess/commit/c42aac3e7076d8d847c57e7d8a51ce346fa7f164))
* **balance:** ocultar botones de edición/eliminación en ingresos compensatorios (Issue [#26](https://github.com/Kavalieri/Cuentas_SiKNess/issues/26)) ([f0ba413](https://github.com/Kavalieri/Cuentas_SiKNess/commit/f0ba41343909a6d560eda98f2f2de7f6f6e27d03))
* **balance:** Phase 2 - Marcar categorías existentes como sistema ([9782bcf](https://github.com/Kavalieri/Cuentas_SiKNess/commit/9782bcfc6c2ed979ba22239f3ec7bf81b64edbca)), closes [#58](https://github.com/Kavalieri/Cuentas_SiKNess/issues/58)
* **balance:** Phase 3 - Deprecar tablas legacy (sin datos) ([4ce4578](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4ce4578c00b3d8ea6a4933395958f68734c48719)), closes [#59](https://github.com/Kavalieri/Cuentas_SiKNess/issues/59)
* **balance:** Phase 4 - Backend integrado usando API existente ([e9e0fce](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e9e0fce1664157fadd8eec25dd249d8f50792bb5)), closes [#60](https://github.com/Kavalieri/Cuentas_SiKNess/issues/60)
* **charts:** añadir indicadores técnicos a gráfico de evolución ([b0e1349](https://github.com/Kavalieri/Cuentas_SiKNess/commit/b0e13493b10ea789851a7270a6e76e65c08d0c40))
* **colors:** reforzar sistema de paletas con validación robusta ([55f72ce](https://github.com/Kavalieri/Cuentas_SiKNess/commit/55f72ce8c8e31f86830cd791d59e16c45c31d478)), closes [#48](https://github.com/Kavalieri/Cuentas_SiKNess/issues/48)
* **database:** cambio concepto 'objetivo' → 'presupuesto' ([#25](https://github.com/Kavalieri/Cuentas_SiKNess/issues/25)) ([b6fa089](https://github.com/Kavalieri/Cuentas_SiKNess/commit/b6fa0897c17b6d13920b133cf33f5c23fcce6c19))
* **database:** unify ownership to single cuentassik_owner role (v2.1.0) ([e74260c](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e74260c2398a2a2a33e2feb32aa0a8b4499d82e3)), closes [#6](https://github.com/Kavalieri/Cuentas_SiKNess/issues/6)
* **db:** añadir .archive/ a .gitignore para backups locales ([ed928d6](https://github.com/Kavalieri/Cuentas_SiKNess/commit/ed928d62e6994c68b9f1775726c718130314691f))
* **db:** baseline v3.0.0 - esquema completo desde PROD post Issue [#47](https://github.com/Kavalieri/Cuentas_SiKNess/issues/47) ([5b3e1e0](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5b3e1e0d7c10f94f281f72da2f7b7dab0b40b660))
* **db:** completar Issue [#16](https://github.com/Kavalieri/Cuentas_SiKNess/issues/16) - migración categorías y subcategorías ([48a30ae](https://github.com/Kavalieri/Cuentas_SiKNess/commit/48a30aeeaaa8471f75314a4d9cd9eaf508f0d625))
* **db:** completar sistema de subcategorías (Issue [#44](https://github.com/Kavalieri/Cuentas_SiKNess/issues/44)) ([4d42806](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4d42806ea88a00c6115cad1facba25ae9e80c2ff))
* **db:** complete subcategories for all categories (Issue [#44](https://github.com/Kavalieri/Cuentas_SiKNess/issues/44)) ([4f9e3b1](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4f9e3b103d60a88b46a400c917d0954e5ba88e10))
* **db:** Fase 1.5 - Eliminar 12 columnas sin uso (Issue [#63](https://github.com/Kavalieri/Cuentas_SiKNess/issues/63)) ([befdf9c](https://github.com/Kavalieri/Cuentas_SiKNess/commit/befdf9ca31aec74036d301b26342c4982cc5094d))
* **db:** implement Cuenta Común as system entity + fix migration workflow ([6415f14](https://github.com/Kavalieri/Cuentas_SiKNess/commit/6415f14523eb48a78a575aae2bb59f6812823a91))
* **db:** inferir subcategorías desde descripciones de transacciones ([71d1859](https://github.com/Kavalieri/Cuentas_SiKNess/commit/71d1859f589381276e75fce3b9731a856648bceb))
* **db:** Issue [#47](https://github.com/Kavalieri/Cuentas_SiKNess/issues/47) - consolidar funciones duplicadas de categorías + baseline v3.0.0 ([e610f0f](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e610f0f5b0fc38dd05298d8e5795a7e51392c814))
* **db:** migrar performed_by de email a UUID - Issue [#19](https://github.com/Kavalieri/Cuentas_SiKNess/issues/19), [#20](https://github.com/Kavalieri/Cuentas_SiKNess/issues/20) ([c671a0e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/c671a0e1e2b5a82c33923b25393450a7afebef88))
* **db:** sistema dual-field completo aplicado a PROD - Issue [#19](https://github.com/Kavalieri/Cuentas_SiKNess/issues/19), [#20](https://github.com/Kavalieri/Cuentas_SiKNess/issues/20) ([7c9d6a2](https://github.com/Kavalieri/Cuentas_SiKNess/commit/7c9d6a276bc7cd9fe280b6dd2c9e9b0d0dd75f02))
* **edit-forms:** unificar formularios de edición con validación doble por fecha ([9e72266](https://github.com/Kavalieri/Cuentas_SiKNess/commit/9e72266d490e35d914d3e16e62ed48e8e16f6fda))
* **estadisticas:** añadir indicadores técnicos al gráfico de balance ([95140b6](https://github.com/Kavalieri/Cuentas_SiKNess/commit/95140b60f73940c5bb0872c5ef5cc5cce1cffb33))
* **estadisticas:** cambiar Pareto de grupos a categorías nivel 2 ([32d7567](https://github.com/Kavalieri/Cuentas_SiKNess/commit/32d75677bbb16a9f2e9632211776c0873504c0d7))
* **estadisticas:** implementar sistema de colores jerárquico y gráficos Nivo mejorados ([6017342](https://github.com/Kavalieri/Cuentas_SiKNess/commit/60173428e709be09310a83e8623919e9c12a76f7))
* **estadisticas:** implementar TradingView con múltiples escalas temporales ([e407302](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e407302d4dff7ad73abd6fca77c537a227c0bf57))
* **estadisticas:** implementar TradingView Pro con historial completo y features profesionales ([11d10c2](https://github.com/Kavalieri/Cuentas_SiKNess/commit/11d10c2700192850dce7a2740a21634b0bdd7f10))
* **estadisticas:** implementar visualizaciones jerárquicas y Pareto funcionales ([56ba84c](https://github.com/Kavalieri/Cuentas_SiKNess/commit/56ba84c0583385f57787510e2b6ef3bd6895612a))
* **estadisticas:** POC TradingView Lightweight Charts v5 con comparador A/B ([5f69160](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5f691602ed0c10f4f01428eca488720502d471ca))
* **estadisticas:** sistema de colores por grupos + Nivo Pie Chart ([a1c7e1f](https://github.com/Kavalieri/Cuentas_SiKNess/commit/a1c7e1fd92108fd3fca3ce2fe62993d12d51a2f3))
* **forms:** añadir selector "¿Quién realizó?" en NewMovementForm - Phase 4 ([51ea18b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/51ea18b3c7742137e976e19f7de3d8b0a86305c2))
* **forms:** encadenamiento con localStorage en formulario nuevo movimiento (Issue [#15](https://github.com/Kavalieri/Cuentas_SiKNess/issues/15)) ([1f65b8e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/1f65b8eb813d0b2b374b6e8f7bc40d726f75541e))
* **forms:** validación numérica mejorada en campos de importe (Issue [#14](https://github.com/Kavalieri/Cuentas_SiKNess/issues/14)) ([01df452](https://github.com/Kavalieri/Cuentas_SiKNess/commit/01df452e8db4a5dde4babdb305ad98ad08d4a898))
* **Issue #63 Fase 1:** Remove 6 redundant empty database tables ([4faa845](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4faa8453ff3e78f3d41fbd807aa9d851c4ba4835))
* **issue-25:** migrar terminología "objetivo/meta" a "presupuesto" (fase 2-3 backend/frontend) ([5a5cb40](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5a5cb407a778efcaeb7114ed97b080cff5165983))
* **loans:** add owner approval interface for household loans ([9cb9c56](https://github.com/Kavalieri/Cuentas_SiKNess/commit/9cb9c56004910871f672dbde7125e27347f3433e))
* **loans:** implement household-to-member loan system with approval workflow ([5b3341f](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5b3341f22da531449f30fca767eaa9ab9bc6689b))
* **loans:** implementar sistema de préstamos usando categorías de sistema ([ff64728](https://github.com/Kavalieri/Cuentas_SiKNess/commit/ff64728df207a2dc752e08f9c6e05725e514ab2b))
* **migrations:** establecer baseline v3.0.0 y limpiar historial (Issue [#53](https://github.com/Kavalieri/Cuentas_SiKNess/issues/53) - FASE 3) ([bb66050](https://github.com/Kavalieri/Cuentas_SiKNess/commit/bb66050c082b888f6092a7d4f2600919f0fb5d12))
* **migrations:** Integrar auto-regeneración de types en workflow (Issue [#10](https://github.com/Kavalieri/Cuentas_SiKNess/issues/10)) ([c63001e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/c63001e225e68f7b50c2eb111ace850ec5b51011))
* **Phase 40:** UX improvements and comprehensive documentation ([6e9fcfc](https://github.com/Kavalieri/Cuentas_SiKNess/commit/6e9fcfca42ab6025341357d991e5dc74486dbe06))
* **scripts:** reorganizar estructura y crear scripts de gestión de migraciones ([#53](https://github.com/Kavalieri/Cuentas_SiKNess/issues/53)) ([4333eb9](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4333eb9dc49d174f3cd2aee9624e94c17b6b9279))
* **sickness:** add CategoryTreemap component with 3-level hierarchy visualization ([4b8f417](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4b8f41737e0ac87656a6cbd9322afa81782c6a0e))
* **sickness:** add ParetoChart component with 80/20 principle visualization ([01d36c2](https://github.com/Kavalieri/Cuentas_SiKNess/commit/01d36c26a66776482092787b17c72289bef96759))
* **sickness:** add TrendLineChart component with temporal trend analysis ([65fb032](https://github.com/Kavalieri/Cuentas_SiKNess/commit/65fb032f5cabf2f52f3798593f581db0318d31c1))
* **sickness:** display category hierarchy in transaction list ([08ac8db](https://github.com/Kavalieri/Cuentas_SiKNess/commit/08ac8db179247481cf317aad263d5f723f91dbba))
* **sickness:** implement 3-level category hierarchy (Parent → Category → Subcategory) ([fb2359a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fb2359a5d88ea5a8acde109bce23d201a2a5a6bd))
* **sickness:** integrate advanced visualizations into statistics page ([baed01d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/baed01d7be10af7e6eab5a95c301e7030096cd90))
* **stats:** añadir gráfico de evolución del balance histórico ([949cdb4](https://github.com/Kavalieri/Cuentas_SiKNess/commit/949cdb421b17da47ce20832b5f7cd54b7a64b7e3)), closes [#51](https://github.com/Kavalieri/Cuentas_SiKNess/issues/51)
* **transactions:** sistema de numeración + botones solo icono (Issues [#27](https://github.com/Kavalieri/Cuentas_SiKNess/issues/27) [#28](https://github.com/Kavalieri/Cuentas_SiKNess/issues/28)) ([50e2905](https://github.com/Kavalieri/Cuentas_SiKNess/commit/50e2905e6e774020a39d3040a36a389557f6f46b))
* **types:** Implementar auto-generación de types desde PostgreSQL (Issue [#8](https://github.com/Kavalieri/Cuentas_SiKNess/issues/8)) ([5e99b6b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5e99b6bcacd3589cbb07d21490ee6b676a976283))
* **ui:** add menu link to advanced analytics page ([430ce8e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/430ce8e96d6ab74d86ee3a8d504e87a7d8a77ddc))
* **ui:** implementar display dual-field en TransactionCard - Phase 5 ([32c2c2a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/32c2c2a9abcad444e10688bdc80db214a1b52abd))
* **ui:** Implementar Issues [#40](https://github.com/Kavalieri/Cuentas_SiKNess/issues/40) y [#42](https://github.com/Kavalieri/Cuentas_SiKNess/issues/42) - Collapsible + Analytics separado ([fb6e50a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fb6e50a3ec3cc195e3ffc8feb6ba9f88c6ce22a4))
* **ui:** implementar TransactionCard responsive con expand/collapse (Issue [#13](https://github.com/Kavalieri/Cuentas_SiKNess/issues/13)) ([d40e14d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/d40e14deb810968e5a5a87618e8eeff4c5b79f4e))
* **ui:** mostrar jerarquía completa en TransactionCard (Grupo → Categoría → Subcategoría) ([ca1d942](https://github.com/Kavalieri/Cuentas_SiKNess/commit/ca1d9421d9bcc67f1ad7fdd2df7694ae0fc29cb6))
* **ui:** Phase 5 - Dashboard Multi-Miembro de Balance ([33bdfc3](https://github.com/Kavalieri/Cuentas_SiKNess/commit/33bdfc3b02295b14907055653d7a48f451111330)), closes [#61](https://github.com/Kavalieri/Cuentas_SiKNess/issues/61)
* **ui:** simplificar display "Gastado por" - Issue [#29](https://github.com/Kavalieri/Cuentas_SiKNess/issues/29) ([9b63e9e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/9b63e9e471267457dc8d93f8b8524d9c1ff3bb0c))
* **validación:** implementar validación de movimientos basada en fecha real (Issue [#37](https://github.com/Kavalieri/Cuentas_SiKNess/issues/37)) ([5cdab58](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5cdab58ba559e8f7cfdeb553c65da751d12e8ca1))
* **vscode:** actualizar tasks.json con nueva estructura de scripts (Issue [#53](https://github.com/Kavalieri/Cuentas_SiKNess/issues/53) - FASE 2) ([4e00764](https://github.com/Kavalieri/Cuentas_SiKNess/commit/4e00764da5c779042cc1f8da9b7ae608eb345fd8))


### Bug Fixes

* **analytics:** corregir 5 queries con bugs de JOIN y lógica ([c70ee0c](https://github.com/Kavalieri/Cuentas_SiKNess/commit/c70ee0c3387bdda0e99e6092f98cbaadfc88e4e1)), closes [#46](https://github.com/Kavalieri/Cuentas_SiKNess/issues/46)
* **api:** corregir JOINs para jerarquía completa de categorías ([26ac6d5](https://github.com/Kavalieri/Cuentas_SiKNess/commit/26ac6d54363ea916fd1bf00a05038dff9c758c91)), closes [#17](https://github.com/Kavalieri/Cuentas_SiKNess/issues/17)
* **api:** ordenar transacciones por fecha del movimiento (occurred_at) ([44f23af](https://github.com/Kavalieri/Cuentas_SiKNess/commit/44f23afd3df7309341df6942a6fdef682daf032f))
* **api:** restaurar archivo global/route.ts a estado funcional ([0e84d15](https://github.com/Kavalieri/Cuentas_SiKNess/commit/0e84d15f97dcee37e5d71b0586f9f1411c8ef6ab))
* **api:** revertir cambios que rompieron categorías en transacciones ([28133c1](https://github.com/Kavalieri/Cuentas_SiKNess/commit/28133c183286316a884ca3bbf5170ee5a6a22ac9))
* **balance:** corregir colores y fecha de referencia en dashboard ([a396778](https://github.com/Kavalieri/Cuentas_SiKNess/commit/a396778b85c7fe9285819fa1b36280a5270b73dc))
* **balance:** corregir edición de gastos directos + nomenclatura ([ea41de7](https://github.com/Kavalieri/Cuentas_SiKNess/commit/ea41de7b492ae4e14b3267ad9286dac48778f54d))
* **balance:** eliminar valores -0.00 en historial de balance ([cbd78f5](https://github.com/Kavalieri/Cuentas_SiKNess/commit/cbd78f5464fa5d0e9fbed4ca41b0ca434abe4a04))
* **balance:** resolve initial category values in edit forms ([df11e07](https://github.com/Kavalieri/Cuentas_SiKNess/commit/df11e07c8b3c6617331a0e22b0ce2642fc2bbe26))
* **categoryColors:** añadir non-null assertion a getLegacyColor ([e45cf0a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e45cf0ab38f48a8d35cf179004b0bc870ad21776))
* **charts:** aplicar paletas consistentes en Pareto ([2eb6af0](https://github.com/Kavalieri/Cuentas_SiKNess/commit/2eb6af05b5e8f5385d6d786185a24128be5bd3a2)), closes [#48](https://github.com/Kavalieri/Cuentas_SiKNess/issues/48)
* **charts:** aplicar paletas consistentes en Sunburst ([fc0f4c2](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fc0f4c264ed667dc6bb7db619238b779da2a19d8)), closes [#48](https://github.com/Kavalieri/Cuentas_SiKNess/issues/48)
* **charts:** aplicar paletas consistentes en TreeMap ([647fd88](https://github.com/Kavalieri/Cuentas_SiKNess/commit/647fd888a61f3b2d5e84fcf8629ce12732411885)), closes [#48](https://github.com/Kavalieri/Cuentas_SiKNess/issues/48)
* **charts:** corregir herencia de colores y modo oscuro ([5ee284b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5ee284b4285236f9be97ba9b323a134945c9d92d))
* **charts:** eliminar debug logs y arreglar color del nodo root en TreeMap ([59ca36b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/59ca36b26e2c69afaa4c7ecb0cc773283cf68def))
* **charts:** normalizar keys de paletas de colores para matchear con lookup ([b252036](https://github.com/Kavalieri/Cuentas_SiKNess/commit/b252036189573195c66c887871f419387cf7d8be)), closes [#48](https://github.com/Kavalieri/Cuentas_SiKNess/issues/48)
* **charts:** resolver warnings de React por keys duplicadas ([1a8b2de](https://github.com/Kavalieri/Cuentas_SiKNess/commit/1a8b2ded6d17822c0d705806c042e1aee5e01fd2)), closes [#48](https://github.com/Kavalieri/Cuentas_SiKNess/issues/48)
* **contributions:** corregir cálculo en periodos cerrados ([d8e0480](https://github.com/Kavalieri/Cuentas_SiKNess/commit/d8e048061ee6e60936553d9ca73fb2092f37c2d1))
* **database:** corregir queries para schema de categorías ([bc6d827](https://github.com/Kavalieri/Cuentas_SiKNess/commit/bc6d82747dc37309c5e63a95a8f42f7f40bcbb39))
* **db:** baseline v3.0.0 funcional - corregir refresh MVs vacías ([ff1b9db](https://github.com/Kavalieri/Cuentas_SiKNess/commit/ff1b9dbd4353dd82810aa8d5a1d1956d579d7a47))
* **db:** eliminar referencias a performed_by_email deprecado en unified.ts ([b5b5cc7](https://github.com/Kavalieri/Cuentas_SiKNess/commit/b5b5cc7b702b507cc0ee0cf1daf8a4a17b4a4b1e))
* disable prefetch on configuración links to prevent production logout ([1fe746f](https://github.com/Kavalieri/Cuentas_SiKNess/commit/1fe746fb623bfcadc089c0705cda8a633f017edc))
* **docs:** corregir versión baseline de v1.0.0 a v2.1.0 ([cd3790b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/cd3790b0dd7a8d0b85dc1af756ddf0a3a65e5dd0))
* **estadisticas:** corregir 3 bugs críticos en gráficos ([944dc6a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/944dc6a919af47c009e0601f838ad8b235e4a68f))
* **estadisticas:** corregir API trend para leer snapshots de periodos cerrados ([452e8b2](https://github.com/Kavalieri/Cuentas_SiKNess/commit/452e8b211fe96d577ba1e513311a87055f8ca01c))
* **estadisticas:** corregir cálculos y visualización de los 3 gráficos ([44e242c](https://github.com/Kavalieri/Cuentas_SiKNess/commit/44e242cb71c42500b99a7da4b27364419d1f932d))
* **estadisticas:** corregir filtros temporales y tipos en gráficos ([fee8391](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fee83911c4288b47377be0fec0f642e82e887fc7))
* **estadisticas:** corregir jerarquía de 3 niveles en CategoryTreemap ([3a8a40e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/3a8a40e0db15cac925676e11be40c80b85856c16))
* **estadisticas:** corregir paleta de colores y reorganizar TreeMaps ([3b87328](https://github.com/Kavalieri/Cuentas_SiKNess/commit/3b87328d4b927b2157f8809842a55097af0b3909))
* **estadisticas:** corregir problemas críticos de visualización ([2e99177](https://github.com/Kavalieri/Cuentas_SiKNess/commit/2e99177bedf78373d4a596e3e904f09b60a04817))
* **estadisticas:** eliminar placeholder obsoleto /statistics/ ([dadd1e4](https://github.com/Kavalieri/Cuentas_SiKNess/commit/dadd1e4cc6b5cfb76c7cb980db124045a5579b9b))
* **estadisticas:** incluir todos los tipos de transacciones en gráfico de tendencia ([5ddaba3](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5ddaba3072cf5e833cf84f2497dd5f34e352b345))
* **estadisticas:** prevent treemaps from overlapping next sections ([9166c1c](https://github.com/Kavalieri/Cuentas_SiKNess/commit/9166c1cbe95ccc06c5a41d8acf48ad5eab1f89ef))
* **estadisticas:** remove AdvancedQueries component and add CTA to analytics ([bfd5411](https://github.com/Kavalieri/Cuentas_SiKNess/commit/bfd5411df7133d7bb63304b67e0f829e009f0777))
* **estadisticas:** Sunburst - eliminar cálculo manual de valores ([08494ff](https://github.com/Kavalieri/Cuentas_SiKNess/commit/08494ff6fd2027b37e14194ed3d33e582c07bf08))
* **filters:** corregir filtros y añadir jerarquía completa de categorías (Issue [#36](https://github.com/Kavalieri/Cuentas_SiKNess/issues/36)) ([b21886d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/b21886daf5e0d9139a403a9a1e4b305757036025))
* **forms:** eliminar opción de ingreso directo del formulario (son automáticos) ([49d1247](https://github.com/Kavalieri/Cuentas_SiKNess/commit/49d12476c97f363992bb00e1ee14b8f3a6e2e7de))
* **forms:** eliminar validación incorrecta de subcategoría obligatoria (Issue [#38](https://github.com/Kavalieri/Cuentas_SiKNess/issues/38)) ([a381d4b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/a381d4b51f0658b45ccf2e82cbcc5f277aed8f21))
* guardar correctamente subcategory_id y eliminar campo fecha duplicado (Issue [#35](https://github.com/Kavalieri/Cuentas_SiKNess/issues/35)) ([d826a68](https://github.com/Kavalieri/Cuentas_SiKNess/commit/d826a6848d96aed32677fc8d987fd16a745e1b28))
* **lib:** remove 'use server' from jointAccount.ts to allow const export ([dcfd33d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/dcfd33dd5013b428c7d3fc0d7185455f137ae08b))
* **lint:** arreglar errores de variables no usadas ([fbc8715](https://github.com/Kavalieri/Cuentas_SiKNess/commit/fbc87156d11b55715e97187592d4723654a9e176))
* **lint:** eliminar variables no usadas (watch, jointAccountId) ([f9831d4](https://github.com/Kavalieri/Cuentas_SiKNess/commit/f9831d4ffeb53cc9f41c6c36f46cd06c6e7d4d19))
* **lint:** resolver warnings de React Hooks exhaustive-deps ([3a3e787](https://github.com/Kavalieri/Cuentas_SiKNess/commit/3a3e78716b3c0a773c21be1e0102a783297ea3c8))
* **loans:** corregir obtención del usuario actual usando getCurrentUser() ([3ac9847](https://github.com/Kavalieri/Cuentas_SiKNess/commit/3ac9847f2372de3c08784d48297392e4bcf9ba0c))
* **middleware:** incluir /sickness en rutas protegidas que requieren auth ([04163b7](https://github.com/Kavalieri/Cuentas_SiKNess/commit/04163b7521dea3b2f47ad43766657005bf792931))
* **middleware:** permitir acceso a subrutas de /sickness sin redirección forzada ([6f8f491](https://github.com/Kavalieri/Cuentas_SiKNess/commit/6f8f4919922d2d497980955c38990e70b3ad695b))
* **scripts:** corregir rutas en build-and-deploy.sh y archivar baseline temporal (Issue [#53](https://github.com/Kavalieri/Cuentas_SiKNess/issues/53)) ([e750d6d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e750d6d3926bf736a2a15b326b66ef7a5766edac))
* **security:** actualizar dependencias críticas (npm audit fix) ([45832dc](https://github.com/Kavalieri/Cuentas_SiKNess/commit/45832dcb7ad9fea207e53e99ce1c396c390b2675))
* **security:** actualizar vitest y esbuild (0 vulnerabilidades) ([d15564d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/d15564d04eded090734e87602998391a8c19328d))
* separar builds DEV (.next-dev) y PROD (.next) ([e529d4e](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e529d4e7945ce5ae287886989354c445da85d3e2))
* **sickness:** corregir desplazamiento de fechas por zona horaria UTC ([d0dc38a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/d0dc38a7eacccfc675d559ef4d9576ceff9d6858))
* **sickness:** corregir fecha en gastos directos encadenados y actualización de perfil OAuth ([830fcd5](https://github.com/Kavalieri/Cuentas_SiKNess/commit/830fcd56f56ec32423ba4ab2d1408812068890aa))
* **transactions:** corregir cambio de día al guardar transacciones con hora ([6e41555](https://github.com/Kavalieri/Cuentas_SiKNess/commit/6e41555677540941def6661d6297fea5feacae01))
* **transactions:** corregir conversión de zona horaria en creación de movimientos ([1272e24](https://github.com/Kavalieri/Cuentas_SiKNess/commit/1272e2404d4be219a7e8090a2085ead07120af9b))
* **transactions:** eliminar validación legacy de paid_by en ingresos comunes ([1d8d2ea](https://github.com/Kavalieri/Cuentas_SiKNess/commit/1d8d2ea0449e1f4460c3091939e6d596a02ca366))
* **treemap:** mostrar solo nombre en etiquetas, no path completo ([ac8cab5](https://github.com/Kavalieri/Cuentas_SiKNess/commit/ac8cab5ee16abb56cd068d5886514dde8943a806))
* **ui:** añadir símbolo € en campos de cantidad y corregir actualización de categoría ([12c2154](https://github.com/Kavalieri/Cuentas_SiKNess/commit/12c215420c9857c7124a43247a39da8e85417fb0))
* **ui:** corregir visualización de jerarquía en TransactionCard ([f1ddd8b](https://github.com/Kavalieri/Cuentas_SiKNess/commit/f1ddd8b0544b6ce5b84928aceae22368d05184e5)), closes [#17](https://github.com/Kavalieri/Cuentas_SiKNess/issues/17)
* **ui:** estandarizar orden de campos en todos los formularios (Issue [#35](https://github.com/Kavalieri/Cuentas_SiKNess/issues/35)) ([d7da5d8](https://github.com/Kavalieri/Cuentas_SiKNess/commit/d7da5d868507cf26c88c25c3050a0377c5e07fc2))
* **ui:** mejorar labels de origen de fondos en TransactionCard ([b2e0213](https://github.com/Kavalieri/Cuentas_SiKNess/commit/b2e0213a250f2e5daf79a622ad497cd56afa07d0)), closes [#17](https://github.com/Kavalieri/Cuentas_SiKNess/issues/17)
* **ui:** rediseño completo de TransactionCard con UX mejorada ([15350d6](https://github.com/Kavalieri/Cuentas_SiKNess/commit/15350d6cbc3890d62ea1a6aac180ad371529f91b)), closes [#17](https://github.com/Kavalieri/Cuentas_SiKNess/issues/17)
* **ui:** unificar orden de campos en TODOS los formularios ([885f8da](https://github.com/Kavalieri/Cuentas_SiKNess/commit/885f8da154dd0c65fc7bc5b9441432bc7cd7707f))
* **ui:** usar componentes shadcn/ui en diálogos de edición ([5d1d2a0](https://github.com/Kavalieri/Cuentas_SiKNess/commit/5d1d2a0c1d91ec58caa0e64e1bb2560c91608566))
* **ui:** usar performed_by_profile_id en EditDirectExpenseButton ([16b3dfe](https://github.com/Kavalieri/Cuentas_SiKNess/commit/16b3dfe9f553ddcb9ed7d5efd98d030acd1298f0))
* unificar campo performed_by en todos los formularios (Issue [#30](https://github.com/Kavalieri/Cuentas_SiKNess/issues/30), [#29](https://github.com/Kavalieri/Cuentas_SiKNess/issues/29), [#35](https://github.com/Kavalieri/Cuentas_SiKNess/issues/35)) ([8757a68](https://github.com/Kavalieri/Cuentas_SiKNess/commit/8757a6887369aeda94e1254f8c8190c9edf432c6))


### Performance Improvements

* **balance:** eliminar recargas repetidas de jerarquía en diálogos de edición (Issue [#22](https://github.com/Kavalieri/Cuentas_SiKNess/issues/22)) ([e9fa09a](https://github.com/Kavalieri/Cuentas_SiKNess/commit/e9fa09a82510ab2b9aad361e480b741af4df38b4))


### Reverts

* Rollback Fase 1.5 (Issue [#63](https://github.com/Kavalieri/Cuentas_SiKNess/issues/63)) ([a5f28e8](https://github.com/Kavalieri/Cuentas_SiKNess/commit/a5f28e8dcf2e96875c2229a920508ee629bde0fe))


### Code Refactoring

* **docs:** archivar docs/TO-DO/ y migrar a GitHub Issues ([940f24d](https://github.com/Kavalieri/Cuentas_SiKNess/commit/940f24d0d88492a85a85fd465eef4860d9580205))

## [2.0.0](https://github.com/Kavalieri/CuentasSiK/compare/cuentas-sik-v1.0.0...cuentas-sik-v2.0.0) (2025-10-29)


### ⚠ BREAKING CHANGES

* README structure completely redesigned
* **audit:** createHousehold ahora usa create_household_with_owner en lugar de create_household_with_member

### Features

* **audit:** sistema completo de auditoría y atomicidad ([911572f](https://github.com/Kavalieri/CuentasSiK/commit/911572f022268e96a882c14f1616373f4079393e))
* **auth:** admin user redirect to dual-flow environment ([5d48571](https://github.com/Kavalieri/CuentasSiK/commit/5d485712740005b88d1700047e198784534441dd))
* **auth:** implement invitation acceptance and multi-email auth ([d12642b](https://github.com/Kavalieri/CuentasSiK/commit/d12642b6830b48c11700f44b483aa45edbacfcec))
* **auth:** implement UI permission restrictions for secondary email logins ([61a18ff](https://github.com/Kavalieri/CuentasSiK/commit/61a18ff17922f180bb6e220af1541e5342522732))
* **auth:** implementar autenticación completa con Google OAuth 2.0 ([ebf8339](https://github.com/Kavalieri/CuentasSiK/commit/ebf8339ff96cb700f6e9968616652040d2895df2))
* **balance,estadisticas:** recuperar paginación e incluir ingresos directos ([80e152e](https://github.com/Kavalieri/CuentasSiK/commit/80e152e91e0e242c3ee25b171cfba010aa0a531a))
* **balance:** add contribution calculation visibility and period state guidance ([5df55bd](https://github.com/Kavalieri/CuentasSiK/commit/5df55bd8de0d7572ea8d3ec3898e479aae433c06))
* **balance:** decouple balance page from period filtering ([d18b7ad](https://github.com/Kavalieri/CuentasSiK/commit/d18b7ada46ec804bb13b6f7b68719abaa5191341))
* **balance:** mantener formulario abierto tras crear movimiento para flujo rápido ([2b4cb90](https://github.com/Kavalieri/CuentasSiK/commit/2b4cb9064aa055821a0ae23a79576d0ee36ab78a))
* **balance:** recuperar botón "Nuevo movimiento" y arreglar edición de transacciones comunes ([bf4269d](https://github.com/Kavalieri/CuentasSiK/commit/bf4269d7471f4c61105f79779b3638f7b31e6a83))
* **balance:** refactor filters to collapsible component ([6a0c36a](https://github.com/Kavalieri/CuentasSiK/commit/6a0c36a82e4979b61a964e050d2cf47a3d94c435))
* **credito-deuda:** activate get_member_balance_status_v2 after migration applied ([4a5dee9](https://github.com/Kavalieri/CuentasSiK/commit/4a5dee9992d06b1ae29cc7f897fde7954f44059a))
* **credito-deuda:** añadir server actions para gestión de crédito/deuda ([cf3bf9e](https://github.com/Kavalieri/CuentasSiK/commit/cf3bf9ef6beb8e3af946f3f7d0e45cbe03c8dd2b))
* **database:** add audit fields to transactions table ([9e4333b](https://github.com/Kavalieri/CuentasSiK/commit/9e4333b9698f9e07996df019ae2e48b4207ed4c5))
* **database:** promote complete dual-flow system migrations to tested ([b43c70b](https://github.com/Kavalieri/CuentasSiK/commit/b43c70b0d47457cf73cf7ab894fc8fbac7ae476f))
* **dev:** complete testing environment setup ([19b0b6c](https://github.com/Kavalieri/CuentasSiK/commit/19b0b6c1095e85beae8eb5a8b4dca56fd4c4d4d0))
* **docs:** add production deployment checklist and remove hardcoded admin email ([28ab4f1](https://github.com/Kavalieri/CuentasSiK/commit/28ab4f15e2e9d718b6b0338ae2b0f2c1b8932541))
* **dual-flow:** add complete household selector and management ([4526d0c](https://github.com/Kavalieri/CuentasSiK/commit/4526d0cdf3c89e0e20de6f8f5be9058b43b35a03))
* **estadisticas:** añadir opción "Todos los períodos" para consultas basadas en períodos ([a391151](https://github.com/Kavalieri/CuentasSiK/commit/a3911510b1b19955db1d8ba78b6131cc0320ba7d))
* **estadisticas:** crear página de estadísticas con estructura base sin datos reales ([8d31d7a](https://github.com/Kavalieri/CuentasSiK/commit/8d31d7a7c980e3ce0c172fdad39b187cb5c94b3a))
* **estadisticas:** Implementar gráficos con datos reales desde PostgreSQL ([fffe0cd](https://github.com/Kavalieri/CuentasSiK/commit/fffe0cde6cef6c5e9f5a51ed1005a3b78ca7ccf9))
* **estadisticas:** mejorar tarjeta presupuesto diario con balance efectivo y grid 3 columnas ([17de28c](https://github.com/Kavalieri/CuentasSiK/commit/17de28c6f443d1b542ac5032d65a6a39798d252d))
* **estadisticas:** mejorar visualización de gráficos circulares con porcentajes en etiquetas y leyenda ([9f72b3c](https://github.com/Kavalieri/CuentasSiK/commit/9f72b3c5fe1601c310b388f110d0c433c98a9e8a))
* **estadisticas:** redistribuir tarjetas para mejor simetría y aprovechamiento del espacio ([8e6f618](https://github.com/Kavalieri/CuentasSiK/commit/8e6f6189ce58a9ce02df68e701f4145345d58770))
* **estadisticas:** reorganizar layout para mejor simetría visual ([370790e](https://github.com/Kavalieri/CuentasSiK/commit/370790ee34ba35b36d36ab809af47aa0b33b1724))
* **format:** añadir helper toNumber() para valores numeric de PostgreSQL ([669447e](https://github.com/Kavalieri/CuentasSiK/commit/669447e42396801dca3b5763237900458cb3364e))
* **hogar:** implementar CRUD completo de gestión de miembros ([5f50751](https://github.com/Kavalieri/CuentasSiK/commit/5f50751bbb73d59c3f5f52ab95abbd82cd7092a7))
* **invitations:** integrate invitation flow with OAuth and Magic Link ([c203b58](https://github.com/Kavalieri/CuentasSiK/commit/c203b58fb48101885900aa7e9ce6735d983ad616))
* **perfil:** implementar funcionalidad de eliminación de cuenta ([dd3e00e](https://github.com/Kavalieri/CuentasSiK/commit/dd3e00e0a6249a5d54caa43fa15d6c411ccccd69))
* **periodo:** crear componente PhaseCard visual para workflow de períodos ([9ba19cb](https://github.com/Kavalieri/CuentasSiK/commit/9ba19cbdcf510a39bb01fa668822b1537576d1b4))
* **periodo:** integrar PhaseCard en gestión de periodo ([cbaf44a](https://github.com/Kavalieri/CuentasSiK/commit/cbaf44a57127e71d53c4ad799e4ba0307cd43da4))
* **periods:** añadir gestión de períodos y selector con confirmación ([7e2e5d8](https://github.com/Kavalieri/CuentasSiK/commit/7e2e5d8af044f3fb37cbcdb289fde73f26d8da50))
* **periods:** añadir opción ignorar contribuciones en fase preparing ([befe4d1](https://github.com/Kavalieri/CuentasSiK/commit/befe4d1c7d27d05ea18e55212997327e3d736e06))
* **periods:** enforce phase-based transaction blocking across all creation paths ([080a8ae](https://github.com/Kavalieri/CuentasSiK/commit/080a8ae5c7cc02d9f66ceba48109d37a5ea3b9f5))
* **periods:** implement complete contribution periods management UI ([58aee4e](https://github.com/Kavalieri/CuentasSiK/commit/58aee4e11d8fd7c8b61db3de604fdcb8fe23b5bf))
* **periods:** revertir fase de periodo (owner-only) + refresco global tras transiciones ([250bd88](https://github.com/Kavalieri/CuentasSiK/commit/250bd88cf274f14cb4986118caa15dcb8ba059f9))
* **pm2:** add comprehensive VSCode tasks for dev/prod management ([deb6c4c](https://github.com/Kavalieri/CuentasSiK/commit/deb6c4cddc23882964f77251e03bbf4a8c92bddc))
* **pm2:** implement automatic log archiving on process restart ([7899400](https://github.com/Kavalieri/CuentasSiK/commit/78994002d1ed37cb827e6c15678a7eb388459ff2))
* **profile:** add server actions for multi-email management ([7e3c605](https://github.com/Kavalieri/CuentasSiK/commit/7e3c6054051a42582f1b88fde365634db0286ff8))
* **profile:** add UI for multi-email management ([7c7c1a8](https://github.com/Kavalieri/CuentasSiK/commit/7c7c1a89157a2349ebf19b36a945d3f41fe6f4f9))
* **refunds:** implement active and declared refund system with balance integration ([a96e4dc](https://github.com/Kavalieri/CuentasSiK/commit/a96e4dc469a2530e70e52681054c8acd421aea64))
* **settings:** implement complete invitation management system ([a66d69e](https://github.com/Kavalieri/CuentasSiK/commit/a66d69ebe693a11dc75338b747a32d8540630497))
* **sickness/balance:** implement complete transaction filtering and pagination system ([4b5542e](https://github.com/Kavalieri/CuentasSiK/commit/4b5542ee33015ecae6c3a87067256cf0fd9f4567))
* **sickness:** add advanced analytics query system to statistics page ([9cbc2d1](https://github.com/Kavalieri/CuentasSiK/commit/9cbc2d19f8e63c44a912ee89777858d7146a6280))
* **sickness:** completar Fase 2 - integración completa de contexto con APIs ([d534e19](https://github.com/Kavalieri/CuentasSiK/commit/d534e19676a2bddac09da834cab207e7eb49ccce))
* **sickness:** Fase 1 - Shell Global SiKNess completo ([be03e14](https://github.com/Kavalieri/CuentasSiK/commit/be03e14b3039772133944973ed5638c61479bd1d))
* **sickness:** implementar CRUD categorías UI completo ([f0e902f](https://github.com/Kavalieri/CuentasSiK/commit/f0e902f7b978a52086531d60fa768dce32903fc8))
* **sickness:** implementar CRUD completo de perfil de usuario ([f59e6d6](https://github.com/Kavalieri/CuentasSiK/commit/f59e6d6014fc2c51de1f81679de6e03ce16f8557))
* **sickness:** implementar dashboard completo con balance prominente ([0157a0b](https://github.com/Kavalieri/CuentasSiK/commit/0157a0b654ff17153c3673b16ad847546fdf8a34))
* **sickness:** implementar server actions CRUD de categorías ([4082769](https://github.com/Kavalieri/CuentasSiK/commit/40827693027dffbcf87868d18906f6d99d5d86be))
* **sickness:** improve balance and statistics UX ([d991002](https://github.com/Kavalieri/CuentasSiK/commit/d991002caa96afadad61d307daf157b71e4994f0))
* **sickness:** mejorar claridad visual de indicadores de fase en selector de periodo ([6219347](https://github.com/Kavalieri/CuentasSiK/commit/6219347c3a3d73a9dfd65f2e0bf75a095dbe3c1a))
* **sickness:** mejorar selector de emojis en CRUD categorías ([4550faa](https://github.com/Kavalieri/CuentasSiK/commit/4550faabe9d86bf9d8075d6ee2618079bace5f48))
* **sickness:** mejorar selectores globales con feedback visual y creación de hogares ([d743f1f](https://github.com/Kavalieri/CuentasSiK/commit/d743f1f51ce28dd033dea4ff47703ac2fe88118d))
* **transactions:** implement unified transaction flow system ([1c9569c](https://github.com/Kavalieri/CuentasSiK/commit/1c9569cb93d9e3a9344f13506adefb0e4def57d3))
* **ui:** añadir página de Estadísticas al menú lateral ([300b0bc](https://github.com/Kavalieri/CuentasSiK/commit/300b0bc92ae5bcf68da6f017c44556ddb9decc07))
* **ui:** implementar visualización de performed_at y overpaid en UI ([7489e8e](https://github.com/Kavalieri/CuentasSiK/commit/7489e8ec26f898867fb17edbcca6e436336782e2))


### Bug Fixes

* **api:** devolver phase consistente en set-active ([6ac3b56](https://github.com/Kavalieri/CuentasSiK/commit/6ac3b56274e2a49b72d79dbc97cbc7114b7b2536))
* **api:** normalizar phase en household set-active ([8430f54](https://github.com/Kavalieri/CuentasSiK/commit/8430f54a9a967a3ccf88198da95bc3750d1780ca))
* **auth:** agregar atributo domain a cookies de sesión para persistencia ([f47e2e1](https://github.com/Kavalieri/CuentasSiK/commit/f47e2e1bd1a6297a986e32708a67b50823810572))
* **auth:** exclude deleted profiles from duplicate email validation ([fa5383c](https://github.com/Kavalieri/CuentasSiK/commit/fa5383cc643a882c1909e3d05fbfd59b9920c236))
* **auth:** optimize OAuth Google flow and eliminate profile_emails dependencies ([ef67184](https://github.com/Kavalieri/CuentasSiK/commit/ef671840dbf7db3ba9400499db66f1b27829a082))
* **auth:** refactor getUserHouseholdId with query() and soft-delete checks ([607424e](https://github.com/Kavalieri/CuentasSiK/commit/607424e539f431fc09d4ce4a0face05fd802db19))
* **balance,estadisticas:** restaurar paginación completa y corregir gastos en gráficos ([516e94f](https://github.com/Kavalieri/CuentasSiK/commit/516e94f00aac3036fd2c7a3d9ab0bba5a343fb9a))
* **balance:** calcular ingresos/gastos por año/mes (occurred_at) en period-summary ([6a13d27](https://github.com/Kavalieri/CuentasSiK/commit/6a13d27a7150a9b28e1f1f33c64b7a1a4f678580))
* **balance:** correct phase check and remove duplicate periods ([02e64ce](https://github.com/Kavalieri/CuentasSiK/commit/02e64ce1cb1c03490724f23802fa283c9dcad045))
* **balance:** corregir edición de gastos directos no funcionaba ([a4e394e](https://github.com/Kavalieri/CuentasSiK/commit/a4e394e8822d0e7f88f45dfbe55053cdd55ff53c))
* **balance:** cumplir reglas de hooks moviendo useMemo/useEffect antes del early return y evitar crash sin periodo activo ([4a2939e](https://github.com/Kavalieri/CuentasSiK/commit/4a2939ee1cee04693301a5a9a0439a403112b1e7))
* **balance:** recalculate period_id when editing direct expense dates ([8e6bf35](https://github.com/Kavalieri/CuentasSiK/commit/8e6bf3556d0d2f37962c7802e81c8868fa41b0d8))
* **balance:** restaurar versión estable de página balance y limpiar código ([c3b97c9](https://github.com/Kavalieri/CuentasSiK/commit/c3b97c9300ae55d8eeda815d7106e3906cce206c))
* **categorias:** corregir uso de user.id → user.profile_id en CRUD ([75bc7dc](https://github.com/Kavalieri/CuentasSiK/commit/75bc7dcd4afc266fb7e705e7e42c606c16c848db))
* **consultas:** corregir campos vacíos y usar miembro que realizó el gasto ([7a323bd](https://github.com/Kavalieri/CuentasSiK/commit/7a323bde27f31c1ffd808d926be3ed3bd9cfdd8b))
* **contributions:** mostrar display_name en lugar de email en resumen de contribuciones ([912ba05](https://github.com/Kavalieri/CuentasSiK/commit/912ba054e32f263d11d97a840ad7cc89f8c48544))
* correct monthly_periods INSERT to use phase='preparing' and status='open' ([4028013](https://github.com/Kavalieri/CuentasSiK/commit/40280134209b1ef6524e06343d2f44709985351c))
* **credito-deuda:** implement proper error handling and UX feedback for refund and loan forms ([a5ed623](https://github.com/Kavalieri/CuentasSiK/commit/a5ed623964075b3197f04c999feeaacc051e260c))
* **credito-deuda:** use consistent balance calculation and add refund types system ([4ddf721](https://github.com/Kavalieri/CuentasSiK/commit/4ddf72148e39d06a5d8272b589532a53a5e3a57e))
* **docs:** corregir propuesta de gestión períodos - mantener lógica existente ([46d86b7](https://github.com/Kavalieri/CuentasSiK/commit/46d86b71dec4f59d9aae7f20a80f982518fdcdf0))
* **estadisticas:** add null safety for periods array in build ([3133118](https://github.com/Kavalieri/CuentasSiK/commit/3133118714d7532f9a29876d127597c0eb5a0494))
* **estadisticas:** convert all remaining queries from snapshots to live transaction data ([f052074](https://github.com/Kavalieri/CuentasSiK/commit/f0520743538bf2ccb23e788fed108e1d5b890b5a))
* **estadisticas:** corregir cálculo de gasto diario usando balance efectivo dinámico ([5d07cec](https://github.com/Kavalieri/CuentasSiK/commit/5d07cecde4a2a711173f173c6d9bf5fec45182fc))
* **estadisticas:** corregir cálculo de gasto medio y reestructurar UI ([675930b](https://github.com/Kavalieri/CuentasSiK/commit/675930b7be24db7fda294c178b2ce972c54448ce))
* **estadisticas:** corregir layout a 2 columnas con gráfico categorías expandido ([f759569](https://github.com/Kavalieri/CuentasSiK/commit/f759569df91d9d9a950b3019d28a31bdd719c98f))
* **estadisticas:** fix server action error and completely redesign UX ([8e65725](https://github.com/Kavalieri/CuentasSiK/commit/8e657259bed5dc4236769cc25fed209a34512606))
* **estadisticas:** include expense_direct in category and income/expense charts ([c1b9dfe](https://github.com/Kavalieri/CuentasSiK/commit/c1b9dfeed201c88a002d76e2084b26b0c7d31338))
* **estadisticas:** mostrar presupuesto diario también en fase open (fase 3) ([53bdb3f](https://github.com/Kavalieri/CuentasSiK/commit/53bdb3f476f296cd7295d2bde811b8fe1bc5e1b4))
* **estadisticas:** resolve build errors and QUERY_CATALOG runtime issue ([bb54432](https://github.com/Kavalieri/CuentasSiK/commit/bb54432e35b1bdf098e9374f6aeafee5d56c1253))
* **estadisticas:** usar nombres correctos de fases (preparing/validation/active) ([90cbf92](https://github.com/Kavalieri/CuentasSiK/commit/90cbf92d4c76573f81fdc80a5c3e8ca8a0038674))
* **estadisticas:** use display_name instead of email and add currency formatting ([99a0c79](https://github.com/Kavalieri/CuentasSiK/commit/99a0c7967a5f12395a423c5354fe56fa465f176e))
* excluir .archive de compilación y arreglar conversión de ingresos ([0834ef3](https://github.com/Kavalieri/CuentasSiK/commit/0834ef3b78e212e18de59bf3a2eddfcb9e5be869))
* excluir también archive/ de compilación y lint ([b132192](https://github.com/Kavalieri/CuentasSiK/commit/b1321924baa625e3e91924560117a1d69cfed499))
* **hogar:** mostrar display_name real en lugar de alias generado ([0876b25](https://github.com/Kavalieri/CuentasSiK/commit/0876b25b9568efa4a0552d7002b1e60d1b1c3643))
* **household:** replace direct supabase queries with server actions ([777233e](https://github.com/Kavalieri/CuentasSiK/commit/777233e96c94e980be92b780a558a247537dcc82))
* **invitations:** await params and use detectOrigin for redirects ([0134e94](https://github.com/Kavalieri/CuentasSiK/commit/0134e947a22d804fe00c428022f8ff8b31efd94b))
* **invitations:** correct validation logic and field usage in accept-email-invitation ([ad006e3](https://github.com/Kavalieri/CuentasSiK/commit/ad006e3a70ca8103503dbf855210e9b79fb8ae28))
* **invitations:** use correct origin for email invitation URLs ([4e837ea](https://github.com/Kavalieri/CuentasSiK/commit/4e837ea9db7bdcbc1c5f89f6c4adab1d43cc2a09))
* **lint:** marcar globalBalance como variable no usada ([0ae0899](https://github.com/Kavalieri/CuentasSiK/commit/0ae08996d0c5bdc9d346eeac87b7779551d1e439))
* **perfil:** añade ORDER BY created_at DESC para ingreso más reciente ([8c0b43c](https://github.com/Kavalieri/CuentasSiK/commit/8c0b43cbbef23c3040a4f88ec1c60fbd3557bfc1))
* **perfil:** corregir uso de user.id → user.profile_id en todas las queries ([6527c8a](https://github.com/Kavalieri/CuentasSiK/commit/6527c8abb2f70a546f192cc9ef3e8bacbdad4541))
* **perfil:** sincroniza input de ingreso tras actualización ([dd31269](https://github.com/Kavalieri/CuentasSiK/commit/dd31269685f083b6eb2c2abf312758a523b8de79))
* **periodo:** corregir eliminación de períodos desde selector global ([c79bba7](https://github.com/Kavalieri/CuentasSiK/commit/c79bba77f25e5de46ad475f7480f00e29d08d821))
* **periods:** arreglar bugs críticos lockPeriod y phase normalization ([c6841fc](https://github.com/Kavalieri/CuentasSiK/commit/c6841fc8590a2a53135321a551e2bc268b2ad005))
* **periods:** integrar creación de períodos en selector global ([47c33ef](https://github.com/Kavalieri/CuentasSiK/commit/47c33ef7d9d27442b67eb8fa1df81c41077f0706))
* resolve all ESLint errors for clean CI build ([2983002](https://github.com/Kavalieri/CuentasSiK/commit/298300298f087a20a783cfea1f2256ad6380cc5f))
* resolve lint errors and promote migrations to applied ([29d6f3b](https://github.com/Kavalieri/CuentasSiK/commit/29d6f3b413666d575e5b3e00220319ad532074c4))
* **sickness:** añadir gastos directos en balance general de hogar ([bb8ce8c](https://github.com/Kavalieri/CuentasSiK/commit/bb8ce8c31a28e8fc1700e13cb26e8c111ef3da93))
* **sickness:** corregir hydration error en theme toggle y mensaje de error en perfil ([7057671](https://github.com/Kavalieri/CuentasSiK/commit/705767161e3a710ca951e1afee9ec6828ecbead8))
* **sickness:** corregir validación de fases y limpiar errores de tipos ([545d6f2](https://github.com/Kavalieri/CuentasSiK/commit/545d6f279b34ff318103e8f6ec070f4b6dad225d))
* **sickness:** corregir visibilidad de texto en período activo seleccionado ([9f01993](https://github.com/Kavalieri/CuentasSiK/commit/9f0199359618ce66ab2896879c99b6e5c0df054b))
* **sickness:** eliminar selectores duplicados en topbar ([fecdecb](https://github.com/Kavalieri/CuentasSiK/commit/fecdecbd8165df3d7e9c2af9ec449e424a221bb6))
* **sickness:** improve period selector UX after deletion ([3878da1](https://github.com/Kavalieri/CuentasSiK/commit/3878da1c68470852ff5b12cae7163e85815a9bd3))
* **sickness:** seleccionar periodo actual por defecto ([c0b7690](https://github.com/Kavalieri/CuentasSiK/commit/c0b7690604558967313a0fcb3d96e781d5457a96))
* **sickness:** usar campo `phase` en vez de `status` para detección de workflow ([cb8cfa5](https://github.com/Kavalieri/CuentasSiK/commit/cb8cfa5cf4864dd96343a85f1900e55d407ea2f6))
* **transaction:** estandarizar descripciones y validación de fases ([13c86c7](https://github.com/Kavalieri/CuentasSiK/commit/13c86c781d1bfe611b891897e8dcec9432e0d504))
* **transactions:** corregir 3 problemas críticos del sistema ([044bab2](https://github.com/Kavalieri/CuentasSiK/commit/044bab284015feffefb141ce90052ef1db2c9b92))
* **transactions:** corregir atribución de miembros y mostrar nombres en lugar de emails ([6f7e72f](https://github.com/Kavalieri/CuentasSiK/commit/6f7e72fbdd5f0e8960b3b4f4f1962326e72ada92))
* **types:** resolve typescript errors in periods.ts ([6a0fc6f](https://github.com/Kavalieri/CuentasSiK/commit/6a0fc6f79546f729a028281d1d6bad03edac86c6))
* **ui:** mejorar contraste en botones de periodo seleccionados ([1aca109](https://github.com/Kavalieri/CuentasSiK/commit/1aca109fd2845cdccc87e253522a323543833a14))
* **ui:** mejorar visibilidad de texto en selector de periodos y feedback de formulario ([ab678cb](https://github.com/Kavalieri/CuentasSiK/commit/ab678cbf61200f331f5e72f8b5b924ecbce2ea42))


### Documentation

* rewrite README for public release and enhance .gitignore ([c25d752](https://github.com/Kavalieri/CuentasSiK/commit/c25d75212cda823150355a3594474d5c96efe6ce))

## [1.0.0](https://github.com/Kavalieri/CuentasSiK/compare/cuentas-sik-v0.3.0-alpha...cuentas-sik-v1.0.0) (2025-10-11)


### ⚠ BREAKING CHANGES

* Migración completa de infraestructura requiere reconfiguración de entorno

### Features

* Migración completa de Supabase+Vercel a stack Ubuntu nativo ([f77e1b3](https://github.com/Kavalieri/CuentasSiK/commit/f77e1b34ed3abf41617cf9be8bee0eb78b55e565))

## [0.3.0-alpha](https://github.com/Kavalieri/CuentasSiK/compare/cuentas-sik-v0.2.0-alpha...cuentas-sik-v0.3.0-alpha) (2025-10-08)


### ⚠ BREAKING CHANGES

* member_credits tiene nuevas columnas obligatorias (auto_apply, monthly_decision)

### Features

* add updated_at tracking + fix categories empty + auto-refresh dashboard ([ffe7ef3](https://github.com/Kavalieri/CuentasSiK/commit/ffe7ef3e1f49276e19eb34f4f67b35f5312e08f2))
* **balance:** implementar FASE 3 - Balance Breakdown Cards ([8a33a28](https://github.com/Kavalieri/CuentasSiK/commit/8a33a2824d4423d42ea04bdbd0d6b2851cd1faae))
* **contributions:** implement approve/reject workflow for adjustments ([4bbe6ee](https://github.com/Kavalieri/CuentasSiK/commit/4bbe6ee70ada2ef9ce01863d8223a92af0c13a6b))
* **contributions:** use "Aportación Cuenta Conjunta" instead of "Nómina" ([e3716d1](https://github.com/Kavalieri/CuentasSiK/commit/e3716d1db5d0ca94114bda95637cd3f722b7e180))
* **credits:** implementar FASE 2 - Credit Decision Dialog ([0b13f09](https://github.com/Kavalieri/CuentasSiK/commit/0b13f09cdd28ceb8f20eba59deffe1e880f81fa9))
* **credits:** implementar sistema completo de créditos automáticos ([7a5016e](https://github.com/Kavalieri/CuentasSiK/commit/7a5016edd1d1116bf8b9006959fb32bc79727d37))
* **credits:** integrate server actions for transfer and apply workflows ([b60d4e5](https://github.com/Kavalieri/CuentasSiK/commit/b60d4e56391c8d3e35cc941ef87c9fdf84177857))
* **credits:** UI completa para gestionar créditos ([fbb9ba6](https://github.com/Kavalieri/CuentasSiK/commit/fbb9ba632e20683f27913c0a9cab7efd6f8437dc))
* **dashboard:** add advanced filters for transactions list ([6a8fda3](https://github.com/Kavalieri/CuentasSiK/commit/6a8fda375a3b5ca27029fb3e2a436849b3197ed9))
* **dashboard:** add paid_by and status columns to transactions list ([a84ccfc](https://github.com/Kavalieri/CuentasSiK/commit/a84ccfc4224aa0e20b9e6546f58ec8823708eec7))
* **dashboard:** add savings evolution chart to statistics tab ([ab7e34a](https://github.com/Kavalieri/CuentasSiK/commit/ab7e34a154e6ed3ff268d3d2c370f7e2d06e09f5))
* **dashboard:** implement 3-tab navigation (Balance, Ahorro, Estadísticas) ([4533965](https://github.com/Kavalieri/CuentasSiK/commit/453396549dc0245946118bcf301cce30b5b0a30f))
* **dashboard:** implement advanced filters and sorting for Balance tab ([b0d99ce](https://github.com/Kavalieri/CuentasSiK/commit/b0d99ce26e2b1d4aa0e332aae8ada34164333679))
* **expenses:** agregar opción "Cuenta común" y validación por tipo de transacción ([f991994](https://github.com/Kavalieri/CuentasSiK/commit/f991994ad66619ce433efa879e065ab45353eeaa))
* **expenses:** agregar selector paid_by condicional según rol de usuario ([17ca5fc](https://github.com/Kavalieri/CuentasSiK/commit/17ca5fcbd52aeb1dbe619f8c30f1880ded57923b))
* **expenses:** implement complete CRUD with filters and dialogs ([5a3419a](https://github.com/Kavalieri/CuentasSiK/commit/5a3419a46ee4aec360a0def616fef9ac996238a4))
* **expenses:** implementar formulario de edición de transacciones ([542e96b](https://github.com/Kavalieri/CuentasSiK/commit/542e96bed64e01e2fd9344bd096a5f4ea1c54b3e))
* **export:** implementar FASE 0-3 - Sistema de Exportación PDF ([adafc8b](https://github.com/Kavalieri/CuentasSiK/commit/adafc8b670aa6c8051b85f14b12489df165243c3))
* **export:** implementar FASE 4 - CSV Generator ([ff3db20](https://github.com/Kavalieri/CuentasSiK/commit/ff3db20546de24fae308f020b6b4ac76c8237d92))
* FASE 6 completada - auditoría completa + módulo ahorro + fixes seguridad ([35511ee](https://github.com/Kavalieri/CuentasSiK/commit/35511ee6c74447324fede3189c9e411c7d81b81e))
* FASE 7 (partial) - UI Módulo Ahorro completo con 3 modales ([ce83220](https://github.com/Kavalieri/CuentasSiK/commit/ce832209ecafc1c71f192562f35b4bb716098ab2))
* **fase0:** Add calculation types + editable display names ([c715899](https://github.com/Kavalieri/CuentasSiK/commit/c71589933311f4935ad9435db2041895e826779d))
* **phase-8:** complete UX improvements - unified navigation, payment fix, templates system ([bb845e8](https://github.com/Kavalieri/CuentasSiK/commit/bb845e832776bdbeb683e4c03f1b753a697e03dd))
* **phase-8:** implement credits monthly decision and periods close/reopen UI ([5ed4860](https://github.com/Kavalieri/CuentasSiK/commit/5ed4860d57153bfd05a229346181dcdc0f8c9660))
* **privacy:** extender modo privacidad a TODAS las cantidades ([1e61149](https://github.com/Kavalieri/CuentasSiK/commit/1e6114949a10a04e31f5e51d8ad6038ef737bf70))
* **reports:** implement complete reports module with Recharts visualizations ([14c2ac2](https://github.com/Kavalieri/CuentasSiK/commit/14c2ac2fe94b05583a0fe6f760cbb3dd6935c560))
* Sistema de ahorro completo + 23 categorías predeterminadas ([80319af](https://github.com/Kavalieri/CuentasSiK/commit/80319af4783e58638ee9bb918316b5b97d572544))
* **ui:** FASE 1 - Preparación y componentes base compartidos ([b939af8](https://github.com/Kavalieri/CuentasSiK/commit/b939af80b80a7657f7d9bb8b3421c172aa78fb10))
* **ui:** FASE 2a - Componentes Dashboard modulares (4/7) ([70c7362](https://github.com/Kavalieri/CuentasSiK/commit/70c7362b5b623096046574390c2c6e3c788d2e28))
* **ui:** FASE 2b - Componentes gráficos Dashboard (6/7) ([4456f6c](https://github.com/Kavalieri/CuentasSiK/commit/4456f6c220d4abc07b4f15d561425a705ef01d9d))
* **ui:** FASE 2c - Refactor DashboardContent modular (7/7) ([bc305b5](https://github.com/Kavalieri/CuentasSiK/commit/bc305b5586e55579c62910f75fb269fc44f09ac5))
* **ui:** FASE 3 - Nueva ruta /app/transactions completa ([0265d02](https://github.com/Kavalieri/CuentasSiK/commit/0265d021467e81f32c912e4b9b09187710a2850f))
* **ui:** FASE 4.1 - Ruta /app/contributions/adjustments completa ([d52a392](https://github.com/Kavalieri/CuentasSiK/commit/d52a392a12d54eef913fea220383dfc185f40840))
* **ui:** FASE 4.2 - Ruta /app/contributions/credits completa ([dd1c487](https://github.com/Kavalieri/CuentasSiK/commit/dd1c487e0f60b291fb42e0d3c8d1e7dbbd4208c2))
* **ui:** FASE 4.3 - Refactor ContributionsContent con TabsNav ([5dbaf54](https://github.com/Kavalieri/CuentasSiK/commit/5dbaf54d70a9ecc540d11d097b9ea22b0f8d5b0c))
* **ui:** preservar estado de pestanas al refrescar ([67e5388](https://github.com/Kavalieri/CuentasSiK/commit/67e538876b2c15950d596e276cb69368a76a5707))


### Bug Fixes

* cambiar as any por as unknown as never en INSERT transactions para evitar ESLint errors ([1b31cba](https://github.com/Kavalieri/CuentasSiK/commit/1b31cba718064251b6f8dc4ff7f145f4550a7f36))
* **contributions:** auditoría completa y actualización instantánea de UI ([819e76a](https://github.com/Kavalieri/CuentasSiK/commit/819e76a08438da586574b9158d5b475e4c521d05))
* **contributions:** distinguish NULL (not configured) from 0 (configured as zero) ([4703da4](https://github.com/Kavalieri/CuentasSiK/commit/4703da4fc02d983518657501cab48e521ff3519a))
* **contributions:** prevent isPaid=true when expected_amount is NULL (sin configurar) ([5d94bb6](https://github.com/Kavalieri/CuentasSiK/commit/5d94bb61f880eca75693dc77dabe0d31aa3426bf))
* **contributions:** updated_at NULL error + default category for prepayment approval ([60f7963](https://github.com/Kavalieri/CuentasSiK/commit/60f7963045215ffd5fa8e70cb673f9932ddc8fe2))
* corregir bug de zona horaria en fechas de movimientos de ajustes ([ab33c9a](https://github.com/Kavalieri/CuentasSiK/commit/ab33c9aa27d16d6b5b08386f2280585809e25b75))
* corregir SelectItem value vacío en EditMovementDialog ([ff913ed](https://github.com/Kavalieri/CuentasSiK/commit/ff913ed8d03dac04ba2bda3196ecc25241d2cb74))
* **critical:** getCreditsSummary y display de descriptions ([7835bff](https://github.com/Kavalieri/CuentasSiK/commit/7835bff29f269b212251809a978220e66ab9c99b))
* **dates:** occurred_at mostraba día creación en vez de día real ([c902424](https://github.com/Kavalieri/CuentasSiK/commit/c902424b8ecacd960579b1b634bb06e8e1ce098c))
* **db:** apply monthly_periods schema fix and clean build warnings ([e653e45](https://github.com/Kavalieri/CuentasSiK/commit/e653e45318379bb374c5d9853ff7cf3d2512be7f))
* **db:** corregir referencias a tabla movements en funciones ([5d8223a](https://github.com/Kavalieri/CuentasSiK/commit/5d8223a7d010d159ee68e150e614c404cd043ae0))
* **db:** fix monthly_periods schema and encoding issues ([eb949a4](https://github.com/Kavalieri/CuentasSiK/commit/eb949a42aef28e6f4f7c7687c5c58cd30071b62a))
* **expenses:** mostrar todos los miembros en selector paid_by ([179a536](https://github.com/Kavalieri/CuentasSiK/commit/179a536d03cd1ea4f2c8619dd8b54fa52808a962))
* **expenses:** reordenar router.refresh() antes de cerrar dialog ([7c28476](https://github.com/Kavalieri/CuentasSiK/commit/7c28476dc4b977a7397968e6c1b7e337d363970b))
* **mcp:** add authentication tokens for Supabase and Vercel MCPs ([ae280e2](https://github.com/Kavalieri/CuentasSiK/commit/ae280e2e45f14f6239bf568cba113adc4d0772f4))
* mostrar fechas/horas correctas en TransactionsList (dashboard) ([c680e63](https://github.com/Kavalieri/CuentasSiK/commit/c680e63cc5b633f39aeceb912bc3859b2ee0fe62))
* remove explicit created_at/updated_at from INSERT statements ([d9dac83](https://github.com/Kavalieri/CuentasSiK/commit/d9dac833f66bdfad7c852a1b42adadfbd23e2815))
* **routes:** consolidate to /app/expenses, remove duplicate /app/transactions ([95dd37e](https://github.com/Kavalieri/CuentasSiK/commit/95dd37e442a3758cc5657e150fe94febf9b7d646))
* sistema tracking contribuciones + trigger auto + crédito caballero ([edbd7b5](https://github.com/Kavalieri/CuentasSiK/commit/edbd7b521e617d48189f0e371aa77808f360a2fe))
* **transactions:** start_date error + UTF-8 encoding issue ([590c878](https://github.com/Kavalieri/CuentasSiK/commit/590c8787a952fc5d372bda954980c8857c4c411f))
* **ui:** créditos panel vacío y fechas/hora transacciones ([8644cc6](https://github.com/Kavalieri/CuentasSiK/commit/8644cc61b3a950faad77fda0c2a5268ff18a7071))
* **ui:** eliminate loading spinner flash on PendingCreditsWidget ([110e318](https://github.com/Kavalieri/CuentasSiK/commit/110e318d2b34e3e39f4e815be15b0afc358583f9))

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
