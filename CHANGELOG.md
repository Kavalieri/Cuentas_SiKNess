# Changelog

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
