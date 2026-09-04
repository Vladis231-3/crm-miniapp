# PROJECT_MAP — карта проекта

> Автосгенерировано 2026-09-04 05:02 UTC. **НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.**

**Обновление:**

```
python scripts/generate_project_map.py            # один раз
scripts\watch-project-map.bat                    # фоновый вотчер (перезапускается при изменениях)
python scripts/generate_project_map.py --install-hook  # git pre-commit хук (обновляет карту при коммите)
```

## Статистика

- Файлов кода: **521**
- Строк кода: **208 262**
- По расширениям: `.js`: 3, `.mjs`: 5, `.py`: 170, `.ts`: 37, `.tsx`: 306

## Архитектура

```mermaid
graph TD
    BE["backend/ — FastAPI + SQLAlchemy"] --> DB[("SQLite: backend/data/crm.sqlite3")]
    BOT["backend/bot.py — Telegram polling-бот"] --> DB
    FE["frontend/ — CRM-минапп (React/Vite): admin/owner/worker/client"] -->|HTTP /api| BE
    CWS["carwash/ — лендинг автомойки (React)"] -->|HTTP| BE
    SHOW["Showcase/ — лендинг-витрина (React)"] -->|HTTP| BE
    API["api/ — Vercel serverless (api/index.py)"] --> BE
    EL["native/electron/ — Windows-десктоп (Electron)"] -->|HTTPS| BE
```

## Дерево каталогов

```
concept1.0/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .postman/
│   └── resources.yaml
├── .skill-staging/
│   ├── ui-styling/
│   │   ├── canvas-fonts/
│   │   │   ├── ArsenalSC-OFL.txt
│   │   │   ├── BigShoulders-OFL.txt
│   │   │   ├── Boldonse-OFL.txt
│   │   │   ├── BricolageGrotesque-OFL.txt
│   │   │   ├── CrimsonPro-OFL.txt
│   │   │   ├── DMMono-OFL.txt
│   │   │   ├── EricaOne-OFL.txt
│   │   │   ├── GeistMono-OFL.txt
│   │   │   ├── Gloock-OFL.txt
│   │   │   ├── IBMPlexMono-OFL.txt
│   │   │   ├── InstrumentSans-OFL.txt
│   │   │   ├── Italiana-OFL.txt
│   │   │   ├── JetBrainsMono-OFL.txt
│   │   │   ├── Jura-OFL.txt
│   │   │   ├── LibreBaskerville-OFL.txt
│   │   │   ├── Lora-OFL.txt
│   │   │   ├── NationalPark-OFL.txt
│   │   │   ├── NothingYouCouldDo-OFL.txt
│   │   │   ├── Outfit-OFL.txt
│   │   │   ├── PixelifySans-OFL.txt
│   │   │   ├── PoiretOne-OFL.txt
│   │   │   ├── RedHatMono-OFL.txt
│   │   │   ├── Silkscreen-OFL.txt
│   │   │   ├── SmoochSans-OFL.txt
│   │   │   ├── Tektur-OFL.txt
│   │   │   ├── WorkSans-OFL.txt
│   │   │   └── YoungSerif-OFL.txt
│   │   ├── references/
│   │   │   ├── canvas-design-system.md
│   │   │   ├── shadcn-accessibility.md
│   │   │   ├── shadcn-components.md
│   │   │   ├── shadcn-theming.md
│   │   │   ├── tailwind-customization.md
│   │   │   ├── tailwind-responsive.md
│   │   │   └── tailwind-utilities.md
│   │   ├── scripts/
│   │   │   ├── tests/
│   │   │   │   ├── coverage-ui.json
│   │   │   │   ├── requirements.txt
│   │   │   │   ├── test_shadcn_add.py
│   │   │   │   └── test_tailwind_config_gen.py
│   │   │   ├── .coverage
│   │   │   ├── requirements.txt
│   │   │   ├── shadcn_add.py
│   │   │   └── tailwind_config_gen.py
│   │   ├── LICENSE.txt
│   │   └── SKILL.md
│   └── ui-ux-pro-max/
│       ├── data/
│       │   ├── stacks/
│       │   │   ├── angular.csv
│       │   │   ├── astro.csv
│       │   │   ├── avalonia.csv
│       │   │   ├── flutter.csv
│       │   │   ├── html-tailwind.csv
│       │   │   ├── javafx.csv
│       │   │   ├── jetpack-compose.csv
│       │   │   ├── laravel.csv
│       │   │   ├── nextjs.csv
│       │   │   ├── nuxt-ui.csv
│       │   │   ├── nuxtjs.csv
│       │   │   ├── react-native.csv
│       │   │   ├── react.csv
│       │   │   ├── shadcn.csv
│       │   │   ├── svelte.csv
│       │   │   ├── swiftui.csv
│       │   │   ├── threejs.csv
│       │   │   ├── uno.csv
│       │   │   ├── uwp.csv
│       │   │   ├── vue.csv
│       │   │   ├── winui.csv
│       │   │   └── wpf.csv
│       │   ├── app-interface.csv
│       │   ├── catalog-summary.json
│       │   ├── charts.csv
│       │   ├── colors.csv
│       │   ├── data-provenance.json
│       │   ├── google-font-licenses.json
│       │   ├── google-fonts.csv
│       │   ├── icons.csv
│       │   ├── landing.csv
│       │   ├── motion.csv
│       │   ├── phosphor-icons-upstream.json
│       │   ├── products.csv
│       │   ├── react-performance.csv
│       │   ├── styles.csv
│       │   ├── typography.csv
│       │   ├── ui-reasoning.csv
│       │   └── ux-guidelines.csv
│       ├── references/
│       │   ├── pro-rules.md
│       │   └── quick-reference.md
│       ├── scripts/
│       │   ├── tests/
│       │   │   ├── fixtures/
│       │   │   │   ├── catalogs/
│       │   │   │   │   ├── google-api.json
│       │   │   │   │   ├── google-catalog.json
│       │   │   │   │   ├── google-existing.csv
│       │   │   │   │   ├── google-metadata.json
│       │   │   │   │   ├── google-overrides.json
│       │   │   │   │   ├── icons-curated.csv
│       │   │   │   │   ├── phosphor-core.json
│       │   │   │   │   ├── phosphor-package.json
│       │   │   │   │   ├── phosphor-react-exports.json
│       │   │   │   │   └── phosphor-react-package.json
│       │   │   │   ├── relevance-baseline.json
│       │   │   │   ├── relevance-cases.json
│       │   │   │   └── relevance-thresholds.json
│       │   │   ├── test_catalog_refresh.py
│       │   │   ├── test_core.py
│       │   │   ├── test_core_data_quality.py
│       │   │   ├── test_data_contracts.py
│       │   │   ├── test_design_system_mode.py
│       │   │   ├── test_native_desktop_stack_freshness.py
│       │   │   ├── test_relevance_evaluator.py
│       │   │   ├── test_style_taxonomy.py
│       │   │   ├── test_text_layout_resilience.py
│       │   │   └── test_web_stack_freshness.py
│       │   ├── core.py
│       │   ├── design_system.py
│       │   ├── reasoning_contract.py
│       │   ├── search.py
│       │   └── validate_data.py
│       └── SKILL.md
├── api/
│   └── index.py
├── audit/
│   ├── reports/
│   │   ├── api_drift.md
│   │   ├── bandit_full.txt
│   │   ├── baseline.json
│   │   ├── coverage_backend.txt
│   │   ├── eslint_full.txt
│   │   ├── mypy_full.txt
│   │   ├── npm_audit.json
│   │   ├── pip_audit.txt
│   │   ├── route_matrix.md
│   │   ├── ruff_full.txt
│   │   ├── ruff_statistics.txt
│   │   ├── tsc_baseline.txt
│   │   ├── uncovered_routes.md
│   │   └── vulture_full.txt
│   ├── scripts/
│   │   ├── check_api_drift.py
│   │   ├── migration_idempotency.py
│   │   └── route_matrix.py
│   └── FINDINGS.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── complaints.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── date_utils.py
│   │   ├── error_notifier.py
│   │   ├── exports.py
│   │   ├── finance.py
│   │   ├── finance_sync.py
│   │   ├── google_calendar.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── seed.py
│   │   └── telegram_linking.py
│   ├── migrations/
│   │   ├── _common.py
│   │   ├── add_materials_written_off.py
│   │   ├── add_pay_type_to_workers.py
│   │   ├── add_performance_indexes.py
│   │   ├── add_plate_type.py
│   │   ├── add_referral_source.py
│   │   ├── add_service_times.py
│   │   ├── add_stock_write_offs.py
│   │   ├── add_write_off_booking_fields.py
│   │   ├── change_int_to_float.py
│   │   ├── finance_consistency.py
│   │   ├── migrate_additional_services.py
│   │   ├── payroll_entry_dates.py
│   │   └── sync_client_schema.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_additional_service_validation.py
│   │   ├── test_archive.py
│   │   ├── test_archive_split_zp_sync.py
│   │   ├── test_attendance_endpoints.py
│   │   ├── test_booking_logic.py
│   │   ├── test_booking_money_split.py
│   │   ├── test_booking_outsource_guard.py
│   │   ├── test_bot_help.py
│   │   ├── test_broadcast_edge_cases.py
│   │   ├── test_concurrent_booking_patch.py
│   │   ├── test_config.py
│   │   ├── test_content.py
│   │   ├── test_database_config.py
│   │   ├── test_deposit.py
│   │   ├── test_error_notifier.py
│   │   ├── test_finance_batch3.py
│   │   ├── test_finance_calculations.py
│   │   ├── test_finance_edit.py
│   │   ├── test_finance_integration_batch3.py
│   │   ├── test_finance_migration.py
│   │   ├── test_google_calendar.py
│   │   ├── test_google_calendar_api.py
│   │   ├── test_google_calendar_pull.py
│   │   ├── test_html_and_headers.py
│   │   ├── test_idor_spot.py
│   │   ├── test_income_endpoints.py
│   │   ├── test_mojibake_repair.py
│   │   ├── test_money_fixes.py
│   │   ├── test_money_flow.py
│   │   ├── test_money_split_fuzz.py
│   │   ├── test_orphan_endpoints.py
│   │   ├── test_owner_export_stock_decimal.py
│   │   ├── test_owner_masters.py
│   │   ├── test_owner_salary_asvc_only.py
│   │   ├── test_payroll_date_migration.py
│   │   ├── test_performance_wave3.py
│   │   ├── test_piggy_bank_adjust.py
│   │   ├── test_piggy_bank_withdraw_flex.py
│   │   ├── test_security_hardening.py
│   │   ├── test_subtract_fits_net.py
│   │   ├── test_upload_security.py
│   │   ├── test_wallet_query_budget.py
│   │   ├── test_worker_additional_services.py
│   │   ├── test_worker_calendar.py
│   │   ├── test_worker_car_search.py
│   │   └── test_worker_percent_cap.py
│   ├── .env.example
│   ├── bot.py
│   ├── requirements.txt
│   └── run.py
├── carwash/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── figma/
│   │   │   │   │   └── ImageWithFallback.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   ├── Contact.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Pricing.tsx
│   │   │   │   ├── Services.tsx
│   │   │   │   ├── ServiceSearchInput.tsx
│   │   │   │   └── Testimonials.tsx
│   │   │   ├── App.tsx
│   │   │   └── useContent.ts
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── globals.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   └── theme.css
│   │   ├── api.ts
│   │   └── main.tsx
│   ├── .gitignore
│   ├── ATTRIBUTIONS.md
│   ├── default_shadcn_theme.css
│   ├── index.html
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.mjs
│   ├── README.md
│   └── vite.config.ts
├── desktop/
│   ├── atmosfera-backend.spec
│   └── run_frozen.py
├── docs/
│   └── archive/
│       └── telegram-webapp-design.txt
├── frontend/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── public/
│   │   ├── google2855e110d983d030.html
│   │   └── test-cyrillic.html
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── AdminCalendarDayScreen.tsx
│   │   │   │   │   │   ├── AdminClientsPage.tsx
│   │   │   │   │   │   ├── AdminEmployeesPage.tsx
│   │   │   │   │   │   ├── AdminPayrollPage.tsx
│   │   │   │   │   │   ├── AdminStatsPage.tsx
│   │   │   │   │   │   └── AdminStockPage.tsx
│   │   │   │   │   ├── settings-sections/
│   │   │   │   │   │   └── AdminSettingsSections.tsx
│   │   │   │   │   ├── shared/
│   │   │   │   │   │   └── AssignWorkersDialog.tsx
│   │   │   │   │   ├── AdminApp.tsx
│   │   │   │   │   └── ContentEditor.tsx
│   │   │   │   ├── atmosfera/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Dialog.tsx
│   │   │   │   │   ├── FormRow.tsx
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Money.tsx
│   │   │   │   │   ├── SectionHeader.tsx
│   │   │   │   │   ├── Sheet.tsx
│   │   │   │   │   ├── StatTile.tsx
│   │   │   │   │   ├── StatusBadge.tsx
│   │   │   │   │   ├── statusMap.ts
│   │   │   │   │   ├── SummaryRows.tsx
│   │   │   │   │   └── Toaster.tsx
│   │   │   │   ├── client/
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── BookingsScreen.tsx
│   │   │   │   │   │   ├── CatalogScreen.tsx
│   │   │   │   │   │   ├── ConfirmSuccessScreen.tsx
│   │   │   │   │   │   ├── DetailScreen.tsx
│   │   │   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   │   │   └── SlotsScreen.tsx
│   │   │   │   │   ├── shared/
│   │   │   │   │   │   └── BoxRentPicker.tsx
│   │   │   │   │   └── ClientApp.tsx
│   │   │   │   ├── figma/
│   │   │   │   │   └── ImageWithFallback.tsx
│   │   │   │   ├── landing/
│   │   │   │   │   ├── Contact.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   ├── Hero.tsx
│   │   │   │   │   ├── LandingPage.tsx
│   │   │   │   │   ├── Navbar.tsx
│   │   │   │   │   ├── Pricing.tsx
│   │   │   │   │   ├── Services.tsx
│   │   │   │   │   ├── StudioInfo.tsx
│   │   │   │   │   ├── Testimonials.tsx
│   │   │   │   │   ├── Works.tsx
│   │   │   │   │   └── WorksPage.tsx
│   │   │   │   ├── owner/
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── OwnerClientsScreen.tsx
│   │   │   │   │   │   ├── OwnerPiggyBankScreen.tsx
│   │   │   │   │   │   ├── OwnerStockPage.tsx
│   │   │   │   │   │   └── OwnerWalletScreen.tsx
│   │   │   │   │   ├── DepositPanel.tsx
│   │   │   │   │   └── OwnerApp.tsx
│   │   │   │   ├── shared/
│   │   │   │   │   ├── Atmosfera.tsx
│   │   │   │   │   ├── AttendanceTable.tsx
│   │   │   │   │   ├── EmptyState.tsx
│   │   │   │   │   ├── RolePreviewSwitcher.tsx
│   │   │   │   │   ├── ServiceSearchInput.tsx
│   │   │   │   │   ├── ServiceSearchSelect.tsx
│   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   └── SourceBadge.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   └── worker/
│   │   │   │       ├── screens/
│   │   │   │       │   ├── WorkerEarningsScreen.tsx
│   │   │   │       │   ├── WorkerProfileScreen.tsx
│   │   │   │       │   ├── WorkerScheduleScreen.tsx
│   │   │   │       │   └── WorkerTodayScreen.tsx
│   │   │   │       ├── shared/
│   │   │   │       │   ├── CarSearch.tsx
│   │   │   │       │   └── EarningsCalendar.tsx
│   │   │   │       ├── WorkerApp.tsx
│   │   │   │       └── WorkerCalendar.tsx
│   │   │   ├── constants/
│   │   │   │   └── referralSources.ts
│   │   │   ├── context/
│   │   │   │   └── AppContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTelegramBackButton.ts
│   │   │   │   ├── useTelegramMainButton.ts
│   │   │   │   └── useTelegramSetup.ts
│   │   │   ├── utils/
│   │   │   │   ├── complaints.ts
│   │   │   │   ├── date.ts
│   │   │   │   ├── useVisualViewport.ts
│   │   │   │   ├── validation.test.ts
│   │   │   │   └── validation.ts
│   │   │   ├── api.ts
│   │   │   └── App.tsx
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   ├── theme.css
│   │   │   └── tokens.css
│   │   └── main.tsx
│   ├── .env.desktop
│   ├── .env.example
│   ├── ATTRIBUTIONS.md
│   ├── eslint.config.mjs
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── README.md
│   ├── tsconfig.json
│   └── vite.config.ts
├── native/
│   └── electron/
│       ├── src/
│       │   ├── main.js
│       │   └── url-policy.js
│       ├── test/
│       │   └── url-policy.test.js
│       ├── install-run.bat
│       └── package.json
├── postman/
│   ├── environments/
│   │   └── New Environment.environment.yaml
│   └── globals/
│       └── workspace.globals.yaml
├── scripts/
│   ├── .project-map-watch.lock
│   ├── generate_project_map.py
│   ├── install-tunnel-watchdog-task.ps1
│   ├── repair_source_mojibake.py
│   ├── run-backend-local.bat
│   ├── run-backend-local.ps1
│   ├── run-bot-polling.bat
│   ├── run-tunnel-watchdog.ps1
│   ├── start-project-map-watch.vbs
│   ├── start-tunnel-watchdog.bat
│   ├── start_localhostrun_tunnel.cmd
│   ├── start_pinggy_tunnel.cmd
│   └── watch-project-map.bat
├── Showcase/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── figma/
│   │   │   │   │   └── ImageWithFallback.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   ├── BookingSection.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── GallerySection.tsx
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── PricingSection.tsx
│   │   │   │   ├── ServiceSearchInput.tsx
│   │   │   │   ├── ServicesSection.tsx
│   │   │   │   └── TestimonialsSection.tsx
│   │   │   └── App.tsx
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── globals.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   └── theme.css
│   │   └── main.tsx
│   ├── ATTRIBUTIONS.md
│   ├── default_shadcn_theme.css
│   ├── index.html
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.mjs
│   ├── README.md
│   └── vite.config.ts
├── training/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── complaints.py
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── date_utils.py
│   │   │   ├── exports.py
│   │   │   ├── finance.py
│   │   │   ├── finance_sync.py
│   │   │   ├── google_calendar.py
│   │   │   ├── main.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── security.py
│   │   │   ├── seed.py
│   │   │   └── telegram_linking.py
│   │   ├── data/
│   │   │   ├── diag_asvc.py
│   │   │   └── diag_asvc2.py
│   │   ├── migrations/
│   │   │   ├── add_materials_written_off.py
│   │   │   ├── add_pay_type_to_workers.py
│   │   │   ├── add_plate_type.py
│   │   │   ├── add_referral_source.py
│   │   │   ├── add_service_times.py
│   │   │   ├── add_stock_write_offs.py
│   │   │   ├── add_write_off_booking_fields.py
│   │   │   ├── change_int_to_float.py
│   │   │   ├── finance_consistency.py
│   │   │   ├── migrate_additional_services.py
│   │   │   └── sync_client_schema.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_additional_service_validation.py
│   │   │   ├── test_archive.py
│   │   │   ├── test_attendance_endpoints.py
│   │   │   ├── test_booking_logic.py
│   │   │   ├── test_booking_money_split.py
│   │   │   ├── test_broadcast_edge_cases.py
│   │   │   ├── test_config.py
│   │   │   ├── test_content.py
│   │   │   ├── test_database_config.py
│   │   │   ├── test_deposit.py
│   │   │   ├── test_finance_batch3.py
│   │   │   ├── test_finance_calculations.py
│   │   │   ├── test_finance_edit.py
│   │   │   ├── test_finance_integration_batch3.py
│   │   │   ├── test_finance_migration.py
│   │   │   ├── test_google_calendar.py
│   │   │   ├── test_google_calendar_api.py
│   │   │   ├── test_google_calendar_pull.py
│   │   │   ├── test_html_and_headers.py
│   │   │   ├── test_income_endpoints.py
│   │   │   ├── test_owner_export_stock_decimal.py
│   │   │   ├── test_owner_masters.py
│   │   │   ├── test_owner_salary_asvc_only.py
│   │   │   ├── test_piggy_bank_adjust.py
│   │   │   ├── test_security_hardening.py
│   │   │   ├── test_training_help.py
│   │   │   ├── test_upload_security.py
│   │   │   ├── test_worker_additional_services.py
│   │   │   ├── test_worker_calendar.py
│   │   │   └── test_worker_car_search.py
│   │   ├── .env.example
│   │   ├── bot.py
│   │   ├── requirements.txt
│   │   └── run.py
│   └── frontend/
│       ├── guidelines/
│       │   └── Guidelines.md
│       ├── public/
│       │   └── google2855e110d983d030.html
│       ├── src/
│       │   ├── app/
│       │   │   ├── components/
│       │   │   │   ├── admin/
│       │   │   │   │   ├── AdminApp.tsx
│       │   │   │   │   └── ContentEditor.tsx
│       │   │   │   ├── client/
│       │   │   │   │   └── ClientApp.tsx
│       │   │   │   ├── figma/
│       │   │   │   │   └── ImageWithFallback.tsx
│       │   │   │   ├── help/
│       │   │   │   │   └── HelpDemoApp.tsx
│       │   │   │   ├── landing/
│       │   │   │   │   ├── Contact.tsx
│       │   │   │   │   ├── Footer.tsx
│       │   │   │   │   ├── Hero.tsx
│       │   │   │   │   ├── LandingPage.tsx
│       │   │   │   │   ├── Navbar.tsx
│       │   │   │   │   ├── Pricing.tsx
│       │   │   │   │   ├── Services.tsx
│       │   │   │   │   ├── StudioInfo.tsx
│       │   │   │   │   ├── Testimonials.tsx
│       │   │   │   │   ├── Works.tsx
│       │   │   │   │   └── WorksPage.tsx
│       │   │   │   ├── owner/
│       │   │   │   │   ├── _OwnerApp.work.bak.tsx
│       │   │   │   │   ├── DepositPanel.tsx
│       │   │   │   │   └── OwnerApp.tsx
│       │   │   │   ├── shared/
│       │   │   │   │   ├── TrainingAssistant/
│       │   │   │   │   │   ├── assistantScript.ts
│       │   │   │   │   │   ├── tourTypes.ts
│       │   │   │   │   │   └── TrainingAssistant.tsx
│       │   │   │   │   ├── Atmosfera.tsx
│       │   │   │   │   ├── AttendanceTable.tsx
│       │   │   │   │   ├── EmptyState.tsx
│       │   │   │   │   ├── ServiceSearchInput.tsx
│       │   │   │   │   ├── ServiceSearchSelect.tsx
│       │   │   │   │   ├── Skeleton.tsx
│       │   │   │   │   └── SourceBadge.tsx
│       │   │   │   ├── ui/
│       │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│       │   │   │   └── worker/
│       │   │   │       ├── WorkerApp.tsx
│       │   │   │       └── WorkerCalendar.tsx
│       │   │   ├── constants/
│       │   │   │   └── referralSources.ts
│       │   │   ├── context/
│       │   │   │   └── AppContext.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── useTelegramBackButton.ts
│       │   │   │   └── useTelegramMainButton.ts
│       │   │   ├── mocks/
│       │   │   │   └── trainingStubs.ts
│       │   │   ├── utils/
│       │   │   │   ├── complaints.ts
│       │   │   │   ├── date.ts
│       │   │   │   ├── useVisualViewport.ts
│       │   │   │   └── validation.ts
│       │   │   ├── api.ts
│       │   │   └── App.tsx
│       │   ├── imports/
│       │   │   └── pasted_text/
│       │   │       └── telegram-webapp-design.txt
│       │   ├── styles/
│       │   │   ├── fonts.css
│       │   │   ├── index.css
│       │   │   ├── tailwind.css
│       │   │   └── theme.css
│       │   └── main.tsx
│       ├── .env.desktop
│       ├── .env.example
│       ├── .env.local
│       ├── .env.production
│       ├── .gitignore
│       ├── ATTRIBUTIONS.md
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── README.md
│       ├── vercel.json
│       └── vite.config.ts
├── .dockerignore
├── .editorconfig
├── .env.local
├── .gitignore
├── .pre-commit-config.yaml
├── .pytest_full.err
├── .python-version
├── .vercelignore
├── _admin_excerpt.txt
├── _client_excerpt.txt
├── _owner_excerpt.txt
├── _tmp_db_check.py
├── _tmp_worker_session_test.py
├── _worker_excerpt.txt
├── AGENTS.md
├── amvera.yml
├── app.py
├── AUDIT_REPORT.md
├── booking.status
├── DEPLOY_AMVERA.md
├── DEPLOY_RENDER_SUPABASE.md
├── DEPLOY_VERCEL.md
├── Dockerfile
├── flip_push_permission.py
├── REDESIGN_PLAN.md
├── render.yaml
├── requirements.txt
├── start-native.bat
├── task.id
├── task.status
└── vercel.json
```

## Backend (Python)

### backend/app/__init__.py (1 строк)

### backend/app/complaints.py (98 строк)

Классы и функции (9):

- `class ComplaintStatus: active_count: int reduction_active: bool reduction_until: datetime | None effective_percent: floa` (стр. 16)
- `as_utcdef as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 23)
- `clamp_worker_percentdef clamp_worker_percent(value: float) -> float: return max(0, min(float(value), WORKER_MAX_PERCENT))` (стр. 29)
- `complaint_active_untildef complaint_active_until(created_at: datetime) -> datetime: return as_utc(created_at) + timedelta(days=COMPLAINT_DURATION_DAYS)` (стр. 33)
- `complaint_end_atdef complaint_end_at(complaint: Any) -> datetime: revoked_at = getattr(complaint, "revoked_at", None) if revoked_at is not None: return as_utc(revoked_at) active_until = getattr(co` (стр. 37)
- `complaint_is_active_atdef complaint_is_active_at(complaint: Any, at: datetime | None = None) -> bool: current = as_utc(at or datetime.now(timezone.utc)) starts_at = as_utc(getattr(complaint, "created_at` (стр. 47)
- `complaint_status_for_percentdef complaint_status_for_percent( base_percent: float, complaints: Iterable[Any], *, at: datetime | None = None,` (стр. 54)
- `parse_booking_datetimedef parse_booking_datetime(date_value: str, time_value: str) -> datetime | None: try: parsed = datetime.strptime(f"{date_value} {time_value}", "%d.%m.%Y %H:%M") except ValueError: ` (стр. 80)
- `adjusted_booking_percentdef adjusted_booking_percent( assigned_percent: float, complaints: Iterable[Any], *, date_value: str, time_value: str, fallback: datetime | None = None,` (стр. 88)

### backend/app/config.py (300 строк)

Классы и функции (11):

- `class Settings: app_name: str environment: str is_production: bool app_secret: str telegram_bot_token: str | None webapp` (стр. 34)
- `_parse_booldef _parse_bool(raw: str | None, default: bool) -> bool: if raw is None: return default return raw.strip().lower() in {"1", "true", "yes", "on"}` (стр. 66)
- `_parse_positive_intdef _parse_positive_int(name: str, raw: str | None, default: int) -> int: try: value = int(raw) if raw is not None else default except ValueError as exc: raise RuntimeError(f"{name` (стр. 72)
- `_parse_telegram_delivery_modedef _parse_telegram_delivery_mode(raw: str | None) -> str: value = (raw or "polling").strip().lower() if value not in {"polling", "webhook"}: raise ValueError("TELEGRAM_DELIVERY_MO` (стр. 82)
- `_normalize_webhook_pathdef _normalize_webhook_path(raw: str | None) -> str: value = (raw or "/api/telegram/webhook").strip() or "/api/telegram/webhook" if not value.startswith("/"):` (стр. 89)
- `_normalize_database_urldef _normalize_database_url(raw: str) -> str: if raw.startswith("postgres://"):` (стр. 96)
- `_normalize_environmentdef _normalize_environment() -> tuple[str, bool]: raw = ( os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or os.getenv("VERCEL_ENV") or "development" ).strip().lower() aliases = {` (стр. 104)
- `_parse_cors_originsdef _parse_cors_origins(raw: str, *, strong_environment: bool) -> tuple[str, ...]: origins = tuple(dict.fromkeys(origin.strip().rstrip("/") for origin in raw.split(",") if origin.s` (стр. 121)
- `_parse_permanent_telegram_ownersdef _parse_permanent_telegram_owners(raw: str | None) -> tuple[tuple[str, str, str, str], ...]: if not raw: return () try: items = json.loads(raw) except json.JSONDecodeError as ex` (стр. 138)
- `_parse_creator_telegram_idsdef _parse_creator_telegram_ids(raw: str | None) -> tuple[str, ...]: """Разрешённые Telegram id создателя. Пустая строка -> значения по умолчанию. Список намеренно вынесен в конфиг` (стр. 178)
- `get_settingsdef get_settings() -> Settings: PERSISTENT_DATA_DIR.mkdir(parents=True, exist_ok=True) environment, is_production = _normalize_environment() strong_environment = environment in _ST` (стр. 200)

### backend/app/date_utils.py (36 строк)

Классы и функции (3):

- `parse_dmydef parse_dmy(value: str) -> date: """Strictly parse a real DD.MM.YYYY calendar date.""" if not isinstance(value, str):` (стр. 6)
- `parse_date_paramdef parse_date_param(value: str) -> date: """Accept strict DD.MM.YYYY or ISO YYYY-MM-DD query dates.""" try: return parse_dmy(value) except ValueError: parsed = date.fromisoformat(` (стр. 23)
- `validate_rangedef validate_range(date_from: date, date_to: date) -> None: if date_from > date_to: raise ValueError("date_from must not be after date_to")` (стр. 34)

### backend/app/error_notifier.py (380 строк)

Классы и функции (26):

- `_env_booldef _env_bool(name: str, default: bool) -> bool: raw = (os.getenv(name) or "").strip().lower() if not raw: return default return raw in {"1", "true", "yes", "on"}` (стр. 47)
- `_env_intdef _env_int(name: str, default: int, minimum: int) -> int: try: value = int((os.getenv(name) or "").strip()) except ValueError: return default return max(minimum, value)` (стр. 54)
- `class _NotifierState: """Общее состояние throttle'а (потокобезопасное через RLock).""" def __init__(self) -> None: self.` (стр. 62)
- `_NotifierState.__init__def __init__(self) -> None: self.lock = threading.RLock() self.last_sent_by_fingerprint: dict[str, float] = {} self.sent_timestamps: deque[float] = deque() self.no_recipient_warned` (стр. 65)
- `_reset_state_for_testsdef _reset_state_for_tests() -> None: global _state _state = _NotifierState()` (стр. 75)
- `_cooldown_secondsdef _cooldown_seconds() -> int: return _env_int("ERROR_NOTIFY_COOLDOWN_SECONDS", 600, minimum=1)` (стр. 80)
- `_max_messages_per_hourdef _max_messages_per_hour() -> int: return _env_int("ERROR_NOTIFY_MAX_PER_HOUR", 30, minimum=1)` (стр. 84)
- `_enableddef _enabled() -> bool: return _env_bool("ERROR_NOTIFY_ENABLED", True)` (стр. 88)
- `_is_own_recorddef _is_own_record(record: logging.LogRecord) -> bool: name = record.name or "" return any( name == own or name.startswith(f"{own}.") for own in _OWN_LOGGER_NAMES )` (стр. 92)
- `_fetch_owner_chat_idsdef _fetch_owner_chat_ids() -> list[str]: """Получатель ошибок: только создатель (primary owner) с привязанным Telegram.""" db = SessionLocal() try: rows = db.execute( select(Staff` (стр. 99)
- `_send_via_botdef _send_via_bot(chat_id: str, text: str) -> None: """Ленивый импорт, чтобы избежать циклического импорта с bot.py.""" try: from backend.bot import send_telegram_message except Im` (стр. 123)
- `_truncatedef _truncate(text: str, limit: int) -> str: if len(text) <= limit: return text return text[: max(limit - 20, 0)].rstrip() + "\n…[сообщение обрезано]"` (стр. 132)
- `_build_messagedef _build_message( *, kind: str, context: str, error_type: str, message: str, where: str, tb_text: str,` (стр. 138)
- `_exception_wheredef _exception_where(exc: BaseException) -> str: frames = traceback.extract_tb(exc.__traceback__) if not frames: return "" last = frames[-1] filename = os.path.basename(last.filena` (стр. 168)
- `_exception_fingerprintdef _exception_fingerprint(exc: BaseException) -> str: frames = traceback.extract_tb(exc.__traceback__) site = f"{frames[-1].filename}:{frames[-1].lineno}" if frames else "unknown"` (стр. 177)
- `_log_record_fingerprintdef _log_record_fingerprint(record: logging.LogRecord) -> str: return f"log:{record.name}:{record.funcName}:{record.lineno}"` (стр. 187)
- `_dispatch_lockeddef _dispatch_locked(state: _NotifierState, text: str, fingerprint: str) -> bool: """Отправка текста владельцам. Вызывать под state.lock.""" try: chat_ids = _fetch_owner_chat_ids()` (стр. 191)
- `_throttle_check_lockeddef _throttle_check_locked(state: _NotifierState, fingerprint: str) -> str | None: """Возвращает причину подавления или None, если можно отправлять.""" now_monotonic = time.monoton` (стр. 244)
- `_submitdef _submit(*, fingerprint: str, message: str) -> bool: if not _enabled():` (стр. 260)
- `notify_exceptiondef notify_exception(exc: BaseException, *, context: str = "") -> bool: """Отправить исключение владельцам в Telegram. Никогда не бросает.""" try: frames = traceback.extract_tb(exc` (стр. 272)
- `notify_error_messagedef notify_error_message(message: str, *, context: str = "", source: str = "") -> bool: """Отправить произвольный текст ошибки владельцам в Telegram.""" try: fingerprint_source = f` (стр. 296)
- `class TelegramErrorNotifyHandler(logging.Handler):` (стр. 317)
- `TelegramErrorNotifyHandler.__init__def __init__(self, level: int = logging.ERROR) -> None: super().__init__(level=level)` (стр. 320)
- `TelegramErrorNotifyHandler.emitdef emit(self, record: logging.LogRecord) -> None: if _is_own_record(record):` (стр. 323)
- `install_error_notifyingdef install_error_notifying() -> None: """Идемпотентно подключает logging-handler к корневому логгеру. Проверка по имени класса (а не по флагу модуля): тесты выгружают и заново имп` (стр. 350)
- `unhandled_exception_handlerasync def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse: """FastAPI/Starlette handler для несловленных исключений (HTTP 500).""" notify_exception(ex` (стр. 365)

### backend/app/exports.py (3805 строк)

Классы и функции (57):

- `class ExportMetric: label: str value: str @dataclass(frozen=True)` (стр. 137)
- `class OwnerExportData: owner_name: str company_name: str generated_at: datetime period_from: str period_to: str …` (стр. 149)
- `class GeneratedExport: file_name: str media_type: str content: bytes telegram_caption: str ReportPeriod = Literal["daily` (стр. 191)
- `class OwnerSummaryReport: title: str message: str @dataclass(frozen=True)` (стр. 215)
- `class OwnerSummaryContext: company_name: str generated_at: datetime period: ReportPeriod segment: ReportSegment period_l` (стр. 227)
- `class OwnerSummaryExportData: owner_name: str company_name: str title: str generated_at: datetime period_label: str …` (стр. 251)
- `build_owner_summary_reportdef build_owner_summary_report( *, company_name: str, bookings: list[Booking], services: list[Service], expenses: list[Expense] | None = None, incomes: list[Income] | None = None, ` (стр. 291)
- `OwnerSummaryExportData._parse_ddmmyyyydef _parse_ddmmyyyy(value: str) -> datetime | None: try: return datetime.strptime(value.strip(), "%d.%m.%Y") except ValueError: return None` (стр. 363)
- `OwnerSummaryExportData._in_perioddef _in_period(date_str: str) -> bool: dt = _parse_ddmmyyyy(date_str) if dt is None: return False # Сравниваем без timezone (period_start/end могут быть aware) ps = period_start.re` (стр. 375)
- `build_owner_summary_exportdef build_owner_summary_export( *, owner: StaffUser, company_name: str, bookings: list[Booking], services: list[Service], penalties: list[Penalty] | None = None, piggy_transactions` (стр. 564)
- `_build_owner_summary_contextdef _build_owner_summary_context( *, company_name: str, bookings: list[Booking], services: list[Service], period: ReportPeriod, segment: ReportSegment, now: datetime | None = None,` (стр. 656)
- `_summary_headerdef _summary_header(context: OwnerSummaryContext) -> str: return f"{context.company_name}\n{context.title}\nПериод: {context.period_label}"` (стр. 740)
- `_build_owner_summary_export_datadef _build_owner_summary_export_data( *, owner_name: str, context: OwnerSummaryContext, penalties: list[Penalty] | None = None, db: Session | None = None,` (стр. 748)
- `_summary_period_boundsdef _summary_period_bounds(period: ReportPeriod, current: datetime) -> tuple[datetime, datetime, str]: end_at = current.replace(hour=0, minute=0, second=0, microsecond=0) + timedel` (стр. 1615)
- `_summary_period_labeldef _summary_period_label(period_start: datetime, period_end: datetime) -> str: last_day = period_end - timedelta(days=1) if period_start.date() == last_day.date():` (стр. 1633)
- `_booking_matches_segmentdef _booking_matches_segment(booking: Booking, service: Service | None, segment: ReportSegment) -> bool: if service is not None and service.category: category = service.category.st` (стр. 1647)
- `build_owner_exportdef build_owner_export( *, kind: ExportKind, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUse` (стр. 1673)
- `build_piggy_bank_exportdef build_piggy_bank_export( *, company_name: str, piggy_transactions: list[PiggyBankTransaction], date_from: str | None = None, date_to: str | None = None, resource_group: str | N` (стр. 1767)
- `OwnerSummaryExportData._to_dtdef _to_dt(value: str | None) -> datetime | None: if not value: return None parsed = _parse_date_for_sort(value) return None if parsed == datetime.max else parsed` (стр. 1797)
- `OwnerSummaryExportData._in_rangedef _in_range(tx: PiggyBankTransaction) -> bool: d = _to_dt(tx.date) if d is None: return False if from_dt and d < from_dt: return False if to_dt and d > to_dt.replace(hour=23, min` (стр. 1806)
- `OwnerSummaryExportData._sort_keydef _sort_key(tx: PiggyBankTransaction) -> tuple[datetime, datetime]: min_aware = datetime.min.replace(tzinfo=generated.tzinfo) tx_created = ( _as_local_datetime(tx.created_at, gen` (стр. 1816)
- `OwnerSummaryExportData._period_sumdef _period_sum(predicate: Any) -> float: return sum(float(t.amount) for t in period_txs if predicate(t))` (стр. 1835)
- `OwnerSummaryExportData.moneydef money(value: float) -> str: return f"{value:,.0f} ₽".replace(",", " ")` (стр. 1870)
- `OwnerSummaryExportData.signeddef signed(value: float) -> str: return f"{value:+,.0f} ₽".replace(",", " ")` (стр. 1873)
- `OwnerSummaryExportData._month_bucketsdef _month_buckets(start: date, end: date) -> list[tuple[str, date, date]]: buckets: list[tuple[str, date, date]] = [] year, month = start.year, start.month while (year, month) <= ` (стр. 1899)
- `OwnerSummaryExportData._week_bucketsdef _week_buckets(start: date, end: date) -> list[tuple[str, date, date]]: buckets: list[tuple[str, date, date]] = [] week_start = start - timedelta(days=(start.weekday() - 5) % 7)` (стр. 1911)
- `OwnerSummaryExportData._balance_atdef _balance_at(end_day: date) -> float: # Нарастающий итог по всей истории (не только период отчёта) return sum(float(t.amount) for d, t in dated_txs if d <= end_day)` (стр. 1922)
- `OwnerSummaryExportData._bucket_metricsdef _bucket_metrics(txs: list[PiggyBankTransaction]) -> dict[str, float]: metrics: dict[str, float] = { "count": 0, "deposits": 0.0, "repayments": 0.0, "deposit_returns": 0.0, "adj` (стр. 1926)
- `OwnerSummaryExportData._comparison_rowsdef _comparison_rows( buckets: list[tuple[str, date, date]],` (стр. 1974)
- `OwnerSummaryExportData._comparison_headersdef _comparison_headers( period_label_ru: str, start_label: str, end_label: str, delta_label: str,` (стр. 2130)
- `OwnerSummaryExportData._append_comparison_sheetdef _append_comparison_sheet(title: str, headers: list[str], rows: list[list[Any]]) -> None: _append_sheet(workbook, title, headers, rows, currency_cols=comparison_currency_cols) i` (стр. 2161)
- `_build_export_datadef _build_export_data( *, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUser], stock_items: l` (стр. 2220)
- `OwnerSummaryExportData._is_fixed_bookingdef _is_fixed_booking(booking: Booking) -> bool: # привязка строго по названию — "подготовка к полировке" всегда фиксированная if is_fixed_master_service(booking.service):` (стр. 2306)
- `OwnerSummaryExportData._piggy_sort_keydef _piggy_sort_key(tx: PiggyBankTransaction) -> tuple[datetime, datetime]: min_aware = datetime.min.replace(tzinfo=generated_at.tzinfo) tx_created = _as_local_datetime(tx.created_` (стр. 2784)
- `_render_excel_reportdef _render_excel_report(data: OwnerExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1") summary["A1"] = data` (стр. 2903)
- `_render_owner_summary_excel_reportdef _render_owner_summary_excel_report(data: OwnerSummaryExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1")` (стр. 2979)
- `_append_sheetdef _append_sheet(workbook: Workbook, title: str, headers: list[str], rows: list[list[Any]], *, currency_cols: set[int] | None = None) -> None: sheet = workbook.create_sheet(title)` (стр. 3169)
- `_render_pdf_reportdef _render_pdf_report(data: OwnerExportData) -> bytes: buffer = io.BytesIO() font_name = _pdf_font_name() styles = getSampleStyleSheet() title_style = ParagraphStyle("OwnerTitle",` (стр. 3199)
- `_pdf_sectiondef _pdf_section(story: list[Any], section_style: ParagraphStyle, font_name: str, title: str, headers: list[str], rows: list[list[Any]]) -> None: story.append(Paragraph(title, sect` (стр. 3289)
- `_pdf_tabledef _pdf_table(rows: list[list[Any]], font_name: str, header_color: str = "#0E1624") -> LongTable: normalized = [[Paragraph(_escape(str(cell)), _pdf_cell_style(font_name)) for cell` (стр. 3305)
- `_format_rowsdef _format_rows(rows: list[list[Any]], *, currency_cols: set[int]) -> list[list[Any]]: formatted: list[list[Any]] = [] for row in rows: next_row = [] for index, value in enumerate` (стр. 3345)
- `_style_headingdef _style_heading(sheet, *cells: str) -> None: if cells: sheet[cells[0]].font = Font(size=16, bold=True, color="0B1226") for cell_name in cells[1:]: sheet[cell_name].font = Font(s` (стр. 3375)
- `_style_tabledef _style_table(sheet, header_row: int, start_row: int, end_row: int, end_col: int) -> None: header_fill = PatternFill(fill_type="solid", fgColor="0A84FF") header_font = Font(bold` (стр. 3389)
- `_apply_currencydef _apply_currency(cell) -> None: cell.number_format = '#,##0 "руб."' cell.alignment = Alignment(horizontal="right", vertical="center")` (стр. 3431)
- `_autosizedef _autosize(sheet) -> None: for column in sheet.columns: letter = get_column_letter(column[0].column) max_length = 0 for cell in column: max_length = max(max_length, len("" if ce` (стр. 3441)
- `_pdf_font_namedef _pdf_font_name() -> str: candidates = [ str(Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSans-Regular.ttf"), os.getenv("OWNER_EXPORT_FONT_PATH", ""), "C:/Windows` (стр. 3461)
- `_pdf_cell_styledef _pdf_cell_style(font_name: str) -> ParagraphStyle: return ParagraphStyle("OwnerExportCell", fontName=font_name, fontSize=7.5, leading=9, textColor=colors.HexColor("#111827"))` (стр. 3511)
- `_booking_datetimedef _booking_datetime(booking: Booking) -> datetime | None: raw = f"{booking.date} {booking.time}".strip() for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M"):` (стр. 3519)
- `_booking_sort_keydef _booking_sort_key(booking: Booking) -> tuple[datetime, datetime]: local_now = datetime.now().astimezone() booking_dt = _booking_datetime(booking) primary = _as_local_datetime(b` (стр. 3539)
- `_as_local_datetimedef _as_local_datetime(value: datetime, reference: datetime) -> datetime: target_tz = reference.tzinfo if value.tzinfo is None: return value.replace(tzinfo=target_tz) return value.` (стр. 3555)
- `_parse_date_for_sortdef _parse_date_for_sort(value: str) -> datetime: for fmt in ("%d.%m.%Y", "%Y-%m-%d"):` (стр. 3569)
- `_format_datetimedef _format_datetime(value: datetime | None) -> str: if value is None: return "" return value.astimezone().strftime("%d.%m.%Y %H:%M") if value.tzinfo is not None else value.strftim` (стр. 3587)
- `_format_moneydef _format_money(value: int) -> str: return f"{value:,.0f}".replace(",", " ") + " руб."` (стр. 3599)
- `_escapedef _escape(value: str) -> str: return escape(value).replace("\n", "<br/>")` (стр. 3607)
- `build_deposit_exportdef build_deposit_export( db: Any, client: Client, overview: Any,` (стр. 3620)
- `OwnerSummaryExportData.moneydef money(value: float) -> str: return f"{float(value):,.0f} ₽".replace(",", " ")` (стр. 3635)
- `build_deposit_export_alldef build_deposit_export_all( db: Any, *, date_from: str | None = None, date_to: str | None = None,` (стр. 3719)

### backend/app/finance.py (56 строк)

Классы и функции (4):

- `moneydef money(value: object) -> Decimal: """Convert through text and round monetary values consistently.""" return Decimal(str(value or 0)).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_` (стр. 10)
- `money_intdef money_int(value: object) -> int: return int(money(value).quantize(Decimal(1), rounding=ROUND_HALF_UP))` (стр. 15)
- `prorated_monthly_salarydef prorated_monthly_salary(monthly_salary: object, date_from: date, date_to: date) -> Decimal: """Prorate a monthly salary over inclusive calendar dates, month by month.""" if dat` (стр. 19)
- `salary_base_for_perioddef salary_base_for_period( monthly_salary: object, date_from: date, date_to: date, *, period: str, today: date | None = None,` (стр. 36)

### backend/app/finance_sync.py (52 строк)

Классы и функции (1):

- `sync_expense_piggy_transactiondef sync_expense_piggy_transaction(db: Session, expense: Expense) -> None: """Keep the single piggy transaction linked to an expense in sync.""" # Зарплатные расходы (премии/авансы` (стр. 14)

### backend/app/google_calendar.py (1944 строк)

Классы и функции (68):

- `_appsetting_modeldef _appsetting_model(): """Ленивый импорт модели AppSetting (обход циклических зависимостей).""" global _AppSetting if _AppSetting is None: from .models import AppSetting _AppSett` (стр. 69)
- `is_configureddef is_configured(settings: Settings, db: Any = None) -> bool: """True, если заданы учётные данные Google Calendar. Учётные данные берутся из БД (заполняются владельцем через UI), ` (стр. 79)
- `load_credentialsdef load_credentials(db: Any) -> dict[str, Any]: """Вернуть учётные данные OAuth-клиента из БД или пустой dict. Владелец может ввести client_id/secret прямо в интерфейсе настроек (` (стр. 89)
- `save_credentialsdef save_credentials(db: Any, credentials: dict[str, Any]) -> None: """Сохранить учётные данные OAuth-клиента (upsert).""" AppSetting = _appsetting_model() row = db.get(AppSetting,` (стр. 103)
- `clear_credentialsdef clear_credentials(db: Any) -> None: """Удалить сохранённые в БД учётные данные OAuth-клиента.""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALENDAR_CREDE` (стр. 115)
- `_default_connectiondef _default_connection(tokens: dict[str, Any] | None = None) -> dict[str, Any]: """Шаблон подключения владельца.""" return { "id": OWNER_CONNECTION_ID, "name": "Владелец", "email"` (стр. 129)
- `_read_legacy_tokensdef _read_legacy_tokens(db: Any) -> dict[str, Any]: """Токены из старого ключа google_calendar_tokens (до мультиподключения).""" AppSetting = _appsetting_model() row = db.get(AppSe` (стр. 141)
- `_read_connectionsdef _read_connections(db: Any) -> list[dict[str, Any]]: """Прочитать список подключений (полные dict с токенами). Совместимость: если ключ подключений отсутствует/пуст, но есть leg` (стр. 153)
- `_write_connectionsdef _write_connections(db: Any, connections: list[dict[str, Any]]) -> None: """Сохранить весь список подключений (upsert) и завершить legacy-миграцию. Ключи с префиксом "_" (служеб` (стр. 178)
- `get_connectiondef get_connection(db: Any, connection_id: str) -> dict[str, Any] | None: """Полное подключение по id (с токенами) или None.""" for conn in _read_connections(db):` (стр. 203)
- `list_connectionsdef list_connections(db: Any) -> list[dict[str, Any]]: """Публичный список подключений (без токенов) — для UI владельца.""" return [ { "id": str(conn.get("id") or ""), "name": str(` (стр. 211)
- `upsert_connectiondef upsert_connection(db: Any, connection: dict[str, Any]) -> None: """Добавить подключение или обновить существующее (по полю id).""" connections = _read_connections(db) conn_id =` (стр. 224)
- `delete_connectiondef delete_connection(db: Any, connection_id: str) -> bool: """Удалить одно подключение. True, если оно существовало.""" connections = _read_connections(db) remaining = [c for c in` (стр. 237)
- `_usable_connectionsdef _usable_connections(db: Any) -> list[dict[str, Any]]: """Подключения, готовые к запросам (есть refresh_token).""" return [ conn for conn in _read_connections(db) if isinstance(` (стр. 247)
- `_persist_dirty_connectionsdef _persist_dirty_connections(db: Any, connections: list[dict[str, Any]]) -> None: """Сохранить подключения с изменёнными токенами/sync_token (маркер _dirty). Маркер ставится при ` (стр. 256)
- `create_invitedef create_invite(db: Any, label: str, state: str) -> dict[str, Any]: """Запомнить приглашение: state OAuth-ссылки -> имя приглашённого.""" invite = { "state": state, "label": labe` (стр. 272)
- `consume_invitedef consume_invite(db: Any, state: str) -> dict[str, Any] | None: """Найти приглашение по state и удалить его (одноразовое).""" AppSetting = _appsetting_model() row = db.get(AppSet` (стр. 297)
- `clear_invitesdef clear_invites(db: Any) -> None: """Удалить все ожидающие приглашения (например, при полном отключении).""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALE` (стр. 320)
- `extract_account_emaildef extract_account_email(tokens: dict[str, Any] | None) -> str: """Email Google-аккаунта из id_token (JWT payload), если он есть. Scope email добавлен к запросу авторизации, поэто` (стр. 329)
- `_resolve_credsdef _resolve_creds( db: Any, settings: Settings, *, fallback_redirect_uri: str = "",` (стр. 346)
- `load_tokensdef load_tokens(db: Any) -> dict[str, Any]: """Вернуть OAuth-токены первого подключения или пустой dict. Совместимость: функция сохранена для старого кода/тестов — в мультиподключе` (стр. 378)
- `save_tokensdef save_tokens(db: Any, tokens: dict[str, Any]) -> None: """Сохранить OAuth-токены в первое подключение (создать при отсутствии). Совместимость со старым кодом: раньше токены лежа` (стр. 396)
- `clear_tokensdef clear_tokens(db: Any) -> None: """Отключить интеграцию полностью: удалить все подключения и состояние.""" AppSetting = _appsetting_model() for key in ( GOOGLE_CALENDAR_TOKENS_K` (стр. 411)
- `_is_token_revoked_errordef _is_token_revoked_error(exc: _GoogleApiError) -> bool: """True, если ошибка — истёкший/отозванный токен (нужен повторный OAuth). Google возвращает 400 invalid_grant с описанием` (стр. 435)
- `_disable_integration_on_revokeddef _disable_integration_on_revoked(db: Any, connection_id: str | None = None) -> None: """Отключить Google Calendar при отозванном токене. Если задан connection_id — удаляем тольк` (стр. 457)
- `_client_configdef _client_config(settings: Settings) -> dict[str, Any]: """Базовый client_config для построения OAuth-запросов.""" redirect_uri = settings.google_calendar_redirect_uri return { "` (стр. 484)
- `build_auth_urldef build_auth_url( settings: Settings, state: str, db: Any = None, *, fallback_redirect_uri: str = ""` (стр. 494)
- `exchange_codedef exchange_code( settings: Settings, code: str, db: Any = None, *, fallback_redirect_uri: str = ""` (стр. 516)
- `class _GoogleApiError(Exception):` (стр. 550)
- `_GoogleApiError.__init__def __init__( self, status: int, message: str = "", *, reason: str | None = None, details: str | None = None,` (стр. 558)
- `_google_error_from_responsedef _google_error_from_response(resp: Any) -> tuple[str | None, str | None]: """Извлечь (reason, details) из тела ошибки Google API, если возможно. Calendar API: {"error": {"reason` (стр. 572)
- `_refresh_access_tokendef _refresh_access_token( settings: Settings, tokens: dict[str, Any], db: Any = None` (стр. 596)
- `_calendar_requestdef _calendar_request( db: Any, settings: Settings, method: str, path: str, *, params: dict[str, Any] | None = None, body: dict[str, Any] | None = None, conn: dict[str, Any] | None` (стр. 621)
- `_source_labeldef _source_label(source: Any) -> str: """Подпись источника записи для Google-события.""" return SOURCE_LABELS.get(source or "", "CRM")` (стр. 687)
- `_booking_event_bodydef _booking_event_body(booking: Any, settings: Settings) -> dict[str, Any]: """Сформировать тело Google-события из записи Booking.""" from zoneinfo import ZoneInfo # type: ignore ` (стр. 692)
- `sync_booking_to_calendardef sync_booking_to_calendar( db: Any, settings: Settings, booking: Any, *, action: str = "upsert"` (стр. 742)
- `_connection_event_idsdef _connection_event_ids(booking: Any, connections: list[dict[str, Any]]) -> dict[str, str]: """Карта {connection_id: event_id} для записи. Совместимость: у записей, созданных до ` (стр. 786)
- `_sync_booking_to_calendar_impldef _sync_booking_to_calendar_impl( db: Any, settings: Settings, booking: Any, *, action: str` (стр. 806)
- `_load_sync_tokendef _load_sync_token(db: Any) -> str | None: """syncToken первого подключения (совместимость) или None.""" connections = _read_connections(db) if not connections: return None retur` (стр. 942)
- `_save_sync_tokendef _save_sync_token(db: Any, sync_token: str | None) -> None: """Сохранить syncToken первого подключения (совместимость).""" connections = _read_connections(db) if not connections` (стр. 950)
- `_set_connection_sync_tokendef _set_connection_sync_token(conn: dict[str, Any], sync_token: str | None) -> None: """Отметить syncToken подключения (сохранится через _persist_dirty).""" conn["sync_token"] = s` (стр. 960)
- `last_sync_atdef last_sync_at(db: Any) -> str | None: """ISO-метка последней успешной обратной синхронизации или None.""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALEND` (стр. 966)
- `_save_last_syncdef _save_last_sync(db: Any) -> None: AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALENDAR_LAST_SYNC_KEY) now = datetime.now(timezone.utc).isoformat() if row i` (стр. 975)
- `_parse_google_datetimedef _parse_google_datetime(raw: str) -> datetime | None: """RFC3339 (dateTime или date) -> aware datetime, или None."""` (стр. 987)
- `_event_start_enddef _event_start_end( event: dict[str, Any], settings: Settings` (стр. 995)
- `_parse_event_descriptiondef _parse_event_description(description: Any) -> dict[str, str]: """Извлечь поля «Ключ: значение» из описания Google-события.""" fields: dict[str, str] = {} if not description: re` (стр. 1020)
- `_extract_plate_from_textdef _extract_plate_from_text(text: str) -> str: """Найти госномер в свободном тексте (или пустую строку). Сначала российские (авто + мото), затем иностранные. Иностранные распознаё` (стр. 1164)
- `_extract_phone_from_textdef _extract_phone_from_text(text: str) -> str: """Найти российский мобильный телефон в свободном тексте (или пустую строку). Перебор всех подстрок 10-11 цифр: соседние цифры (напр` (стр. 1188)
- `_extract_name_from_textdef _extract_name_from_text(text: str) -> str: """Найти имя клиента по словарю русских имён (или пустую строку).""" for token in re.findall(r"[А-ЯЁа-яё]+", text):` (стр. 1212)
- `_is_plausible_namedef _is_plausible_name(word: str) -> bool: """Подходит ли слово на роль имени клиента (кириллица, не служебное).""" if not re.fullmatch(r"[А-ЯЁа-яё]+", word):` (стр. 1221)
- `_extract_name_by_phone_neighborhooddef _extract_name_by_phone_neighborhood(text: str, phone: str) -> str: """Определить имя клиента по соседству с телефоном (или пустую строку). Когда у события есть свободный текст,` (стр. 1232)
- `_title_case_wordsdef _title_case_words(value: str) -> str: """Привести каждое слово к виду «С заглавной», сохранив аббревиатуры. «тойота камри» -> «Тойота Камри», «BMW x5» -> «BMW X5», «BMW» остане` (стр. 1257)
- `_extract_vehicle_from_textdef _extract_vehicle_from_text(text: str) -> str: """Найти марку и модель автомобиля в свободном тексте (или пустую строку).""" from .schemas import normalize_vehicle_name lowered ` (стр. 1271)
- `_normalize_for_matchdef _normalize_for_match(value: str) -> str: """Нижний регистр без «ё» и лишних пробелов — для сопоставления названий.""" return re.sub(r"\s+", " ", value.lower().replace("ё", "е")` (стр. 1309)
- `_match_service_in_textdef _match_service_in_text(service_names: list[str], text: str) -> str: """Найти услугу из каталога в тексте; вернуть пусто, если нет. Сопоставляем по префиксу названия услуги (от ` (стр. 1314)
- `_parse_event_text_loosedef _parse_event_text_loose(text: Any, service_names: list[str]) -> dict[str, str]: """Определить поля (госномер, телефон, имя, авто, услуга) из свободного текста. Данные могут идт` (стр. 1345)
- `_active_service_namesdef _active_service_names(db: Any) -> list[str]: """Названия активных услуг из каталога — для распознавания в тексте события.""" from .models import Service return [row.name for ro` (стр. 1417)
- `_booking_by_google_eventdef _booking_by_google_event(db: Any, event_id: str) -> Any | None: """Запись по идентификатору события Google из любого подключённого календаря.""" from .models import Booking boo` (стр. 1424)
- `_event_updated_utcdef _event_updated_utc(event: dict[str, Any]) -> datetime | None: """Метка «когда событие последний раз правилось» (event.updated) в UTC.""" raw = event.get("updated") if not raw: ` (стр. 1446)
- `_event_is_staledef _event_is_stale(event: dict[str, Any], booking: Any) -> bool: """Правилось ли событие ПОЗЖЕ последней записи записи в Google. True — событие не менялось после того, как запись ` (стр. 1457)
- `_update_booking_from_eventdef _update_booking_from_event( db: Any, booking: Any, event: dict[str, Any], settings: Settings` (стр. 1476)
- `_find_duplicate_bookingdef _find_duplicate_booking( db: Any, client_id: str, date: str, time: str` (стр. 1588)
- `_create_booking_from_eventdef _create_booking_from_event( db: Any, event: dict[str, Any], settings: Settings` (стр. 1613)
- `_apply_calendar_eventdef _apply_calendar_event( db: Any, settings: Settings, event: dict[str, Any], result: dict[str, Any]` (стр. 1735)
- `pull_calendar_changesdef pull_calendar_changes(db: Any, settings: Settings) -> dict[str, Any]: """Обратная синхронизация «Google Calendar -> CRM» по ВСЕМ подключениям. Инкрементальная через syncToken (` (стр. 1773)
- `_empty_pull_resultdef _empty_pull_result() -> dict[str, Any]: return { "ok": True, "skipped": False, "created": 0, "updated": 0, "cancelled": 0, "duplicates": 0, "error": None, }` (стр. 1806)
- `_pull_one_calendardef _pull_one_calendar(db: Any, settings: Settings, conn: dict[str, Any]) -> dict[str, Any]: """Обратная синхронизация одного календаря. Возвращает свою статистику. result["ok"]=Fa` (стр. 1818)
- `_pull_calendar_changes_impldef _pull_calendar_changes_impl(db: Any, settings: Settings) -> dict[str, Any]: result = _empty_pull_result() if not is_configured(settings, db):` (стр. 1872)

### backend/app/main.py (24128 строк)

Роуты (139):

```
  `POST /api/auth/client` -> `register_or_login_client` (декоратор: стр. 6047)
  `POST /api/auth/staff/login` -> `staff_login` (декоратор: стр. 6160)
  `POST /api/auth/telegram` -> `authenticate_via_telegram` (декоратор: стр. 6210)
  `POST /api/auth/staff/link` -> `link_staff_account` (декоратор: стр. 6232)
  `POST /api/auth/telegram-owner` -> `authenticate_primary_owner_via_telegram` (декоратор: стр. 6282)
  `POST /api/auth/switch-role` -> `switch_role` (декоратор: стр. 6319)
  `POST /api/owner/database-reset/start` -> `start_owner_database_reset` (декоратор: стр. 8284)
  `POST /api/owner/database-reset/approve` -> `approve_owner_database_reset` (декоратор: стр. 8340)
  `POST /api/owner/database-reset/execute` -> `execute_owner_database_reset` (декоратор: стр. 8394)
  `GET /api/owner/exports/{kind}` -> `download_owner_export` (декоратор: стр. 9324)
  `POST /api/owner/exports/{kind}/telegram` -> `send_owner_export_to_telegram` (декоратор: стр. 9356)
  `POST /api/owner/reports/{period}/{segment}/telegram` -> `send_owner_summary_report_to_telegram` (декоратор: стр. 9388)
  `PATCH /api/clients/me` -> `update_client_me` (декоратор: стр. 10584)
  `DELETE /api/clients/{client_id}` -> `delete_client` (декоратор: стр. 10664)
  `PATCH /api/clients/{client_id}/card` -> `update_client_card` (декоратор: стр. 10689)
  `POST /api/clients` -> `create_client` (декоратор: стр. 10789)
  `GET /api/health` -> `health` (декоратор: стр. 10845)
  `GET /api/debug/encoding` -> `debug_encoding` (декоратор: стр. 10870)
  `GET /api/debug/db` -> `debug_db` (декоратор: стр. 10876)
  `GET /api/debug/mojibake-scan` -> `debug_mojibake_scan` (декоратор: стр. 10957)
  `POST /api/debug/mojibake-repair` -> `debug_mojibake_repair` (декоратор: стр. 10967)
  `GET /api/content` -> `get_public_content` (декоратор: стр. 11157)
  `PUT /api/content` -> `save_content` (декоратор: стр. 11171)
  `POST /api/upload` -> `upload_file` (декоратор: стр. 11235)
  `GET /api/uploads/{filename}` -> `serve_upload` (декоратор: стр. 11287)
  `POST /api/contact` -> `submit_contact` (декоратор: стр. 11308)
  `POST settings.telegram_webhook_path` -> `handle_telegram_webhook` (декоратор: стр. 11358)
  `POST /api/telegram/webhook/sync` -> `resync_telegram_webhook` (декоратор: стр. 11408)
  `GET /api/stock-categories` -> `list_stock_categories` (декоратор: стр. 11490)
  `POST /api/stock-categories` -> `create_stock_category` (декоратор: стр. 11503)
  `PATCH /api/stock-categories/{category_id}` -> `update_stock_category` (декоратор: стр. 11528)
  `DELETE /api/stock-categories/{category_id}` -> `delete_stock_category` (декоратор: стр. 11561)
  `GET /api/bookings/availability` -> `get_booking_availability` (декоратор: стр. 11595)
  `POST /api/bookings` -> `create_booking` (декоратор: стр. 11666)
  `PATCH /api/bookings/{booking_id}` -> `update_booking` (декоратор: стр. 12931)
  `DELETE /api/bookings/{booking_id}` -> `delete_booking` (декоратор: стр. 13615)
  `POST /api/bookings/{booking_id}/services` -> `add_booking_service` (декоратор: стр. 13715)
  `POST /api/bookings/{booking_id}/additional-services` -> `add_booking_additional_service` (декоратор: стр. 13781)
  `DELETE /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `remove_booking_additional_service` (декоратор: стр. 13918)
  `PATCH /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `update_booking_additional_service` (декоратор: стр. 13990)
  `POST /api/notifications` -> `create_notification` (декоратор: стр. 14083)
  `PATCH /api/notifications/{notification_id}/read` -> `mark_notification_read` (декоратор: стр. 14163)
  `POST /api/notifications/read-all` -> `mark_all_notifications_read` (декоратор: стр. 14241)
  `POST /api/stock-items` -> `create_stock_item` (декоратор: стр. 14307)
  `PATCH /api/stock-items/{item_id}` -> `update_stock_item` (декоратор: стр. 14343)
  `POST /api/stock-items/{item_id}/write-off` -> `write_off_stock` (декоратор: стр. 14391)
  `GET /api/stock/write-off-history` -> `get_write_off_history` (декоратор: стр. 14440)
  `DELETE /api/stock-items/{item_id}` -> `delete_stock_item` (декоратор: стр. 14471)
  `GET /api/shift-checklists` -> `list_shift_checklists` (декоратор: стр. 14507)
  `POST /api/shift-checklists` -> `submit_shift_checklist` (декоратор: стр. 14549)
  `GET /api/admin/shift-inspections` -> `list_admin_shift_inspections` (декоратор: стр. 14671)
  `GET /api/admin/shift-inspections/{inspection_id}/photo` -> `get_admin_shift_inspection_photo` (декоратор: стр. 14717)
  `POST /api/admin/shift-inspections` -> `submit_admin_shift_inspection` (декоратор: стр. 14799)
  `POST /api/admin/shift-inspections/{inspection_id}/review` -> `review_admin_shift_inspection` (декоратор: стр. 14955)
  `POST /api/owner/shift-openings` -> `open_shift_for_masters` (декоратор: стр. 14994)
  `POST /api/expenses` -> `create_expense` (декоратор: стр. 15120)
  `PATCH /api/expenses/{expense_id}` -> `update_expense` (декоратор: стр. 15166)
  `GET /api/owner/incomes` -> `list_incomes` (декоратор: стр. 15232)
  `POST /api/owner/incomes` -> `create_income` (декоратор: стр. 15280)
  `PATCH /api/owner/incomes/{income_id}` -> `update_income` (декоратор: стр. 15344)
  `GET /api/owner/piggy-bank` -> `get_piggy_bank` (декоратор: стр. 15437)
  `POST /api/owner/piggy-bank/withdraw` -> `piggy_bank_withdraw` (декоратор: стр. 15969)
  `POST /api/owner/piggy-bank/adjust` -> `piggy_bank_adjust` (декоратор: стр. 16264)
  `GET /api/owner/deposits` -> `list_deposit_clients` (декоратор: стр. 16710)
  `PATCH /api/owner/deposits/{client_id}` -> `update_deposit_subscription` (декоратор: стр. 16754)
  `POST /api/owner/deposits/{client_id}/topup` -> `deposit_topup` (декоратор: стр. 16789)
  `POST /api/owner/deposits/{client_id}/adjust` -> `deposit_adjust` (декоратор: стр. 16816)
  `GET /api/owner/deposits/export-all.xlsx` -> `deposit_export_all_excel` (декоратор: стр. 16842)
  `POST /api/owner/deposits/export-all.xlsx/telegram` -> `deposit_export_all_excel_telegram` (декоратор: стр. 16860)
  `POST /api/owner/deposits/{client_id}/export.xlsx/telegram` -> `deposit_export_excel_telegram` (декоратор: стр. 16872)
  `GET /api/owner/deposits/{client_id}` -> `get_deposit_overview` (декоратор: стр. 16890)
  `POST /api/owner/deposits/{client_id}/washes` -> `deposit_record_wash` (декоратор: стр. 16903)
  `POST /api/owner/deposits/{client_id}/settle-month` -> `deposit_settle_month` (декоратор: стр. 16982)
  `GET /api/owner/deposits/{client_id}/export.xlsx` -> `deposit_export_excel` (декоратор: стр. 17067)
  `GET /api/owner/wallet` -> `get_wallet` (декоратор: стр. 17127)
  `GET /api/owner/workers/{worker_id}/shift-attendance` -> `get_worker_shift_attendance` (декоратор: стр. 17352)
  `GET /api/owner/shift-attendance` -> `get_all_workers_shift_attendance` (декоратор: стр. 17448)
  `GET /api/worker/shift-attendance` -> `get_own_shift_attendance` (декоратор: стр. 17528)
  `GET /api/worker/calendar` -> `get_worker_calendar_bookings` (декоратор: стр. 17596)
  `GET /api/worker/cars/search` -> `search_worker_cars` (декоратор: стр. 17735)
  `POST /api/penalties` -> `create_penalty` (декоратор: стр. 17817)
  `POST /api/penalties/{penalty_id}/revoke` -> `revoke_penalty` (декоратор: стр. 17967)
  `POST /api/workers/{worker_id}/penalties/revoke-all` -> `revoke_all_worker_penalties` (декоратор: стр. 18109)
  `POST /api/telegram/link-code` -> `generate_telegram_link_code` (декоратор: стр. 18255)
  `PUT /api/settings/services` -> `save_services` (декоратор: стр. 18309)
  `PUT /api/settings/boxes` -> `save_boxes` (декоратор: стр. 18385)
  `PUT /api/settings/schedule` -> `save_schedule` (декоратор: стр. 18443)
  `PUT /api/settings/admin/profile` -> `save_admin_profile` (декоратор: стр. 18491)
  `PUT /api/settings/admin/notifications` -> `save_admin_notifications` (декоратор: стр. 18565)
  `PUT /api/settings/workers/{worker_id}/profile` -> `save_worker_profile` (декоратор: стр. 18589)
  `PUT /api/settings/workers/{worker_id}/notifications` -> `save_worker_notifications` (декоратор: стр. 18649)
  `PUT /api/settings/owner/company` -> `save_owner_company` (декоратор: стр. 18691)
  `PUT /api/settings/owner/notifications` -> `save_owner_notifications` (декоратор: стр. 18715)
  `PUT /api/settings/owner/integrations` -> `save_owner_integrations` (декоратор: стр. 18739)
  `GET /api/owner/integrations/google/auth-url` -> `get_google_calendar_auth_url` (декоратор: стр. 18774)
  `GET /api/owner/integrations/google/callback` -> `google_calendar_callback` (декоратор: стр. 18845)
  `POST /api/owner/integrations/google/disconnect` -> `disconnect_google_calendar` (декоратор: стр. 18943)
  `GET /api/owner/integrations/google/status` -> `get_google_calendar_status` (декоратор: стр. 18962)
  `POST /api/owner/integrations/google/invites` -> `create_google_calendar_invite` (декоратор: стр. 18999)
  `DELETE /api/owner/integrations/google/connections/{connection_id}` -> `delete_google_calendar_connection` (декоратор: стр. 19034)
  `PUT /api/owner/integrations/google/credentials` -> `save_google_calendar_credentials` (декоратор: стр. 19060)
  `DELETE /api/owner/integrations/google/credentials` -> `delete_google_calendar_credentials` (декоратор: стр. 19093)
  `POST /api/owner/integrations/google/sync` -> `sync_google_calendar_now` (декоратор: стр. 19105)
  `GET /api/cron/google-sync` -> `run_google_calendar_sync_cron` (декоратор: стр. 19129)
  `GET /api/cron/reminders` -> `run_reminders_cron` (декоратор: стр. 19154)
  `POST /api/owner/inactive-clients/remind-admin` -> `remind_admin_about_inactive_clients` (декоратор: стр. 19186)
  `POST /api/owner/reminders/dispatch` -> `dispatch_owner_booking_reminders` (декоратор: стр. 19244)
  `GET /api/cron/reports` -> `run_reports_cron` (декоратор: стр. 19263)
  `PUT /api/settings/owner/security` -> `save_owner_security` (декоратор: стр. 19309)
  `PUT /api/workers/settings` -> `save_worker_settings` (декоратор: стр. 19345)
  `GET /api/admin/workers/payroll` -> `get_admin_workers_payroll` (декоратор: стр. 19448)
  `PUT /api/admin/workers/payroll` -> `save_admin_worker_payroll` (декоратор: стр. 19548)
  `GET /api/owner/outsource/payroll` -> `get_owner_outsource_payroll` (декоратор: стр. 19617)
  `POST /api/payroll/entries` -> `create_payroll_entry` (декоратор: стр. 19687)
  `PUT /api/payroll/entries/{entry_id}` -> `update_payroll_entry` (декоратор: стр. 19968)
  `DELETE /api/payroll/entries/{entry_id}` -> `delete_payroll_entry` (декоратор: стр. 20126)
  `PUT /api/payroll/booking-workers/{link_id}/override-earned` -> `update_booking_worker_override_earned` (декоратор: стр. 20216)
  `GET /api/owner/bookings-history` -> `get_owner_bookings_history` (декоратор: стр. 20441)
  `GET /api/owner/bookings-history/totals` -> `get_owner_bookings_history_totals` (декоратор: стр. 20529)
  `GET /api/owner/archive` -> `get_owner_archive` (декоратор: стр. 20702)
  `GET /api/owner/money-flow` -> `get_owner_money_flow` (декоратор: стр. 21016)
  `GET /api/owner/bookings/{booking_id}/money-split` -> `get_owner_booking_money_split` (декоратор: стр. 21523)
  `PUT /api/owner/bookings/{booking_id}/money-split` -> `update_owner_booking_money_split` (декоратор: стр. 21537)
  `GET /api/owner/workers/{worker_id}/salary-detail` -> `owner_worker_salary_detail` (декоратор: стр. 21926)
  `GET /api/worker/salary-detail` -> `worker_my_salary_detail` (декоратор: стр. 22375)
  `POST /api/owner/workers/{worker_id}/pay-salary` -> `owner_worker_pay_salary` (декоратор: стр. 22783)
  `GET /api/owner/owners/salary-detail` -> `owner_salary_detail` (декоратор: стр. 23044)
  `POST /api/owner/owners/pay-salary` -> `owner_pay_salary` (декоратор: стр. 23292)
  `POST /api/workers` -> `create_worker` (декоратор: стр. 23541)
  `POST /api/workers/{worker_id}/reset-password` -> `reset_worker_password` (декоратор: стр. 23679)
  `DELETE /api/workers/{worker_id}` -> `fire_worker` (декоратор: стр. 23739)
  `GET /api/auth/session` -> `get_session_bootstrap` (декоратор: стр. 23933)
  `GET /api/auth/role-preview` -> `get_role_preview` (декоратор: стр. 23947)
  `POST /api/auth/role-preview` -> `set_role_preview` (декоратор: стр. 23962)
  `GET /api/auth/consent/check` -> `check_consent` (декоратор: стр. 24014)
  `POST /api/auth/consent` -> `record_consent` (декоратор: стр. 24026)
  `GET /api/auth/sessions` -> `get_active_sessions` (декоратор: стр. 24050)
  `POST /api/auth/logout` -> `logout` (декоратор: стр. 24058)
  `POST /api/auth/change-password` -> `change_password` (декоратор: стр. 24071)
```

Классы и функции (268):

- `_resolve_frontend_distdef _resolve_frontend_dist() -> Path: """Каталог собранного React-фронтенда. В обычном режиме — <project>/frontend/dist (родитель каталога app/). В frozen-режиме (PyInstaller bundl` (стр. 583)
- `class AsciiJSONResponse(JSONResponse):` (стр. 780)
- `AsciiJSONResponse.renderdef render(self, content) -> bytes: # Пробуем отдать чистый ASCII \u0412... чтобы WebView, игнорирующий charset, всё равно показал В # Если WebView всё равно декодирует как windows` (стр. 781)
- `_validation_error_handlerasync def _validation_error_handler( request: Request, exc: RequestValidationError` (стр. 828)
- `_check_rate_limitdef _check_rate_limit(ip: str) -> None: global _last_rate_limit_cleanup now = time_module.time() window_start = now - _LOGIN_RATE_LIMIT_WINDOW # Periodic cleanup of stale entries t` (стр. 860)
- `add_security_headersasync def add_security_headers(request: Request, call_next): response = await call_next(request) for key, value in SECURITY_HEADERS.items():` (стр. 953)
- `serve_single_page_appasync def serve_single_page_app(request: Request, call_next): path = request.url.path index_file = frontend_dist / "index.html" if request.method not in {"GET", "HEAD"}: return awa` (стр. 979)
- `on_startupdef on_startup() -> None: global bot_thread Base.metadata.create_all(bind=engine) _apply_runtime_migrations() db = next(get_db()) try: seed_database(db, include_demo_staff=settings` (стр. 1027)
- `start_google_sync_threaddef start_google_sync_thread() -> None: """Запускает фоновый цикл синхронизации «Google Calendar -> CRM» (daemon-поток). Поток нужен только при настроенной интеграции: учётные данн` (стр. 1112)
- `_nowdef _now() -> datetime: return datetime.now(timezone.utc)` (стр. 1142)
- `_local_day_boundsdef _local_day_bounds(date_str: str) -> tuple[datetime, datetime]: """Границы локального дня (DD.MM.YYYY) в UTC: (00:00, 23:59:59) местного времени. Периоды ЗП считаются по локальн` (стр. 1147)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 1162)
- `_format_moscow_dtdef _format_moscow_dt(dt: datetime | None) -> str: if dt is None: return "" msk = dt.astimezone(timezone(timedelta(hours=3))) return msk.strftime("%H:%M %d.%m.%Y")` (стр. 1171)
- `_request_ipdef _request_ip(request: Request) -> str: # For rate limiting, prefer direct client IP to prevent X-Forwarded-For spoofing if request.client is not None and request.client.host: re` (стр. 1182)
- `_safe_textdef _safe_text(value: Any) -> str: return value if isinstance(value, str) else ""` (стр. 1202)
- `_client_by_phonedef _client_by_phone(db: Session, phone: str) -> Client | None: if not phone.strip():` (стр. 1210)
- `_owner_querydef _owner_query(): return ( select(StaffUser) .where(StaffUser.role == "owner") .order_by(StaffUser.created_at.asc(), StaffUser.id.asc()) )` (стр. 1248)
- `_primary_ownerdef _primary_owner(db: Session) -> StaffUser | None: return db.scalar( select(StaffUser) .where(StaffUser.role == "owner", StaffUser.is_primary_owner.is_(True)) .order_by(StaffUser` (стр. 1264)
- `_owner_master_conditiondef _owner_master_condition() -> Any: """Владелец, которому дополнительно выдана роль мастера (extra_roles != []). Такие владельцы попадают в списки мастеров: назначение на записи,` (стр. 1280)
- `_is_owner_masterdef _is_owner_master(worker: StaffUser) -> bool: return worker.role == "owner" and bool(worker.extra_roles)` (стр. 1295)
- `_ensure_permanent_telegram_ownersdef _ensure_permanent_telegram_owners(db: Session) -> None: """Upsert explicitly configured owners without reassigning existing rows.""" for staff_id, login, chat_id, owner_name in` (стр. 1302)
- `_ensure_owner_accountsdef _ensure_owner_accounts(db: Session) -> None: owners = db.scalars(_owner_query()).all() primary_owner = next((owner for owner in owners if owner.is_primary_owner), None) if prim` (стр. 1408)
- `_device_labeldef _device_label(user_agent: str) -> str: if "Telegram-Android" in user_agent: return "Telegram Android" if "Telegram-iOS" in user_agent: return "Telegram iPhone" if "iPhone" in u` (стр. 1536)
- `_apply_runtime_migrationsdef _apply_runtime_migrations() -> None: from sqlalchemy import text def boolean_default_sql(value: bool) -> str:` (стр. 1572)
- `AsciiJSONResponse.boolean_default_sqldef boolean_default_sql(value: bool) -> str: if engine.dialect.name == "postgresql": return "TRUE" if value else "FALSE" return "1" if value else "0"` (стр. 1576)
- `AsciiJSONResponse.ensure_postgres_varchar_lengthdef ensure_postgres_varchar_length( table_name: str, column_name: str, minimum_length: int` (стр. 1586)
- `AsciiJSONResponse.ensure_postgres_text_columndef ensure_postgres_text_column(table_name: str, column_name: str) -> None: if engine.dialect.name != "postgresql": return column = next( ( item for item in inspect(engine).get_col` (стр. 1632)
- `_apply_default_shift_paydef _apply_default_shift_pay(db: Session) -> None: """Один раз выставляет оклад за смену DEFAULT_SHIFT_PAY сотрудникам (кроме владельцев), у которых ставка не задана (0). Выполняет` (стр. 2761)
- `_cyr_countdef _cyr_count(value: str) -> int: return sum(1 for ch in value if "\u0400" <= ch <= "\u04FF")` (стр. 2791)
- `_strict_utf8_variantsdef _strict_utf8_variants(value: str) -> list[str]: """Детерминированные кандидаты ремонта: строка является UTF-8 байтами, ошибочно декодированными как cp1251/cp1252/latin-1. Никак` (стр. 2801)
- `_repair_text_strict_stepdef _repair_text_strict_step(value: str) -> str | None: """Один шаг строгого ремонта: кандидат обязан содержать кириллицу или ₽.""" for fixed in _strict_utf8_variants(value):` (стр. 2855)
- `_repair_text_valuedef _repair_text_value(value: str) -> str: """Строгий ремонт mojibake (UTF-8 байты, декодированные как cp1251/cp1252/latin-1). Корректный текст не изменяется: кириллица/латиница/em` (стр. 2871)
- `_repair_nested_textdef _repair_nested_text(value): if isinstance(value, str):` (стр. 2905)
- `_repair_model_text_fieldsdef _repair_model_text_fields(db: Session, model, fields: tuple[str, ...]) -> bool: changed = False for item in db.scalars(select(model)).all():` (стр. 2925)
- `_sanitize_notification_messagedef _sanitize_notification_message(message: str) -> str: fixed = _repair_text_value(message).strip() for source, target in { "вЂў": "•", "в€¢": "•", "вВў": "•", "â€¢": "•", "вЂ”": ` (стр. 2953)
- `_repair_text_datadef _repair_text_data(db: Session) -> None: changed = False for model, fields in _TEXT_REPAIR_TARGETS: changed |= _repair_model_text_fields(db, model, fields) for notification in d` (стр. 3002)
- `get_db_with_text_repairdef get_db_with_text_repair() -> Any: """get_db с гарантированным одноразовым ремонтом mojibake. Vercel serverless не исполняет FastAPI startup-события, поэтому ремонт выполняется ` (стр. 3053)
- `_settingdef _setting(db: Session, key: str, default: dict) -> dict: row = db.get(AppSetting, key) if row: return row.value row = AppSetting(key=key, value=default) db.add(row) db.flush() r` (стр. 3089)
- `_merge_setting_dictdef _merge_setting_dict(value: Any, default: dict[str, Any]) -> dict[str, Any]: if not isinstance(value, dict):` (стр. 3109)
- `_normalize_client_vehiclesdef _normalize_client_vehicles( vehicles: list[ClientVehiclePayload] | list[dict[str, Any]] | None, *, fallback_car: str = "", fallback_plate: str = "",` (стр. 3133)
- `_client_vehicles_mapdef _client_vehicles_map(db: Session) -> dict[str, Any]: return _setting(db, "client_vehicles", {})` (стр. 3245)
- `_client_vehicles_payloaddef _client_vehicles_payload(db: Session, client: Client) -> list[ClientVehiclePayload]: raw = _client_vehicles_map(db).get(client.id, []) return _normalize_client_vehicles( raw, f` (стр. 3253)
- `_save_client_vehiclesdef _save_client_vehicles( db: Session, client_id: str, vehicles: list[ClientVehiclePayload]` (стр. 3267)
- `_client_phone_verifications_mapdef _client_phone_verifications_map(db: Session) -> dict[str, Any]: value = _setting(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) return value if isinstance(value, dict) else {}` (стр. 3287)
- `_client_verified_phone_digitsdef _client_verified_phone_digits(db: Session, telegram_id: str | None) -> str | None: if not telegram_id: return None entry = _client_phone_verifications_map(db).get(str(telegram_` (стр. 3297)
- `_client_phone_is_verifieddef _client_phone_is_verified(db: Session, telegram_id: str | None, phone: str) -> bool: if not phone.strip():` (стр. 3317)
- `_require_client_phone_verificationdef _require_client_phone_verification( db: Session, telegram_id: str | None, phone: str` (стр. 3343)
- `_client_payloaddef _client_payload(client: Client | None) -> ClientProfilePayload | None: if client is None: return None with Session(engine) as vehicles_db: vehicles = _client_vehicles_payload(v` (стр. 3365)
- `_client_summary_payloaddef _client_summary_payload( client: Client, db: Session | None = None` (стр. 3405)
- `_booking_status_labeldef _booking_status_label(status_value: str) -> str: return { "new": "Новая заявка", "confirmed": "Подтверждена", "scheduled": "Запланирована", "in_progress": "В работе", "complete` (стр. 3463)
- `_booking_status_short_labeldef _booking_status_short_label(status_value: str) -> str: return { "new": "Новая", "confirmed": "Подтв.", "scheduled": "Запл.", "in_progress": "В работе", "completed": "Завершена"` (стр. 3489)
- `_format_local_datetimedef _format_local_datetime(value: datetime) -> str: return _as_utc(value).astimezone().strftime("%d.%m.%Y %H:%M")` (стр. 3515)
- `_parse_booking_datetimedef _parse_booking_datetime(date_value: str, time_value: str) -> datetime | None: raw = f"{date_value.strip()} {time_value.strip()}" for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M")` (стр. 3523)
- `_py_weekday_to_schedule_indexdef _py_weekday_to_schedule_index(py_weekday: int) -> int: # Конвенция day_index (сид и фронт getScheduleDayIndex=(getDay()+1)%7): Сб=0, Вс=1, Пн=2..Пт=6. # Python weekday(): Пн=0.` (стр. 3543)
- `_parse_time_to_minutesdef _parse_time_to_minutes(time_value: str) -> int | None: raw = time_value.strip() if len(raw) != 5 or raw[2] != ":": return None try: hours = int(raw[:2]) minutes = int(raw[3:]) ` (стр. 3554)
- `_today_labeldef _today_label() -> str: return datetime.now().strftime("%d.%m.%Y")` (стр. 3582)
- `_build_schedule_slotsdef _build_schedule_slots( open_minutes: int, close_minutes: int, step_minutes: int = 30` (стр. 3590)
- `_booking_requires_scheduled_slotdef _booking_requires_scheduled_slot(status_value: str) -> bool: return status_value in BOOKING_ACTIVE_STATUSES` (стр. 3614)
- `_booking_slot_fields_changeddef _booking_slot_fields_changed(booking: Booking, updates: dict) -> bool: if "date" in updates and (updates.get("date") or "").strip() != (booking.date or "").strip():` (стр. 3622)
- `_booking_time_rangedef _booking_time_range( date_value: str, time_value: str, duration: int` (стр. 3642)
- `_time_ranges_overlapdef _time_ranges_overlap( start_at: datetime, end_at: datetime, other_start_at: datetime, other_end_at: datetime,` (стр. 3660)
- `_ensure_booking_datetime_not_in_pastdef _ensure_booking_datetime_not_in_past(date_value: str, time_value: str, role: str) -> None: if role in {"admin", "owner"}: return scheduled_at = _parse_booking_datetime(date_val` (стр. 3678)
- `_ensure_booking_within_scheduledef _ensure_booking_within_schedule( db: Session, date_value: str, time_value: str, duration: int` (стр. 3712)
- `_box_is_availabledef _box_is_available( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str,` (стр. 3786)
- `_pick_available_boxdef _pick_available_box( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, resource_group: str | None = None, preferred_box: str | None = Non` (стр. 3810)
- `_booking_slot_availabilitydef _booking_slot_availability( db: Session, *, date_value: str, duration: int, service_id: str | None = None, resource_group: str | None = None,` (стр. 3872)
- `_ensure_booking_has_no_conflictsdef _ensure_booking_has_no_conflicts( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str, worker_ids: set[str], …` (стр. 4024)
- `_load_penaltiesdef _load_penalties( db: Session, *, worker_ids: set[str] | None = None` (стр. 4068)
- `_complaints_by_workerdef _complaints_by_worker(penalties: list[Penalty]) -> dict[str, list[Penalty]]: grouped: dict[str, list[Penalty]] = {} for penalty in penalties: grouped.setdefault(penalty.worker_` (стр. 4094)
- `_normalize_worker_rulesdef _normalize_worker_rules(db: Session) -> None: changed = False workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker")).all() for worker in workers: capped_perc` (стр. 4108)
- `_worker_payloaddef _worker_payload(worker: StaffUser) -> WorkerPayload: return WorkerPayload( id=worker.id, role=worker.role, # type: ignore[arg-type] name=worker.name, experience=worker.experien` (стр. 4162)
- `_payroll_entry_payloaddef _payroll_entry_payload(entry: PayrollEntry, actor_name: str) -> PayrollEntryPayload: return PayrollEntryPayload( id=entry.id, workerId=entry.worker_id, kind=entry.kind, # type:` (стр. 4202)
- `_worker_payroll_summariesdef _worker_payroll_summaries( db: Session, workers: list[StaffUser], complaints_by_worker: dict[str, list[Penalty]],` (стр. 4230)
- `_worker_payroll_summaries_from_datadef _worker_payroll_summaries_from_data( db: Session, workers: list[StaffUser], completed_bookings: list[Booking], entries: list[PayrollEntry], complaints_by_worker: dict[str, list` (стр. 4278)
- `_worker_payload_with_payrolldef _worker_payload_with_payroll( worker: StaffUser, payroll_summaries: dict[str, WorkerPayrollSummaryPayload] | None = None,` (стр. 4458)
- `_booking_payloaddef _booking_payload( booking: Booking, complaints_by_worker: dict[str, list[Penalty]] | None = None` (стр. 4482)
- `_notification_payloaddef _notification_payload(notification: Notification) -> NotificationPayload: return NotificationPayload( id=notification.id, recipientRole=notification.recipient_role, # type: ign` (стр. 4652)
- `_stock_payloaddef _stock_payload(item: StockItem) -> StockItemPayload: return StockItemPayload( id=item.id, name=item.name, qty=item.qty, unit=item.unit, unitPrice=item.unit_price, category=item` (стр. 4674)
- `_expense_payloaddef _expense_payload(expense: Expense) -> ExpensePayload: return ExpensePayload( id=expense.id, title=expense.title, amount=money_int(expense.amount), category=expense.category, da` (стр. 4690)
- `_penalty_payloaddef _penalty_payload(penalty: Penalty) -> PenaltyPayload: worker_name = penalty.worker.name if penalty.worker else "" return PenaltyPayload( id=penalty.id, workerId=penalty.worker_` (стр. 4714)
- `_service_payloaddef _service_payload(service: Service) -> ServicePayload: return ServicePayload( id=service.id, name=service.name, category=service.category, price=service.price, duration=service.` (стр. 4744)
- `_box_payloaddef _box_payload(box: Box) -> BoxPayload: return BoxPayload( id=box.id, name=box.name, resourceGroup=(box.resource_group or DEFAULT_RESOURCE_GROUP).strip() or DEFAULT_RESOURCE_GROU` (стр. 4788)
- `_visible_boxesdef _visible_boxes(db: Session) -> list[Box]: boxes = db.scalars(select(Box).order_by(Box.name.asc())).all() wash_order_map = {name: index for index, name in enumerate(WASH_BOX_NAM` (стр. 4812)
- `AsciiJSONResponse.box_orderdef box_order(box: Box) -> tuple[int, int, str, str]: resource_group = _resource_group_key( box.resource_group or _default_box_resource_group(box) ) if resource_group == DETAILING_` (стр. 4822)
- `_schedule_payloaddef _schedule_payload(entry: ScheduleEntry) -> SchedulePayload: return SchedulePayload( dayIndex=entry.day_index, day=entry.day_label, open=entry.open_time, close=entry.close_time,` (стр. 4858)
- `_settings_payloaddef _settings_payload(db: Session) -> SettingsBundlePayload: admin_profile_default = { "name": "Администратор", "email": "", "phone": "", "telegramChatId": "", } admin_notification` (стр. 4878)
- `_empty_settings_payloaddef _empty_settings_payload() -> SettingsBundlePayload: return SettingsBundlePayload( adminProfile=AdminProfilePayload( name="", email="", phone="", telegramChatId="" ), adminNotif` (стр. 5102)
- `_scoped_settings_payloaddef _scoped_settings_payload( db: Session, role: str, actor_id: str` (стр. 5186)
- `_session_payloaddef _session_payload(session_data: dict) -> SessionPayload: return SessionPayload( role=session_data["role"], actorId=session_data["actorId"], sessionId=session_data.get("sessionId` (стр. 5272)
- `_mark_overdue_bookings_for_admin_reviewdef _mark_overdue_bookings_for_admin_review(db: Session) -> None: now_local = datetime.now().replace(second=0, microsecond=0) changed = False for booking in db.scalars( select(Book` (стр. 5298)
- `_build_bootstrapdef _build_bootstrap( db: Session, session_data: dict, role_preview: RolePreviewState | None = None,` (стр. 5342)
- `_resolve_user_from_init_datadef _resolve_user_from_init_data(authorization: str, db: Session) -> dict | None: try: validated = validate_telegram_init_data( authorization, settings.telegram_bot_token, max_age_` (стр. 5670)
- `_role_preview_setting_keydef _role_preview_setting_key(telegram_id: str) -> str: return f"{ROLE_PREVIEW_SETTING_PREFIX}{telegram_id}"` (стр. 5801)
- `_read_role_previewdef _read_role_preview(db: Session, telegram_id: str) -> dict: if not telegram_id or telegram_id not in CREATOR_TELEGRAM_IDS: return {} row = db.get(AppSetting, _role_preview_setti` (стр. 5805)
- `_write_role_previewdef _write_role_preview(db: Session, telegram_id: str, state: dict | None) -> None: if not telegram_id or telegram_id not in CREATOR_TELEGRAM_IDS: return key = _role_preview_settin` (стр. 5821)
- `_telegram_id_from_init_datadef _telegram_id_from_init_data(authorization: str) -> str: """Возвращает проверенный Telegram id или '' — без выброса исключений. Используется там, где отсутствие валидного initDa` (стр. 5838)
- `_preview_actor_querydef _preview_actor_query(db: Session, role: str) -> list[RolePreviewActor]: """Список аккаунтов, от имени которых можно посмотреть роль.""" if role == "client": rows = db.scalars( ` (стр. 5855)
- `_preview_session_datadef _preview_session_data(db: Session, role: str, actor_id: str) -> dict | None: """Собирает session_data для предпросмотра указанного аккаунта.""" if role == "client": client = db` (стр. 5890)
- `_apply_role_previewdef _apply_role_preview(db: Session, authorization: str, session_data: dict) -> dict: """Подменяет роль/аккаунт, если создатель включил предпросмотр.""" if not CREATOR_TELEGRAM_IDS` (стр. 5915)
- `_role_preview_statedef _role_preview_state(db: Session, authorization: str, session_data: dict) -> RolePreviewState: """Полное состояние переключателя для текущего пользователя.""" telegram_id = _tel` (стр. 5939)
- `_require_sessiondef _require_session( authorization: str | None = Header(default=None), db: Session = Depends(get_db),` (стр. 5977)
- `_extract_telegram_id_from_init_datadef _extract_telegram_id_from_init_data(authorization: str) -> str: if not authorization: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData") t` (стр. 6008)
- `_ensure_staff_roledef _ensure_staff_role(session_data: dict, allowed: set[str]) -> None: if session_data["role"] not in allowed: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Fo` (стр. 6352)
- `_validated_booking_workersdef _validated_booking_workers( db: Session, workers: list[BookingWorkerPayload]` (стр. 6362)
- `_ensure_worker_percent_capdef _ensure_worker_percent_cap(workers: list) -> None: """Суммарный процент бригады не может превышать 100 (M-001). Фронт такие бригады блокирует, API — нет: сплит переплачивал мас` (стр. 6458)
- `_ensure_subtract_fits_netdef _ensure_subtract_fits_net(db: Session, booking: Booking, new_subtract_total: int) -> None: """Вычет не может превышать базу (M-002). Subtract-carve-out паркуется в копилку как ` (стр. 6480)
- `_booking_payload_for_responsedef _booking_payload_for_response(db: Session, booking: Booking) -> BookingPayload: worker_ids = {link.worker_id for link in booking.worker_links} penalties = _load_penalties(db, w` (стр. 6513)
- `_sync_booking_workersdef _sync_booking_workers( db: Session, booking: Booking, workers: list[BookingWorkerPayload]` (стр. 6525)
- `_sync_booking_materialsdef _sync_booking_materials( db: Session, booking: Booking, materials: list[BookingMaterialPayload]` (стр. 6555)
- `_send_telegram_safedef _send_telegram_safe(chat_id: str | None, text: str) -> None: if not chat_id: logger.warning("Пропущена отправка Telegram-уведомления: у получателя нет chat_id") return try: sen` (стр. 6574)
- `_telegram_display_namedef _telegram_display_name(telegram_user: dict, fallback: str) -> str: first_name = str(telegram_user.get("first_name") or "").strip() last_name = str(telegram_user.get("last_name"` (стр. 6594)
- `_owner_two_factor_recipientdef _owner_two_factor_recipient(db: Session) -> StaffUser: owner = _primary_owner(db) if owner is None: raise HTTPException( status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail` (стр. 6610)
- `_all_active_ownersdef _all_active_owners(db: Session) -> list[StaffUser]: """Возвращает всех активных владельцев, отсортированных по created_at asc.""" return list( db.scalars( select(StaffUser) .wh` (стр. 6640)
- `_all_owner_telegram_recipientsdef _all_owner_telegram_recipients(db: Session) -> list[StaffUser]: """Возвращает всех владельцев с непустым telegram_chat_id, отсортированных по created_at asc.""" return list( db` (стр. 6662)
- `_booking_reminder_target_datedef _booking_reminder_target_date(days_ahead: int = 1) -> str: return (datetime.now() + timedelta(days=days_ahead)).strftime("%d.%m.%Y")` (стр. 6690)
- `_get_booking_reminder_hoursdef _get_booking_reminder_hours(owner_settings: dict[str, Any]) -> int: """Вытащить из настроек владельца за сколько часов слать напоминание (1..168).""" raw = owner_settings.get("` (стр. 6695)
- `_worker_notification_settings_mapdef _worker_notification_settings_map(db: Session) -> dict[str, dict[str, Any]]: return _setting(db, "worker_notification_settings", {})` (стр. 6717)
- `_booking_reminder_statedef _booking_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, BOOKING_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 6725)
- `_return_reminder_statedef _return_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, RETURN_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 6733)
- `_shift_checklists_statedef _shift_checklists_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, SHIFT_CHECKLISTS_KEY, []) return value if isinstance(value, list) else []` (стр. 6741)
- `_admin_shift_inspections_statedef _admin_shift_inspections_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, []) return value if isinstance(value, list) else []` (стр. 6751)
- `_compute_shift_attendancedef _compute_shift_attendance( inspections: list[dict], worker_id: str, date_from: date, date_to: date,` (стр. 6761)
- `_period_to_date_rangedef _period_to_date_range(period: str) -> tuple[date, date]: """ Преобразует строковый период в диапазон дат (date_from, date_to). - ``week`` → последние 7 дней - ``month`` → после` (стр. 6889)
- `_admin_shift_owner_bot_statedef _admin_shift_owner_bot_state(db: Session) -> dict[str, Any]: value = _setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) return value if isinstance(value,` (стр. 6935)
- `_cleanup_booking_reminder_deliveriesdef _cleanup_booking_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=14) cleaned: dict[str, str] = {} for key, value in deliv` (стр. 6945)
- `_cleanup_return_reminder_deliveriesdef _cleanup_return_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=30) cleaned: dict[str, str] = {} for key, value in delive` (стр. 6965)
- `_booking_client_reminder_messagedef _booking_client_reminder_message(booking: Booking) -> str: add_block = _additional_services_block(booking) return ( "Напоминание о записи\n" f"Услуга: {booking.service}{add_blo` (стр. 6985)
- `_booking_worker_reminder_messagedef _booking_worker_reminder_message(booking: Booking, worker_name: str) -> str: add_block = _additional_services_block(booking) return ( f"Напоминание мастеру {worker_name}\n" f"К` (стр. 7007)
- `_dispatch_booking_remindersdef _dispatch_booking_reminders( db: Session, *, target_date: str | None = None, force: bool = False,` (стр. 7029)
- `_dispatch_return_visit_remindersdef _dispatch_return_visit_reminders(db: Session) -> int: reminder_state = _return_reminder_state(db) deliveries = reminder_state.get("deliveries") if not isinstance(deliveries, di` (стр. 7340)
- `_shift_checklist_payloaddef _shift_checklist_payload(entry: dict[str, Any]) -> ShiftChecklistPayload: return ShiftChecklistPayload( id=str(entry.get("id") or ""), workerId=str(entry.get("workerId") or "")` (стр. 7450)
- `_chemistry_stock_itemsdef _chemistry_stock_items(db: Session) -> list[StockItem]: return db.scalars( select(StockItem) .where(StockItem.category == "Химия") .order_by(StockItem.name.asc()) ).all()` (стр. 7504)
- `_latest_shift_checklist_entrydef _latest_shift_checklist_entry( entries: list[dict[str, Any]], worker_id: str, phase: str` (стр. 7520)
- `_clean_data_url_prefixdef _clean_data_url_prefix(data_url: str) -> str: return data_url.split(",", 1)[1] if "," in data_url else data_url` (стр. 7542)
- `_decode_data_url_imagedef _decode_data_url_image(data_url: str) -> tuple[str, bytes]: raw = data_url.strip() if not raw.startswith("data:image/"):` (стр. 7550)
- `_admin_shift_inspection_suppliesdef _admin_shift_inspection_supplies(db: Session) -> list[dict[str, Any]]: items = db.scalars( select(StockItem) .where(StockItem.category.in_(("Химия", "Расходники"))) .order_by(S` (стр. 7616)
- `_admin_shift_inspection_payloaddef _admin_shift_inspection_payload( entry: dict[str, Any],` (стр. 7674)
- `_admin_shift_captiondef _admin_shift_caption(entry: dict[str, Any]) -> str: checked_supplies = [ item.get("name") for item in entry.get("supplies", []) if isinstance(item, dict) and item.get("checked"` (стр. 7763)
- `_admin_shift_owner_inline_keyboarddef _admin_shift_owner_inline_keyboard(inspection_id: str) -> dict[str, Any]: return { "inline_keyboard": [ [ { "text": "Подтвердить", "callback_data": f"shiftapprove:{inspection_i` (стр. 7815)
- `_notify_owner_about_admin_shiftdef _notify_owner_about_admin_shift(db: Session, entry: dict[str, Any]) -> None: caption = _admin_shift_caption(entry) mime_type, photo_bytes = _decode_data_url_image( str(entry.ge` (стр. 7843)
- `_apply_admin_shift_reviewdef _apply_admin_shift_review( db: Session, inspection_id: str, *, action: str, issue_note: str, owner_actor_id: str,` (стр. 7913)
- `_serialize_state_datetimedef _serialize_state_datetime(value: datetime | None) -> str | None: if value is None: return None return _as_utc(value).isoformat()` (стр. 8033)
- `_parse_state_datetimedef _parse_state_datetime(value: Any) -> datetime | None: if not value: return None if not isinstance(value, str):` (стр. 8045)
- `_owner_database_reset_statedef _owner_database_reset_state(db: Session) -> dict[str, Any] | None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is None or not isinstance(row.value, dict):` (стр. 8067)
- `_save_owner_database_reset_statedef _save_owner_database_reset_state( db: Session, value: dict[str, Any]` (стр. 8081)
- `_clear_owner_database_reset_statedef _clear_owner_database_reset_state(db: Session) -> None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is not None: db.delete(row) db.flush()` (стр. 8093)
- `_normalize_database_reset_phrasedef _normalize_database_reset_phrase(value: str) -> str: normalized = " ".join(value.replace("\n", " ").split()).strip().upper() return normalized.replace("Ё", "Е")` (стр. 8107)
- `_owner_database_reset_previewdef _owner_database_reset_preview( db: Session,` (стр. 8117)
- `_owner_database_reset_warningsdef _owner_database_reset_warnings( preview: OwnerDatabaseResetPreviewPayload,` (стр. 8171)
- `_perform_owner_database_resetdef _perform_owner_database_reset(db: Session) -> None: db.execute(sa_delete(TelegramLinkCode)) db.execute(sa_delete(Notification)) db.execute(sa_delete(BookingWorker)) db.execute(` (стр. 8211)
- `_parse_datedef _parse_date(s: str) -> date | None: if "." in s: parts = s.split(".") try: return date(int(parts[2]), int(parts[1]), int(parts[0])) except (ValueError, IndexError):` (стр. 8430)
- `_owner_export_filedef _owner_export_file( db: Session, actor_id: str, kind: str, segment: str = "all", date_from: str | None = None, date_to: str | None = None,` (стр. 8456)
- `AsciiJSONResponse._in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_to an` (стр. 8606)
- `_piggy_bank_export_filedef _piggy_bank_export_file( db: Session, actor_id: str, date_from: str | None = None, date_to: str | None = None, resource_group: str | None = None,` (стр. 8686)
- `_download_responsedef _download_response(export_file: GeneratedExport) -> Response: return Response( content=export_file.content, media_type=export_file.media_type, headers={ "Content-Disposition": ` (стр. 8756)
- `class _PartialBroadcastError(Exception):` (стр. 8776)
- `_PartialBroadcastError.__init__def __init__(self, payload: TelegramBroadcastPayload) -> None: super().__init__("partial broadcast failure") self.payload = payload` (стр. 8782)
- `_partial_broadcast_error_handlerasync def _partial_broadcast_error_handler( request: Request, exc: _PartialBroadcastError` (стр. 8791)
- `_send_export_to_telegramdef _send_export_to_telegram( db: Session, actor_id: str, export_file: GeneratedExport` (стр. 8830)
- `_owner_summary_reportdef _owner_summary_report( db: Session, actor_id: str, period: str, segment: str` (стр. 8955)
- `_owner_summary_export_filedef _owner_summary_export_file( db: Session, actor_id: str, period: str, segment: str` (стр. 9073)
- `_send_owner_summary_reportdef _send_owner_summary_report( db: Session, actor_id: str, report: OwnerSummaryReport, export_file: GeneratedExport,` (стр. 9191)
- `_booking_car_labeldef _booking_car_label(car: str | None, plate: str | None) -> str: car_value = (car or "").strip() or "Авто не указано" plate_value = (plate or "").strip() return f"{car_value}, {p` (стр. 9404)
- `_admin_booking_notification_titledef _admin_booking_notification_title( client_name: str, car: str | None, plate: str | None` (стр. 9416)
- `_booking_datetime_labeldef _booking_datetime_label(date: str | None, time: str | None) -> str: if not (date or "").strip():` (стр. 9428)
- `_admin_booking_notification_textdef _admin_booking_notification_text( client_name: str, car: str | None, plate: str | None, date: str | None, time: str | None,` (стр. 9444)
- `_additional_services_blockdef _additional_services_block(booking: Booking) -> str: """Форматирует блок доп. услуг для вставки в Telegram/внутренние сообщения.""" services = getattr(booking, "additional_serv` (стр. 9464)
- `_booking_all_worker_idsdef _booking_all_worker_ids(booking: Booking) -> set[str]: """Все мастера записи: основная услуга + доп. услуги.""" ids: set[str] = {link.worker_id for link in (booking.worker_link` (стр. 9487)
- `_notify_admins_about_bookingdef _notify_admins_about_booking(db: Session, booking: Booking) -> None: admins = db.scalars( select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True)) ).all()` (стр. 9496)
- `_notify_owners_about_bookingdef _notify_owners_about_booking(db: Session, booking: Booking) -> None: owners = _all_owner_telegram_recipients(db) add_block = _additional_services_block(booking) text = ( "Новая` (стр. 9530)
- `_service_category_keydef _service_category_key(value: str | None) -> str: return (value or "").strip().lower()` (стр. 9560)
- `_resource_group_keydef _resource_group_key(value: str | None) -> str: return (value or "").strip().lower() or DEFAULT_RESOURCE_GROUP` (стр. 9568)
- `_normalized_textdef _normalized_text(value: str | None) -> str: return (value or "").strip()` (стр. 9576)
- `_default_service_resource_groupdef _default_service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_for_service_category(service.category)` (стр. 9584)
- `_default_box_resource_groupdef _default_box_resource_group(box: Box | None) -> str: if box is None: return DEFAULT_RESOURCE_GROUP name_key = (box.name or "").strip().lower() description_key = (box.descriptio` (стр. 9596)
- `_service_resource_groupdef _service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_key( service.resource_group or _default_servic` (стр. 9616)
- `_compatible_box_namesdef _compatible_box_names(db: Session, resource_group: str | None) -> list[str]: target_group = _resource_group_key(resource_group) return [ box.name for box in db.scalars( select(` (стр. 9632)
- `_is_box_rental_servicedef _is_box_rental_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "аренда бокса" )` (стр. 9658)
- `_is_detailing_servicedef _is_detailing_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "детейлинг" )` (стр. 9672)
- `_resource_group_for_service_categorydef _resource_group_for_service_category(category: str | None) -> str: category_key = _service_category_key(category) if category_key == "детейлинг": return DETAILING_RESOURCE_GROU` (стр. 9684)
- `_box_by_namedef _box_by_name(db: Session, box_name: str) -> Box | None: return db.scalar(select(Box).where(Box.name == box_name))` (стр. 9698)
- `_normalize_service_and_box_resourcesdef _normalize_service_and_box_resources(db: Session) -> None: changed = False # Группа ресурсов услуг больше не привязывается к категории принудительно. boxes = db.scalars(select(` (стр. 9706)
- `_box_hourly_pricedef _box_hourly_price(db: Session, box_name: str, fallback_price: int) -> int: box = _box_by_name(db, box_name) if box is not None and box.price_per_hour > 0: return box.price_per_` (стр. 9914)
- `_payment_type_labeldef _payment_type_label(payment_type: str) -> str: return { "cash": "Наличные", "transfer": "Перевод", "invoice": "По счёту", "credit": "В долг (депозит)", }.get(payment_type, paym` (стр. 9928)
- `_booking_payment_labeldef _booking_payment_label(booking: Booking) -> str: if not booking.payment_settled: return "Не оплачено" return _payment_type_label(booking.payment_type)` (стр. 9946)
- `_notify_ownersdef _notify_owners(db: Session, text: str) -> None: db.add( Notification( id=f"n-{uuid4()}", recipient_role="owner", recipient_id=None, message=text, read=False, created_at=_now(),` (стр. 9958)
- `_booking_receipt_textdef _booking_receipt_text(booking: Booking, *, worker_name: str | None = None) -> str: worker_line = f"\nМастер: {worker_name}" if worker_name else "" add_block = _additional_servi` (стр. 9994)
- `_notify_booking_completion_receiptdef _notify_booking_completion_receipt( db: Session, booking: Booking, *, worker_name: str | None = None` (стр. 10026)
- `_notify_owner_about_worker_booking_eventdef _notify_owner_about_worker_booking_event( db: Session, booking: Booking, *, worker_name: str, event_label: str` (стр. 10098)
- `_notify_workers_about_assignmentdef _notify_workers_about_assignment( db: Session, booking: Booking, worker_ids: set[str]` (стр. 10141)
- `_notify_workers_about_additional_servicedef _notify_workers_about_additional_service( db: Session, booking: Booking, asvc: BookingAdditionalService` (стр. 10229)
- `_notify_workers_about_notedef _notify_workers_about_note( db: Session, booking: Booking, worker_ids: set[str]` (стр. 10331)
- `_notify_workers_about_rescheduledef _notify_workers_about_reschedule( db: Session, booking: Booking, worker_ids: set[str], previous_date: str, previous_time: str, previous_box: str,` (стр. 10403)
- `_payroll_entry_labeldef _payroll_entry_label(kind: str) -> str: return { "bonus": "премия", "advance": "аванс", "deduction": "удержание", "payout": "выплата", "adjustment": "корректировка", }.get(kind` (стр. 10493)
- `_notify_worker_about_payroll_entrydef _notify_worker_about_payroll_entry( db: Session, worker: StaffUser, *, actor_role: str, actor_id: str, kind: str, amount: int, note: str, …` (стр. 10513)
- `_PartialBroadcastError._safe_digitsdef _safe_digits(value: str) -> str: try: return normalize_phone_digits(value) except ValueError: return ""` (стр. 10601)
- `_debug_owner_sessiondef _debug_owner_session( authorization: str | None = Header(default=None), init_data: str | None = None, db: Session = Depends(get_db),` (стр. 10853)
- `_mojibake_scan_rowsdef _mojibake_scan_rows(db: Session) -> list[dict]: """Найти строки-кандидаты mojibake: строгий ремонт меняет значение.""" rows: list[dict] = [] for model, fields in _TEXT_REPAIR_T` (стр. 10907)
- `_default_contentdef _default_content() -> ContentPayload: return ContentPayload( hero=ContentHeroPayload(), about=ContentAboutPayload( text=( "<b>\u2728 \u041e \u0441\u0442\u0443\u0434\u0438\u0438` (стр. 11016)
- `_normalize_legacy_contentdef _normalize_legacy_content(value: dict) -> dict: """Мигрирует старый формат контента (hero.title строкой + hero.titleHighlight) в новый (hero.title => {before, highlight, after}` (стр. 11096)
- ...ещё 68

### backend/app/models.py (647 строк)

Классы и функции (28):

- `utc_nowdef utc_now() -> datetime: return datetime.now(timezone.utc)` (стр. 16)
- `class Client(Base):` (стр. 20)
- `class StaffUser(Base):` (стр. 65)
- `class Service(Base):` (стр. 115)
- `class Box(Base):` (стр. 141)
- `class ScheduleEntry(Base):` (стр. 152)
- `class Booking(Base):` (стр. 163)
- `class BookingWorker(Base):` (стр. 236)
- `class BookingAdditionalService(Base):` (стр. 256)
- `class BookingMaterial(Base):` (стр. 281)
- `class AdditionalServiceWorker(Base):` (стр. 304)
- `class Notification(Base):` (стр. 322)
- `class StockCategory(Base):` (стр. 338)
- `class StockItem(Base):` (стр. 360)
- `class Expense(Base):` (стр. 380)
- `class StockWriteOff(Base):` (стр. 400)
- `class Penalty(Base):` (стр. 424)
- `class PayrollEntry(Base):` (стр. 451)
- `class TelegramLinkCode(Base):` (стр. 482)
- `class AppSetting(Base):` (стр. 497)
- `class UploadedFile(Base):` (стр. 504)
- `class DataConsent(Base):` (стр. 514)
- `class Income(Base):` (стр. 522)
- `class WeeklyArchive(Base):` (стр. 542)
- `class PiggyBankTransaction(Base):` (стр. 560)
- `class DepositTransaction(Base):` (стр. 591)
- `class DepositMonth(Base):` (стр. 610)
- `class OwnerProfitShare(Base):` (стр. 628)

### backend/app/schemas.py (2422 строк)

Классы и функции (231):

- `normalize_person_namedef normalize_person_name(value: str) -> str: normalized = re.sub(r"\s+", " ", value).strip() if len(normalized) < 1: raise ValueError("Введите настоящее имя") if not NAME_PATTERN.` (стр. 52)
- `normalize_phone_digitsdef normalize_phone_digits(value: str) -> str: digits = re.sub(r"\D", "", value) if len(digits) == 10: digits = f"7{digits}" elif len(digits) == 11 and digits[0] in {"7", "8"}: dig` (стр. 61)
- `normalize_phonedef normalize_phone(value: str) -> str: digits = normalize_phone_digits(value) return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"` (стр. 74)
- `normalize_vehicle_namedef normalize_vehicle_name(value: str) -> str: normalized = re.sub(r"\s+", " ", value).strip() letters_only = "".join(char for char in normalized if char.isalpha()) if not normaliz` (стр. 79)
- `normalize_platedef normalize_plate(value: str, plate_type: str = "russian") -> str: if plate_type == "foreign": normalized = re.sub(r"[^A-Za-z0-9]", "", value).lower() if not normalized: raise Va` (стр. 95)
- `_coerce_money_intdef _coerce_money_int(value: Any) -> int: """Coerce Decimal/float/str monetary values to int rubles (ROUND_HALF_UP). Handles Decimal('15881.54') from DB Numeric(18,2) that would ot` (стр. 158)
- `class ClientVehiclePayload(BaseModel):` (стр. 178)
- `ClientVehiclePayload.validate_vehicledef validate_vehicle(self) -> "ClientVehiclePayload": if self.car.strip():` (стр. 185)
- `class ClientProfilePayload(BaseModel):` (стр. 193)
- `class ClientProfileInput(BaseModel):` (стр. 204)
- `ClientProfileInput.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 215)
- `ClientProfileInput.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 220)
- `ClientProfileInput.validate_vehicledef validate_vehicle(self) -> "ClientProfileInput": if self.plate.strip():` (стр. 226)
- `class ClientSummaryPayload(BaseModel):` (стр. 232)
- `class ClientCreateRequest(BaseModel):` (стр. 257)
- `ClientCreateRequest.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 268)
- `ClientCreateRequest.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 273)
- `ClientCreateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCreateRequest": if self.car.strip():` (стр. 279)
- `class WorkerPayload(BaseModel):` (стр. 287)
- `class PayrollEntryPayload(BaseModel):` (стр. 306)
- `PayrollEntryPayload._validate_amountdef _validate_amount(cls, value: Any) -> int: return _coerce_money_int(value)` (стр. 319)
- `class WorkerPayrollBookingPayload(BaseModel):` (стр. 323)
- `class WorkerPayrollSummaryPayload(BaseModel):` (стр. 336)
- `class SalaryBookingItem(BaseModel):` (стр. 361)
- `class SalaryPayoutItem(BaseModel):` (стр. 385)
- `class SalaryDetailResponse(BaseModel):` (стр. 393)
- `class PaySalaryRequest(BaseModel):` (стр. 411)
- `class PaySalaryResponse(BaseModel):` (стр. 423)
- `class BookingWorkerPayload(BaseModel):` (стр. 430)
- `class BookingServiceItem(BaseModel):` (стр. 438)
- `class AdditionalServiceWorkerPayload(BaseModel):` (стр. 445)
- `class AdditionalServicePayload(BaseModel):` (стр. 453)
- `class AddAdditionalServiceRequest(BaseModel):` (стр. 467)
- `class UpdateAdditionalServiceRequest(BaseModel):` (стр. 478)
- `class BookingPayload(BaseModel):` (стр. 488)
- `class WorkerCalendarBookingPayload(BaseModel):` (стр. 520)
- `class BookingAvailabilitySlotPayload(BaseModel):` (стр. 538)
- `class BookingAvailabilityPayload(BaseModel):` (стр. 545)
- `class NotificationPayload(BaseModel):` (стр. 551)
- `class StockCategoryPayload(BaseModel):` (стр. 560)
- `class StockItemPayload(BaseModel):` (стр. 566)
- `class BookingMaterialPayload(BaseModel):` (стр. 576)
- `class ShiftChecklistItemPayload(BaseModel):` (стр. 585)
- `class ShiftChecklistPayload(BaseModel):` (стр. 594)
- `class ShiftChecklistSubmitItem(BaseModel):` (стр. 604)
- `class ShiftChecklistSubmitRequest(BaseModel):` (стр. 609)
- `class AdminShiftInspectionSupplyPayload(BaseModel):` (стр. 615)
- `class AdminShiftInspectionMasterPayload(BaseModel):` (стр. 624)
- `class AdminShiftInspectionPayload(BaseModel):` (стр. 630)
- `class AdminShiftInspectionSubmitSupply(BaseModel):` (стр. 647)
- `class AdminShiftInspectionSubmitMaster(BaseModel):` (стр. 652)
- `class AdminShiftInspectionSubmitRequest(BaseModel):` (стр. 657)
- `class AdminShiftInspectionReviewRequest(BaseModel):` (стр. 665)
- `class OwnerShiftOpeningRequest(BaseModel):` (стр. 670)
- `class ExpensePayload(BaseModel):` (стр. 675)
- `ExpensePayload._validate_amountdef _validate_amount(cls, value: Any) -> int: return _coerce_money_int(value)` (стр. 686)
- `class PenaltyPayload(BaseModel):` (стр. 690)
- `class TelegramLinkCodePayload(BaseModel):` (стр. 702)
- `class ServicePayload(BaseModel):` (стр. 708)
- `class DetailingRequestCreateRequest(BaseModel):` (стр. 732)
- `DetailingRequestCreateRequest.validate_cardef validate_car(cls, value: str | None) -> str | None: if value is None: return None return normalize_vehicle_name(value)` (стр. 741)
- `DetailingRequestCreateRequest.validate_plate_fielddef validate_plate_field(self) -> "DetailingRequestCreateRequest": if self.plate is not None: if not self.plate.strip():` (стр. 747)
- `class BoxPayload(BaseModel):` (стр. 756)
- `class SchedulePayload(BaseModel):` (стр. 765)
- `class AdminNotificationSettings(BaseModel):` (стр. 773)
- `class AdminProfilePayload(BaseModel):` (стр. 781)
- `class WorkerNotificationSettings(BaseModel):` (стр. 788)
- `class WorkerProfilePayload(BaseModel):` (стр. 796)
- `class OperatingMode(str, Enum):` (стр. 807)
- `class OwnerCompanyPayload(BaseModel):` (стр. 812)
- `class OwnerNotificationSettings(BaseModel):` (стр. 822)
- `OwnerNotificationSettings._coerce_hoursdef _coerce_hours(self) -> "OwnerNotificationSettings": if "bookingReminderHours" not in self.model_fields_set and "bookingReminderDays" in self.model_fields_set and self.bookingRe` (стр. 834)
- `class OwnerIntegrationsPayload(BaseModel):` (стр. 844)
- `class GoogleCredentialsPayload(BaseModel):` (стр. 851)
- `class GoogleInvitePayload(BaseModel):` (стр. 859)
- `class OwnerSecurityPayload(BaseModel):` (стр. 865)
- `class AuthSessionPayload(BaseModel):` (стр. 869)
- `class EmployeeSettingPayload(BaseModel):` (стр. 878)
- `class WorkerCreateRequest(BaseModel):` (стр. 889)
- `class PayrollEntryCreateRequest(BaseModel):` (стр. 901)
- `PayrollEntryCreateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 919)
- `class PayrollEntryUpdateRequest(BaseModel):` (стр. 923)
- `PayrollEntryUpdateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 929)
- `class SettingsBundlePayload(BaseModel):` (стр. 933)
- `class SessionPayload(BaseModel):` (стр. 943)
- `class BootstrapPayload(BaseModel):` (стр. 956)
- `class ClientRegisterRequest(BaseModel):` (стр. 975)
- `ClientRegisterRequest.lift_profiledef lift_profile(cls, raw: Any) -> Any: if isinstance(raw, dict) and isinstance(raw.get("profile"), dict):` (стр. 987)
- `ClientRegisterRequest.validate_namedef validate_name(cls, value: str) -> str: if not value.strip():` (стр. 996)
- `ClientRegisterRequest.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 1003)
- `ClientRegisterRequest.validate_vehicledef validate_vehicle(self) -> "ClientRegisterRequest": if self.plate.strip():` (стр. 1009)
- `class ConsentRecordPayload(BaseModel):` (стр. 1015)
- `class ConsentCheckResponse(BaseModel):` (стр. 1020)
- `class StaffLinkRequest(BaseModel):` (стр. 1024)
- `class SwitchRoleRequest(BaseModel):` (стр. 1029)
- `class RolePreviewActor(BaseModel):` (стр. 1033)
- `class RolePreviewOption(BaseModel):` (стр. 1042)
- `class RolePreviewState(BaseModel):` (стр. 1049)
- `class RolePreviewRequest(BaseModel):` (стр. 1066)
- `_normalize_booking_datedef _normalize_booking_date(value: str) -> str: """Нормализует дату записи к канону ДД.ММ.ГГГГ. Принимает и ДД.ММ.ГГГГ, и ГГГГ-ММ-ДД (форматы, которые могут слать клиенты). Остальн` (стр. 1073)
- `_normalize_booking_timedef _normalize_booking_time(value: str) -> str: """Normalize booking time to HH:MM (24h) canonical form. Empty allowed.""" v = value.strip() if not v: return "" m = re.fullmatch(r"` (стр. 1094)
- `class BookingCreateRequest(BaseModel):` (стр. 1108)
- `BookingCreateRequest.validate_datedef validate_date(cls, value: str) -> str: return _normalize_booking_date(value)` (стр. 1134)
- `BookingCreateRequest.validate_timedef validate_time(cls, value: str) -> str: return _normalize_booking_time(value)` (стр. 1139)
- `BookingCreateRequest.validate_client_namedef validate_client_name(cls, value: str) -> str: if not value.strip():` (стр. 1144)
- `BookingCreateRequest.validate_client_phonedef validate_client_phone(cls, value: str) -> str: if not value.strip():` (стр. 1151)
- `BookingCreateRequest.validate_vehicledef validate_vehicle(self) -> "BookingCreateRequest": if self.car is not None and self.car.strip():` (стр. 1157)
- `class AddBookingServiceRequest(BaseModel):` (стр. 1165)
- `class BookingUpdateRequest(BaseModel):` (стр. 1172)
- `BookingUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None return _normalize_booking_date(value)` (стр. 1198)
- `BookingUpdateRequest.validate_timedef validate_time(cls, value: str | None) -> str | None: if value is None: return None return _normalize_booking_time(value)` (стр. 1205)
- `BookingUpdateRequest.validate_client_namedef validate_client_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 1212)
- `BookingUpdateRequest.validate_client_phonedef validate_client_phone(cls, value: str | None) -> str | None: if value is None: return None return normalize_phone(value)` (стр. 1219)
- `BookingUpdateRequest.validate_vehicledef validate_vehicle(self) -> "BookingUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1225)
- `class ClientCardUpdateRequest(BaseModel):` (стр. 1238)
- `ClientCardUpdateRequest.validate_namedef validate_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 1256)
- `ClientCardUpdateRequest.validate_phonedef validate_phone(cls, value: str | None) -> str | None: if value is None or not value.strip():` (стр. 1263)
- `ClientCardUpdateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCardUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1269)
- `class NotificationCreateRequest(BaseModel):` (стр. 1282)
- `class ReadAllNotificationsRequest(BaseModel):` (стр. 1289)
- `class StockItemCreateRequest(BaseModel):` (стр. 1293)
- `class StockItemUpdateRequest(BaseModel):` (стр. 1302)
- `class StockCategoryCreateRequest(BaseModel):` (стр. 1311)
- `class StockCategoryUpdateRequest(BaseModel):` (стр. 1316)
- `class StockWriteOffRequest(BaseModel):` (стр. 1321)
- `class StockWriteOffPayload(BaseModel):` (стр. 1325)
- `class IncomeCreateRequest(BaseModel):` (стр. 1343)
- `IncomeCreateRequest.validate_sourcedef validate_source(cls, value: str) -> str: stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или состоять только из пробелов") return stripp` (стр. 1352)
- `IncomeCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1360)
- `class IncomePayload(BaseModel):` (стр. 1366)
- `IncomePayload._validate_amountdef _validate_amount(cls, value: Any) -> int: return _coerce_money_int(value)` (стр. 1378)
- `class ExpenseCreateRequest(BaseModel):` (стр. 1382)
- `ExpenseCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1392)
- `class PenaltyCreateRequest(BaseModel):` (стр. 1398)
- `class OwnerReminderDispatchRequest(BaseModel):` (стр. 1404)
- `class OwnerReminderDispatchPayload(BaseModel):` (стр. 1409)
- `class StaffLoginRequest(BaseModel):` (стр. 1417)
- `class ChangePasswordRequest(BaseModel):` (стр. 1422)
- `class OwnerDatabaseResetPreviewPayload(BaseModel):` (стр. 1427)
- `class OwnerDatabaseResetStartRequest(BaseModel):` (стр. 1442)
- `class OwnerDatabaseResetApproveRequest(BaseModel):` (стр. 1446)
- `class OwnerDatabaseResetExecuteRequest(BaseModel):` (стр. 1452)
- `class OwnerDatabaseResetStartPayload(BaseModel):` (стр. 1456)
- `class OwnerDatabaseResetApprovePayload(BaseModel):` (стр. 1465)
- `class OwnerDatabaseResetExecutePayload(BaseModel):` (стр. 1473)
- `class ContentAboutPayload(BaseModel):` (стр. 1478)
- `class ContentServicePayload(BaseModel):` (стр. 1484)
- `class ContentWorksPayload(BaseModel):` (стр. 1495)
- `class ContentStatsPayload(BaseModel):` (стр. 1501)
- `class ContentTitlePayload(BaseModel):` (стр. 1506)
- `ContentTitlePayload.to_full_titledef to_full_title(self) -> str: return f"{self.before}{self.highlight}{self.after}"` (стр. 1511)
- `class ContentHeroPayload(BaseModel):` (стр. 1515)
- `class ContentPayload(BaseModel):` (стр. 1531)
- `class ContactPayload(BaseModel):` (стр. 1538)
- `class ResetPasswordRequest(BaseModel):` (стр. 1545)
- `class GenericMessage(BaseModel):` (стр. 1549)
- `class TelegramDeliveryResult(BaseModel):` (стр. 1553)
- `class TelegramBroadcastPayload(BaseModel):` (стр. 1559)
- `class OwnerExportDeliveryPayload(BaseModel):` (стр. 1565)
- `class ShiftAttendancePayload(BaseModel):` (стр. 1572)
- `class ExpenseUpdateRequest(BaseModel):` (стр. 1583)
- `ExpenseUpdateRequest.validate_titledef validate_title(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("title не может быть пустым или с` (стр. 1593)
- `ExpenseUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1603)
- `ExpenseUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "ExpenseUpdateRequest": if all(v is None for v in [self.title, self.amount, self.category, self.date, self.note]):` (стр. 1611)
- `class IncomeUpdateRequest(BaseModel):` (стр. 1617)
- `IncomeUpdateRequest.validate_sourcedef validate_source(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или` (стр. 1626)
- `IncomeUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1636)
- `IncomeUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "IncomeUpdateRequest": # Use model_fields_set to detect explicitly provided fields (including null). # This allows {"note": null} to pass as` (стр. 1644)
- `class PiggyBankTransactionPayload(BaseModel):` (стр. 1652)
- `class PiggyBankWithdrawRequest(BaseModel):` (стр. 1681)
- `PiggyBankWithdrawRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1707)
- `PiggyBankWithdrawRequest.validate_spent_by_namedef validate_spent_by_name(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() return stripped or None` (стр. 1714)
- `class PiggyBankAdjustRequest(BaseModel):` (стр. 1721)
- `PiggyBankAdjustRequest.validate_datedef validate_date(cls, value: str) -> str: stripped = value.strip() if stripped and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", stripped):` (стр. 1729)
- `class PiggyBankWashBreakdown(BaseModel):` (стр. 1736)
- `class PiggyBankDetailingBreakdown(BaseModel):` (стр. 1749)
- `class PiggyBankSpenderDebt(BaseModel):` (стр. 1760)
- `class PiggyBankResponse(BaseModel):` (стр. 1767)
- `class WeeklyArchivePayload(BaseModel):` (стр. 1787)
- `class WalletResponse(BaseModel):` (стр. 1801)
- `class OwnerProfitShareItem(BaseModel):` (стр. 1818)
- `class OwnerProfitShareSummary(BaseModel):` (стр. 1835)
- `class OwnerSalaryDetailResponse(BaseModel):` (стр. 1844)
- `class PayOwnerSalaryRequest(BaseModel):` (стр. 1851)
- `class PayOwnerSalaryResponse(BaseModel):` (стр. 1860)
- `class OverrideEarnedRequest(BaseModel):` (стр. 1867)
- `class BookingHistoryItem(BaseModel):` (стр. 1871)
- `class BookingTotalsWorkerItem(BaseModel):` (стр. 1888)
- `class BookingTotalsOwnerItem(BaseModel):` (стр. 1906)
- `class BookingTotalsPiggyItem(BaseModel):` (стр. 1913)
- `class BookingHistoryTotals(BaseModel):` (стр. 1919)
- `class BookingMoneySplitWorkerItem(BaseModel):` (стр. 1925)
- `class BookingMoneySplitOwnerItem(BaseModel):` (стр. 1936)
- `class BookingPiggyTxItem(BaseModel):` (стр. 1944)
- `class BookingAdditionalServiceItem(BaseModel):` (стр. 1953)
- `class BookingAsvcPiggyItem(BaseModel):` (стр. 1962)
- `class BookingAsvcWorkerItem(BaseModel):` (стр. 1968)
- `class BookingMoneySplitDetail(BaseModel):` (стр. 1979)
- `class BookingWorkerEarnedUpdate(BaseModel):` (стр. 2027)
- `class BookingMoneySplitOwnerUpdate(BaseModel):` (стр. 2032)
- ...ещё 31

### backend/app/security.py (110 строк)

Классы и функции (5):

- `hash_passworddef hash_password(password: str) -> str: salt = secrets.token_hex(16) digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS) ret` (стр. 16)
- `verify_passworddef verify_password(password: str, password_hash: str) -> bool: try: iterations_raw, salt, digest = password_hash.split("$", 2) iterations = int(iterations_raw) except ValueError: ` (стр. 22)
- `hash_one_time_codedef hash_one_time_code(code: str, secret: str) -> str: return hmac.new(secret.encode("utf-8"), code.encode("utf-8"), hashlib.sha256).hexdigest()` (стр. 32)
- `verify_one_time_codedef verify_one_time_code(code: str, expected_hash: str, secret: str) -> bool: calculated = hash_one_time_code(code, secret) return hmac.compare_digest(calculated, expected_hash)` (стр. 36)
- `validate_telegram_init_datadef validate_telegram_init_data( init_data: str, bot_token: str | None, *, skip_validation: bool = False, max_age_seconds: int = TELEGRAM_INIT_DATA_MAX_AGE_SECONDS, future_skew_sec` (стр. 41)

### backend/app/seed.py (201 строк)

Классы и функции (1):

- `seed_databasedef seed_database(db: Session, *, include_demo_staff: bool = True, is_production: bool = False) -> None: if is_production: # Never seed demo data in production include_demo_staff =` (стр. 18)

### backend/app/telegram_linking.py (94 строк)

Классы и функции (6):

- `_nowdef _now() -> datetime: return datetime.now(timezone.utc)` (стр. 13)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 17)
- `_check_link_code_rate_limitdef _check_link_code_rate_limit(chat_id: str) -> None: now = time_module.time() window_start = now - _LINK_CODE_RATE_LIMIT_WINDOW key = str(chat_id) if key in _link_code_attempts: ` (стр. 29)
- `create_link_codedef create_link_code(db: Session, staff_id: str, lifetime_minutes: int = 10) -> TelegramLinkCode: db.execute(delete(TelegramLinkCode).where(TelegramLinkCode.staff_id == staff_id)) ` (стр. 42)
- `ensure_staff_chat_id_availabledef ensure_staff_chat_id_available( db: Session, chat_id: str | int, *, exclude_staff_id: str | None = None,` (стр. 62)
- `confirm_link_codedef confirm_link_code(db: Session, code: str, chat_id: int) -> StaffUser | None: _check_link_code_rate_limit(str(chat_id)) item = db.scalar(select(TelegramLinkCode).where(TelegramL` (стр. 80)

### backend/bot.py (711 строк)

Классы и функции (39):

- `class BotRuntime: token: str webapp_url: str api_base: str training_webapp_url: str | None = None ADMIN_SHIFT_INSPECTION` (стр. 31)
- `_build_runtimedef _build_runtime() -> BotRuntime: settings = get_settings() if not settings.telegram_bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured") if not settings.webapp_` (стр. 43)
- `telegram_webhook_secretdef telegram_webhook_secret() -> str: settings = get_settings() if not settings.telegram_bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured") raw_secret = f"{setti` (стр. 57)
- `telegram_webhook_urldef telegram_webhook_url() -> str: settings = get_settings() if not settings.webapp_url: raise RuntimeError("WEBAPP_URL is not configured") return f"{settings.webapp_url.rstrip('/'` (стр. 65)
- `_parse_retry_afterdef _parse_retry_after(details: str) -> int | None: try: parsed = json.loads(details) except json.JSONDecodeError: return None parameters = parsed.get("parameters") if not isinstan` (стр. 72)
- `_telegram_calldef _telegram_call( runtime: BotRuntime, method: str, payload: dict[str, Any] | None = None, *, max_attempts: int = 3,` (стр. 86)
- `_telegram_multipart_calldef _telegram_multipart_call( runtime: BotRuntime, method: str, fields: dict[str, Any], files: dict[str, tuple[str, str, bytes]],` (стр. 118)
- `_welcome_reply_markupdef _welcome_reply_markup(webapp_url: str) -> dict[str, Any]: return { "inline_keyboard": [ [ {"text": "✨ О нас", "web_app": {"url": f"{webapp_url}/about"}}, {"text": "📸 Наши работ` (стр. 161)
- `_help_reply_markupdef _help_reply_markup(runtime: BotRuntime) -> dict[str, Any]: training_url = runtime.training_webapp_url or runtime.webapp_url help_url = f"{training_url}?help=1" if "?" not in tr` (стр. 184)
- `_send_help_messagedef _send_help_message(runtime: BotRuntime, chat_id: int) -> None: _send_text_message( runtime, chat_id, HELP_TEXT, reply_markup=_help_reply_markup(runtime), parse_mode="HTML", )` (стр. 196)
- `_configure_bot_metadatadef _configure_bot_metadata(runtime: BotRuntime) -> str | None: me = _telegram_call(runtime, "getMe") _telegram_call( runtime, "setMyCommands", { "commands": [ {"command": "start",` (стр. 206)
- `disable_telegram_webhookdef disable_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None: runtime = _build_runtime() username = _configure_bot_metadata(runtime) _telegram_call(runtime, "d` (стр. 234)
- `sync_telegram_webhookdef sync_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None: runtime = _build_runtime() username = _configure_bot_metadata(runtime) target_url = telegram_webhook` (стр. 241)
- `_send_text_messagedef _send_text_message( runtime: BotRuntime, chat_id: int, text: str, *, reply_markup: dict[str, Any] | None = None, parse_mode: str | None = None,` (стр. 270)
- `_send_start_messagedef _send_start_message(runtime: BotRuntime, chat_id: int) -> None: markup = _welcome_reply_markup(runtime.webapp_url) try: req = request.Request(WELCOME_PHOTO_URL) with request.ur` (стр. 301)
- `_send_about_messagedef _send_about_message(runtime: BotRuntime, chat_id: int) -> None: with session_scope() as db: row = db.get(AppSetting, "content") if row and isinstance(row.value, dict):` (стр. 337)
- `_send_works_messagedef _send_works_message(runtime: BotRuntime, chat_id: int) -> None: with session_scope() as db: row = db.get(AppSetting, "content") works = (row.value or {}).get("works", []) if ro` (стр. 350)
- `send_telegram_messagedef send_telegram_message( chat_id: str | int, text: str, *, parse_mode: str | None = None` (стр. 372)
- `send_telegram_documentdef send_telegram_document( chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream",` (стр. 379)
- `send_telegram_photodef send_telegram_photo( chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, parse_mode: str | None = None, mime_type: str = "image/jpeg", reply_mark` (стр. 399)
- `_setting_dictdef _setting_dict(db, key: str, default: dict[str, Any]) -> dict[str, Any]: row = db.get(AppSetting, key) if row is None or not isinstance(row.value, dict):` (стр. 425)
- `_setting_listdef _setting_list(db, key: str) -> list[dict[str, Any]]: row = db.get(AppSetting, key) if row is None or not isinstance(row.value, list):` (стр. 432)
- `_upsert_settingdef _upsert_setting(db, key: str, value: Any) -> None: row = db.get(AppSetting, key) if row is None: row = AppSetting(key=key, value=value) db.add(row) else: row.value = value` (стр. 439)
- `_serialize_nowdef _serialize_now() -> str: return datetime.now(timezone.utc).isoformat()` (стр. 448)
- `_owner_by_chat_iddef _owner_by_chat_id(db, chat_id: int) -> StaffUser | None: return db.query(StaffUser).filter(StaffUser.role == "owner", StaffUser.telegram_chat_id == str(chat_id)).first()` (стр. 452)
- `_apply_shift_review_from_botdef _apply_shift_review_from_bot(chat_id: int, inspection_id: str, action: str, issue_note: str = "") -> str: with session_scope() as db: owner = _owner_by_chat_id(db, chat_id) if ` (стр. 456)
- `_remember_pending_issuedef _remember_pending_issue(chat_id: int, inspection_id: str) -> None: with session_scope() as db: state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat":` (стр. 496)
- `_pop_pending_issuedef _pop_pending_issue(chat_id: int) -> str | None: with session_scope() as db: state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) pending = sta` (стр. 507)
- `_extract_contact_phonedef _extract_contact_phone(update: dict[str, Any], chat_id: int) -> str | None: message = update.get("message") or {} contact = message.get("contact") or {} phone_number = contact.` (стр. 519)
- `_store_client_phone_verificationdef _store_client_phone_verification(chat_id: int, phone_digits: str) -> None: with session_scope() as db: current = _setting_dict(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) current[s` (стр. 537)
- `_extract_chat_iddef _extract_chat_id(update: dict[str, Any]) -> int | None: callback = update.get("callback_query") or {} callback_message = callback.get("message") or {} callback_chat = callback_` (стр. 547)
- `_extract_textdef _extract_text(update: dict[str, Any]) -> str: message = update.get("message") or {} text = message.get("text") return text.strip() if isinstance(text, str) else ""` (стр. 560)
- `_extract_callbackdef _extract_callback(update: dict[str, Any]) -> tuple[str, str] | None: callback = update.get("callback_query") or {} callback_id = callback.get("id") data = callback.get("data") ` (стр. 566)
- `_answer_callback_querydef _answer_callback_query(runtime: BotRuntime, callback_id: str, text: str) -> None: _telegram_call(runtime, "answerCallbackQuery", {"callback_query_id": callback_id, "text": text` (стр. 575)
- `_handle_link_commanddef _handle_link_command(chat_id: int, text: str) -> str: parts = text.split(maxsplit=1) code = parts[1].strip() if len(parts) == 2 else "" if not code.isdigit():` (стр. 579)
- `_handle_plain_codedef _handle_plain_code(chat_id: int, text: str) -> str: code = text.strip() if not (code.isdigit() and len(code) == 6):` (стр. 600)
- `_process_telegram_updatedef _process_telegram_update(runtime: BotRuntime, update: dict[str, Any]) -> None: text = _extract_text(update) chat_id = _extract_chat_id(update) if chat_id is None: return contac` (стр. 620)
- `process_telegram_updatedef process_telegram_update(update: dict[str, Any]) -> None: runtime = _build_runtime() _process_telegram_update(runtime, update)` (стр. 668)
- `run_pollingdef run_polling() -> None: logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s") try: # Ошибки цикла бота (logging.error/exception ниже) дублируют` (стр. 673)

### backend/migrations/_common.py (76 строк)

Классы и функции (5):

- `_quote_identdef _quote_ident(name: str) -> str: """Безопасное экранирование идентификатора.""" if '"' in name: raise ValueError(f"Подозрительный идентификатор: {name!r}") return f'"{name}"'` (стр. 17)
- `columns_ofdef columns_of(table_name: str) -> set[str]: return {col["name"] for col in inspect(engine).get_columns(table_name)}` (стр. 24)
- `table_existsdef table_exists(table_name: str) -> bool: return inspect(engine).has_table(table_name)` (стр. 28)
- `ensure_columndef ensure_column( table_name: str, column_name: str, column_type_sqlite: str, column_type_postgres: str | None = None, *, not_null_default_sql: str | None = None,` (стр. 32)
- `drop_column_if_existsdef drop_column_if_exists(table_name: str, column_name: str) -> None: if not table_exists(table_name):` (стр. 66)

### backend/migrations/add_materials_written_off.py (35 строк)

Классы и функции (2):

- `upgradedef upgrade(): ensure_column( "bookings", "materials_written_off", "BOOLEAN", not_null_default_sql="FALSE", ) print("Migration complete: materials_written_off ensured on bookings")` (стр. 17)
- `downgradedef downgrade(): from backend.migrations._common import drop_column_if_exists drop_column_if_exists("bookings", "materials_written_off") print("Downgrade complete")` (стр. 27)

### backend/migrations/add_pay_type_to_workers.py (55 строк)

Классы и функции (2):

- `upgradedef upgrade(): ensure_column( "booking_workers", "pay_type", "VARCHAR(16)", not_null_default_sql="'percent'", ) ensure_column( "booking_workers", "fixed_amount", "INTEGER", ) ensur` (стр. 19)
- `downgradedef downgrade(): from backend.migrations._common import drop_column_if_exists for table in ("booking_workers", "additional_service_workers"):` (стр. 45)

### backend/migrations/add_performance_indexes.py (97 строк)

Классы и функции (2):

- `upgradedef upgrade() -> list[str]: from backend.migrations._common import _quote_ident, columns_of report: list[str] = [] with engine.begin() as connection: for name, table, cols in INDEX` (стр. 44)
- `check_models_in_syncdef check_models_in_sync() -> list[str]: """Сверка: все 19 индексов миграции есть в __table_args__ с теми же колонками.""" from backend.app import models as _models # noqa: F401 by` (стр. 66)

### backend/migrations/add_plate_type.py (37 строк)

Классы и функции (2):

- `upgradedef upgrade(): ensure_column( "clients", "plate_type", "VARCHAR(16)", not_null_default_sql="'russian'", ) ensure_column("bookings", "plate_type", "VARCHAR(16)") print("Migration co` (стр. 17)
- `downgradedef downgrade(): from backend.migrations._common import drop_column_if_exists drop_column_if_exists("clients", "plate_type") drop_column_if_exists("bookings", "plate_type") print("` (стр. 28)

### backend/migrations/add_referral_source.py (51 строк)

Классы и функции (3):

- `_db_filesdef _db_files() -> list[Path]: # G-005: точечный запуск без задевания тестовых БД. single = os.getenv("MIGRATION_DB") if single: return [Path(single)] return [ f for f in DATA_DIR.` (стр. 10)
- `add_referral_source_columndef add_referral_source_column(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() cursor.execute("PRAGMA table_info(clients)") columns = {row[` (стр. 24)
- `maindef main() -> None: print("Adding referral_source column to client databases...") for db_file in sorted(DB_FILES):` (стр. 43)

### backend/migrations/add_service_times.py (32 строк)

Классы и функции (2):

- `upgradedef upgrade(): ensure_column("bookings", "started_at", "TIMESTAMP") ensure_column("bookings", "completed_at", "TIMESTAMP") print("Migration complete: service times ensured on booki` (стр. 17)
- `downgradedef downgrade(): from backend.migrations._common import drop_column_if_exists drop_column_if_exists("bookings", "started_at") drop_column_if_exists("bookings", "completed_at") prin` (стр. 23)

### backend/migrations/add_stock_write_offs.py (44 строк)

Классы и функции (2):

- `upgradedef upgrade(): if not table_exists("stock_write_offs"):` (стр. 17)
- `downgradedef downgrade(): from backend.migrations._common import _quote_ident from backend.app.database import engine with engine.begin() as connection: connection.exec_driver_sql(f"DROP TA` (стр. 33)

### backend/migrations/add_write_off_booking_fields.py (34 строк)

Классы и функции (2):

- `upgradedef upgrade(): ensure_column("stock_write_offs", "booking_client_name", "VARCHAR(120)") ensure_column("stock_write_offs", "booking_date", "VARCHAR(16)") ensure_column("stock_write_` (стр. 17)
- `downgradedef downgrade(): from backend.migrations._common import drop_column_if_exists drop_column_if_exists("stock_write_offs", "booking_client_name") drop_column_if_exists("stock_write_of` (стр. 24)

### backend/migrations/change_int_to_float.py (43 строк)

Классы и функции (2):

- `upgradedef upgrade(): raise RuntimeError( "change_int_to_float superseded: денежные колонки ведёт " "finance_consistency.py (NUMERIC(18,2)), не DOUBLE PRECISION" )` (стр. 19)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_items ALTER COLUMN qty TYPE INTEGER")) conn.execute(text("ALTER TABLE stock_items ALTER COLUMN ` (стр. 26)

### backend/migrations/finance_consistency.py (117 строк)

Классы и функции (4):

- `_default_enginedef _default_engine() -> Engine: """Load application configuration only when the migration is executed.""" try: from backend.app.database import engine except ModuleNotFoundError: ` (стр. 15)
- `_sqlite_pathdef _sqlite_path(engine: Engine | None = None) -> Path | None: target = engine or _default_engine() if target.dialect.name != "sqlite": return None database = target.url.database r` (стр. 35)
- `preflightdef preflight(engine: Engine | None = None) -> list[str]: target = engine or _default_engine() inspector = inspect(target) report: list[str] = [] for table, names in MONEY_COLUMNS.` (стр. 43)
- `upgradedef upgrade(*, dry_run: bool = True, engine: Engine | None = None) -> list[str]: target = engine or _default_engine() report = preflight(target) if dry_run: return report if target` (стр. 58)

### backend/migrations/migrate_additional_services.py (90 строк)

Классы и функции (3):

- `_db_filesdef _db_files() -> list[Path]: # G-005: точечный запуск без задевания тестовых БД. single = os.getenv("MIGRATION_DB") if single: return [Path(single)] return [ f for f in DATA_DIR.` (стр. 12)
- `migrate_additional_servicesdef migrate_additional_services(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() # Проверить, существует ли новая таблица cursor.execute("SE` (стр. 26)
- `maindef main() -> None: print("Migrating additional services from Booking.services JSON to booking_additional_services table...") for db_file in sorted(DB_FILES):` (стр. 82)

### backend/migrations/payroll_entry_dates.py (222 строк)

Классы и функции (12):

- `_default_enginedef _default_engine() -> Engine: """Загружает конфигурацию приложения только при запуске миграции.""" try: from backend.app.database import engine except ModuleNotFoundError: # Зап` (стр. 40)
- `_modelsdef _models(): try: from backend.app import models except ModuleNotFoundError: # Запуск из каталога backend. from app import models return models` (стр. 49)
- `_local_tzdef _local_tz(): return datetime.now().astimezone().tzinfo or timezone.utc` (стр. 57)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 61)
- `_parse_entry_datedef _parse_entry_date(value: str) -> date | None: try: return date(day=int(value[0:2]), month=int(value[3:5]), year=int(value[6:10])) except (TypeError, ValueError, IndexError):` (стр. 67)
- `_fmtdef _fmt(value: date) -> str: return value.strftime("%d.%m.%Y")` (стр. 74)
- `_is_month_enddef _is_month_end(value: date) -> bool: return value.day == calendar.monthrange(value.year, value.month)[1]` (стр. 78)
- `_week_likedef _week_like(value: date) -> bool: """Старый период week падал на пятницу недели Сб..Пт.""" return value.weekday() == 4` (стр. 82)
- `_conduction_daydef _conduction_day(created_at: datetime | None) -> date | None: if created_at is None: return None return _as_utc(created_at).astimezone(_local_tz()).date()` (стр. 87)
- `_rewrite_candidatedef _rewrite_candidate(entry_date: date, conduction: date) -> bool: """Правило 3: день проведения внутри месяца/недели, заканчивающихся entry_date.""" if _is_month_end(entry_date):` (стр. 93)
- `plandef plan(engine: Engine) -> tuple[ list[str], list[tuple[str, str]], list[tuple[str, str, str]],` (стр. 106)
- `upgradedef upgrade(*, dry_run: bool = True, engine: Engine | None = None) -> list[str]: target = engine or _default_engine() models = _models() report, moves, mirror_moves = plan(target) ` (стр. 182)

### backend/migrations/sync_client_schema.py (60 строк)

Классы и функции (3):

- `_db_filesdef _db_files() -> list[Path]: # G-005: точечный запуск без задевания тестовых БД. single = os.getenv("MIGRATION_DB") if single: return [Path(single)] return [ f for f in DATA_DIR.` (стр. 10)
- `sync_client_schemadef sync_client_schema(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() cursor.execute("PRAGMA table_info(clients)") columns = {row[1] for r` (стр. 32)
- `maindef main() -> None: print("Syncing client table schema...") for db_file in sorted(DB_FILES):` (стр. 52)

### backend/run.py (10 строк)

### backend/tests/__init__.py (0 строк)

### backend/tests/test_additional_service_validation.py (264 строк)

Классы и функции (12):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 18)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 30)
- `class AdditionalServiceValidationTest(unittest.TestCase):` (стр. 34)
- `AdditionalServiceValidationTest.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 39)
- `AdditionalServiceValidationTest.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 64)
- `AdditionalServiceValidationTest._set_owner_telegram_iddef _set_owner_telegram_id(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = db` (стр. 77)
- `AdditionalServiceValidationTest._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 89)
- `AdditionalServiceValidationTest._todaydef _today() -> str: return datetime.now(timezone.utc).strftime("%d.%m.%Y")` (стр. 93)
- `AdditionalServiceValidationTest._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" phone = f"+7 (999) 000-{str(uui` (стр. 96)
- `AdditionalServiceValidationTest.test_add_additional_service_without_workers_and_not_outsource_failsdef test_add_additional_service_without_workers_and_not_outsource_fails(self) -> None: """Adding additional service with empty workers and isOutsource=false should fail.""" client_` (стр. 115)
- `AdditionalServiceValidationTest.test_add_additional_service_with_outsource_and_empty_workers_succeedsdef test_add_additional_service_with_outsource_and_empty_workers_succeeds(self) -> None: """Adding additional service with isOutsource=true and empty workers should succeed.""" cli` (стр. 160)
- `AdditionalServiceValidationTest.test_update_additional_service_removing_workers_without_outsource_failsdef test_update_additional_service_removing_workers_without_outsource_fails(self) -> None: """Updating to remove all workers without setting outsource=true should fail.""" client_i` (стр. 206)

### backend/tests/test_archive.py (391 строк)

Классы и функции (23):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 20)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode( {"user": json.dumps({"id": in` (стр. 26)
- `class ArchiveEndpointTests(unittest.TestCase):` (стр. 33)
- `ArchiveEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 38)
- `ArchiveEndpointTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 61)
- `ArchiveEndpointTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 67)
- `ArchiveEndpointTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 76)
- `ArchiveEndpointTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser mapping = { "admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, ` (стр. 85)
- `ArchiveEndpointTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `ArchiveEndpointTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 106)
- `ArchiveEndpointTests.create_bookingdef create_booking(self, *, status: str = "scheduled") -> dict: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.auth_header` (стр. 114)
- `ArchiveEndpointTests.get_archivedef get_archive(self, *, token: str | None = None, **params) -> dict: query = urllib.parse.urlencode(params) response = self.client.get( f"/api/owner/archive?{query}", headers=self` (стр. 149)
- `ArchiveEndpointTests.test_archive_returns_booking_with_split_amountsdef test_archive_returns_booking_with_split_amounts(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() item = next( (b for b in archive["` (стр. 158)
- `ArchiveEndpointTests.test_archive_period_filterdef test_archive_period_filter(self) -> None: booking = self.create_booking(status="completed") date_from = booking["date"] archive = self.get_archive(date_from=date_from, date_to=` (стр. 182)
- `ArchiveEndpointTests.test_archive_contains_incomes_expenses_and_piggydef test_archive_contains_incomes_expenses_and_piggy(self) -> None: today = datetime.now().strftime("%d.%m.%Y") income = self.client.post( "/api/owner/incomes", headers=self.auth_h` (стр. 204)
- `ArchiveEndpointTests.test_archive_payroll_and_owners_sectionsdef test_archive_payroll_and_owners_sections(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() worker = next( (w for w in archive["payro` (стр. 240)
- `ArchiveEndpointTests.test_archive_booking_detail_matches_money_splitdef test_archive_booking_detail_matches_money_split(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() item = next((b for b in archive["b` (стр. 261)
- `ArchiveEndpointTests.test_archive_booking_has_client_iddef test_archive_booking_has_client_id(self) -> None: booking = self.create_booking(status="completed") archive = self.get_archive() item = next((b for b in archive["bookings"] if ` (стр. 281)
- `ArchiveEndpointTests.test_wallet_accepts_period_datesdef test_wallet_accepts_period_dates(self) -> None: yesterday = (datetime.now() - timedelta(days=1)).strftime("%d.%m.%Y") income = self.client.post( "/api/owner/incomes", headers=s` (стр. 288)
- `ArchiveEndpointTests.test_owners_salary_detail_with_datesdef test_owners_salary_detail_with_dates(self) -> None: booking = self.create_booking(status="completed") split = self.client.get( f"/api/owner/bookings/{booking['id']}/money-split` (стр. 317)
- `ArchiveEndpointTests.test_archive_requires_owner_roledef test_archive_requires_owner_role(self) -> None: response = self.client.get( "/api/owner/archive", headers=self.auth_headers(self.admin_token), ) self.assertEqual(response.statu` (стр. 336)
- `ArchiveEndpointTests.test_archive_rejects_invalid_datedef test_archive_rejects_invalid_date(self) -> None: response = self.client.get( "/api/owner/archive?date_from=not-a-date", headers=self.auth_headers(self.owner_token), ) self.asse` (стр. 349)
- `ArchiveEndpointTests.test_worker_salary_detail_accepts_both_date_formatsdef test_worker_salary_detail_accepts_both_date_formats(self) -> None: booking = self.create_booking(status="completed") booking_date = booking["date"] iso_date = booking_date[6:10` (стр. 356)

### backend/tests/test_archive_split_zp_sync.py (425 строк)

Классы и функции (14):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 19)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 25)
- `class ArchiveSplitPayrollSyncTests(unittest.TestCase):` (стр. 29)
- `ArchiveSplitPayrollSyncTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 34)
- `ArchiveSplitPayrollSyncTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 57)
- `ArchiveSplitPayrollSyncTests.restart_appdef restart_app(self) -> None: reset_app_modules() from app.main import app self.client_manager = TestClient(app) self.client = self.client_manager.__enter__()` (стр. 70)
- `ArchiveSplitPayrollSyncTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = { "admin": self.ADMIN_TG_I` (стр. 77)
- `ArchiveSplitPayrollSyncTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 95)
- `ArchiveSplitPayrollSyncTests.next_active_datedef next_active_date() -> str: # В сиде неактивен только day_index=1 («Вс», конвенция Сб=0..Пт=6). candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, micros` (стр. 99)
- `ArchiveSplitPayrollSyncTests._worker_iddef _worker_id(self) -> str: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: worker = db.scalars(select(StaffUser).where(StaffUser` (стр. 108)
- `ArchiveSplitPayrollSyncTests.create_completed_bookingdef create_completed_booking(self) -> dict: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.auth_headers(self.admin_token),` (стр. 116)
- `ArchiveSplitPayrollSyncTests.test_override_in_archive_updates_payroll_pagesdef test_override_in_archive_updates_payroll_pages(self) -> None: booking = self.create_completed_booking() split = self.client.get( f"/api/owner/bookings/{booking['id']}/money-spl` (стр. 149)
- `ArchiveSplitPayrollSyncTests.test_owner_master_override_reflected_on_payroll_pagedef test_owner_master_override_reflected_on_payroll_page(self) -> None: """Правка суммы в архиве для владельца-мастера (extra_roles=['worker']) должна отражаться на странице «Зарпл` (стр. 236)
- `ArchiveSplitPayrollSyncTests.test_archive_payroll_tab_includes_owner_masterdef test_archive_payroll_tab_includes_owner_master(self) -> None: """Вкладка «Зарплаты» внутри архива: мастер-владелец виден, правка суммы в архиве меняет его начисления.""" from a` (стр. 333)

### backend/tests/test_attendance_endpoints.py (248 строк)

Классы и функции (12):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `class AttendanceEndpointTests(unittest.TestCase):` (стр. 30)
- `AttendanceEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 33)
- `AttendanceEndpointTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 61)
- `AttendanceEndpointTests._link_staffdef _link_staff(self, login: str, telegram_id: str) -> None: from sqlalchemy import select from app.database import SessionLocal from app.models import StaffUser with SessionLocal(` (стр. 78)
- `AttendanceEndpointTests._telegram_init_datadef _telegram_init_data(telegram_id: str) -> str: from urllib.parse import urlencode return urlencode({"user": f'{{"id":{telegram_id}}}'})` (стр. 92)
- `AttendanceEndpointTests._get_worker_iddef _get_worker_id(self, login: str) -> str: """Return the staff user id for the given login.""" from sqlalchemy import select from app.database import SessionLocal from app.models` (стр. 97)
- `AttendanceEndpointTests._auth_headersdef _auth_headers(init_data: str) -> dict[str, str]: return {"Authorization": init_data}` (стр. 113)
- `AttendanceEndpointTests.test_get_all_workers_attendance_with_invalid_period_returns_422def test_get_all_workers_attendance_with_invalid_period_returns_422(self) -> None: """GET /api/owner/shift-attendance?period=invalid returns 422. Requirements: 3.4 """ response = s` (стр. 120)
- `AttendanceEndpointTests.test_worker_requesting_another_workers_attendance_via_owner_endpoint_returns_403def test_worker_requesting_another_workers_attendance_via_owner_endpoint_returns_403( self,` (стр. 132)
- `AttendanceEndpointTests.test_owner_can_open_shift_for_masters_immediately_approveddef test_owner_can_open_shift_for_masters_immediately_approved(self) -> None: """Owner opens a shift for masters: immediately approved, visible in the shift list and counted in mas` (стр. 153)
- `AttendanceEndpointTests.test_new_worker_gets_default_shift_pay_1000def test_new_worker_gets_default_shift_pay_1000(self) -> None: """Новый сотрудник получает оклад за выход 1000 ₽ по умолчанию.""" unique_login = f"newmaster-{uuid4().hex[:8]}" resp` (стр. 225)

### backend/tests/test_booking_logic.py (4634 строк)

Классы и функции (152):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `class BookingLogicTests(unittest.TestCase):` (стр. 33)
- `BookingLogicTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 34)
- `BookingLogicTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 54)
- `BookingLogicTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 60)
- `BookingLogicTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 69)
- `BookingLogicTests.login_clientdef login_client(self, *, name: str, phone: str, car: str = "Lada Vesta", plate: str = "A123BC", telegram_id: str | None = None) -> tuple[str, str]: tid = telegram_id or ("7" + "".` (стр. 78)
- `BookingLogicTests.client_auth_payloaddef client_auth_payload( self, *, name: str, phone: str, car: str = "Lada Vesta", plate: str = "A123BC", telegram_id: str | None = None,` (стр. 89)
- `BookingLogicTests.make_init_datadef make_init_data( self, telegram_id: str, *, first_name: str = "Alice", username: str | None = None, auth_date: int | None = None,` (стр. 111)
- `BookingLogicTests.telegram_webhook_secretdef telegram_webhook_secret(self) -> str: raw = f"{os.environ['APP_SECRET']}:{os.environ['TELEGRAM_BOT_TOKEN']}".encode("utf-8") return hashlib.sha256(raw).hexdigest()` (стр. 132)
- `BookingLogicTests.test_telegram_webhook_acknowledges_processing_errorsdef test_telegram_webhook_acknowledges_processing_errors(self) -> None: with patch("app.main.process_telegram_update", side_effect=RuntimeError("telegram send failed")):` (стр. 136)
- `BookingLogicTests.login_staffdef login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(respo` (стр. 147)
- `BookingLogicTests.get_staffdef get_staff(self, *, login: str | None = None, staff_id: str | None = None) -> dict[str, object]: from app.database import SessionLocal from app.models import StaffUser if login ` (стр. 155)
- `BookingLogicTests.get_clientdef get_client(self, client_id: str) -> dict[str, object]: from app.database import SessionLocal from app.models import Client with SessionLocal() as db: client = db.get(Client, cl` (стр. 173)
- `BookingLogicTests.count_clientsdef count_clients(self) -> int: from app.database import SessionLocal from app.models import Client with SessionLocal() as db: return len(db.scalars(select(Client)).all())` (стр. 190)
- `BookingLogicTests.count_client_notificationsdef count_client_notifications(self, client_id: str) -> int: from app.database import SessionLocal from app.models import Notification with SessionLocal() as db: return len( db.sca` (стр. 197)
- `BookingLogicTests.test_session_schema_supports_prefixed_ids_and_long_mobile_user_agentsdef test_session_schema_supports_prefixed_ids_and_long_mobile_user_agents(self) -> None: from app.models import Booking, BookingWorker, Client, Expense, Notification, Penalty, Staf` (стр. 211)
- `BookingLogicTests.count_worker_notificationsdef count_worker_notifications(self, worker_id: str) -> int: from app.database import SessionLocal from app.models import Notification with SessionLocal() as db: return len( db.sca` (стр. 245)
- `BookingLogicTests.disable_owner_two_factordef disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_s` (стр. 259)
- `BookingLogicTests.test_secondary_owner_can_login_without_primary_owner_telegram_when_2fa_cannot_rundef test_secondary_owner_can_login_without_primary_owner_telegram_when_2fa_cannot_run(self) -> None: response = self.client.post( "/api/auth/staff/login", json={"login": "owner", "` (стр. 270)
- `BookingLogicTests.set_primary_owner_telegramdef set_primary_owner_telegram(self, chat_id: str = "974738256") -> None: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: owner = ` (стр. 280)
- `BookingLogicTests.set_staff_telegramdef set_staff_telegram(self, login: str, chat_id: str) -> None: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: staff = db.scalar(` (стр. 291)
- `BookingLogicTests.verify_client_phonedef verify_client_phone(self, telegram_id: str, phone: str) -> None: from bot import _store_client_phone_verification from app.schemas import normalize_phone_digits _store_client_p` (стр. 302)
- `BookingLogicTests.test_cron_requires_configured_secretdef test_cron_requires_configured_secret(self) -> None: self.shutdown_app() os.environ.pop("CRON_SECRET", None) self.restart_app() response = self.client.get("/api/cron/reminders")` (стр. 308)
- `BookingLogicTests.test_production_requires_non_default_app_secretdef test_production_requires_non_default_app_secret(self) -> None: self.shutdown_app() os.environ["APP_ENV"] = "production" os.environ["APP_SECRET"] = "change-me" with self.assertR` (стр. 316)
- `BookingLogicTests.test_production_does_not_seed_demo_password_accountsdef test_production_does_not_seed_demo_password_accounts(self) -> None: self.shutdown_app() if self.db_path.exists():` (стр. 328)
- `BookingLogicTests.test_staff_login_is_rate_limited_after_repeated_failuresdef test_staff_login_is_rate_limited_after_repeated_failures(self) -> None: from app.main import _LOGIN_MAX_ATTEMPTS for attempt in range(_LOGIN_MAX_ATTEMPTS):` (стр. 354)
- `BookingLogicTests.extract_owner_reset_codedef extract_owner_reset_code(message: str) -> str: prefixes = ["Код подтверждения: ", "Код подтверждения: "] for line in message.splitlines():` (стр. 377)
- `BookingLogicTests.force_owner_reset_readydef force_owner_reset_ready(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_da` (стр. 385)
- `BookingLogicTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 399)
- `BookingLogicTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 403)
- `BookingLogicTests.test_client_booking_uses_session_client_and_forces_admin_review_statusdef test_client_booking_uses_session_client_and_forces_admin_review_status(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = s` (стр. 411)
- `BookingLogicTests.test_owner_can_update_client_card_notes_and_debtdef test_owner_can_update_client_card_notes_and_debt(self) -> None: _client_token, client_id = self.login_client(name="Alice", phone="+7 (999) 222-33-44") self.disable_owner_two_fa` (стр. 444)
- `BookingLogicTests.test_owner_dispatches_booking_reminders_once_per_bookingdef test_owner_dispatches_booking_reminders_once_per_booking(self) -> None: self.verify_client_phone("555111222", "+7 (999) 555-44-33") auth_response = self.client.post( "/api/auth` (стр. 469)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 530)
- `BookingLogicTests.test_client_login_tolerates_legacy_partial_settingsdef test_client_login_tolerates_legacy_partial_settings(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: owner_noti` (стр. 572)
- `BookingLogicTests.test_client_booking_can_share_busy_boxdef test_client_booking_can_share_busy_box(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() admin_response = self.client.post(` (стр. 610)
- `BookingLogicTests.test_detailing_booking_uses_detailing_room_and_keeps_slots_separatedef test_detailing_booking_uses_detailing_room_and_keeps_slots_separate(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() wash_` (стр. 662)
- `BookingLogicTests.test_booking_rejects_box_time_overlapdef test_booking_rejects_box_time_overlap(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") common = { "clientId": "", "clientName": "Alice", "c` (стр. 728)
- `BookingLogicTests.test_admin_can_edit_and_complete_existing_booking_on_inactive_daydef test_admin_can_edit_and_complete_existing_booking_on_inactive_day(self) -> None: from app.database import SessionLocal from app.models import Booking, Client admin_token = self` (стр. 764)
- `BookingLogicTests.test_admin_booking_without_box_picks_available_wash_boxdef test_admin_booking_without_box_picks_available_wash_box(self) -> None: admin_token = self.login_staff("admin", "admin") booking_date = self.next_active_date() first_response = ` (стр. 820)
- `BookingLogicTests.test_admin_can_start_booking_that_ends_exactly_at_closing_timedef test_admin_can_start_booking_that_ends_exactly_at_closing_time(self) -> None: from app.database import SessionLocal from app.models import ScheduleEntry admin_token = self.logi` (стр. 870)
- `BookingLogicTests.test_admin_can_change_booking_status_without_revalidating_unchanged_slotdef test_admin_can_change_booking_status_without_revalidating_unchanged_slot(self) -> None: from app.database import SessionLocal from app.models import Booking, ScheduleEntry admi` (стр. 926)
- `BookingLogicTests.test_booking_must_fit_schedule_windowdef test_booking_must_fit_schedule_window(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") # Явная среда (day_index=2, close=21:00): 20:30 + 90` (стр. 991)
- `BookingLogicTests.test_worker_cannot_update_foreign_bookingdef test_worker_cannot_update_foreign_booking(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/bookings", headers=self.auth` (стр. 1022)
- `BookingLogicTests.test_owner_can_revoke_all_worker_complaintsdef test_owner_can_revoke_all_worker_complaints(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker = self.get_staff(login="ivan"` (стр. 1056)
- `BookingLogicTests.test_owner_summary_report_sends_detailed_excel_documentdef test_owner_summary_report_sends_detailed_excel_document(self) -> None: from app.database import SessionLocal from app.models import Booking, BookingWorker self.disable_owner_tw` (стр. 1085)
- `BookingLogicTests.fake_send_documentdef fake_send_document(chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream") -> None: sent_documents.appen` (стр. 1149)
- `BookingLogicTests.test_admin_create_booking_can_assign_workers_and_notify_themdef test_admin_create_booking_can_assign_workers_and_notify_them(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = s` (стр. 1197)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 1211)
- `BookingLogicTests.test_admin_can_create_booking_without_platedef test_admin_can_create_booking_without_plate(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/bookings", headers=self.auth_head` (стр. 1262)
- `BookingLogicTests.test_admin_can_create_admin_review_booking_with_empty_optional_fieldsdef test_admin_can_create_admin_review_booking_with_empty_optional_fields(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/booking` (стр. 1292)
- `BookingLogicTests.test_admin_cannot_create_scheduled_booking_without_date_and_timedef test_admin_cannot_create_scheduled_booking_without_date_and_time(self) -> None: """Статус scheduled требует валидный слот при создании — иначе запись нельзя впоследствии переве` (стр. 1330)
- `BookingLogicTests.test_scheduled_booking_without_slot_cannot_be_moved_to_active_statusdef test_scheduled_booking_without_slot_cannot_be_moved_to_active_status(self) -> None: """Слотless запись (устаревшие данные) не может быть переведена в активный статус: PATCH отв` (стр. 1359)
- `BookingLogicTests.test_patch_can_clear_slot_when_moving_to_non_active_statusdef test_patch_can_clear_slot_when_moving_to_non_active_status(self) -> None: """Регресс: перевод детейлинг-записи со слотом в «на уточнении» (admin_review) фронтенд отправляет с н` (стр. 1405)
- `BookingLogicTests.test_owner_can_create_client_and_past_booking_visible_on_first_client_logindef test_owner_can_create_client_and_past_booking_visible_on_first_client_login(self) -> None: owner_token = self.login_staff("owner", "owner") client_response = self.client.post( ` (стр. 1456)
- `BookingLogicTests.test_service_resource_group_preserved_on_savedef test_service_resource_group_preserved_on_save(self) -> None: owner_token = self.login_staff("owner", "owner") bootstrap = self.client.get("/api/auth/session", headers=self.auth` (стр. 1509)
- `BookingLogicTests.test_fired_worker_loses_access_and_future_assignmentsdef test_fired_worker_loses_access_and_future_assignments(self) -> None: admin_token = self.login_staff("admin", "admin") self.disable_owner_two_factor() owner_token = self.login_s` (стр. 1526)
- `BookingLogicTests.test_same_telegram_client_reuses_existing_accountdef test_same_telegram_client_reuses_existing_account(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.` (стр. 1586)
- `BookingLogicTests.test_generic_telegram_auth_logs_in_linked_clientdef test_generic_telegram_auth_logs_in_linked_client(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.c` (стр. 1620)
- `BookingLogicTests.test_generic_telegram_auth_tolerates_legacy_client_profile_datadef test_generic_telegram_auth_tolerates_legacy_client_profile_data(self) -> None: from app.database import SessionLocal from app.models import Client self.verify_client_phone("100` (стр. 1639)
- `BookingLogicTests.test_generic_telegram_auth_prefers_linked_staff_windowdef test_generic_telegram_auth_prefers_linked_staff_window(self) -> None: self.set_staff_telegram("ivan", "7001") self.verify_client_phone("7001", "+7 (999) 111-22-33") client = se` (стр. 1669)
- `BookingLogicTests.test_generic_telegram_auth_does_not_claim_primary_ownerdef test_generic_telegram_auth_does_not_claim_primary_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post("/api/auth/telegram", json={"initData": s` (стр. 1685)
- `BookingLogicTests.test_primary_owner_telegram_route_rejects_unlinked_ownerdef test_primary_owner_telegram_route_rejects_unlinked_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post( "/api/auth/telegram-owner", json={"init` (стр. 1692)
- `BookingLogicTests.test_nullable_text_values_are_treated_as_empty_stringsdef test_nullable_text_values_are_treated_as_empty_strings(self) -> None: from app.main import _safe_text self.assertEqual(_safe_text(None), "") self.assertEqual(_safe_text(" 9001 ` (стр. 1705)
- `BookingLogicTests.test_primary_owner_can_log_in_via_dedicated_telegram_routedef test_primary_owner_can_log_in_via_dedicated_telegram_route(self) -> None: self.set_primary_owner_telegram("9001") response = self.client.post( "/api/auth/telegram-owner", json=` (стр. 1711)
- `BookingLogicTests.test_generic_telegram_auth_rejects_expired_init_datadef test_generic_telegram_auth_rejects_expired_init_data(self) -> None: # Строгий режим: без insecure-fallback просроченный initData отклоняется self.shutdown_app() os.environ["ALL` (стр. 1728)
- `BookingLogicTests.test_generic_telegram_auth_rejects_duplicate_staff_bindingsdef test_generic_telegram_auth_rejects_duplicate_staff_bindings(self) -> None: self.set_staff_telegram("ivan", "7007") self.set_staff_telegram("oleg", "7007") response = self.clien` (стр. 1745)
- `BookingLogicTests.test_client_registration_rejects_same_phone_for_different_telegram_idsdef test_client_registration_rejects_same_phone_for_different_telegram_ids(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/aut` (стр. 1753)
- `BookingLogicTests.test_client_profile_cannot_take_phone_of_another_clientdef test_client_profile_cannot_take_phone_of_another_client(self) -> None: first_token, first_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") second_token, _ = sel` (стр. 1768)
- `BookingLogicTests.test_client_booking_creates_notification_for_same_client_iddef test_client_booking_creates_notification_for_same_client_id(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.` (стр. 1787)
- `BookingLogicTests.test_client_cannot_mark_other_clients_notification_as_readdef test_client_cannot_mark_other_clients_notification_as_read(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice` (стр. 1818)
- `BookingLogicTests.test_client_login_rejects_foreign_telegram_id_for_existing_phonedef test_client_login_rejects_foreign_telegram_id_for_existing_phone(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/clie` (стр. 1847)
- `BookingLogicTests.test_client_read_all_marks_only_own_notificationsdef test_client_read_all_marks_only_own_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice", phone=` (стр. 1868)
- `BookingLogicTests.test_client_read_all_rejects_foreign_role_payloaddef test_client_read_all_rejects_foreign_role_payload(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/notif` (стр. 1910)
- `BookingLogicTests.test_deleting_client_removes_client_sessions_and_notificationsdef test_deleting_client_removes_client_sessions_and_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name=` (стр. 1919)
- `BookingLogicTests.test_client_cancel_booking_creates_client_and_admin_notificationsdef test_client_cancel_booking_creates_client_and_admin_notifications(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") create_response =` (стр. 1947)
- `BookingLogicTests.test_deleted_client_can_register_again_with_same_phone_and_telegramdef test_deleted_client_can_register_again_with_same_phone_and_telegram(self) -> None: admin_token = self.login_staff("admin", "admin") self.verify_client_phone("1001", "+7 (999) 1` (стр. 1988)
- `BookingLogicTests.test_secure_client_auth_requires_valid_init_datadef test_secure_client_auth_requires_valid_init_data(self) -> None: self.shutdown_app() os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "false" self.restart_app() missing = self.client.` (стр. 2012)
- `BookingLogicTests.test_admin_reschedule_creates_client_notificationdef test_admin_reschedule_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 2043)
- `BookingLogicTests.test_admin_completion_creates_client_notificationdef test_admin_completion_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 2081)
- `BookingLogicTests.test_admin_booking_reuses_existing_client_by_normalized_phonedef test_admin_booking_reuses_existing_client_by_normalized_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", pho` (стр. 2125)
- `BookingLogicTests.test_admin_cannot_create_booking_with_conflicting_client_and_phonedef test_admin_cannot_create_booking_with_conflicting_client_and_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, first_client_id = self.login_client(name="` (стр. 2159)
- `BookingLogicTests.test_admin_can_save_profile_and_notification_settingsdef test_admin_can_save_profile_and_notification_settings(self) -> None: admin_token = self.login_staff("admin", "admin") profile_response = self.client.put( "/api/settings/admin/p` (стр. 2187)
- `BookingLogicTests.test_owner_can_create_admin_like_worker_and_update_telegram_idsdef test_owner_can_create_admin_like_worker_and_update_telegram_ids(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_admin = s` (стр. 2227)
- `BookingLogicTests.test_owner_can_create_and_login_accountantdef test_owner_can_create_and_login_accountant(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_accountant = self.client.post(` (стр. 2309)
- `BookingLogicTests.test_owner_can_rehire_employee_with_same_telegram_after_dismissaldef test_owner_can_rehire_employee_with_same_telegram_after_dismissal(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_worker ` (стр. 2348)
- `BookingLogicTests.test_admin_can_manage_master_payroll_and_private_client_ratingdef test_admin_can_manage_master_payroll_and_private_client_rating(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", ph` (стр. 2399)
- `BookingLogicTests.test_admin_payroll_propagates_period_and_matches_salary_base_helperdef test_admin_payroll_propagates_period_and_matches_salary_base_helper(self) -> None: from app.database import SessionLocal from app.finance import money_int, salary_base_for_peri` (стр. 2441)
- `BookingLogicTests.test_owner_and_admin_can_see_detailed_worker_payroll_summarydef test_owner_and_admin_can_see_detailed_worker_payroll_summary(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.` (стр. 2501)
- `BookingLogicTests.test_payroll_entry_notifies_worker_and_updates_summarydef test_payroll_entry_notifies_worker_and_updates_summary(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser self.disable_owner_tw` (стр. 2594)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2609)
- `BookingLogicTests.test_admin_cannot_issue_advance_before_worker_earns_1000def test_admin_cannot_issue_advance_before_worker_earns_1000(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/payroll/entries", he` (стр. 2635)
- `BookingLogicTests._tg_headersdef _tg_headers(self, login: str, telegram_id: str) -> dict[str, str]: """Авторизация текущего флоу (Telegram init data): привязываем telegram_chat_id к сотруднику и возвращаем заг` (стр. 2651)
- `BookingLogicTests.test_payroll_entries_with_period_are_attributed_to_selected_perioddef test_payroll_entries_with_period_are_attributed_to_selected_period(self) -> None: """Премия/штраф/списание с выбранным периодом учитываются за этот период (08.08–14.08), а не п` (стр. 2670)
- `BookingLogicTests.test_payroll_entry_without_period_keeps_created_at_behaviordef test_payroll_entry_without_period_keeps_created_at_behavior(self) -> None: """Операция без периода (legacy) учитывается по дате создания.""" owner_headers = self._tg_headers("o` (стр. 2735)
- `BookingLogicTests.test_owner_can_delete_payroll_entry_with_linked_budget_recordsdef test_owner_can_delete_payroll_entry_with_linked_budget_records(self) -> None: """Владелец может удалить выплату и штраф; связанные записи бюджета удаляются.""" from app.databas` (стр. 2768)
- `BookingLogicTests.test_owner_pay_salary_attributes_payout_to_selected_perioddef test_owner_pay_salary_attributes_payout_to_selected_period(self) -> None: """Выплата мастеру тоже привязывается к выбранному периоду.""" owner_headers = self._tg_headers("owner` (стр. 2865)
- `BookingLogicTests.test_payroll_operations_for_current_periods_fall_on_conduction_daydef test_payroll_operations_for_current_periods_fall_on_conduction_day(self) -> None: """Выплата/премия за периоды day/week/month падают реальным днём проведения, а не концом перио` (стр. 2891)
- `BookingLogicTests.test_owner_salary_detail_lists_db_owners_without_configdef test_owner_salary_detail_lists_db_owners_without_config(self) -> None: """Доходы владельцев видны без PERMANENT_TELEGRAM_OWNERS — владельцы берутся из БД.""" owner_headers = se` (стр. 2947)
- `BookingLogicTests.test_owner_pdf_export_returns_pdf_filedef test_owner_pdf_export_returns_pdf_file(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self.client.get("/api/owner/ex` (стр. 2975)
- `BookingLogicTests.test_owner_can_create_booking_with_assigned_master_without_platedef test_owner_can_create_booking_with_assigned_master_without_plate(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self` (стр. 2984)
- `BookingLogicTests.test_admin_reschedule_notifies_assigned_workerdef test_admin_reschedule_notifies_assigned_worker(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = self.login_staf` (стр. 3013)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3052)
- `BookingLogicTests.test_worker_start_and_completion_notify_owner_and_send_receiptdef test_worker_start_and_completion_notify_owner_and_send_receipt(self) -> None: from app.database import SessionLocal from app.models import Client, Notification self.disable_own` (стр. 3089)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3134)
- `BookingLogicTests.test_client_can_store_multiple_vehiclesdef test_client_can_store_multiple_vehicles(self) -> None: token, client_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.patch( "/api/client` (стр. 3180)
- `BookingLogicTests.test_owner_can_notify_admin_about_inactive_clientsdef test_owner_can_notify_admin_about_inactive_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two_fact` (стр. 3217)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3252)
- `BookingLogicTests.test_owner_dispatches_return_visit_reminders_to_clientsdef test_owner_dispatches_return_visit_reminders_to_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two` (стр. 3272)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3316)
- `BookingLogicTests.test_worker_can_submit_shift_checklists_and_owner_can_review_themdef test_worker_can_submit_shift_checklists_and_owner_can_review_them(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 3346)
- `BookingLogicTests.test_admin_shift_inspection_sends_owner_photo_and_can_be_approveddef test_admin_shift_inspection_sends_owner_photo_and_can_be_approved(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 3415)
- `BookingLogicTests.fake_send_photodef fake_send_photo(chat_id: str | int, **kwargs) -> None: sent_photos.append({"chat_id": chat_id, **kwargs})` (стр. 3435)
- `BookingLogicTests.test_admin_shift_inspection_list_uses_photo_endpointdef test_admin_shift_inspection_list_uses_photo_endpoint(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_st` (стр. 3471)
- `BookingLogicTests.test_bot_can_reject_admin_shift_with_issue_notedef test_bot_can_reject_admin_shift_with_issue_note(self) -> None: from bot import BotRuntime, process_telegram_update from app.database import SessionLocal from app.models import ` (стр. 3514)
- `BookingLogicTests.fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict[str, object] | None = None, **_kwargs): telegram_calls.append((method, payload or {})) return {}` (стр. 3549)
- `BookingLogicTests.test_admin_mark_read_all_affects_only_admin_notificationsdef test_admin_mark_read_all_affects_only_admin_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") owner_token = self.login_staff("owner", "owner") if Fa` (стр. 3581)
- `BookingLogicTests.test_admin_cannot_access_owner_only_endpointsdef test_admin_cannot_access_owner_only_endpoints(self) -> None: admin_token = self.login_staff("admin", "admin") create_worker = self.client.post( "/api/workers", headers=self.aut` (стр. 3624)
- `BookingLogicTests.test_worker_can_update_only_own_assigned_booking_status_and_notesdef test_worker_can_update_only_own_assigned_booking_status_and_notes(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "maste` (стр. 3671)
- `BookingLogicTests.test_worker_completion_creates_admin_notification_with_amount_client_and_servicedef test_worker_completion_creates_admin_notification_with_amount_client_and_service(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff` (стр. 3717)
- `BookingLogicTests.test_worker_cannot_change_time_or_workers_even_on_own_bookingdef test_worker_cannot_change_time_or_workers_even_on_own_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 3757)
- `BookingLogicTests.test_worker_must_specify_payment_state_when_completing_bookingdef test_worker_must_specify_payment_state_when_completing_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master")` (стр. 3799)
- `BookingLogicTests.test_worker_can_save_only_own_profiledef test_worker_can_save_only_own_profile(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.get_staff(login` (стр. 3852)
- `BookingLogicTests.test_worker_can_save_only_own_notification_settingsdef test_worker_can_save_only_own_notification_settings(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.g` (стр. 3890)
- `BookingLogicTests.test_worker_mark_read_all_affects_only_own_notificationsdef test_worker_mark_read_all_affects_only_own_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker_token = self.log` (стр. 3923)
- `BookingLogicTests.test_worker_cannot_create_penaltiesdef test_worker_cannot_create_penalties(self) -> None: worker_token = self.login_staff("ivan", "master") other_worker = self.get_staff(login="oleg") response = self.client.post( "/` (стр. 3956)
- `BookingLogicTests.test_worker_cannot_create_notifications_for_other_rolesdef test_worker_cannot_create_notifications_for_other_roles(self) -> None: worker_token = self.login_staff("ivan", "master") _, client_id = self.login_client(name="Alice", phone="+` (стр. 3966)
- `BookingLogicTests.test_worker_can_create_notification_for_assigned_clientdef test_worker_can_create_notification_for_assigned_client(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") worker` (стр. 3981)
- `BookingLogicTests.test_worker_can_generate_telegram_link_codedef test_worker_can_generate_telegram_link_code(self) -> None: worker_token = self.login_staff("ivan", "master") response = self.client.post( "/api/telegram/link-code", headers=sel` (стр. 4022)
- `BookingLogicTests.test_telegram_webhook_rejects_invalid_secretdef test_telegram_webhook_rejects_invalid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.restart_app()` (стр. 4033)
- `BookingLogicTests.test_telegram_webhook_processes_update_with_valid_secretdef test_telegram_webhook_processes_update_with_valid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.r` (стр. 4045)
- `BookingLogicTests.test_client_bootstrap_contains_only_own_bookings_and_no_worker_directorydef test_client_bootstrap_contains_only_own_bookings_and_no_worker_directory(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_clie` (стр. 4060)
- `BookingLogicTests.test_worker_bootstrap_contains_only_assigned_bookingsdef test_worker_bootstrap_contains_only_assigned_bookings(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") first_wo` (стр. 4120)
- `BookingLogicTests.test_admin_can_update_booking_alias_fields_and_service_canonical_datadef test_admin_can_update_booking_alias_fields_and_service_canonical_data(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/` (стр. 4180)
- `BookingLogicTests.test_owner_stock_write_off_rejects_negative_qtydef test_owner_stock_write_off_rejects_negative_qty(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_response = self.client.po` (стр. 4231)
- `BookingLogicTests.test_admin_can_read_targeted_admin_notificationsdef test_admin_can_read_targeted_admin_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_staff(` (стр. 4260)
- `BookingLogicTests.test_deleting_client_removes_related_bookings_and_sessionsdef test_deleting_client_removes_related_bookings_and_sessions(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name="Ali` (стр. 4313)
- `BookingLogicTests.test_worker_cannot_message_client_from_only_completed_bookingdef test_worker_cannot_message_client_from_only_completed_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 4350)
- `BookingLogicTests.test_owner_database_reset_execute_requires_delay_after_approvaldef test_owner_database_reset_execute_requires_delay_after_approval(self) -> None: self.disable_owner_two_factor() self.set_primary_owner_telegram() owner_token = self.login_staff(` (стр. 4397)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 4403)
- `BookingLogicTests.test_owner_database_reset_clears_operational_data_and_preserves_ownersdef test_owner_database_reset_clears_operational_data_and_preserves_owners(self) -> None: from app.database import SessionLocal from app.models import ( AppSetting, Booking, Box, C` (стр. 4437)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 4508)
- `BookingLogicTests.test_normalize_service_and_box_resources_handles_legacy_null_box_fieldsdef test_normalize_service_and_box_resources_handles_legacy_null_box_fields(self) -> None: from app.main import DETAILING_BOX_NAME, WASH_BOX_NAMES, _normalize_service_and_box_resou` (стр. 4571)
- `class FakeScalarResult: def __init__(self, items: list[object]) -> None: self._items = items def all(self) -> list[objec` (стр. 4575)
- `FakeScalarResult.__init__def __init__(self, items: list[object]) -> None: self._items = items` (стр. 4576)
- `FakeScalarResult.alldef all(self) -> list[object]: return self._items` (стр. 4579)
- `class FakeSession: def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.` (стр. 4582)
- `FakeSession.__init__def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.boxes = boxes self.flushed = False` (стр. 4583)
- `FakeSession.scalarsdef scalars(self, statement): entity = statement.column_descriptions[0]["entity"] if entity is Service: return FakeScalarResult(self.services) if entity is Box: return FakeScalarRe` (стр. 4588)
- `FakeSession.adddef add(self, _item: object) -> None: return None` (стр. 4596)
- `FakeSession.flushdef flush(self) -> None: self.flushed = True` (стр. 4599)

### backend/tests/test_booking_money_split.py (1347 строк)

Классы и функции (35):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 16)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 28)
- `class BookingMoneySplitTests(unittest.TestCase):` (стр. 33)
- `BookingMoneySplitTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 38)
- `BookingMoneySplitTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 67)
- `BookingMoneySplitTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 73)
- `BookingMoneySplitTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 82)
- `BookingMoneySplitTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser mapping = { "admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, ` (стр. 91)
- `BookingMoneySplitTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 108)
- `BookingMoneySplitTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 112)
- `BookingMoneySplitTests.create_bookingdef create_booking(self, *, status: str = "scheduled") -> dict: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.auth_header` (стр. 120)
- `BookingMoneySplitTests.get_splitdef get_split(self, booking_id: str, token: str) -> dict: response = self.client.get( f"/api/owner/bookings/{booking_id}/money-split", headers=self.auth_headers(token), ) self.asse` (стр. 155)
- `BookingMoneySplitTests.test_bookings_history_lists_and_filtersdef test_bookings_history_lists_and_filters(self) -> None: booking = self.create_booking(status="completed") response = self.client.get( "/api/owner/bookings-history", headers=self` (стр. 163)
- `BookingMoneySplitTests.test_bookings_history_totals_accepts_dd_mm_yyyy_datesdef test_bookings_history_totals_accepts_dd_mm_yyyy_dates(self) -> None: booking = self.create_booking(status="completed") booking_date = booking["date"] dated = self.client.get( f` (стр. 205)
- `BookingMoneySplitTests.test_money_split_get_returns_full_distributiondef test_money_split_get_returns_full_distribution(self) -> None: booking = self.create_booking(status="completed") split = self.get_split(booking["id"], self.owner_token) self.ass` (стр. 224)
- `BookingMoneySplitTests.test_money_split_update_changes_all_partsdef test_money_split_update_changes_all_parts(self) -> None: from app.database import SessionLocal from app.models import BookingWorker, Expense, OwnerProfitShare, PiggyBankTransac` (стр. 242)
- `BookingMoneySplitTests.test_money_split_reset_restores_auto_valuesdef test_money_split_reset_restores_auto_values(self) -> None: booking = self.create_booking(status="completed") split = self.get_split(booking["id"], self.owner_token) response = ` (стр. 318)
- `BookingMoneySplitTests.test_money_split_rejects_paid_owner_sharedef test_money_split_rejects_paid_owner_share(self) -> None: from app.database import SessionLocal from app.models import OwnerProfitShare booking = self.create_booking(status="com` (стр. 335)
- `BookingMoneySplitTests.test_money_split_rejects_unfinished_bookingdef test_money_split_rejects_unfinished_booking(self) -> None: booking = self.create_booking(status="scheduled") response = self.client.put( f"/api/owner/bookings/{booking['id']}/m` (стр. 362)
- `BookingMoneySplitTests.test_money_split_requires_owner_roledef test_money_split_requires_owner_role(self) -> None: booking = self.create_booking(status="completed") get_response = self.client.get( f"/api/owner/bookings/{booking['id']}/mone` (стр. 372)
- `BookingMoneySplitTests.test_money_split_missing_booking_returns_404def test_money_split_missing_booking_returns_404(self) -> None: response = self.client.get( f"/api/owner/bookings/{uuid4().hex}/money-split", headers=self.auth_headers(self.owner_t` (стр. 388)
- `BookingMoneySplitTests.test_credit_booking_skips_piggy_deposit_and_owner_sharedef test_credit_booking_skips_piggy_deposit_and_owner_share(self) -> None: booking_date = self.next_active_date() create_response = self.client.post( "/api/bookings", headers=self.` (стр. 395)
- `BookingMoneySplitTests.test_money_split_subtract_additional_service_pipelinedef test_money_split_subtract_additional_service_pipeline(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.ge` (стр. 457)
- `BookingMoneySplitTests.test_money_split_subtract_other_master_paid_included_in_totaldef test_money_split_subtract_other_master_paid_included_in_total(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc` (стр. 553)
- `BookingMoneySplitTests.test_money_split_pipeline_with_materials_not_in_orderdef test_money_split_pipeline_with_materials_not_in_order(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.ge` (стр. 624)
- `BookingMoneySplitTests.test_money_split_pipeline_materials_step_lastdef test_money_split_pipeline_materials_step_last(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.get(Servic` (стр. 699)
- `BookingMoneySplitTests.test_money_split_classic_with_subtract_additional_servicedef test_money_split_classic_with_subtract_additional_service(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = d` (стр. 773)
- `BookingMoneySplitTests.test_toggling_payment_settled_does_not_duplicate_piggy_depositsdef test_toggling_payment_settled_does_not_duplicate_piggy_deposits(self) -> None: from app.database import SessionLocal from app.models import PiggyBankTransaction from sqlalchemy` (стр. 848)
- `BookingMoneySplitTests.deposit_countdef deposit_count(booking_id: str) -> int: with SessionLocal() as db: return len( db.scalars( select(PiggyBankTransaction).where( PiggyBankTransaction.booking_id == booking_id, Pig` (стр. 853)
- `BookingMoneySplitTests.test_money_split_add_service_remainder_to_piggy_and_ownersdef test_money_split_add_service_remainder_to_piggy_and_owners(self) -> None: from app.database import SessionLocal from app.models import PiggyBankTransaction, Service from sqlalc` (стр. 890)
- `BookingMoneySplitTests.test_money_split_outsource_additional_servicedef test_money_split_outsource_additional_service(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.get(Servic` (стр. 987)
- `BookingMoneySplitTests.test_toggle_outsource_additional_service_via_patchdef test_toggle_outsource_additional_service_via_patch(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: svc = db.get(S` (стр. 1073)
- `BookingMoneySplitTests.test_service_mode_weights_respect_complaintsdef test_service_mode_weights_respect_complaints(self) -> None: from datetime import timedelta, timezone from app.database import SessionLocal from app.models import Penalty, Servi` (стр. 1159)
- `BookingMoneySplitTests.test_single_active_owner_gets_full_sharedef test_single_active_owner_gets_full_share(self) -> None: from app.database import SessionLocal from app.models import OwnerProfitShare, StaffUser from sqlalchemy import select w` (стр. 1238)
- `BookingMoneySplitTests.test_money_split_rest_piggy_modedef test_money_split_rest_piggy_mode(self) -> None: from app.database import SessionLocal from app.models import PiggyBankTransaction, Service from sqlalchemy import select with Se` (стр. 1271)

### backend/tests/test_booking_outsource_guard.py (169 строк)

Классы и функции (14):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 34)
- `class BookingOutsourceGuardTests(unittest.TestCase):` (стр. 38)
- `BookingOutsourceGuardTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 42)
- `BookingOutsourceGuardTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 64)
- `BookingOutsourceGuardTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 70)
- `BookingOutsourceGuardTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 79)
- `BookingOutsourceGuardTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = {"admin": self.ADMIN_TG_ID` (стр. 88)
- `BookingOutsourceGuardTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `BookingOutsourceGuardTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 106)
- `BookingOutsourceGuardTests.create_bookingdef create_booking(self) -> dict: response = self.client.post( "/api/bookings", headers=self.auth_headers(self.admin_token), json={ "clientId": "", "clientName": "Outsource Guard",` (стр. 114)
- `BookingOutsourceGuardTests.test_patch_with_is_outsource_true_returns_400def test_patch_with_is_outsource_true_returns_400(self) -> None: booking = self.create_booking() response = self.client.patch( f"/api/bookings/{booking['id']}", headers=self.auth_h` (стр. 139)
- `BookingOutsourceGuardTests.test_patch_with_is_outsource_false_returns_400def test_patch_with_is_outsource_false_returns_400(self) -> None: booking = self.create_booking() response = self.client.patch( f"/api/bookings/{booking['id']}", headers=self.auth_` (стр. 149)
- `BookingOutsourceGuardTests.test_patch_without_outsource_fields_still_worksdef test_patch_without_outsource_fields_still_works(self) -> None: booking = self.create_booking() response = self.client.patch( f"/api/bookings/{booking['id']}", headers=self.auth` (стр. 158)

### backend/tests/test_bot_help.py (125 строк)

Классы и функции (11):

- `_runtimedef _runtime(*, training_url: str | None = "https://training.example") -> BotRuntime: return BotRuntime( token="t", webapp_url="https://app.example", api_base="https://api.example"` (стр. 14)
- `_run_updatedef _run_update(runtime: BotRuntime, update: dict) -> list[tuple[str, dict]]: calls: list[tuple[str, dict]] = [] def fake_telegram_call(_runtime, method: str, payload: dict | None ` (стр. 23)
- `fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs): calls.append((method, payload or {})) return {}` (стр. 26)
- `fake_multipart_calldef fake_multipart_call(_runtime, method: str, *, fields: dict | None = None, files: dict | None = None) -> None: # sendPhoto/sendDocument идут multipart-каналом мимо _telegram_cal` (стр. 30)
- `fake_public_senddef fake_public_send(chat_id, text, **_kwargs) -> None: calls.append(("sendMessage", {"chat_id": chat_id, "text": text}))` (стр. 35)
- `fake_public_senddef fake_public_send(chat_id, text, **_kwargs) -> None: calls.append(("sendMessage", {"chat_id": chat_id, "text": text}))` (стр. 43)
- `test_help_command_sends_training_message_with_webapp_buttondef test_help_command_sends_training_message_with_webapp_button() -> None: calls = _run_update( _runtime(), {"message": {"chat": {"id": 777}, "text": "/help"}}, ) sent = [payload f` (стр. 64)
- `test_help_button_falls_back_to_main_webapp_url_when_training_unsetdef test_help_button_falls_back_to_main_webapp_url_when_training_unset() -> None: calls = _run_update( _runtime(training_url=None), {"message": {"chat": {"id": 778}, "text": "/help` (стр. 85)
- `test_help_command_registered_in_bot_menudef test_help_command_registered_in_bot_menu() -> None: calls: list[tuple[str, dict]] = [] runtime = _runtime() def fake_telegram_call(_runtime, method: str, payload: dict | None =` (стр. 97)
- `fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs): calls.append((method, payload or {})) return {}` (стр. 101)
- `test_help_does_not_break_start_commanddef test_help_does_not_break_start_command() -> None: calls = _run_update( _runtime(), {"message": {"chat": {"id": 779}, "text": "/start"}}, ) sent = [payload for method, payload i` (стр. 118)

### backend/tests/test_broadcast_edge_cases.py (315 строк)

Классы и функции (20):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 18)
- `class BroadcastEdgeCaseTests(unittest.TestCase):` (стр. 30)
- `BroadcastEdgeCaseTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 33)
- `BroadcastEdgeCaseTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 52)
- `BroadcastEdgeCaseTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 58)
- `BroadcastEdgeCaseTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 67)
- `BroadcastEdgeCaseTests.login_staffdef login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(respo` (стр. 76)
- `BroadcastEdgeCaseTests.disable_owner_two_factordef disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_s` (стр. 84)
- `BroadcastEdgeCaseTests.clear_all_owner_telegram_chat_idsdef clear_all_owner_telegram_chat_ids(self) -> None: """Remove telegram_chat_id from all owners so no one is eligible for broadcast.""" from app.database import SessionLocal from a` (стр. 95)
- `BroadcastEdgeCaseTests.set_owner_telegram_chat_idsdef set_owner_telegram_chat_ids(self, *, all_good: bool) -> int: """Привязывает уникальные telegram_chat_id всем владельцам. Число владельцев не фиксировано: в dev-сиде это creator` (стр. 108)
- `BroadcastEdgeCaseTests.count_owner_notificationsdef count_owner_notifications(self) -> int: from app.database import SessionLocal from app.models import Notification with SessionLocal() as db: return len( db.scalars( select(Noti` (стр. 136)
- `BroadcastEdgeCaseTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 150)
- `BroadcastEdgeCaseTests.test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_iddef test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_id( self,` (стр. 157)
- `BroadcastEdgeCaseTests.test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_iddef test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_id( self,` (стр. 189)
- `BroadcastEdgeCaseTests._login_ownerdef _login_owner(self) -> str: self.disable_owner_two_factor() return self.login_staff("owner", "owner")` (стр. 227)
- `BroadcastEdgeCaseTests.test_export_broadcast_returns_207_on_partial_failuredef test_export_broadcast_returns_207_on_partial_failure(self) -> None: """POST /api/owner/exports/report/telegram: часть доставок падает → 207.""" # chat_id выставляем ДО логина: ` (стр. 231)
- `BroadcastEdgeCaseTests._flaky_senddef _flaky_send(chat_id, *, file_name, content, caption=None, mime_type=None): if str(chat_id).startswith("66"):` (стр. 238)
- `BroadcastEdgeCaseTests.test_piggy_bank_export_broadcast_returns_207_on_partial_failuredef test_piggy_bank_export_broadcast_returns_207_on_partial_failure(self) -> None: """POST /api/owner/exports/piggy-bank/telegram (эндпоинт из баг-репорта):` (стр. 265)
- `BroadcastEdgeCaseTests._flaky_senddef _flaky_send(chat_id, *, file_name, content, caption=None, mime_type=None): if str(chat_id).startswith("66"):` (стр. 271)
- `BroadcastEdgeCaseTests.test_export_broadcast_returns_200_when_all_delivereddef test_export_broadcast_returns_200_when_all_delivered(self) -> None: """POST /api/owner/exports/report/telegram: все доставки успешны → 200 c legacy-телом OwnerExportDeliveryPay` (стр. 290)

### backend/tests/test_concurrent_booking_patch.py (168 строк)

Классы и функции (11):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 23)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 35)
- `class ConcurrentBookingPatchTests(unittest.TestCase):` (стр. 39)
- `ConcurrentBookingPatchTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 43)
- `ConcurrentBookingPatchTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 64)
- `ConcurrentBookingPatchTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 70)
- `ConcurrentBookingPatchTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 79)
- `ConcurrentBookingPatchTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: staff = d` (стр. 88)
- `ConcurrentBookingPatchTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 101)
- `ConcurrentBookingPatchTests.test_concurrent_notes_patch_has_no_lock_failuresdef test_concurrent_notes_patch_has_no_lock_failures(self) -> None: create_response = self.client.post( "/api/bookings", headers={"Authorization": self.admin_token}, json={ "client` (стр. 109)
- `ConcurrentBookingPatchTests.workerdef worker(value: str) -> None: barrier.wait(timeout=30) response = self.client.patch( f"/api/bookings/{booking_id}", headers={"Authorization": self.admin_token}, json={"notes": va` (стр. 139)

### backend/tests/test_config.py (132 строк)

Классы и функции (13):

- `test_normalize_database_url_converts_legacy_postgres_schemedef test_normalize_database_url_converts_legacy_postgres_scheme() -> None: raw_url = "postgres://user:pass@example.com:5432/appdb?sslmode=require&application_name=crm" assert _norm` (стр. 9)
- `test_normalize_database_url_uses_psycopg_for_postgresql_schemedef test_normalize_database_url_uses_psycopg_for_postgresql_scheme() -> None: raw_url = "postgresql://user:pass@example.com:5432/appdb" assert _normalize_database_url(raw_url) == "` (стр. 18)
- `test_normalize_database_url_keeps_explicit_driver_and_sqlitedef test_normalize_database_url_keeps_explicit_driver_and_sqlite() -> None: assert _normalize_database_url("postgresql+psycopg://user:pass@example.com/appdb") == "postgresql+psycop` (стр. 24)
- `test_strong_environments_reject_weak_secretdef test_strong_environments_reject_weak_secret(monkeypatch, environment: str) -> None: monkeypatch.setenv("APP_ENV", environment) monkeypatch.setenv("APP_SECRET", "change-me") mon` (стр. 30)
- `test_production_rejects_demo_seeddef test_production_rejects_demo_seed(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("ALLOW_DEMO_SE` (стр. 40)
- `test_production_init_data_ttl_defaults_to_24hdef test_production_init_data_ttl_defaults_to_24h(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("A` (стр. 50)
- `test_production_accepts_large_init_data_ttldef test_production_accepts_large_init_data_ttl(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("ALL` (стр. 60)
- `test_cors_rejects_wildcard_with_credentialsdef test_cors_rejects_wildcard_with_credentials(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "development") monkeypatch.setenv("CORS_ORIGINS", "*") with pytest.raises(Runtim` (стр. 70)
- `test_production_postgres_defaults_to_required_tlsdef test_production_postgres_defaults_to_required_tls(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.seten` (стр. 78)
- `test_production_rejects_disabled_tls_from_urldef test_production_rejects_disabled_tls_from_url(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("A` (стр. 89)
- `test_development_postgres_does_not_force_tlsdef test_development_postgres_does_not_force_tls(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "development") monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@examp` (стр. 102)
- `test_vercel_production_rejects_sqlitedef test_vercel_production_rejects_sqlite(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("VERCEL", "1") monkeypatch.setenv("APP_SECRET", "a" *` (стр. 110)
- `test_permanent_owner_config_is_strict_and_contains_no_defaultsdef test_permanent_owner_config_is_strict_and_contains_no_defaults(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "test") monkeypatch.setenv("PERMANENT_TELEGRAM_OWNERS", json.` (стр. 122)

### backend/tests/test_content.py (178 строк)

Классы и функции (11):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 24)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 35)
- `class ContentTests(unittest.TestCase):` (стр. 39)
- `ContentTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_content_{uuid4().hex}.` (стр. 42)
- `ContentTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 68)
- `ContentTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = d` (стр. 81)
- `ContentTests._seed_contentdef _seed_content(self, value: dict) -> None: from app.main import get_db from app.models import AppSetting with next(get_db()) as db: row = db.get(AppSetting, "content") if row is` (стр. 92)
- `ContentTests.test_missing_row_returns_defaultdef test_missing_row_returns_default(self) -> None: res = self.client.get("/api/content") assert res.status_code == 200, res.text payload = res.json() assert isinstance(payload["he` (стр. 104)
- `ContentTests.test_legacy_format_is_migrated_on_readdef test_legacy_format_is_migrated_on_read(self) -> None: self._seed_content({ "hero": { "backgroundImage": "/hero-bg.jpg", "badgeText": "ATMOSFERA", "title": "Ваш автомобиль заслу` (стр. 111)
- `ContentTests.test_new_format_passes_throughdef test_new_format_passes_through(self) -> None: self._seed_content({ "hero": { "backgroundImage": "/hero-bg.jpg", "badgeText": "ATMOSFERA", "title": {"before": "Ваш автомобиль за` (стр. 134)
- `ContentTests.test_put_roundtrip_new_formatdef test_put_roundtrip_new_format(self) -> None: payload = { "hero": { "backgroundImage": "/bg.jpg", "badgeText": "ATMOSFERA", "title": {"before": "A ", "highlight": "H", "after": ` (стр. 155)

### backend/tests/test_database_config.py (44 строк)

Классы и функции (3):

- `test_postgres_config_preserves_standard_query_parametersdef test_postgres_config_preserves_standard_query_parameters() -> None: raw = ( "postgresql+psycopg://user:secret@example.com/app" "?application_name=crm&connect_timeout=7&options=` (стр. 8)
- `test_url_sslmode_wins_and_verify_full_ca_is_preserveddef test_url_sslmode_wins_and_verify_full_ca_is_preserved() -> None: normalized, connect_args = database._database_connection_config( "postgresql+psycopg://user:secret@example.com/` (стр. 30)
- `test_sqlite_config_does_not_add_tlsdef test_sqlite_config_does_not_add_tls() -> None: normalized, connect_args = database._database_connection_config("sqlite:////tmp/test.sqlite3") assert normalized == "sqlite:////t` (стр. 40)

### backend/tests/test_deposit.py (526 строк)

Классы и функции (27):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 27)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 38)
- `class DepositTests(unittest.TestCase):` (стр. 43)
- `DepositTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 47)
- `DepositTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 74)
- `DepositTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = d` (стр. 91)
- `DepositTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 106)
- `DepositTests._create_clientdef _create_client(self) -> str: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" with SessionLocal() as db: db.add( Client( ` (стр. 109)
- `DepositTests._activate_depositdef _activate_deposit(self, client_id: str, monthly: int = 4000, **plan_fields) -> None: payload: dict = {"clientId": client_id, "depositActive": True, "depositMonthly": monthly} p` (стр. 127)
- `DepositTests._topupdef _topup(self, client_id: str, amount: float = 4000.0) -> None: response = self.client.post( f"/api/owner/deposits/{client_id}/topup", headers=self._auth_headers(self.owner_token` (стр. 137)
- `DepositTests._record_washdef _record_wash(self, client_id: str, price: float = 1000.0, car: str = "BMW", plate: str = "M001AA") -> None: response = self.client.post( f"/api/owner/deposits/{client_id}/washe` (стр. 145)
- `DepositTests._overviewdef _overview(self, client_id: str) -> dict: response = self.client.get( f"/api/owner/deposits/{client_id}", headers=self._auth_headers(self.owner_token), ) self.assertEqual(respon` (стр. 159)
- `DepositTests.test_activate_and_topup_and_balancedef test_activate_and_topup_and_balance(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) overview = self._overv` (стр. 171)
- `DepositTests.test_credit_wash_deducts_and_no_immediate_piggy_depositdef test_credit_wash_deducts_and_no_immediate_piggy_deposit(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) se` (стр. 190)
- `DepositTests.test_settle_month_returns_wash_total_to_piggy_bankdef test_settle_month_returns_wash_total_to_piggy_bank(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._r` (стр. 228)
- `DepositTests.test_settle_month_twice_is_rejecteddef test_settle_month_twice_is_rejected(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._record_wash(clie` (стр. 267)
- `DepositTests.test_wash_requires_active_depositdef test_wash_requires_active_deposit(self) -> None: client_id = self._create_client() response = self.client.post( f"/api/owner/deposits/{client_id}/washes", headers=self._auth_he` (стр. 288)
- `DepositTests.test_topup_requires_active_depositdef test_topup_requires_active_deposit(self) -> None: client_id = self._create_client() response = self.client.post( f"/api/owner/deposits/{client_id}/topup", headers=self._auth_he` (стр. 297)
- `DepositTests.test_export_exceldef test_export_excel(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._record_wash(client_id, 1000) respo` (стр. 306)
- `DepositTests.test_export_alldef test_export_all(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) response = self.client.get( "/api/owner/deposits/export-all.xlsx", head` (стр. 322)
- `DepositTests.test_overview_allowed_for_admindef test_overview_allowed_for_admin(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) response = self.client.get( f"/api/owner/deposits/{clie` (стр. 336)
- `DepositTests.test_activate_deposit_as_admindef test_activate_deposit_as_admin(self) -> None: client_id = self._create_client() response = self.client.patch( f"/api/owner/deposits/{client_id}", headers=self._auth_headers(sel` (стр. 346)
- `DepositTests.test_settle_month_allowed_for_admindef test_settle_month_allowed_for_admin(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) self._topup(client_id, 4000) self._record_wash(clie` (стр. 364)
- `DepositTests.test_per_wash_plan_charges_tariff_and_no_refund_at_settledef test_per_wash_plan_charges_tariff_and_no_refund_at_settle(self) -> None: client_id = self._create_client() self._activate_deposit( client_id, monthly=0, depositPlan="per_wash",` (стр. 382)
- `DepositTests.test_washes_plan_charges_full_price_and_refunds_only_covereddef test_washes_plan_charges_full_price_and_refunds_only_covered(self) -> None: client_id = self._create_client() self._activate_deposit( client_id, monthly=4000, depositPlan="wash` (стр. 420)
- `DepositTests.test_washes_plan_carryover_from_previous_monthdef test_washes_plan_carryover_from_previous_month(self) -> None: from datetime import date from uuid import uuid4 as _uuid4 from app.database import SessionLocal from app.models i` (стр. 464)
- `DepositTests.test_deposit_export_telegram_endpoints_reachabledef test_deposit_export_telegram_endpoints_reachable(self) -> None: client_id = self._create_client() self._activate_deposit(client_id, 4000) response = self.client.post( f"/api/ow` (стр. 504)

### backend/tests/test_error_notifier.py (190 строк)

Роуты (2):

```
  `GET /boom` -> `_boom` (декоратор: стр. 154)
  `GET /missing` -> `_missing` (декоратор: стр. 179)
```

Классы и функции (11):

- `_transportdef _transport(chats=("111", "222")): """Подменяет получателей и отправку, собирая отправленные тексты.""" sent: list[tuple[str, str]] = [] with patch.object(en, "_fetch_owner_chat` (стр. 36)
- `_raised_value_errordef _raised_value_error(message: str = "boom") -> ValueError: try: raise ValueError(message) except ValueError as exc: return exc` (стр. 45)
- `test_notify_exception_sends_to_all_owners_with_contextdef test_notify_exception_sends_to_all_owners_with_context() -> None: en._reset_state_for_tests() with _transport() as sent: assert en.notify_exception(_raised_value_error(), conte` (стр. 52)
- `test_identical_error_suppressed_by_cooldowndef test_identical_error_suppressed_by_cooldown() -> None: en._reset_state_for_tests() with _transport() as sent: assert en.notify_exception(_raised_value_error("same")) is True # ` (стр. 65)
- `test_different_message_same_site_not_suppresseddef test_different_message_same_site_not_suppressed() -> None: en._reset_state_for_tests() with _transport() as sent: assert en.notify_exception(_raised_value_error("first")) asser` (стр. 74)
- `test_hourly_budget_blocks_extra_messagesdef test_hourly_budget_blocks_extra_messages(monkeypatch) -> None: monkeypatch.setenv("ERROR_NOTIFY_MAX_PER_HOUR", "1") en._reset_state_for_tests() with _transport() as sent: asser` (стр. 82)
- `test_disabled_env_disables_sendingdef test_disabled_env_disables_sending(monkeypatch) -> None: monkeypatch.setenv("ERROR_NOTIFY_ENABLED", "false") en._reset_state_for_tests() with _transport() as sent: assert not e` (стр. 92)
- `test_logging_handler_forwards_errors_and_dedupsdef test_logging_handler_forwards_errors_and_dedups() -> None: en._reset_state_for_tests() root = logging.getLogger() old_level = root.level handler = en.TelegramErrorNotifyHandler` (стр. 100)
- `test_install_is_idempotent_across_module_reloadsdef test_install_is_idempotent_across_module_reloads() -> None: root = logging.getLogger() before = list(root.handlers) try: en.install_error_notifying() handlers_after_first = [ h` (стр. 129)
- `test_unhandled_route_exception_returns_500_and_notifiesdef test_unhandled_route_exception_returns_500_and_notifies() -> None: en._reset_state_for_tests() app = FastAPI() @app.get("/boom") def _boom() -> dict:` (стр. 149)
- `test_http_exception_does_not_notifydef test_http_exception_does_not_notify() -> None: en._reset_state_for_tests() app = FastAPI() @app.get("/missing") def _missing() -> dict:` (стр. 174)

### backend/tests/test_finance_batch3.py (29 строк)

Классы и функции (3):

- `test_salary_proration_day_month_leap_and_cross_monthdef test_salary_proration_day_month_leap_and_cross_month() -> None: assert prorated_monthly_salary(3100, date(2025, 1, 1), date(2025, 1, 1)) == Decimal("100.00") assert prorated_mo` (стр. 9)
- `test_all_salary_base_is_only_current_calendar_monthdef test_all_salary_base_is_only_current_calendar_month() -> None: assert salary_base_for_period( 3100, date(2000, 1, 1), date(2099, 12, 31), period="all", today=date(2025, 1, 15),` (стр. 16)
- `test_invalid_query_dates_are_rejecteddef test_invalid_query_dates_are_rejected(value: str) -> None: with pytest.raises((TypeError, ValueError)):` (стр. 27)

### backend/tests/test_finance_calculations.py (24 строк)

Классы и функции (3):

- `test_money_rounds_half_up_without_binary_float_errordef test_money_rounds_half_up_without_binary_float_error() -> None: assert money("1.005") == Decimal("1.01") assert money_int("2.5") == 3` (стр. 9)
- `test_prorating_handles_leap_year_and_cross_monthdef test_prorating_handles_leap_year_and_cross_month() -> None: assert prorated_monthly_salary(2900, date(2024, 2, 1), date(2024, 2, 29)) == Decimal("2900.00") assert prorated_mont` (стр. 14)
- `test_strict_dates_and_rangedef test_strict_dates_and_range() -> None: assert parse_dmy("29.02.2024") == date(2024, 2, 29) with pytest.raises(ValueError):` (стр. 19)

### backend/tests/test_finance_edit.py (396 строк)

Классы и функции (31):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `class FinanceEditTestBase(unittest.TestCase):` (стр. 33)
- `FinanceEditTestBase.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 36)
- `FinanceEditTestBase.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 62)
- `FinanceEditTestBase._login_staffdef _login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(resp` (стр. 79)
- `FinanceEditTestBase._disable_owner_two_factordef _disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_` (стр. 87)
- `FinanceEditTestBase._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 98)
- `FinanceEditTestBase._login_clientdef _login_client(self, name: str = "Алиса Иванова", phone: str = "+7 (999) 111-22-33") -> str: telegram_id = "7" + "".join(ch for ch in phone if ch.isdigit())[-9:] init_data = f"u` (стр. 101)
- `FinanceEditTestBase._create_worker_and_logindef _create_worker_and_login( self, login: str = "testworker", password: str = "workerpass", role: str = "worker",` (стр. 119)
- `FinanceEditTestBase._valid_expense_payloaddef _valid_expense_payload(self, **overrides) -> dict: payload = { "title": "Аренда помещения", "amount": 15000, "category": "Аренда", "date": "10.01.2025", "note": "Январь 2025", ` (стр. 141)
- `FinanceEditTestBase._create_expensedef _create_expense(self, **overrides) -> dict: """Create an expense via POST and return the created record.""" payload = self._valid_expense_payload(**overrides) response = self.c` (стр. 152)
- `FinanceEditTestBase._valid_income_payloaddef _valid_income_payload(self, **overrides) -> dict: payload = { "amount": 5000, "source": "Аренда помещения", "note": "Январь 2025", "date": "15.01.2025", } payload.update(overri` (стр. 163)
- `FinanceEditTestBase._create_incomedef _create_income(self, **overrides) -> dict: """Create an income via POST and return the created record.""" payload = self._valid_income_payload(**overrides) response = self.clie` (стр. 173)
- `class PatchExpenseTests(FinanceEditTestBase):` (стр. 189)
- `PatchExpenseTests.test_patch_expense_updates_only_provided_fieldsdef test_patch_expense_updates_only_provided_fields(self) -> None: """PATCH with only amount updates amount; title, category, date, note stay unchanged.""" expense = self._create_e` (стр. 192)
- `PatchExpenseTests.test_patch_expense_returns_404_for_unknown_iddef test_patch_expense_returns_404_for_unknown_id(self) -> None: """PATCH with a non-existent expense ID returns 404.""" response = self.client.patch( "/api/expenses/nonexistent-id` (стр. 214)
- `PatchExpenseTests.test_patch_expense_returns_422_for_empty_bodydef test_patch_expense_returns_422_for_empty_body(self) -> None: """PATCH with an empty JSON body {} returns 422 (no fields to update).""" expense = self._create_expense() response` (стр. 223)
- `PatchExpenseTests.test_patch_expense_returns_422_for_negative_amountdef test_patch_expense_returns_422_for_negative_amount(self) -> None: """PATCH with a negative amount returns 422.""" expense = self._create_expense() response = self.client.patch(` (стр. 233)
- `PatchExpenseTests.test_patch_expense_returns_422_for_invalid_date_formatdef test_patch_expense_returns_422_for_invalid_date_format(self) -> None: """PATCH with a date not matching DD.MM.YYYY returns 422.""" expense = self._create_expense() response = s` (стр. 243)
- `PatchExpenseTests.test_patch_expense_returns_422_for_whitespace_titledef test_patch_expense_returns_422_for_whitespace_title(self) -> None: """PATCH with a whitespace-only title returns 422.""" expense = self._create_expense() response = self.client` (стр. 253)
- `PatchExpenseTests.test_patch_expense_returns_403_for_worker_roledef test_patch_expense_returns_403_for_worker_role(self) -> None: """PATCH by a worker returns 403.""" expense = self._create_expense() worker_token = self._create_worker_and_login` (стр. 263)
- `PatchExpenseTests.test_patch_expense_returns_403_for_client_roledef test_patch_expense_returns_403_for_client_role(self) -> None: """PATCH by a client returns 403.""" expense = self._create_expense() client_token = self._login_client() response` (стр. 276)
- `class PatchIncomeTests(FinanceEditTestBase):` (стр. 292)
- `PatchIncomeTests.test_patch_income_updates_only_provided_fieldsdef test_patch_income_updates_only_provided_fields(self) -> None: """PATCH with only amount updates amount; source, note, date stay unchanged.""" income = self._create_income() ori` (стр. 295)
- `PatchIncomeTests.test_patch_income_returns_404_for_unknown_iddef test_patch_income_returns_404_for_unknown_id(self) -> None: """PATCH with a non-existent income ID returns 404.""" response = self.client.patch( "/api/owner/incomes/nonexistent` (стр. 315)
- `PatchIncomeTests.test_patch_income_returns_422_for_empty_bodydef test_patch_income_returns_422_for_empty_body(self) -> None: """PATCH with an empty JSON body {} returns 422 (no fields to update).""" income = self._create_income() response = ` (стр. 324)
- `PatchIncomeTests.test_patch_income_returns_422_for_negative_amountdef test_patch_income_returns_422_for_negative_amount(self) -> None: """PATCH with a negative amount returns 422.""" income = self._create_income() response = self.client.patch( f"` (стр. 334)
- `PatchIncomeTests.test_patch_income_returns_422_for_whitespace_sourcedef test_patch_income_returns_422_for_whitespace_source(self) -> None: """PATCH with a whitespace-only source returns 422.""" income = self._create_income() response = self.client.` (стр. 344)
- `PatchIncomeTests.test_patch_income_clears_note_when_null_passeddef test_patch_income_clears_note_when_null_passed(self) -> None: """PATCH with note=null explicitly clears the note field.""" income = self._create_income(note="Важная заметка") s` (стр. 354)
- `PatchIncomeTests.test_patch_income_returns_403_for_accountant_roledef test_patch_income_returns_403_for_accountant_role(self) -> None: """PATCH by an accountant returns 403 (only owner can edit incomes).""" income = self._create_income() accounta` (стр. 368)
- `PatchIncomeTests.test_patch_income_returns_403_for_worker_roledef test_patch_income_returns_403_for_worker_role(self) -> None: """PATCH by a worker returns 403.""" income = self._create_income() worker_token = self._create_worker_and_login( l` (стр. 381)

### backend/tests/test_finance_integration_batch3.py (158 строк)

Классы и функции (9):

- `_expensedef _expense(**overrides) -> Expense: values = { "id": "expense-1", "title": "Химия", "amount": Decimal("1250.50"), "category": "Материалы", "date": "10.01.2025", "note": None, "re` (стр. 13)
- `dbdef db() -> Session: engine = create_engine("sqlite:///:memory:") Base.metadata.create_all(engine) with Session(engine) as session: yield session engine.dispose()` (стр. 28)
- `_linkeddef _linked(db: Session, expense_id: str = "expense-1") -> PiggyBankTransaction | None: return db.scalar( select(PiggyBankTransaction).where( PiggyBankTransaction.expense_id == exp` (стр. 36)
- `test_expense_create_and_updates_stay_linked_to_piggydef test_expense_create_and_updates_stay_linked_to_piggy(db: Session) -> None: expense = _expense() db.add(expense) sync_expense_piggy_transaction(db, expense) db.commit() transact` (стр. 44)
- `test_resource_group_out_deletes_and_back_in_recreates_linkdef test_resource_group_out_deletes_and_back_in_recreates_link(db: Session) -> None: expense = _expense() db.add(expense) sync_expense_piggy_transaction(db, expense) db.commit() ex` (стр. 72)
- `test_expense_and_piggy_changes_roll_back_atomicallydef test_expense_and_piggy_changes_roll_back_atomically(db: Session) -> None: expense = _expense() db.add(expense) sync_expense_piggy_transaction(db, expense) db.rollback() assert ` (стр. 89)
- `test_ambiguous_legacy_backfill_remains_unlinkeddef test_ambiguous_legacy_backfill_remains_unlinked(db: Session) -> None: db.add_all([_expense(id="e-1"), _expense(id="e-2")]) db.add( PiggyBankTransaction( id="legacy-1", amount=D` (стр. 99)
- `test_owner_and_worker_salary_base_use_identical_period_calculationdef test_owner_and_worker_salary_base_use_identical_period_calculation() -> None: owner_value = salary_base_for_period( 3100, date(2025, 1, 10), date(2025, 1, 20), period="custom" ` (стр. 137)
- `test_duplicate_attendance_same_business_day_counts_oncedef test_duplicate_attendance_same_business_day_counts_once() -> None: from app.main import _compute_shift_attendance inspections = [ {"createdAt": "2025-01-10T08:00:00Z", "masters` (стр. 147)

### backend/tests/test_finance_migration.py (28 строк)

Классы и функции (4):

- `migration_enginedef migration_engine(): engine = create_engine("sqlite:///:memory:") try: yield engine finally: engine.dispose()` (стр. 7)
- `test_finance_migration_preflight_is_non_destructivedef test_finance_migration_preflight_is_non_destructive(migration_engine) -> None: report = preflight(migration_engine) assert any("expense_id" in line for line in report)` (стр. 15)
- `test_finance_migration_refuses_live_sqlite_applydef test_finance_migration_refuses_live_sqlite_apply(migration_engine) -> None: with pytest.raises(RuntimeError, match="Refusing live SQLite migration"):` (стр. 20)
- `test_finance_migration_dry_run_is_repeatabledef test_finance_migration_dry_run_is_repeatable(migration_engine) -> None: assert upgrade(dry_run=True, engine=migration_engine) == upgrade( dry_run=True, engine=migration_engine ` (стр. 25)

### backend/tests/test_google_calendar.py (557 строк)

Классы и функции (48):

- `settingsdef settings(monkeypatch): monkeypatch.setenv("APP_ENV", "test") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("ALLOW_DEMO_SEED_DATA", "false") monkeypatch.setenv("` (стр. 12)
- `class _Row: def __init__(self, key, value):` (стр. 24)
- `_Row.__init__def __init__(self, key, value): self.key = key self.value = value` (стр. 25)
- `class _FakeDb: """Минимальный fake сессии: хранит AppSetting-подобные строки в dict.""" def __init__(self):` (стр. 30)
- `_FakeDb.__init__def __init__(self): self.rows = {}` (стр. 33)
- `_FakeDb.getdef get(self, model, key): return self.rows.get(key)` (стр. 36)
- `_FakeDb.adddef add(self, row): self.rows[row.key] = row` (стр. 39)
- `_FakeDb.deletedef delete(self, row): self.rows.pop(row.key, None)` (стр. 42)
- `_FakeDb.flushdef flush(self): pass` (стр. 45)
- `class _FakeAppSetting: def __init__(self, key, value):` (стр. 49)
- `_FakeAppSetting.__init__def __init__(self, key, value): self.key = key self.value = value` (стр. 50)
- `fake_dbdef fake_db(): return _FakeDb()` (стр. 56)
- `patch_appsettingdef patch_appsetting(monkeypatch): # Подменяем модель AppSetting в модуле google_calendar на fake. # Устойчиво к перезагрузке модулей из других тест-файлов: патчим # атрибут МОДУЛЯ` (стр. 61)
- `test_is_configured_requires_both_credentialsdef test_is_configured_requires_both_credentials(settings): assert gc.is_configured(settings) is True settings2 = SimpleNamespace( google_calendar_client_id=None, google_calendar_c` (стр. 69)
- `test_save_load_clear_tokensdef test_save_load_clear_tokens(fake_db): tokens = {"token": "t", "refresh_token": "r"} gc.save_tokens(fake_db, tokens) assert gc.load_tokens(fake_db) == tokens gc.clear_tokens(fak` (стр. 77)
- `test_load_tokens_ignores_non_dictdef test_load_tokens_ignores_non_dict(fake_db): fake_db.rows[gc.GOOGLE_CALENDAR_TOKENS_KEY] = _Row(gc.GOOGLE_CALENDAR_TOKENS_KEY, "not-a-dict") assert gc.load_tokens(fake_db) == {}` (стр. 85)
- `test_credentials_save_load_cleardef test_credentials_save_load_clear(fake_db): creds = { "client_id": "id.apps.googleusercontent.com", "client_secret": "secret", "redirect_uri": "https://example.com/callback", } ` (стр. 90)
- `test_load_credentials_ignores_non_dictdef test_load_credentials_ignores_non_dict(fake_db): fake_db.rows[gc.GOOGLE_CALENDAR_CREDENTIALS_KEY] = _Row( gc.GOOGLE_CALENDAR_CREDENTIALS_KEY, "not-a-dict" ) assert gc.load_cred` (стр. 102)
- `test_is_configured_with_db_credentialsdef test_is_configured_with_db_credentials(fake_db): settings2 = SimpleNamespace( google_calendar_client_id=None, google_calendar_client_secret=None ) assert gc.is_configured(setti` (стр. 109)
- `test_build_auth_url_uses_db_credentialsdef test_build_auth_url_uses_db_credentials(fake_db, settings): gc.save_credentials( fake_db, { "client_id": "db-client.apps.googleusercontent.com", "client_secret": "db-secret", "` (стр. 122)
- `test_exchange_code_uses_db_credentialsdef test_exchange_code_uses_db_credentials(fake_db, settings): gc.save_credentials( fake_db, { "client_id": "db-client.apps.googleusercontent.com", "client_secret": "db-secret", "r` (стр. 139)
- `test_booking_event_body_uses_timezone_and_durationdef test_booking_event_body_uses_timezone_and_duration(settings): booking = SimpleNamespace( id="b1", date="13.08.2026", time="10:30", duration=45, client_name="Иван", client_phone` (стр. 159)
- `test_booking_event_body_marks_google_source_labeldef test_booking_event_body_marks_google_source_label(settings): booking = SimpleNamespace( id="b2", date="13.08.2026", time="10:30", duration=30, client_name="", client_phone="", ` (стр. 186)
- `test_sync_noop_when_unconfigureddef test_sync_noop_when_unconfigured(fake_db): settings2 = SimpleNamespace( google_calendar_client_id=None, google_calendar_client_secret=None ) booking = SimpleNamespace(id="b1", ` (стр. 205)
- `test_sync_noop_without_tokensdef test_sync_noop_without_tokens(fake_db, settings): booking = SimpleNamespace(id="b1", status="scheduled", google_event_id=None) event_id, ok = gc.sync_booking_to_calendar(fake_d` (стр. 215)
- `test_sync_insert_saves_event_iddef test_sync_insert_saves_event_id(fake_db, settings): gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"}) booking = SimpleNamespace( id="b1", status="scheduled", google` (стр. 222)
- `test_sync_patch_existing_eventdef test_sync_patch_existing_event(fake_db, settings): gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"}) booking = SimpleNamespace( id="b1", status="scheduled", google_` (стр. 250)
- `test_sync_delete_removes_eventdef test_sync_delete_removes_event(fake_db, settings): gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"}) booking = SimpleNamespace( id="b1", status="cancelled", google_` (стр. 275)
- `test_sync_cancelled_without_event_is_noopdef test_sync_cancelled_without_event_is_noop(fake_db, settings): gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"}) booking = SimpleNamespace( id="b1", status="cancelle` (стр. 288)
- `test_sync_errors_are_caughtdef test_sync_errors_are_caught(fake_db, settings): gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"}) booking = SimpleNamespace( id="b1", status="scheduled", google_eve` (стр. 300)
- `test_build_auth_url_returns_consent_urldef test_build_auth_url_returns_consent_url(settings): url = gc.build_auth_url(settings, "test-state-123") assert url.startswith("https://accounts.google.com/o/oauth2/auth") assert` (стр. 323)
- `test_exchange_code_returns_tokensdef test_exchange_code_returns_tokens(settings): resp_mock = MagicMock() resp_mock.status_code = 200 resp_mock.json.return_value = {"token": "t", "refresh_token": "r"} with patch.o` (стр. 330)
- `_connect_second_persondef _connect_second_person(fake_db): """Подключить второго человека к уже подключённому владельцу.""" gc.save_tokens(fake_db, {"token": "t1", "refresh_token": "r1"}) gc.upsert_conn` (стр. 348)
- `_booking_for_syncdef _booking_for_sync(**overrides): base = { "id": "b1", "status": "scheduled", "google_event_id": None, "date": "13.08.2026", "time": "10:00", "duration": 30, "client_name": "Иван` (стр. 364)
- `test_connections_store_roundtripdef test_connections_store_roundtrip(fake_db): _connect_second_person(fake_db) conns = gc.list_connections(fake_db) assert [c["id"] for c in conns] == ["owner", "gc-anna"] assert c` (стр. 384)
- `test_legacy_tokens_migrate_into_first_connectiondef test_legacy_tokens_migrate_into_first_connection(fake_db): # Старое хранилище: токены лежат отдельным ключом. fake_db.rows[gc.GOOGLE_CALENDAR_TOKENS_KEY] = _Row( gc.GOOGLE_CALE` (стр. 400)
- `test_sync_fans_out_to_all_calendarsdef test_sync_fans_out_to_all_calendars(fake_db, settings): _connect_second_person(fake_db) booking = _booking_for_sync() responses = [{"id": "evt-owner"}, {"id": "evt-anna"}] with` (стр. 415)
- `test_sync_patch_uses_legacy_event_id_for_first_calendardef test_sync_patch_uses_legacy_event_id_for_first_calendar(fake_db, settings): gc.save_tokens(fake_db, {"token": "t", "refresh_token": "r"}) gc.upsert_connection( fake_db, { "id":` (стр. 434)
- `_FakeAppSetting.fake_requestdef fake_request(db, settings_, method, path, **kwargs): if method == "POST": return {"id": "evt-anna-new"} return {}` (стр. 450)
- `test_delete_removes_events_from_all_calendarsdef test_delete_removes_events_from_all_calendars(fake_db, settings): _connect_second_person(fake_db) booking = SimpleNamespace( id="b1", status="cancelled", google_event_id="evt-o` (стр. 465)
- `test_one_broken_calendar_does_not_block_othersdef test_one_broken_calendar_does_not_block_others(fake_db, settings): _connect_second_person(fake_db) booking = _booking_for_sync() def flaky_request(db, settings_, method, path, ` (стр. 487)
- `_FakeAppSetting.flaky_requestdef flaky_request(db, settings_, method, path, **kwargs): if kwargs["conn"]["id"] == "owner": raise RuntimeError("network down") return {"id": "evt-anna"}` (стр. 491)
- `test_pull_aggregates_from_all_calendarsdef test_pull_aggregates_from_all_calendars(fake_db, settings): _connect_second_person(fake_db) def fake_request(db, settings_, method, path, *, params=None, body=None, conn=None, ` (стр. 504)
- `_FakeAppSetting.fake_requestdef fake_request(db, settings_, method, path, *, params=None, body=None, conn=None, _retried=False): assert method == "GET" if conn["id"] == "owner": return {"items": [{"id": "e1"}` (стр. 507)
- `_FakeAppSetting.apply_eventdef apply_event(db, settings_, item, result): result["created"] += 1` (стр. 513)
- `test_pull_skipped_without_connectionsdef test_pull_skipped_without_connections(fake_db, settings): gc.save_tokens(fake_db, {"token": "t"}) # нет refresh_token -> не «рабочее» result = gc.pull_calendar_changes(fake_db,` (стр. 528)
- `test_invites_create_consume_cleardef test_invites_create_consume_clear(fake_db): gc.create_invite(fake_db, "Анна", "state-1") gc.create_invite(fake_db, "Пётр", "state-2") invite = gc.consume_invite(fake_db, "state` (стр. 534)
- `test_extract_account_email_from_id_tokendef test_extract_account_email_from_id_token(): import base64 import json as json_mod payload = base64.urlsafe_b64encode( json_mod.dumps({"email": "anna@example.com", "sub": "123"}` (стр. 547)

### backend/tests/test_google_calendar_api.py (641 строк)

Классы и функции (27):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 17)
- `class GoogleCalendarApiTests(unittest.TestCase):` (стр. 23)
- `GoogleCalendarApiTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_gc_api_{os.urandom(4).` (стр. 24)
- `GoogleCalendarApiTests.tearDowndef tearDown(self) -> None: # Закрываем соединения ДВИЖКА, который реально использовал app (до # reset_app_modules — иначе импорт вернёт новый движок без соединений, # а старый дер` (стр. 56)
- `GoogleCalendarApiTests.login_ownerdef login_owner(self) -> str: """Аутентификация владельца: возвращаем подписанный initData. В демо-сиде владелец не привязан к Telegram, поэтому предварительно проставляем telegram` (стр. 73)
- `GoogleCalendarApiTests.auth_headersdef auth_headers(self, init_data: str) -> dict[str, str]: return {"Authorization": init_data}` (стр. 115)
- `GoogleCalendarApiTests.telegram_bot_tokendef telegram_bot_token(self) -> str: return os.environ["TELEGRAM_BOT_TOKEN"]` (стр. 118)
- `GoogleCalendarApiTests.test_auth_url_requires_ownerdef test_auth_url_requires_owner(self) -> None: response = self.client.get("/api/owner/integrations/google/auth-url") self.assertEqual(response.status_code, 401)` (стр. 121)
- `GoogleCalendarApiTests.test_auth_url_returns_consent_linkdef test_auth_url_returns_consent_link(self) -> None: token = self.login_owner() with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent?state=abc")` (стр. 125)
- `GoogleCalendarApiTests.test_status_reports_env_source_when_configureddef test_status_reports_env_source_when_configured(self) -> None: token = self.login_owner() response = self.client.get( "/api/owner/integrations/google/status", headers=self.auth_` (стр. 136)
- `GoogleCalendarApiTests.test_put_credentials_saves_and_auth_url_uses_db_credsdef test_put_credentials_saves_and_auth_url_uses_db_creds(self) -> None: token = self.login_owner() response = self.client.put( "/api/owner/integrations/google/credentials", header` (стр. 148)
- `GoogleCalendarApiTests.test_delete_credentials_restores_env_sourcedef test_delete_credentials_restores_env_source(self) -> None: token = self.login_owner() self.client.put( "/api/owner/integrations/google/credentials", headers=self.auth_headers(t` (стр. 183)
- `GoogleCalendarApiTests.test_credentials_endpoints_require_ownerdef test_credentials_endpoints_require_owner(self) -> None: response = self.client.get("/api/owner/integrations/google/status") self.assertEqual(response.status_code, 401) response` (стр. 202)
- `GoogleCalendarApiTests.test_put_credentials_rejects_emptydef test_put_credentials_rejects_empty(self) -> None: token = self.login_owner() response = self.client.put( "/api/owner/integrations/google/credentials", headers=self.auth_headers` (стр. 213)
- `GoogleCalendarApiTests.test_callback_exchanges_code_and_enables_integrationdef test_callback_exchanges_code_and_enables_integration(self) -> None: token = self.login_owner() # Получаем state из AppSetting после запроса auth-url with patch("app.main.build_` (стр. 223)
- `GoogleCalendarApiTests.test_callback_rejects_wrong_statedef test_callback_rejects_wrong_state(self) -> None: response = self.client.get( "/api/owner/integrations/google/callback", params={"code": "auth-code", "state": "wrong-state"}, he` (стр. 270)
- `GoogleCalendarApiTests.test_callback_returns_html_page_for_browserdef test_callback_returns_html_page_for_browser(self) -> None: """Браузер (Accept: text/html) после OAuth видит понятную страницу, а не JSON.""" token = self.login_owner() with pat` (стр. 279)
- `GoogleCalendarApiTests.test_disconnect_clears_tokens_and_flagdef test_disconnect_clears_tokens_and_flag(self) -> None: token = self.login_owner() with patch("app.main.exchange_code", return_value={"token": "t", "refresh_token": "r"}):` (стр. 318)
- `GoogleCalendarApiTests.test_invite_flow_connects_second_persondef test_invite_flow_connects_second_person(self) -> None: """Владелец создаёт ссылку-приглашение, человек подключает свой календарь.""" token = self.login_owner() # Сначала владел` (стр. 355)
- `GoogleCalendarApiTests.test_delete_single_connection_keeps_othersdef test_delete_single_connection_keeps_others(self) -> None: """Удаление одного подключения не отключает остальные календари.""" token = self.login_owner() def connect_via(label: ` (стр. 429)
- `GoogleCalendarApiTests.connect_viadef connect_via(label: str) -> None: if label == "Владелец": with patch("app.main.build_auth_url", return_value="https://accounts.google.com/consent"):` (стр. 433)
- `GoogleCalendarApiTests.test_create_booking_calls_google_syncdef test_create_booking_calls_google_sync(self) -> None: token = self.login_owner() from app.database import SessionLocal from app.models import AppSetting # Подключаем интеграцию ` (стр. 503)
- `GoogleCalendarApiTests.test_sync_endpoint_requires_ownerdef test_sync_endpoint_requires_owner(self) -> None: response = self.client.post("/api/owner/integrations/google/sync") self.assertEqual(response.status_code, 401)` (стр. 544)
- `GoogleCalendarApiTests.test_sync_endpoint_returns_pull_statsdef test_sync_endpoint_returns_pull_stats(self) -> None: token = self.login_owner() from app.database import SessionLocal from app.models import AppSetting # Подключаем интеграцию ` (стр. 548)
- `GoogleCalendarApiTests.test_create_booking_sets_source_for_client_roledef test_create_booking_sets_source_for_client_role(self) -> None: token = self.login_owner() response = self.client.post( "/api/bookings", headers=self.auth_headers(token), json={` (стр. 580)
- `GoogleCalendarApiTests.test_exchange_code_normalizes_google_responsedef test_exchange_code_normalizes_google_response(self) -> None: """exchange_code возвращает ключ "token" (access_token из ответа Google).""" from unittest.mock import MagicMock fr` (стр. 604)
- `GoogleCalendarApiTests.test_load_tokens_normalizes_legacy_access_token_keydef test_load_tokens_normalizes_legacy_access_token_key(self) -> None: """Токены, сохранённые старым кодом (ключ access_token), читаются как token.""" from app.database import Sess` (стр. 627)

### backend/tests/test_google_calendar_pull.py (1298 строк)

Классы и функции (40):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 15)
- `_eventdef _event( event_id: str, *, start: str = "2026-08-13T10:30:00+03:00", end: str = "2026-08-13T11:15:00+03:00", summary: str = "Мойка", description: str | None = "Клиент: Иван\nТел` (стр. 21)
- `class GoogleCalendarPullTests(unittest.TestCase):` (стр. 47)
- `GoogleCalendarPullTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_gc_pull_{os.urandom(4)` (стр. 48)
- `GoogleCalendarPullTests.tearDowndef tearDown(self) -> None: from app.database import engine engine.dispose() self.client_manager.__exit__(None, None, None) self._sync_thread_patch.stop() reset_app_modules() for s` (стр. 82)
- `GoogleCalendarPullTests.sessiondef session(self): from app.database import SessionLocal return SessionLocal()` (стр. 96)
- `GoogleCalendarPullTests._save_tokensdef _save_tokens(self) -> None: from app.google_calendar import save_tokens with self.session() as db: save_tokens(db, {"token": "t", "refresh_token": "r"}) db.commit()` (стр. 101)
- `GoogleCalendarPullTests._patch_calendar_requestdef _patch_calendar_request(self, pages: list) -> patch: """Подменить _calendar_request: каждый вызов возвращает следующую страницу. Элемент может быть dict (страница) или исключен` (стр. 108)
- `GoogleCalendarPullTests.fake_calendar_requestdef fake_calendar_request( db, settings, method, path, *, params=None, body=None, _retried=False, conn=None` (стр. 117)
- `GoogleCalendarPullTests._stored_sync_tokendef _stored_sync_token(self, db) -> str | None: """syncToken из первого (владельческого) подключения.""" from app.google_calendar import get_connection conn = get_connection(db, "o` (стр. 127)
- `GoogleCalendarPullTests.test_pull_skipped_without_tokensdef test_pull_skipped_without_tokens(self) -> None: from app.google_calendar import pull_calendar_changes with self.session() as db: result = pull_calendar_changes(db, self.setting` (стр. 134)
- `GoogleCalendarPullTests.test_pull_creates_booking_and_client_from_new_eventdef test_pull_creates_booking_and_client_from_new_event(self) -> None: from app.google_calendar import pull_calendar_changes self._save_tokens() pages = [ { "items": [ _event( "g-n` (стр. 143)
- `GoogleCalendarPullTests.test_pull_updates_booking_time_by_crm_booking_iddef test_pull_updates_booking_time_by_crm_booking_id(self) -> None: from app.google_calendar import pull_calendar_changes from app.models import Booking, Client with self.session()` (стр. 189)
- `GoogleCalendarPullTests.test_pull_cancels_booking_when_event_deleteddef test_pull_cancels_booking_when_event_deleted(self) -> None: from app.google_calendar import pull_calendar_changes from app.models import Booking, Client with self.session() as ` (стр. 245)
- `GoogleCalendarPullTests.test_pull_updates_existing_booking_without_crm_linkdef test_pull_updates_existing_booking_without_crm_link(self) -> None: """События, созданные старым кодом (без extendedProperties), обновляются по google_event_id и не дублируются.` (стр. 286)
- `GoogleCalendarPullTests.test_pull_passes_sync_token_on_next_rundef test_pull_passes_sync_token_on_next_run(self) -> None: from app.google_calendar import pull_calendar_changes self._save_tokens() pages = [{"items": [], "nextSyncToken": "tok-1"` (стр. 332)
- `GoogleCalendarPullTests.fake_seconddef fake_second(db, settings, method, path, *, params=None, body=None, _retried=False, conn=None): captured.append(dict(params or {})) return {"items": [], "nextSyncToken": "tok-2"` (стр. 345)
- `GoogleCalendarPullTests.test_pull_full_rescan_when_sync_token_expireddef test_pull_full_rescan_when_sync_token_expired(self) -> None: from app.google_calendar import _GoogleApiError, pull_calendar_changes self._save_tokens() captured: list[dict] = [` (стр. 359)
- `GoogleCalendarPullTests.fake_rescandef fake_rescan(db, settings, method, path, *, params=None, body=None, _retried=False, conn=None): captured.append(dict(params or {})) next_item = pages.pop(0) if isinstance(next_i` (стр. 369)
- `GoogleCalendarPullTests.test_pull_skips_foreign_event_with_wrong_crm_linkdef test_pull_skips_foreign_event_with_wrong_crm_link(self) -> None: """Событие с чужим crmBookingId (подделанным или от другой записи) не должно перезаписывать чужую запись.""" fr` (стр. 390)
- `GoogleCalendarPullTests.test_pull_reports_auth_failed_with_google_detailsdef test_pull_reports_auth_failed_with_google_details(self) -> None: """401/403 после попытки обновления токена -> error="auth_failed"; детали из ответа Google пробрасываются в err` (стр. 443)
- `GoogleCalendarPullTests.test_pull_reports_auth_failed_with_raw_detailsdef test_pull_reports_auth_failed_with_raw_details(self) -> None: """Прочие 401/403 (не accessNotConfigured) отдают исходный текст Google.""" from app.google_calendar import _Googl` (стр. 470)
- `GoogleCalendarPullTests.test_pull_parses_scrambled_descriptiondef test_pull_parses_scrambled_description(self) -> None: """Свободный текст события: имя, телефон, авто, госномер, услуга в любом порядке.""" from app.google_calendar import pull_` (стр. 486)
- `GoogleCalendarPullTests.test_pull_parses_latin_brand_and_short_platedef test_pull_parses_latin_brand_and_short_plate(self) -> None: """Латиница марки, телефон «+7 (…)», госномер на 777.""" from app.google_calendar import pull_calendar_changes from ` (стр. 536)
- `GoogleCalendarPullTests.test_pull_keeps_strict_format_prioritydef test_pull_keeps_strict_format_priority(self) -> None: """«Ключ: значение» имеет приоритет над свободным распознаванием.""" from app.google_calendar import pull_calendar_changes` (стр. 573)
- `GoogleCalendarPullTests.test_sync_creates_event_for_admin_review_bookingdef test_sync_creates_event_for_admin_review_booking(self) -> None: """Заявка клиента (admin_review) сразу синхронизируется в календарь.""" from unittest.mock import patch as _patc` (стр. 613)
- `GoogleCalendarPullTests.test_sync_skips_deleted_statusdef test_sync_skips_deleted_status(self) -> None: """Отменённая запись не создаёт событие в календаре.""" from unittest.mock import patch as _patch from app.google_calendar import ` (стр. 654)
- `GoogleCalendarPullTests.test_pull_parses_free_form_bookingdef test_pull_parses_free_form_booking(self) -> None: """«миша ремонт скола мерседес 79872136194» разкладывается по полям.""" from app.google_calendar import pull_calendar_changes ` (стр. 693)
- `GoogleCalendarPullTests.test_pull_falls_back_to_free_text_slice_for_servicedef test_pull_falls_back_to_free_text_slice_for_service(self) -> None: """Без совпадения в каталоге услугой становится остаток текста.""" from app.google_calendar import pull_calen` (стр. 742)
- `GoogleCalendarPullTests.test_pull_does_not_duplicate_existing_bookingdef test_pull_does_not_duplicate_existing_booking(self) -> None: """Запись из бота и то же событие из Google не дают дубля.""" from app.google_calendar import pull_calendar_changes` (стр. 778)
- `GoogleCalendarPullTests.test_pull_links_booking_to_existing_clientdef test_pull_links_booking_to_existing_client(self) -> None: """Запись из Google падает в карточку уже известного клиента.""" from app.google_calendar import pull_calendar_changes` (стр. 828)
- `GoogleCalendarPullTests.test_pull_parses_rare_name_before_phonedef test_pull_parses_rare_name_before_phone(self) -> None: """Имя, которого нет в словаре, определяется по соседству с телефоном. «Гарик» не входит в _COMMON_NAMES — эвристика «ряд` (стр. 868)
- `GoogleCalendarPullTests.test_pull_parses_rare_name_after_phonedef test_pull_parses_rare_name_after_phone(self) -> None: """Имя после телефона в конце текста тоже определяется.""" from app.google_calendar import pull_calendar_changes from app.` (стр. 909)
- `GoogleCalendarPullTests.test_pull_does_not_steal_service_word_as_namedef test_pull_does_not_steal_service_word_as_name(self) -> None: """Служебное слово рядом с телефоном не выдаётся за имя клиента.""" from app.google_calendar import pull_calendar_c` (стр. 945)
- `GoogleCalendarPullTests.test_pull_transfers_google_edits_to_bookingdef test_pull_transfers_google_edits_to_booking(self) -> None: """Правки в Google (заголовок, клиент, бокс, комментарий) переносятся в CRM. Владелец отредактировал событие в Google` (стр. 983)
- `GoogleCalendarPullTests.test_pull_does_not_overwrite_newer_crm_editdef test_pull_does_not_overwrite_newer_crm_edit(self) -> None: """Событие не правилось после последней записи в Google — правки CRM не затираются. Если запись недавно правилась в C` (стр. 1058)
- `GoogleCalendarPullTests.test_pull_transfers_free_text_car_plate_to_existing_bookingdef test_pull_transfers_free_text_car_plate_to_existing_booking(self) -> None: """Свободный текст «бмв х5 у888уу716» в событии доходит до полей Авто/Номер. Существующая запись прав` (стр. 1124)
- `GoogleCalendarPullTests.test_pull_does_not_use_plate_letters_as_namedef test_pull_does_not_use_plate_letters_as_name(self) -> None: """Буквы госномера «у888уу716» не становятся именем клиента «Уу».""" from app.google_calendar import pull_calendar_c` (стр. 1194)
- `GoogleCalendarPullTests.test_pull_parses_foreign_platedef test_pull_parses_foreign_plate(self) -> None: """Иностранный госномер (M123AB) распознаётся и нормализуется.""" from app.google_calendar import pull_calendar_changes from app.m` (стр. 1229)
- `GoogleCalendarPullTests.test_pull_parses_new_chinese_branddef test_pull_parses_new_chinese_brand(self) -> None: """Новые марки из расширенного словаря (хавал, танк) распознаются.""" from app.google_calendar import pull_calendar_changes fr` (стр. 1263)

### backend/tests/test_html_and_headers.py (66 строк)

Классы и функции (13):

- `test_bot_db_content_is_html_escapeddef test_bot_db_content_is_html_escaped(monkeypatch) -> None: sent = {} monkeypatch.setattr(bot, "session_scope", lambda: _SessionContext({"works": [{"title": "<b>x</b>", "descript` (стр. 12)
- `class _SessionContext: def __init__(self, value) -> None: self.value = value def __enter__(self):` (стр. 24)
- `_SessionContext.__init__def __init__(self, value) -> None: self.value = value` (стр. 25)
- `_SessionContext.__enter__def __enter__(self): return _Db(self.value)` (стр. 28)
- `_SessionContext.__exit__def __exit__(self, *args): return False` (стр. 31)
- `class _Db: def __init__(self, value) -> None: self.value = value def get(self, model, key):` (стр. 35)
- `_Db.__init__def __init__(self, value) -> None: self.value = value` (стр. 36)
- `_Db.getdef get(self, model, key): return type("Row", (), {"value": self.value})()` (стр. 39)
- `requestdef request(path: str = "/api/test", scheme: str = "http") -> Request: return Request({"type": "http", "method": "GET", "path": path, "headers": [], "scheme": scheme, "server": ("t` (стр. 43)
- `test_global_security_headers_and_sensitive_no_storedef test_global_security_headers_and_sensitive_no_store() -> None: response = asyncio.run(main.add_security_headers(request(), lambda req: _response())) assert response.headers["X-` (стр. 47)
- `_responseasync def _response(): return JSONResponse({"ok": True})` (стр. 57)
- `test_upload_cache_policy_is_not_overwrittendef test_upload_cache_policy_is_not_overwritten() -> None: async def immutable():` (стр. 61)
- `_Db.immutableasync def immutable(): return JSONResponse({"ok": True}, headers={"Cache-Control": "public, max-age=31536000, immutable"})` (стр. 62)

### backend/tests/test_idor_spot.py (186 строк)

Классы и функции (14):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 34)
- `class IdorSpotTests(unittest.TestCase):` (стр. 38)
- `IdorSpotTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 44)
- `IdorSpotTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 68)
- `IdorSpotTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 74)
- `IdorSpotTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 83)
- `IdorSpotTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = { "admin": self.ADMIN_TG_I` (стр. 92)
- `IdorSpotTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 111)
- `IdorSpotTests.create_booking_fordef create_booking_for(self, worker_id: str, worker_name: str) -> dict: response = self.client.post( "/api/bookings", headers={"Authorization": self.admin_token}, json={ "clientId"` (стр. 119)
- `IdorSpotTests.test_debug_db_requires_ownerdef test_debug_db_requires_owner(self) -> None: anonymous = self.client.get("/api/debug/db") self.assertIn(anonymous.status_code, (401, 403), anonymous.text) worker = self.client.g` (стр. 144)
- `IdorSpotTests.test_stranger_worker_cannot_patch_bookingdef test_stranger_worker_cannot_patch_booking(self) -> None: booking = self.create_booking_for("w2", "Олег") response = self.client.patch( f"/api/bookings/{booking['id']}", headers` (стр. 153)
- `IdorSpotTests.test_assigned_worker_can_patch_own_bookingdef test_assigned_worker_can_patch_own_booking(self) -> None: booking = self.create_booking_for("w1", "Иван") response = self.client.patch( f"/api/bookings/{booking['id']}", header` (стр. 162)
- `IdorSpotTests.test_client_isolated_from_staff_routesdef test_client_isolated_from_staff_routes(self) -> None: client_auth = self.client.post( "/api/auth/client", json={"name": "IDOR", "phone": "+7 (999) 000-00-01", "car": "", "plate` (стр. 171)

### backend/tests/test_income_endpoints.py (242 строк)

Классы и функции (16):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 23)
- `class IncomeEndpointTests(unittest.TestCase):` (стр. 35)
- `IncomeEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 38)
- `IncomeEndpointTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 65)
- `IncomeEndpointTests._login_staffdef _login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(resp` (стр. 82)
- `IncomeEndpointTests._disable_owner_two_factordef _disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_` (стр. 90)
- `IncomeEndpointTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 101)
- `IncomeEndpointTests._valid_income_payloaddef _valid_income_payload(self, **overrides) -> dict: payload = { "amount": 5000, "source": "Аренда помещения", "note": "Январь 2025", "date": "15.01.2025", } payload.update(overri` (стр. 104)
- `IncomeEndpointTests.test_get_incomes_returns_200_with_empty_list_when_no_recordsdef test_get_incomes_returns_200_with_empty_list_when_no_records(self) -> None: """GET /api/owner/incomes returns 200 and an empty list when no incomes exist. Requirements: 1.6 """` (стр. 118)
- `IncomeEndpointTests.test_post_income_with_valid_data_returns_201def test_post_income_with_valid_data_returns_201(self) -> None: """POST /api/owner/incomes with valid data returns 201 and the created record. Requirements: 1.3, 1.7 """ payload = ` (стр. 132)
- `IncomeEndpointTests.test_post_income_with_amount_zero_returns_422def test_post_income_with_amount_zero_returns_422(self) -> None: """POST /api/owner/incomes with amount=0 returns 422. Requirements: 1.4 """ payload = self._valid_income_payload(am` (стр. 153)
- `IncomeEndpointTests.test_post_income_with_empty_source_returns_422def test_post_income_with_empty_source_returns_422(self) -> None: """POST /api/owner/incomes with source="" returns 422. Requirements: 1.5 """ payload = self._valid_income_payload(` (стр. 166)
- `IncomeEndpointTests.test_post_income_with_whitespace_only_source_returns_422def test_post_income_with_whitespace_only_source_returns_422(self) -> None: """POST /api/owner/incomes with source containing only spaces returns 422. Requirements: 1.5 """ payload` (стр. 179)
- `IncomeEndpointTests.test_created_income_appears_in_listdef test_created_income_appears_in_list(self) -> None: """After POST, the new income record appears in GET /api/owner/incomes. Requirements: 1.6, 1.7 """ payload = self._valid_inco` (стр. 192)
- `IncomeEndpointTests.test_post_income_with_negative_amount_returns_422def test_post_income_with_negative_amount_returns_422(self) -> None: """POST /api/owner/incomes with a negative amount returns 422. Requirements: 1.4 """ payload = self._valid_inco` (стр. 214)
- `IncomeEndpointTests.test_post_income_with_amount_exceeding_max_returns_422def test_post_income_with_amount_exceeding_max_returns_422(self) -> None: """POST /api/owner/incomes with amount > 10_000_000 returns 422. Requirements: 1.4 """ payload = self._val` (стр. 227)

### backend/tests/test_mojibake_repair.py (276 строк)

Классы и функции (26):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode( {"user": json.dumps({"id": in` (стр. 28)
- `as_cp1251_mojibakedef as_cp1251_mojibake(text: str) -> str: """Эмуляция типичной порчи: utf-8 байты, декодированные как cp1251.""" return text.encode("utf-8").decode("cp1251")` (стр. 35)
- `as_latin1_mojibakedef as_latin1_mojibake(text: str) -> str: return text.encode("utf-8").decode("cp1252")` (стр. 40)
- `class StrictRepairUnitTests(unittest.TestCase):` (стр. 44)
- `StrictRepairUnitTests.test_repairs_cp1251_mojibakedef test_repairs_cp1251_mojibake(self) -> None: from app.main import _repair_text_value mojibake = as_cp1251_mojibake("Выручка") self.assertNotEqual(mojibake, "Выручка") self.asser` (стр. 45)
- `StrictRepairUnitTests.test_repairs_cp1251_mojibake_with_broken_apostrophedef test_repairs_cp1251_mojibake_with_broken_apostrophe(self) -> None: from app.main import _repair_text_value # Байт 0x92 (’) при порче часто превращался в обычный апостроф mojiba` (стр. 52)
- `StrictRepairUnitTests.test_repairs_latin1_mojibakedef test_repairs_latin1_mojibake(self) -> None: from app.main import _repair_text_value mojibake = as_latin1_mojibake("Привет") self.assertNotEqual(mojibake, "Привет") self.assertE` (стр. 59)
- `StrictRepairUnitTests.test_repairs_double_mojibakedef test_repairs_double_mojibake(self) -> None: from app.main import _repair_text_value once = as_cp1251_mojibake("Выручка") twice = once.encode("utf-8").decode("cp1251") self.asse` (стр. 66)
- `class _TestClientContext: """Обёртка над TestClient с context manager семантикой.""" def __init__(self, app) -> None: fr` (стр. 75)
- `_TestClientContext.__init__def __init__(self, app) -> None: from fastapi.testclient import TestClient self._cm = TestClient(app)` (стр. 78)
- `_TestClientContext.__enter__def __enter__(self): return self._cm.__enter__()` (стр. 83)
- `_TestClientContext.__exit__def __exit__(self, *args) -> None: self._cm.__exit__(*args)` (стр. 86)
- `class MojibakeEndpointTests(unittest.TestCase):` (стр. 90)
- `MojibakeEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 95)
- `MojibakeEndpointTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 120)
- `MojibakeEndpointTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 126)
- `MojibakeEndpointTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 135)
- `MojibakeEndpointTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser mapping = { "admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, ` (стр. 144)
- `MojibakeEndpointTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 161)
- `MojibakeEndpointTests._break_one_servicedef _break_one_service(self) -> None: from app.database import SessionLocal from app.models import Service with SessionLocal() as db: service = db.scalars(select(Service)).first() ` (стр. 164)
- `MojibakeEndpointTests.test_scan_and_repair_endpointsdef test_scan_and_repair_endpoints(self) -> None: self._break_one_service() scan = self.client.get( "/api/debug/mojibake-scan", headers=self.auth_headers(self.owner_token), ) self.` (стр. 174)
- `MojibakeEndpointTests.test_repair_requires_ownerdef test_repair_requires_owner(self) -> None: for token in (self.admin_token, self.worker_token):` (стр. 229)
- `MojibakeEndpointTests.test_repairs_ruble_mojibakedef test_repairs_ruble_mojibake(self) -> None: from app.main import _repair_text_value mojibake = as_cp1251_mojibake("₽") self.assertEqual(_repair_text_value(mojibake), "₽")` (стр. 248)
- `MojibakeEndpointTests.test_correct_text_untoucheddef test_correct_text_untouched(self) -> None: from app.main import _repair_text_value samples = [ "Выручка", "Привет мир", "АТМОСФЕРА", "Клиент Иван", "Revenue 2024", "don't stop"` (стр. 254)
- `MojibakeEndpointTests.test_idempotentdef test_idempotent(self) -> None: from app.main import _repair_text_value once = _repair_text_value(as_cp1251_mojibake("Выручка завершена ₽")) self.assertEqual(_repair_text_value(` (стр. 272)

### backend/tests/test_money_fixes.py (935 строк)

Классы и функции (45):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 30)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 42)
- `class MoneyFixTestBase(unittest.TestCase):` (стр. 47)
- `MoneyFixTestBase.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_money_{uuid4().hex}.sq` (стр. 53)
- `MoneyFixTestBase.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 87)
- `MoneyFixTestBase._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 100)
- `MoneyFixTestBase._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 115)
- `MoneyFixTestBase._todaydef _today() -> str: return datetime.now(timezone.utc).strftime("%d.%m.%Y")` (стр. 119)
- `MoneyFixTestBase._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client from app.schemas import normalize_phone client_id = f"c-{uuid4().he` (стр. 122)
- `MoneyFixTestBase._create_completed_bookingdef _create_completed_booking( self, *, price: int, workers: list[dict], payment_settled: bool = True,` (стр. 142)
- `class PayrollAmountValidationTest(MoneyFixTestBase):` (стр. 177)
- `PayrollAmountValidationTest.test_nan_amount_rejected_with_422def test_nan_amount_rejected_with_422(self) -> None: # Starlette парсит NaN-литерал в float('nan'); pydantic должен отклонить. response = self.client.post( "/api/payroll/entries", ` (стр. 180)
- `PayrollAmountValidationTest.test_infinite_amount_rejected_with_422def test_infinite_amount_rejected_with_422(self) -> None: response = self.client.post( "/api/payroll/entries", headers=self._auth_headers(self.owner_token), data=json.dumps( { "wor` (стр. 191)
- `PayrollAmountValidationTest.test_negative_override_earned_rejected_with_422def test_negative_override_earned_rejected_with_422(self) -> None: booking_id = self._create_completed_booking( price=5000, workers=[{"workerId": "w1", "workerName": "Иван", "perce` (стр. 206)
- `class PiggyWithdrawLinkTest(MoneyFixTestBase):` (стр. 230)
- `PiggyWithdrawLinkTest.test_editing_withdraw_expense_updates_single_mirrordef test_editing_withdraw_expense_updates_single_mirror(self) -> None: # Снятие 1000 из копилки мойки без привязки к записи withdraw_response = self.client.post( "/api/owner/piggy-` (стр. 233)
- `PiggyWithdrawLinkTest.test_payroll_expense_never_gets_piggy_mirrordef test_payroll_expense_never_gets_piggy_mirror(self) -> None: self._create_completed_booking( price=5000, workers=[{"workerId": "w1", "workerName": "Иван", "percent": 30}], ) pay` (стр. 290)
- `class PaySalaryBalanceConsistencyTest(MoneyFixTestBase):` (стр. 323)
- `PaySalaryBalanceConsistencyTest.test_new_balance_matches_screen_after_payoutdef test_new_balance_matches_screen_after_payout(self) -> None: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: ivan = db.get(Staf` (стр. 326)
- `PaySalaryBalanceConsistencyTest.test_asvc_only_worker_balance_counts_additional_servicesdef test_asvc_only_worker_balance_counts_additional_services(self) -> None: booking_id = self._create_completed_booking( price=5000, workers=[{"workerId": "w2", "workerName": "Олег` (стр. 372)
- `class PaySalaryIdempotencyTest(MoneyFixTestBase):` (стр. 411)
- `PaySalaryIdempotencyTest._paydef _pay(self, request_key: str | None) -> dict: response = self.client.post( "/api/owner/workers/w1/pay-salary", headers=self._auth_headers(self.owner_token), json={ "period": "mo` (стр. 414)
- `PaySalaryIdempotencyTest.test_duplicate_request_returns_same_payoutdef test_duplicate_request_returns_same_payout(self) -> None: first = self._pay("req-key-123") second = self._pay("req-key-123") self.assertEqual(first["payoutId"], second["payoutI` (стр. 429)
- `PaySalaryIdempotencyTest.test_different_keys_create_separate_payoutsdef test_different_keys_create_separate_payouts(self) -> None: first = self._pay("req-key-a") second = self._pay("req-key-b") self.assertNotEqual(first["payoutId"], second["payoutI` (стр. 451)
- `class PayoutViaEntriesCreatesExpenseTest(MoneyFixTestBase):` (стр. 469)
- `PayoutViaEntriesCreatesExpenseTest.test_payout_entry_creates_expensedef test_payout_entry_creates_expense(self) -> None: response = self.client.post( "/api/payroll/entries", headers=self._auth_headers(self.owner_token), json={ "workerId": "w1", "ki` (стр. 472)
- `class ReverseBudgetSyncTest(MoneyFixTestBase):` (стр. 506)
- `ReverseBudgetSyncTest.test_editing_bonus_expense_updates_payroll_entrydef test_editing_bonus_expense_updates_payroll_entry(self) -> None: create_response = self.client.post( "/api/payroll/entries", headers=self._auth_headers(self.owner_token), json={` (стр. 509)
- `ReverseBudgetSyncTest.test_editing_deduction_income_updates_payroll_entrydef test_editing_deduction_income_updates_payroll_entry(self) -> None: create_response = self.client.post( "/api/payroll/entries", headers=self._auth_headers(self.owner_token), jso` (стр. 551)
- `class EditAdjustmentBudgetSyncTest(MoneyFixTestBase):` (стр. 590)
- `EditAdjustmentBudgetSyncTest._create_adjustmentdef _create_adjustment(self, amount: int) -> str: create_response = self.client.post( "/api/payroll/entries", headers=self._auth_headers(self.owner_token), json={"workerId": "w1", ` (стр. 594)
- `EditAdjustmentBudgetSyncTest.assert_budgetdef assert_budget(self, *, expenses: int, incomes: int) -> None: from app.database import SessionLocal from app.models import Expense, Income from sqlalchemy import func, select wi` (стр. 616)
- `EditAdjustmentBudgetSyncTest.test_negative_adjustment_syncs_incomedef test_negative_adjustment_syncs_income(self) -> None: entry_id = self._create_adjustment(500) self.assert_budget(expenses=1, incomes=0) # Меняем знак: +500 → −300. Expense удаля` (стр. 631)
- `EditAdjustmentBudgetSyncTest.test_negative_to_positive_adjustment_undoes_incomedef test_negative_to_positive_adjustment_undoes_income(self) -> None: entry_id = self._create_adjustment(-500) self.assert_budget(expenses=0, incomes=1) # Меняем знак: −500 → +700.` (стр. 653)
- `class ComplaintPostingsConsistencyTest(MoneyFixTestBase):` (стр. 667)
- `ComplaintPostingsConsistencyTest.test_postings_match_complaint_adjusted_splitdef test_postings_match_complaint_adjusted_split(self) -> None: from app.database import SessionLocal from app.models import ( OwnerProfitShare, Penalty, PiggyBankTransaction, Serv` (стр. 670)
- `class PayrollEntriesIdempotencyTest(MoneyFixTestBase):` (стр. 785)
- `PayrollEntriesIdempotencyTest._createdef _create(self, request_key: str | None) -> dict: response = self.client.post( "/api/payroll/entries", headers=self._auth_headers(self.owner_token), json={ "workerId": "w1", "kin` (стр. 788)
- `PayrollEntriesIdempotencyTest.test_duplicate_request_creates_single_entrydef test_duplicate_request_creates_single_entry(self) -> None: first = self._create("entry-key-123") second = self._create("entry-key-123") # Ответ — WorkerPayload одного и того же` (стр. 803)
- `PayrollEntriesIdempotencyTest.test_different_keys_create_separate_entriesdef test_different_keys_create_separate_entries(self) -> None: self._create("entry-key-a") self._create("entry-key-b") from app.database import SessionLocal from app.models import ` (стр. 826)
- `class OwnerPaySalaryIdempotencyTest(MoneyFixTestBase):` (стр. 843)
- `OwnerPaySalaryIdempotencyTest._pending_owner_with_sharedef _pending_owner_with_share(self) -> str: # Доли владельцев появляются при переходе записи в completed # (фактические проводки: копилка + доли владельцев). client_id, client_phon` (стр. 846)
- `OwnerPaySalaryIdempotencyTest._paydef _pay(self, owner_db_id: str, request_key: str | None) -> dict: response = self.client.post( "/api/owner/owners/pay-salary", headers=self._auth_headers(self.owner_token), json={` (стр. 893)
- `OwnerPaySalaryIdempotencyTest.test_duplicate_request_creates_single_payoutdef test_duplicate_request_creates_single_payout(self) -> None: owner_db_id = self._pending_owner_with_share() first = self._pay(owner_db_id, "owner-key-123") second = self._pay(ow` (стр. 907)
- `OwnerPaySalaryIdempotencyTest.test_different_keys_create_separate_payoutsdef test_different_keys_create_separate_payouts(self) -> None: owner_db_id = self._pending_owner_with_share() first = self._pay(owner_db_id, "owner-key-a") second = self._pay(owner` (стр. 927)

### backend/tests/test_money_flow.py (409 строк)

Классы и функции (22):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 27)
- `class MoneyFlowEndpointTests(unittest.TestCase):` (стр. 32)
- `MoneyFlowEndpointTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 37)
- `MoneyFlowEndpointTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 60)
- `MoneyFlowEndpointTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 66)
- `MoneyFlowEndpointTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 76)
- `MoneyFlowEndpointTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser mapping = { "admin": self.ADMIN_TG_ID, "ivan": self.WORKER_TG_ID, ` (стр. 85)
- `MoneyFlowEndpointTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `MoneyFlowEndpointTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 106)
- `MoneyFlowEndpointTests.create_completed_bookingdef create_completed_booking(self, *, price: int = 1200, payment_type: str = "cash", settled: bool = True) -> dict: candidate = datetime.now().replace(hour=0, minute=0, second=0, m` (стр. 114)
- `MoneyFlowEndpointTests.get_money_flowdef get_money_flow(self, *, token: str | None = None, **params) -> dict: query = urllib.parse.urlencode(params) response = self.client.get( f"/api/owner/money-flow?{query}", header` (стр. 161)
- `MoneyFlowEndpointTests.test_money_flow_requires_owner_roledef test_money_flow_requires_owner_role(self) -> None: response = self.client.get( "/api/owner/money-flow", headers=self.auth_headers(self.admin_token), ) self.assertEqual(response` (стр. 172)
- `MoneyFlowEndpointTests.test_money_flow_rejects_invalid_datedef test_money_flow_rejects_invalid_date(self) -> None: response = self.client.get( "/api/owner/money-flow?date_from=not-a-date", headers=self.auth_headers(self.owner_token), ) sel` (стр. 185)
- `MoneyFlowEndpointTests.test_booking_payment_entry_with_distributiondef test_booking_payment_entry_with_distribution(self) -> None: baseline = self.get_money_flow() booking = self.create_completed_booking(price=1200) data = self.get_money_flow() en` (стр. 194)
- `MoneyFlowEndpointTests.test_credit_booking_is_not_cash_inflowdef test_credit_booking_is_not_cash_inflow(self) -> None: from app.database import SessionLocal from app.models import Booking baseline = self.get_money_flow() booking = self.creat` (стр. 227)
- `MoneyFlowEndpointTests.test_unpaid_booking_marked_as_allocationdef test_unpaid_booking_marked_as_allocation(self) -> None: baseline = self.get_money_flow() booking = self.create_completed_booking(price=700, settled=False) data = self.get_money` (стр. 246)
- `MoneyFlowEndpointTests.test_income_and_expense_entriesdef test_income_and_expense_entries(self) -> None: today = datetime.now().strftime("%d.%m.%Y") baseline = self.get_money_flow() income = self.client.post( "/api/owner/incomes", hea` (стр. 258)
- `MoneyFlowEndpointTests.test_worker_payout_counts_oncedef test_worker_payout_counts_once(self) -> None: from app.database import SessionLocal from app.models import StaffUser self.create_completed_booking(price=3000) with SessionLocal` (стр. 288)
- `MoneyFlowEndpointTests.test_bonus_visible_as_allocation_not_expensedef test_bonus_visible_as_allocation_not_expense(self) -> None: from app.database import SessionLocal from app.models import StaffUser with SessionLocal() as db: worker = db.scalar` (стр. 324)
- `MoneyFlowEndpointTests.test_deposit_topup_is_inflowdef test_deposit_topup_is_inflow(self) -> None: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" client_name = "Депозит Клиен` (стр. 350)
- `MoneyFlowEndpointTests.test_period_filtering_excludes_other_datesdef test_period_filtering_excludes_other_dates(self) -> None: booking = self.create_completed_booking(price=1200) old_date = (datetime.now() - timedelta(days=365)).strftime("%d.%m.` (стр. 389)

### backend/tests/test_money_split_fuzz.py (320 строк)

Классы и функции (15):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 26)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 38)
- `class MoneySplitFuzzTests(unittest.TestCase):` (стр. 42)
- `MoneySplitFuzzTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 48)
- `MoneySplitFuzzTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 70)
- `MoneySplitFuzzTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 76)
- `MoneySplitFuzzTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 85)
- `MoneySplitFuzzTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = {"admin": self.ADMIN_TG_ID` (стр. 94)
- `MoneySplitFuzzTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 108)
- `MoneySplitFuzzTests.active_datesdef active_dates(count: int) -> list[str]: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) found: list[str] = [] offset = 1 while len(found) < count: ` (стр. 112)
- `MoneySplitFuzzTests.make_completed_bookingdef make_completed_booking( self, price: int, workers: list[dict], date: str, time: str` (стр. 124)
- `MoneySplitFuzzTests.add_servicedef add_service( self, booking_id: str, price: int, price_mode: str, outsource: bool` (стр. 158)
- `MoneySplitFuzzTests.get_splitdef get_split(self, booking_id: str) -> dict: response = self.client.get( f"/api/owner/bookings/{booking_id}/money-split", headers=self.auth_headers(self.owner_token), ) self.asser` (стр. 180)
- `MoneySplitFuzzTests.assert_invariantsdef assert_invariants( self, split: dict, price: int, has_explicit_pay: bool, case: str` (стр. 188)
- `MoneySplitFuzzTests.test_money_split_invariants_hold_on_random_mixesdef test_money_split_invariants_hold_on_random_mixes(self) -> None: rng = random.Random(self.SEED) prices = [0, 1, 99, 100, 999, 1000, 3333, 9999, 25000, 100000] percents = [0, 1, ` (стр. 212)

### backend/tests/test_orphan_endpoints.py (172 строк)

Классы и функции (11):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 21)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 33)
- `class OrphanEndpointsTests(unittest.TestCase):` (стр. 37)
- `OrphanEndpointsTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 41)
- `OrphanEndpointsTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 63)
- `OrphanEndpointsTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 69)
- `OrphanEndpointsTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 78)
- `OrphanEndpointsTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = {"admin": self.ADMIN_TG_ID` (стр. 87)
- `OrphanEndpointsTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 101)
- `OrphanEndpointsTests.test_outsource_payroll_sums_completed_outsource_servicesdef test_outsource_payroll_sums_completed_outsource_services(self) -> None: create_response = self.client.post( "/api/bookings", headers={"Authorization": self.admin_token}, json={` (стр. 109)
- `OrphanEndpointsTests.test_inspection_photo_unknown_id_returns_404def test_inspection_photo_unknown_id_returns_404(self) -> None: response = self.client.get( "/api/admin/shift-inspections/does-not-exist/photo", headers={"Authorization": self.owne` (стр. 163)

### backend/tests/test_owner_export_stock_decimal.py (104 строк)

Классы и функции (3):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `app_envdef app_env() -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) os.environ["DATABASE_URL"] = ( f"sqlite:///{(data_dir / f` (стр. 35)
- `test_build_export_data_handles_decimal_stock_pricedef test_build_export_data_handles_decimal_stock_price(app_env: None) -> None: from app.exports import _build_export_data from app.models import StaffUser, StockItem owner = StaffU` (стр. 57)

### backend/tests/test_owner_masters.py (242 строк)

Классы и функции (16):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 28)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 40)
- `class OwnerMasterTests(unittest.TestCase):` (стр. 44)
- `OwnerMasterTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_owner_masters_{uuid4()` (стр. 49)
- `OwnerMasterTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 72)
- `OwnerMasterTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 78)
- `OwnerMasterTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 87)
- `OwnerMasterTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal with SessionLocal() as db: staff = db.scalars(select(StaffUser)).all() for item in staff: if item.l` (стр. 96)
- `OwnerMasterTests._add_owner_rowsdef _add_owner_rows(self) -> None: from app.database import SessionLocal with SessionLocal() as db: db.add_all( [ StaffUser( id="owner-tg-1", login="owner_tg_1", password_hash=hash` (стр. 106)
- `OwnerMasterTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 159)
- `OwnerMasterTests.test_owner_master_in_bootstrap_workersdef test_owner_master_in_bootstrap_workers(self) -> None: response = self.client.get("/api/auth/session", headers=self.auth_headers(self.admin_token)) self.assertEqual(response.sta` (стр. 162)
- `OwnerMasterTests.test_owner_master_assignable_to_bookingdef test_owner_master_assignable_to_booking(self) -> None: booking_date = self._next_active_date() response = self.client.post( "/api/bookings", headers=self.auth_headers(self.admi` (стр. 174)
- `OwnerMasterTests.test_payroll_entry_for_owner_masterdef test_payroll_entry_for_owner_master(self) -> None: response = self.client.post( "/api/payroll/entries", headers=self.auth_headers(self.admin_token), json={"workerId": "owner-tg` (стр. 199)
- `OwnerMasterTests.test_payroll_entry_rejected_for_plain_ownerdef test_payroll_entry_rejected_for_plain_owner(self) -> None: response = self.client.post( "/api/payroll/entries", headers=self.auth_headers(self.admin_token), json={"workerId": "` (стр. 208)
- `OwnerMasterTests.test_admin_payroll_settings_include_owner_masterdef test_admin_payroll_settings_include_owner_master(self) -> None: response = self.client.get( "/api/admin/workers/payroll?period=all", headers=self.auth_headers(self.admin_token)` (стр. 216)
- `OwnerMasterTests._next_active_datedef _next_active_date(self) -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 236)

### backend/tests/test_owner_salary_asvc_only.py (234 строк)

Классы и функции (10):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 34)
- `class OwnerSalaryAsvcOnlyTest(unittest.TestCase):` (стр. 39)
- `OwnerSalaryAsvcOnlyTest.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 45)
- `OwnerSalaryAsvcOnlyTest.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 72)
- `OwnerSalaryAsvcOnlyTest._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 85)
- `OwnerSalaryAsvcOnlyTest._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 100)
- `OwnerSalaryAsvcOnlyTest._todaydef _today() -> str: return datetime.now(timezone.utc).strftime("%d.%m.%Y")` (стр. 104)
- `OwnerSalaryAsvcOnlyTest._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client from app.schemas import normalize_phone client_id = f"c-{uuid4().he` (стр. 107)
- `OwnerSalaryAsvcOnlyTest.test_owner_salary_detail_includes_asvc_only_workerdef test_owner_salary_detail_includes_asvc_only_worker(self) -> None: """Owner should see earnings for worker assigned ONLY to additional service.""" client_id, client_phone = self` (стр. 127)

### backend/tests/test_payroll_date_migration.py (179 строк)

Классы и функции (10):

- `_local_noon_utcdef _local_noon_utc(year: int, month: int, day: int) -> datetime: """Полдень указанного дня по локальному времени, в UTC. Полдень гарантирует, что локальная дата проведения не смес` (стр. 28)
- `_entrydef _entry( entry_id: str, kind: str, created_at: datetime, entry_date: str | None, *, expense_id: str | None = None, income_id: str | None = None,` (стр. 38)
- `_populatedef _populate(engine) -> None: """Фикстуры: 2026-08-31 = понедельник, 04.09.2026 = пятница, 14.08.2026 = пятница, 31.08.2026 = конец месяца.""" with Session(engine) as db: # 1) Вып` (стр. 62)
- `migration_enginedef migration_engine(): engine = create_engine("sqlite:///:memory:") Base.metadata.create_all(engine) try: yield engine finally: engine.dispose()` (стр. 92)
- `_get_entrydef _get_entry(engine, entry_id: str) -> PayrollEntry: with Session(engine) as db: return db.scalar(select(PayrollEntry).where(PayrollEntry.id == entry_id))` (стр. 101)
- `_get_expensedef _get_expense(engine, expense_id: str) -> Expense: with Session(engine) as db: return db.get(Expense, expense_id)` (стр. 106)
- `_get_incomedef _get_income(engine, income_id: str) -> Income: with Session(engine) as db: return db.get(Income, income_id)` (стр. 111)
- `test_dry_run_reports_plan_without_changesdef test_dry_run_reports_plan_without_changes(migration_engine) -> None: _populate(migration_engine) report, moves, mirror_moves = plan(migration_engine) move_ids = {entry_id for e` (стр. 116)
- `test_apply_migrates_legacy_dates_and_mirrorsdef test_apply_migrates_legacy_dates_and_mirrors(migration_engine) -> None: _populate(migration_engine) report = upgrade(dry_run=False, engine=migration_engine) assert report[0].st` (стр. 141)
- `test_apply_is_idempotentdef test_apply_is_idempotent(migration_engine) -> None: _populate(migration_engine) first = upgrade(dry_run=False, engine=migration_engine) second = upgrade(dry_run=False, engine=m` (стр. 169)

### backend/tests/test_performance_wave3.py (218 строк)

Классы и функции (14):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 34)
- `class PerformanceIndexesTests(unittest.TestCase):` (стр. 60)
- `PerformanceIndexesTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 64)
- `PerformanceIndexesTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 86)
- `PerformanceIndexesTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 92)
- `PerformanceIndexesTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 101)
- `PerformanceIndexesTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = {"admin": self.ADMIN_TG_ID` (стр. 110)
- `PerformanceIndexesTests.test_performance_indexes_existdef test_performance_indexes_exist(self) -> None: from app.database import engine from sqlalchemy import inspect inspector = inspect(engine) missing: list[str] = [] for table, name` (стр. 123)
- `PerformanceIndexesTests.test_status_deleted_index_is_useddef test_status_deleted_index_is_used(self) -> None: from app.database import engine from sqlalchemy import text with engine.connect() as connection: plan = " ".join( str(row) for ` (стр. 136)
- `PerformanceIndexesTests.next_active_datedef next_active_date(offset_days: int = 1) -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) found = 0 day = candidate while True: day = day + t` (стр. 152)
- `PerformanceIndexesTests.create_bookingdef create_booking(self, day_offset: int, hour: int) -> dict: response = self.client.post( "/api/bookings", headers={"Authorization": self.admin_token}, json={ "clientId": "", "cli` (стр. 165)
- `PerformanceIndexesTests.historydef history(self, **params: object) -> list: query = urllib.parse.urlencode({k: v for k, v in params.items()}) response = self.client.get( f"/api/owner/bookings-history?{query}" if` (стр. 190)
- `PerformanceIndexesTests.test_bookings_history_offset_pagesdef test_bookings_history_offset_pages(self) -> None: for position in range(1, 4):` (стр. 199)

### backend/tests/test_piggy_bank_adjust.py (231 строк)

Классы и функции (18):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 23)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 34)
- `class PiggyBankAdjustTests(unittest.TestCase):` (стр. 39)
- `PiggyBankAdjustTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 43)
- `PiggyBankAdjustTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 70)
- `PiggyBankAdjustTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = d` (стр. 87)
- `PiggyBankAdjustTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `PiggyBankAdjustTests._adjustdef _adjust(self, resource_group: str, amount: float, **extra) -> dict: payload = {"resourceGroup": resource_group, "amount": amount} payload.update(extra) response = self.client.p` (стр. 105)
- `PiggyBankAdjustTests._piggy_bankdef _piggy_bank(self) -> dict: response = self.client.get( "/api/owner/piggy-bank", headers=self._auth_headers(self.owner_token), ) self.assertEqual(response.status_code, 200, resp` (стр. 116)
- `PiggyBankAdjustTests.test_adjust_detailing_positive_deltadef test_adjust_detailing_positive_delta(self) -> None: before = self._piggy_bank() tx = self._adjust("detailing", 5000, purpose="Дополнили копилку") self.assertEqual(tx["transacti` (стр. 128)
- `PiggyBankAdjustTests.test_adjust_detailing_negative_deltadef test_adjust_detailing_negative_delta(self) -> None: before = self._piggy_bank() self._adjust("detailing", 3000) self._adjust("detailing", -1000) after = self._piggy_bank() self` (стр. 148)
- `PiggyBankAdjustTests.test_adjust_wash_deltadef test_adjust_wash_delta(self) -> None: before = self._piggy_bank() self._adjust("wash", 7000) after = self._piggy_bank() self.assertEqual( after["remainingInPiggyBank"], before[` (стр. 160)
- `PiggyBankAdjustTests.test_adjust_general_deltadef test_adjust_general_delta(self) -> None: before = self._piggy_bank() self._adjust("general", 2500) after = self._piggy_bank() self.assertEqual(after["balance"], before["balance` (стр. 176)
- `PiggyBankAdjustTests.test_zero_amount_rejecteddef test_zero_amount_rejected(self) -> None: response = self.client.post( "/api/owner/piggy-bank/adjust", headers=self._auth_headers(self.owner_token), json={"resourceGroup": "wash` (стр. 186)
- `PiggyBankAdjustTests.test_invalid_resource_group_rejecteddef test_invalid_resource_group_rejected(self) -> None: response = self.client.post( "/api/owner/piggy-bank/adjust", headers=self._auth_headers(self.owner_token), json={"resourceGr` (стр. 194)
- `PiggyBankAdjustTests.test_invalid_date_rejecteddef test_invalid_date_rejected(self) -> None: response = self.client.post( "/api/owner/piggy-bank/adjust", headers=self._auth_headers(self.owner_token), json={"resourceGroup": "was` (стр. 202)
- `PiggyBankAdjustTests.test_worker_forbiddendef test_worker_forbidden(self) -> None: response = self.client.post( "/api/owner/piggy-bank/adjust", headers=self._auth_headers(self.worker_token), json={"resourceGroup": "wash", ` (стр. 210)
- `PiggyBankAdjustTests.test_adjust_appears_in_transactions_historydef test_adjust_appears_in_transactions_history(self) -> None: self._adjust("detailing", 1500, purpose="Ручная правка") data = self._piggy_bank() adjust_txs = [ t for t in data["tr` (стр. 218)

### backend/tests/test_piggy_bank_withdraw_flex.py (669 строк)

Классы и функции (27):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 33)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 44)
- `class PiggyBankWithdrawFlexTests(unittest.TestCase):` (стр. 49)
- `PiggyBankWithdrawFlexTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 53)
- `PiggyBankWithdrawFlexTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 80)
- `PiggyBankWithdrawFlexTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: owner = d` (стр. 97)
- `PiggyBankWithdrawFlexTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 112)
- `PiggyBankWithdrawFlexTests._withdrawdef _withdraw(self, **payload) -> tuple[int, dict]: response = self.client.post( "/api/owner/piggy-bank/withdraw", headers=self._auth_headers(self.owner_token), json=payload, ) ret` (стр. 115)
- `PiggyBankWithdrawFlexTests._piggy_bankdef _piggy_bank(self) -> dict: response = self.client.get( "/api/owner/piggy-bank", headers=self._auth_headers(self.owner_token), ) self.assertEqual(response.status_code, 200, resp` (стр. 125)
- `PiggyBankWithdrawFlexTests._create_booking_with_servicedef _create_booking_with_service(self, resource_group: str = "wash") -> str: """Insert Client + Service + Booking directly; return booking id.""" from app.database import SessionLo` (стр. 133)
- `PiggyBankWithdrawFlexTests.test_withdraw_without_booking_from_detailingdef test_withdraw_without_booking_from_detailing(self) -> None: before = self._piggy_bank() status_code, tx = self._withdraw( resourceGroup="detailing", materialName="Пленка PPF", ` (стр. 180)
- `PiggyBankWithdrawFlexTests.test_withdraw_other_kind_creates_other_expensedef test_withdraw_other_kind_creates_other_expense(self) -> None: before = self._piggy_bank() status_code, tx = self._withdraw( resourceGroup="wash", materialName="Ремонт пылесоса"` (стр. 200)
- `PiggyBankWithdrawFlexTests.test_piggy_source_creates_no_payroll_entriesdef test_piggy_source_creates_no_payroll_entries(self) -> None: """Снятие из копилки не должно трогать зарплату (без удержаний).""" from app.database import SessionLocal from app.m` (стр. 234)
- `PiggyBankWithdrawFlexTests.test_own_money_expense_compensates_in_salarydef test_own_money_expense_compensates_in_salary(self) -> None: """Свои деньги: расход бюджета + компенсация (bonus) в ЗП, копилка не трогается. Без «кто взял» компенсация уходит т` (стр. 258)
- `PiggyBankWithdrawFlexTests.test_own_money_without_person_returns_consistent_responsedef test_own_money_without_person_returns_consistent_response(self) -> None: """Свои деньги: ответ консистентен (компенсация уходит actor-fallback'у).""" status_code, tx = self._wi` (стр. 321)
- `PiggyBankWithdrawFlexTests.test_custom_expense_category_honoreddef test_custom_expense_category_honored(self) -> None: from app.database import SessionLocal from app.models import Expense from sqlalchemy import select status_code, _ = self._wi` (стр. 333)
- `PiggyBankWithdrawFlexTests.test_own_money_expense_edit_updates_compensationdef test_own_money_expense_edit_updates_compensation(self) -> None: """Правка расхода обновляет и компенсацию (PATCH /api/expenses/{id}).""" from app.database import SessionLocal f` (стр. 356)
- `PiggyBankWithdrawFlexTests.test_withdraw_other_default_purposedef test_withdraw_other_default_purpose(self) -> None: status_code, tx = self._withdraw( resourceGroup="detailing", materialName="Химия для химчистки", materialCost=1200, date="12.` (стр. 391)
- `PiggyBankWithdrawFlexTests.test_without_target_rejecteddef test_without_target_rejected(self) -> None: status_code, body = self._withdraw( materialName="Что-то", materialCost=500, date="13.08.2026", ) self.assertEqual(status_code, 400)` (стр. 402)
- `PiggyBankWithdrawFlexTests.test_invalid_resource_group_rejecteddef test_invalid_resource_group_rejected(self) -> None: status_code, _ = self._withdraw( resourceGroup="carwash", materialName="Что-то", materialCost=500, date="13.08.2026", ) self` (стр. 411)
- `PiggyBankWithdrawFlexTests.test_worker_forbiddendef test_worker_forbidden(self) -> None: response = self.client.post( "/api/owner/piggy-bank/withdraw", headers=self._auth_headers(self.worker_token), json={ "resourceGroup": "wash` (стр. 420)
- `PiggyBankWithdrawFlexTests.test_legacy_withdraw_with_booking_resolves_bucketdef test_legacy_withdraw_with_booking_resolves_bucket(self) -> None: booking_id = self._create_booking_with_service(resource_group="wash") status_code, tx = self._withdraw( booking` (стр. 437)
- `PiggyBankWithdrawFlexTests.test_piggy_export_endpoint_returns_xlsxdef test_piggy_export_endpoint_returns_xlsx(self) -> None: self._withdraw( resourceGroup="detailing", materialName="Полироль", materialCost=900, purpose="Экспорт-тест", date="15.08` (стр. 455)
- `PiggyBankWithdrawFlexTests.test_piggy_export_comparison_sheetsdef test_piggy_export_comparison_sheets(self) -> None: # 15.08.2026 и 05.09.2026 — субботы: начало финансовой недели (сб–пт) self._withdraw( resourceGroup="wash", materialName="Хим` (стр. 485)
- `PiggyBankWithdrawFlexTests.test_piggy_export_resource_group_filterdef test_piggy_export_resource_group_filter(self) -> None: # Только копилка мойки: детейлинг-операции не попадают в отчёт self._withdraw( resourceGroup="wash", materialName="Химия"` (стр. 586)
- `PiggyBankWithdrawFlexTests.test_owner_report_contains_piggy_sheetdef test_owner_report_contains_piggy_sheet(self) -> None: self._withdraw( resourceGroup="detailing", materialName="Аппликатор", materialCost=400, purpose="Лист копилки", date="16.0` (стр. 636)
- `PiggyBankWithdrawFlexTests.test_piggy_export_forbidden_for_workerdef test_piggy_export_forbidden_for_worker(self) -> None: response = self.client.get( "/api/owner/exports/piggy-bank", headers=self._auth_headers(self.worker_token), ) self.assertE` (стр. 660)

### backend/tests/test_security_hardening.py (66 строк)

Классы и функции (6):

- `_signed_init_datadef _signed_init_data(*, user: object, auth_date: int | None = None) -> str: pairs = { "auth_date": str(int(time.time()) if auth_date is None else auth_date), "query_id": "query", ` (стр. 15)
- `test_accepts_valid_user_with_short_configurable_ttldef test_accepts_valid_user_with_short_configurable_ttl() -> None: result = validate_telegram_init_data( _signed_init_data(user={"id": 123456789}), BOT_TOKEN, max_age_seconds=300, ` (стр. 27)
- `test_rejects_duplicate_query_keysdef test_rejects_duplicate_query_keys() -> None: init_data = _signed_init_data(user={"id": 123456789}) with pytest.raises(ValueError, match="duplicate keys"):` (стр. 38)
- `test_rejects_invalid_user_structuredef test_rejects_invalid_user_structure(user: object) -> None: with pytest.raises(ValueError, match="user"):` (стр. 46)
- `test_rejects_future_auth_date_beyond_skewdef test_rejects_future_auth_date_beyond_skew() -> None: with pytest.raises(ValueError, match="auth_date"):` (стр. 51)
- `test_rejects_expired_init_data_using_configured_ttldef test_rejects_expired_init_data_using_configured_ttl() -> None: with pytest.raises(ValueError, match="expired"):` (стр. 60)

### backend/tests/test_subtract_fits_net.py (199 строк)

Классы и функции (16):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 34)
- `class SubtractFitsNetTests(unittest.TestCase):` (стр. 38)
- `SubtractFitsNetTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 42)
- `SubtractFitsNetTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 64)
- `SubtractFitsNetTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 70)
- `SubtractFitsNetTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 79)
- `SubtractFitsNetTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select mapping = {"admin": self.ADMIN_TG_ID` (стр. 88)
- `SubtractFitsNetTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 102)
- `SubtractFitsNetTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 106)
- `SubtractFitsNetTests.create_bookingdef create_booking(self, price: int) -> dict: response = self.client.post( "/api/bookings", headers=self.auth_headers(self.admin_token), json={ "clientId": "", "clientName": "Subtr` (стр. 114)
- `SubtractFitsNetTests.add_subtractdef add_subtract(self, booking_id: str, price: int): return self.client.post( f"/api/bookings/{booking_id}/additional-services", headers=self.auth_headers(self.admin_token), json={` (стр. 139)
- `SubtractFitsNetTests.test_add_subtract_bigger_than_net_returns_400def test_add_subtract_bigger_than_net_returns_400(self) -> None: booking = self.create_booking(100) response = self.add_subtract(booking["id"], 900) self.assertEqual(response.statu` (стр. 155)
- `SubtractFitsNetTests.test_add_subtract_within_net_worksdef test_add_subtract_within_net_works(self) -> None: booking = self.create_booking(5000) response = self.add_subtract(booking["id"], 900) self.assertEqual(response.status_code, 20` (стр. 161)
- `SubtractFitsNetTests.test_update_subtract_beyond_net_returns_400def test_update_subtract_beyond_net_returns_400(self) -> None: booking = self.create_booking(5000) response = self.add_subtract(booking["id"], 900) self.assertEqual(response.status` (стр. 166)
- `SubtractFitsNetTests.test_piggy_deposits_never_exceed_checkdef test_piggy_deposits_never_exceed_check(self) -> None: booking = self.create_booking(5000) response = self.add_subtract(booking["id"], 900) self.assertEqual(response.status_code` (стр. 178)

### backend/tests/test_upload_security.py (88 строк)

Классы и функции (14):

- `class FakeDb: def __init__(self, *, fail_commit: bool = False) -> None: self.fail_commit = fail_commit self.added = [] s` (стр. 14)
- `FakeDb.__init__def __init__(self, *, fail_commit: bool = False) -> None: self.fail_commit = fail_commit self.added = [] self.rolled_back = False` (стр. 15)
- `FakeDb.adddef add(self, value) -> None: self.added.append(value)` (стр. 20)
- `FakeDb.commitdef commit(self) -> None: if self.fail_commit: raise RuntimeError("db failure")` (стр. 23)
- `FakeDb.rollbackdef rollback(self) -> None: self.rolled_back = True` (стр. 27)
- `FakeDb.getdef get(self, model, key): return None` (стр. 30)
- `uploaddef upload(name: str, content: bytes, content_type: str = "application/octet-stream") -> UploadFile: return UploadFile(file=BytesIO(content), filename=name, headers={"content-type"` (стр. 34)
- `run_uploaddef run_upload(monkeypatch, tmp_path: Path, file: UploadFile, *, limit: int = 1024, fail_commit: bool = False): monkeypatch.setattr(main, "UPLOAD_DIR", tmp_path) monkeypatch.setatt` (стр. 38)
- `test_valid_png_is_saved_with_server_mimedef test_valid_png_is_saved_with_server_mime(monkeypatch, tmp_path) -> None: payload = b"\x89PNG\r\n\x1a\n" + b"valid-image-data" result, db = run_upload(monkeypatch, tmp_path, upl` (стр. 46)
- `test_oversize_upload_is_rejected_and_cleaneddef test_oversize_upload_is_rejected_and_cleaned(monkeypatch, tmp_path) -> None: with pytest.raises(HTTPException) as exc: run_upload(monkeypatch, tmp_path, upload("large.png", b"\` (стр. 57)
- `test_spoofed_extension_is_rejecteddef test_spoofed_extension_is_rejected(monkeypatch, tmp_path) -> None: with pytest.raises(HTTPException) as exc: run_upload(monkeypatch, tmp_path, upload("fake.png", b"GIF89a-conte` (стр. 64)
- `test_svg_is_rejecteddef test_svg_is_rejected(monkeypatch, tmp_path) -> None: with pytest.raises(HTTPException) as exc: run_upload(monkeypatch, tmp_path, upload("image.svg", b"<svg></svg>", "image/svg+` (стр. 71)
- `test_db_failure_removes_final_and_temp_filesdef test_db_failure_removes_final_and_temp_files(monkeypatch, tmp_path) -> None: with pytest.raises(RuntimeError, match="db failure"):` (стр. 78)
- `test_upload_headers_are_safedef test_upload_headers_are_safe() -> None: headers = main._upload_headers("safe.png") assert headers["X-Content-Type-Options"] == "nosniff" assert headers["Content-Disposition"] =` (стр. 84)

### backend/tests/test_wallet_query_budget.py (126 строк)

Классы и функции (10):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 24)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 36)
- `class WalletQueryBudgetTests(unittest.TestCase):` (стр. 40)
- `WalletQueryBudgetTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 43)
- `WalletQueryBudgetTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 64)
- `WalletQueryBudgetTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 70)
- `WalletQueryBudgetTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 79)
- `WalletQueryBudgetTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: staff = d` (стр. 88)
- `WalletQueryBudgetTests.test_wallet_query_count_within_budgetdef test_wallet_query_count_within_budget(self) -> None: from app.database import engine counter = {"count": 0} def before_cursor_execute(conn, cursor, statement, parameters, conte` (стр. 100)
- `WalletQueryBudgetTests.before_cursor_executedef before_cursor_execute(conn, cursor, statement, parameters, context, executemany): counter["count"] += 1` (стр. 105)

### backend/tests/test_worker_additional_services.py (278 строк)

Классы и функции (17):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 25)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 37)
- `class WorkerAdditionalServiceTests(unittest.TestCase):` (стр. 42)
- `WorkerAdditionalServiceTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 48)
- `WorkerAdditionalServiceTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 75)
- `WorkerAdditionalServiceTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 92)
- `WorkerAdditionalServiceTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 107)
- `WorkerAdditionalServiceTests._todaydef _today() -> str: return datetime.now(timezone.utc).strftime("%d.%m.%Y")` (стр. 111)
- `WorkerAdditionalServiceTests._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" phone = f"+7 (999) 000-{str(uui` (стр. 114)
- `WorkerAdditionalServiceTests._create_bookingdef _create_booking( self, *, main_worker_id: str = "w2", status: str = "new", date: str | None = None,` (стр. 133)
- `WorkerAdditionalServiceTests._add_additional_servicedef _add_additional_service( self, booking_id: str, *, name: str = "Полировка", price: int = 2000, percent: int = 50` (стр. 166)
- `WorkerAdditionalServiceTests._worker_bootstrapdef _worker_bootstrap(self) -> dict: response = self.client.get( "/api/auth/session", headers=self._auth_headers(self.worker_token) ) self.assertEqual(response.status_code, 200, re` (стр. 184)
- `WorkerAdditionalServiceTests.test_worker_sees_booking_with_only_additional_service_in_bootstrapdef test_worker_sees_booking_with_only_additional_service_in_bootstrap(self) -> None: booking_id = self._create_booking(main_worker_id="w2") payload = self._add_additional_service(` (стр. 195)
- `WorkerAdditionalServiceTests.test_worker_without_links_does_not_see_bookingdef test_worker_without_links_does_not_see_booking(self) -> None: booking_id = self._create_booking(main_worker_id="w2") bootstrap = self._worker_bootstrap() ids = {item["id"] for ` (стр. 218)
- `WorkerAdditionalServiceTests.test_worker_salary_detail_includes_additional_service_earningsdef test_worker_salary_detail_includes_additional_service_earnings(self) -> None: booking_id = self._create_booking(main_worker_id="w2", status="completed") self._add_additional_se` (стр. 225)
- `WorkerAdditionalServiceTests.test_creating_additional_service_notifies_assigned_workerdef test_creating_additional_service_notifies_assigned_worker(self) -> None: """При создании доп. услуги назначенному мастеру приходит уведомление (in-app + Telegram), как при назн` (стр. 242)
- `WorkerAdditionalServiceTests.fake_send_telegram_messagedef fake_send_telegram_message(chat_id: str | None, text: str) -> None: telegram_calls.append((chat_id, text))` (стр. 251)

### backend/tests/test_worker_calendar.py (226 строк)

Классы и функции (15):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 24)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 36)
- `class WorkerCalendarTests(unittest.TestCase):` (стр. 41)
- `WorkerCalendarTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 47)
- `WorkerCalendarTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 74)
- `WorkerCalendarTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 91)
- `WorkerCalendarTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 106)
- `WorkerCalendarTests._next_active_datedef _next_active_date() -> str: candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 110)
- `WorkerCalendarTests._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" phone = f"+7 (999) 000-{str(uui` (стр. 118)
- `WorkerCalendarTests._create_bookingdef _create_booking(self, *, worker_id: str = "w2", status: str = "new", time: str = "10:00") -> str: client_id, client_phone = self._create_client() response = self.client.post( "` (стр. 137)
- `WorkerCalendarTests.test_worker_sees_bookings_of_other_workersdef test_worker_sees_bookings_of_other_workers(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/calendar", headers=self._au` (стр. 168)
- `WorkerCalendarTests.test_worker_calendar_omits_sensitive_fieldsdef test_worker_calendar_omits_sensitive_fields(self) -> None: self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/calendar", headers=self._auth_headers(s` (стр. 181)
- `WorkerCalendarTests.test_worker_calendar_excludes_cancelled_bookingsdef test_worker_calendar_excludes_cancelled_bookings(self) -> None: active_id = self._create_booking(worker_id="w2") cancel_response = self.client.patch( f"/api/bookings/{active_id` (стр. 194)
- `WorkerCalendarTests.test_worker_calendar_forbidden_for_ownerdef test_worker_calendar_forbidden_for_owner(self) -> None: response = self.client.get( "/api/worker/calendar", headers=self._auth_headers(self.owner_token), ) self.assertEqual(res` (стр. 213)
- `WorkerCalendarTests.test_worker_calendar_forbidden_without_authdef test_worker_calendar_forbidden_without_auth(self) -> None: response = self.client.get("/api/worker/calendar") self.assertEqual(response.status_code, 401, response.text)` (стр. 220)

### backend/tests/test_worker_car_search.py (363 строк)

Классы и функции (23):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 26)
- `build_init_datadef build_init_data(telegram_id: str) -> str: """Build Telegram init data that passes insecure validation (no HMAC).""" return urllib.parse.urlencode({"user": json.dumps({"id": int` (стр. 37)
- `class WorkerCarSearchTests(unittest.TestCase):` (стр. 42)
- `WorkerCarSearchTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 48)
- `WorkerCarSearchTests.tearDowndef tearDown(self) -> None: if hasattr(self, "client_manager"):` (стр. 75)
- `WorkerCarSearchTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: ivan = db` (стр. 92)
- `WorkerCarSearchTests._auth_headersdef _auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 107)
- `WorkerCarSearchTests._next_active_datedef _next_active_date() -> str: candidate = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 111)
- `WorkerCarSearchTests._today_labeldef _today_label() -> str: return datetime.now().astimezone().strftime("%d.%m.%Y")` (стр. 120)
- `WorkerCarSearchTests._create_clientdef _create_client(self) -> tuple[str, str]: from app.database import SessionLocal from app.models import Client client_id = f"c-{uuid4().hex[:12]}" phone = f"+7 (999) 000-{str(uui` (стр. 123)
- `WorkerCarSearchTests._create_bookingdef _create_booking(self, *, worker_id: str = "w2", status: str = "new", time: str = "10:00") -> str: client_id, client_phone = self._create_client() response = self.client.post( "` (стр. 142)
- `WorkerCarSearchTests._create_booking_directdef _create_booking_direct( self, *, date: str, plate: str = "M001AA", car: str = "BMW", client_name: str = "Тест Клиент", status: str = "new", worker_id: str = "w2",` (стр. 169)
- `WorkerCarSearchTests.test_worker_searches_by_plate_case_insensitivedef test_worker_searches_by_plate_case_insensitive(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=s` (стр. 230)
- `WorkerCarSearchTests.test_worker_searches_by_plate_with_spaces_and_dashesdef test_worker_searches_by_plate_with_spaces_and_dashes(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", hea` (стр. 242)
- `WorkerCarSearchTests.test_worker_searches_by_car_modeldef test_worker_searches_by_car_model(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_hea` (стр. 254)
- `WorkerCarSearchTests.test_worker_searches_by_client_namedef test_worker_searches_by_client_name(self) -> None: booking_id = self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_h` (стр. 266)
- `WorkerCarSearchTests.test_worker_search_no_match_returns_empty_listdef test_worker_search_no_match_returns_empty_list(self) -> None: self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_hea` (стр. 278)
- `WorkerCarSearchTests.test_worker_search_empty_query_returns_today_onlydef test_worker_search_empty_query_returns_today_only(self) -> None: today_id = self._create_booking_direct(date=self._today_label()) tomorrow = (datetime.now().astimezone() + time` (стр. 289)
- `WorkerCarSearchTests.test_worker_search_respects_date_paramdef test_worker_search_respects_date_param(self) -> None: tomorrow = (datetime.now().astimezone() + timedelta(days=1)).strftime("%d.%m.%Y") future_id = self._create_booking_direct(` (стр. 303)
- `WorkerCarSearchTests.test_worker_search_excludes_cancelleddef test_worker_search_excludes_cancelled(self) -> None: active_id = self._create_booking(worker_id="w2") cancel_response = self.client.patch( f"/api/bookings/{active_id}", headers` (стр. 316)
- `WorkerCarSearchTests.test_worker_search_reports_workers_on_bookingdef test_worker_search_reports_workers_on_booking(self) -> None: self._create_booking(worker_id="w2") response = self.client.get( "/api/worker/cars/search", headers=self._auth_head` (стр. 336)
- `WorkerCarSearchTests.test_worker_search_forbidden_for_ownerdef test_worker_search_forbidden_for_owner(self) -> None: response = self.client.get( "/api/worker/cars/search", headers=self._auth_headers(self.owner_token), params={"q": "M001AA"` (стр. 349)
- `WorkerCarSearchTests.test_worker_search_forbidden_without_authdef test_worker_search_forbidden_without_auth(self) -> None: response = self.client.get("/api/worker/cars/search", params={"q": "M001AA"}) self.assertEqual(response.status_code, 40` (стр. 357)

### backend/tests/test_worker_percent_cap.py (218 строк)

Классы и функции (17):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 22)
- `build_init_datadef build_init_data(telegram_id: str) -> str: return urllib.parse.urlencode({"user": json.dumps({"id": int(telegram_id)})})` (стр. 34)
- `class WorkerPercentCapTests(unittest.TestCase):` (стр. 38)
- `WorkerPercentCapTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 41)
- `WorkerPercentCapTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 62)
- `WorkerPercentCapTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 68)
- `WorkerPercentCapTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 77)
- `WorkerPercentCapTests._set_staff_telegram_idsdef _set_staff_telegram_ids(self) -> None: from app.database import SessionLocal from app.models import StaffUser from sqlalchemy import select with SessionLocal() as db: staff = d` (стр. 86)
- `WorkerPercentCapTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 99)
- `WorkerPercentCapTests.next_active_datedef next_active_date() -> str: candidate = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) for offset in range(1, 8):` (стр. 103)
- `WorkerPercentCapTests.create_bookingdef create_booking(self, workers: list[dict]): return self.client.post( "/api/bookings", headers=self.auth_headers(self.admin_token), json={ "clientId": "", "clientName": "Percent ` (стр. 111)
- `WorkerPercentCapTests.two_hundred_percent_crewdef two_hundred_percent_crew(self) -> list[dict]: return [ {"workerId": "w1", "workerName": "Иван", "percent": 100}, {"workerId": "w2", "workerName": "Пётр", "percent": 100}, ]` (стр. 134)
- `WorkerPercentCapTests.test_create_booking_with_percent_sum_over_100_returns_400def test_create_booking_with_percent_sum_over_100_returns_400(self) -> None: response = self.create_booking(self.two_hundred_percent_crew()) self.assertEqual(response.status_code, ` (стр. 140)
- `WorkerPercentCapTests.test_create_booking_with_percent_sum_100_worksdef test_create_booking_with_percent_sum_100_works(self) -> None: response = self.create_booking([ {"workerId": "w1", "workerName": "Иван", "percent": 60}, {"workerId": "w2", "work` (стр. 145)
- `WorkerPercentCapTests.test_patch_booking_workers_over_100_returns_400def test_patch_booking_workers_over_100_returns_400(self) -> None: response = self.create_booking([ {"workerId": "w1", "workerName": "Иван", "percent": 50}, ]) self.assertEqual(res` (стр. 152)
- `WorkerPercentCapTests.test_add_service_with_percent_sum_over_100_returns_400def test_add_service_with_percent_sum_over_100_returns_400(self) -> None: response = self.create_booking([ {"workerId": "w1", "workerName": "Иван", "percent": 50}, ]) self.assertEq` (стр. 165)
- `WorkerPercentCapTests.test_update_service_workers_over_100_returns_400def test_update_service_workers_over_100_returns_400(self) -> None: response = self.create_booking([ {"workerId": "w1", "workerName": "Иван", "percent": 50}, ]) self.assertEqual(re` (стр. 187)

## Frontend — CRM-минапп (frontend/src)

### frontend/src/app/api.ts (347 строк)

- `API_BASE_URL` (стр. 1) — локальный
- `getInitData` (стр. 76) — локальный
- `MOJIBAKE_ENCODINGS` (стр. 83) — локальный
- `encodeMapCache` (стр. 85) — локальный
- `getEncodeMap` (стр. 86) — локальный
- `cached` (стр. 87) — локальный
- `map` (стр. 89) — локальный
- `bytes` (стр. 91) — локальный
- `chars` (стр. 93) — локальный
- `ch` (стр. 95) — локальный
- `ch` (стр. 100) — локальный
- `encodeWith` (стр. 107) — локальный
- `map` (стр. 108) — локальный
- `out` (стр. 109) — локальный
- `b` (стр. 111) — локальный
- `decodeUtf8Strict` (стр. 118) — локальный
- `cyrCount` (стр. 126) — локальный
- `m` (стр. 127) — локальный
- `repairStep` (стр. 131) — локальный
- `variants` (стр. 132) — локальный
- `seen` (стр. 135) — локальный
- `bytes` (стр. 138) — локальный
- `fixed` (стр. 140) — локальный
- `repairMojibake` (стр. 150) — локальный
- `step` (стр. 154) — локальный
- `repairNested` (стр. 161) — локальный
- `getErrorDetail` (стр. 172) — локальный
- `payload` (стр. 175) — локальный
- `messages` (стр. 179) — локальный
- `field` (стр. 180) — локальный
- `msg` (стр. 181) — локальный
- `getDownloadFileName` (стр. 191) — локальный
- `disposition` (стр. 192) — локальный
- `utf8Match` (стр. 193) — локальный
- `plainMatch` (стр. 197) — локальный
- `getTelegramWebApp` (стр. 204)
- `getTelegramInitData` (стр. 208)
- `setupTelegramWebApp` (стр. 221)
- `tg` (стр. 222) — локальный
- `isDark` (стр. 243) — локальный
- `isInsideTelegram` (стр. 249)
- `apiRequest` (стр. 253)
- `initData` (стр. 260) — локальный
- `response` (стр. 265) — локальный
- `raw` (стр. 281) — локальный
- `apiDownload` (стр. 285)
- `initData` (стр. 287) — локальный
- `response` (стр. 292) — локальный
- `fileName` (стр. 301) — локальный
- `blob` (стр. 302) — локальный
- `objectUrl` (стр. 303) — локальный
- `anchor` (стр. 304) — локальный
- `apiUploadFile` (стр. 314)
- `initData` (стр. 315) — локальный
- `formData` (стр. 316) — локальный
- `response` (стр. 318) — локальный
- `apiBlobUrl` (стр. 329)
- `initData` (стр. 331) — локальный
- `response` (стр. 336) — локальный
- `blob` (стр. 345) — локальный

### frontend/src/app/App.tsx (764 строк)

- `ClientApp` (стр. 38) — локальный
- `AdminApp` (стр. 39) — локальный
- `WorkerApp` (стр. 40) — локальный
- `OwnerApp` (стр. 41) — локальный
- `NOOP` (стр. 51) — локальный
- `ConsentDialog` (стр. 53) — локальный
- `primary` (стр. 58) — локальный
- `sub` (стр. 59) — локальный
- `bg` (стр. 60) — локальный
- `text` (стр. 61) — локальный
- `handleAgree` (стр. 63) — локальный
- `WelcomeScreen` (стр. 287) — локальный
- `bg` (стр. 307) — локальный
- `text` (стр. 308) — локальный
- `sub` (стр. 309) — локальный
- `primary` (стр. 310) — локальный
- `glass` (стр. 311) — локальный
- `inputCls` (стр. 314) — локальный
- `validate` (стр. 316) — локальный
- `nameError` (стр. 318) — локальный
- `carError` (стр. 319) — локальный
- `plateError` (стр. 320) — локальный
- `handleClientSubmit` (стр. 329) — локальный
- `message` (стр. 340) — локальный
- `handleStaffLink` (стр. 345) — локальный
- `message` (стр. 351) — локальный
- `navRef` (стр. 356) — локальный
- `handleBack` (стр. 359) — локальный
- `AppContent` (стр. 633) — локальный
- `usePath` (стр. 719) — локальный
- `onPopState` (стр. 722) — локальный
- `LandingWrapper` (стр. 729) — локальный
- `App` (стр. 737)
- `path` (стр. 739) — локальный

### frontend/src/app/components/admin/AdminApp.tsx (3656 строк)

- `stockCategoryIdsWithDescendants` (стр. 54) — локальный
- `map` (стр. 55) — локальный
- `queue` (стр. 62) — локальный
- `visited` (стр. 63) — локальный
- `cur` (стр. 65) — локальный
- `children` (стр. 68) — локальный
- `SERVICE_TYPE_OPTIONS` (стр. 108) — локальный
- `adminServiceResourceGroupForCategory` (стр. 114) — локальный
- `DEFAULT_SHIFT_SUPPLIES` (стр. 126) — локальный
- `SHIFT_PHOTO_CATEGORIES` (стр. 132) — локальный
- `SHIFT_PHOTO_MAX_DIMENSION` (стр. 149) — локальный
- `SHIFT_PHOTO_TARGET_BYTES` (стр. 150) — локальный
- `SHIFT_PHOTO_MIN_QUALITY` (стр. 151) — локальный
- `STOCK_UNITS` (стр. 166) — локальный
- `isDetailingService` (стр. 167) — локальный
- `serviceResourceGroup` (стр. 171) — локальный
- `hasManualScheduling` (стр. 175) — локальный
- `bookingBoxesForService` (стр. 179) — локальный
- `bookingLocationLabel` (стр. 187) — локальный
- `parseBookingMinutes` (стр. 191) — локальный
- `match` (стр. 192) — локальный
- `hours` (стр. 194) — локальный
- `minutes` (стр. 195) — локальный
- `bookingBlocksBox` (стр. 200) — локальный
- `nextStart` (стр. 203) — локальный
- `existingStart` (стр. 204) — локальный
- `nextEnd` (стр. 206) — локальный
- `existingEnd` (стр. 207) — локальный
- `pickDefaultBookingBox` (стр. 211) — локальный
- `resourceGroup` (стр. 220) — локальный
- `preferred` (стр. 221) — локальный
- `fallback` (стр. 222) — локальный
- `candidates` (стр. 223) — локальный
- `paymentLabel` (стр. 228) — локальный
- `normalizePhoneSearchValue` (стр. 237) — локальный
- `bookingStatusRequiresScheduledSlot` (стр. 241) — локальный
- `numberInputValue` (стр. 245) — локальный
- `numberFromInput` (стр. 249) — локальный
- `toISODate` (стр. 253) — локальный
- `parsed` (стр. 254) — локальный
- `y` (стр. 256) — локальный
- `m` (стр. 257) — локальный
- `d` (стр. 258) — локальный
- `TIME_SLOTS` (стр. 262) — локальный
- `h` (стр. 263) — локальный
- `m` (стр. 264) — локальный
- `dataUrlApproxBytes` (стр. 268) — локальный
- `padding` (стр. 270) — локальный
- `loadImage` (стр. 274) — локальный
- `image` (стр. 276) — локальный
- `compressShiftPhoto` (стр. 283) — локальный
- `objectUrl` (стр. 284) — локальный
- `image` (стр. 286) — локальный
- `scale` (стр. 287) — локальный
- `width` (стр. 288) — локальный
- `height` (стр. 289) — локальный
- `canvas` (стр. 290) — локальный
- `context` (стр. 293) — локальный
- `AdminApp` (стр. 311)
- `parentCategories` (стр. 384) — локальный
- `selectableBookingDates` (стр. 465) — локальный
- `masterWorkers` (стр. 471) — локальный
- `selectedClient` (стр. 472) — локальный
- `normalizedClientSearchQuery` (стр. 473) — локальный
- `filteredClients` (стр. 476) — локальный
- `plates` (стр. 481) — локальный
- `selectedClientBookings` (стр. 489) — локальный
- `leftDate` (стр. 493) — локальный
- `rightDate` (стр. 494) — локальный
- `selectedClientFilteredBookings` (стр. 499) — локальный
- `svc` (стр. 501) — локальный
- `selectedClientVehicles` (стр. 505) — локальный
- `newBookingClientVehicles` (стр. 509) — локальный
- `client` (стр. 511) — локальный
- `selectedClientSpent` (стр. 517) — локальный
- `selectedClientCompletedCount` (стр. 520) — локальный
- `selectedClientUpcoming` (стр. 521) — локальный
- `selectedClientLastVisit` (стр. 522) — локальный
- `shiftSupplies` (стр. 523) — локальный
- `uploadedShiftPhotos` (стр. 528) — локальный
- `selectedService` (стр. 541) — локальный
- `defaultBoxForService` (стр. 559) — локальный
- `settingsBoxes` (стр. 571) — локальный
- `bookingFormBoxes` (стр. 572) — локальный
- `editBookingBoxes` (стр. 573) — локальный
- `newBookingLocationLabel` (стр. 576) — локальный
- `editBookingLocationLabel` (стр. 577) — локальный
- `modalMaxHeight` (стр. 629) — локальный
- `vv` (стр. 633) — локальный
- `handler` (стр. 635) — локальный
- `el` (стр. 636) — локальный
- `staffRoleTitle` (стр. 649) — локальный
- `staffNotificationsRole` (стр. 650) — локальный
- `adminNotifications` (стр. 651) — локальный
- `unreadCount` (стр. 656) — локальный
- `todayBookings` (стр. 657) — локальный
- `completedAll` (стр. 658) — локальный
- `totalRevenue` (стр. 659) — локальный
- `glass` (стр. 661) — локальный
- `bg` (стр. 662) — локальный
- `text` (стр. 663) — локальный
- `sub` (стр. 664) — локальный
- `primary` (стр. 665) — локальный
- `accent` (стр. 666) — локальный
- `surface` (стр. 667) — локальный
- `inputCls` (стр. 668) — локальный
- `selectCls` (стр. 669) — локальный
- `timeToMinutes` (стр. 670) — локальный
- `match` (стр. 671) — локальный
- `hours` (стр. 673) — локальный
- `minutes` (стр. 674) — локальный
- `byService` (стр. 680) — локальный
- `byStatus` (стр. 686) — локальный
- `byPayment` (стр. 697) — локальный
- `workerStats` (стр. 704) — локальный
- `bw` (стр. 708) — локальный
- `avgCheck` (стр. 715) — локальный
- `conversionRate` (стр. 716) — локальный
- `scheduleSummary` (стр. 717) — локальный
- `revenueData` (стр. 718) — локальный
- `formatted` (стр. 719) — локальный
- `hourData` (стр. 725) — локальный
- `handleStatusChange` (стр. 729) — локальный
- `target` (стр. 730) — локальный
- `statusNeedsSlot` (стр. 731) — локальный
- `handleDeleteClient` (стр. 743) — локальный
- `confirmed` (стр. 744) — локальный
- `handleCreateClient` (стр. 749) — локальный
- `nameError` (стр. 751) — локальный
- `phoneError` (стр. 755) — локальный
- `carError` (стр. 759) — локальный
- `plateError` (стр. 763) — локальный
- `created` (стр. 771) — локальный
- `handleSaveClientCard` (стр. 793) — локальный
- `draft` (стр. 794) — локальный
- `handleShiftPhotoChange` (стр. 808) — локальный
- `file` (стр. 809) — локальный
- `dataUrl` (стр. 813) — локальный
- `handleSubmitShiftInspection` (стр. 825) — локальный
- `primaryPhoto` (стр. 829) — локальный
- `uploadedCategoriesLabel` (стр. 836) — локальный
- `composedNote` (стр. 837) — локальный
- `saved` (стр. 841) — локальный
- `validateClientName` (стр. 858) — локальный
- `validateClientPhone` (стр. 862) — локальный
- `validateBookingDate` (стр. 866) — локальный
- `parsedDate` (стр. 868) — локальный
- `scheduleDay` (стр. 873) — локальный
- `normalizedTime` (стр. 878) — локальный
- `slotStart` (стр. 879) — локальный
- `openMinutes` (стр. 888) — локальный
- `closeMinutes` (стр. 889) — локальный
- `slotEnd` (стр. 890) — локальный
- `validateBookingDateForEdit` (стр. 900) — локальный
- `parsedDate` (стр. 902) — локальный
- `scheduleDay` (стр. 907) — локальный
- `normalizedTime` (стр. 912) — локальный
- `slotStart` (стр. 913) — локальный
- `openMinutes` (стр. 919) — локальный
- `closeMinutes` (стр. 920) — локальный
- `slotEnd` (стр. 921) — локальный
- `validateBookingDateTimeFormat` (стр. 931) — локальный
- `parsedDate` (стр. 933) — локальный
- `validateNewBookingForm` (стр. 946) — локальный
- `selectedService` (стр. 948) — локальный
- `nameError` (стр. 950) — локальный
- `phoneError` (стр. 954) — локальный
- `carError` (стр. 958) — локальный
- `plateError` (стр. 962) — локальный
- `hasDate` (стр. 965) — локальный
- `hasTime` (стр. 966) — локальный
- `requiresScheduledSlot` (стр. 967) — локальный
- `validation` (стр. 984) — локальный
- `resetNewBookingDraft` (стр. 994) — локальный
- `openNewBookingModal` (стр. 1024) — локальный
- `openAdditionalServiceModal` (стр. 1029) — локальный
- `openNewBookingForClient` (стр. 1038) — локальный
- `historyDate` (стр. 1040) — локальный
- `clientVehicles` (стр. 1042) — локальный
- `mainVehicle` (стр. 1044) — локальный
- `hasPriorVisits` (стр. 1045) — локальный
- `closeNewBookingModal` (стр. 1063) — локальный
- `handleAddService` (стр. 1068) — локальный
- `svc` (стр. 1073) — локальный
- `workersList` (стр. 1074) — локальный
- `worker` (стр. 1075) — локальный
- `updatedBooking` (стр. 1078) — локальный
- `handleRemoveService` (стр. 1098) — локальный
- `handleCreateServiceFromQuery` (стр. 1102) — локальный
- `name` (стр. 1103) — локальный
- `createDraftId` (стр. 1104) — локальный
- `newId` (стр. 1105) — локальный
- `handleOpenEditAsvc` (стр. 1133) — локальный
- `handleSaveEditAsvc` (стр. 1141) — локальный
- `workersList` (стр. 1146) — локальный
- `worker` (стр. 1147) — локальный
- `updatedBooking` (стр. 1150) — локальный
- `closeAddServiceModal` (стр. 1167) — локальный
- `openEditModal` (стр. 1173) — локальный
- `handleSaveEditedBooking` (стр. 1197) — локальный

### frontend/src/app/components/admin/ContentEditor.tsx (441 строк)

- `API_BASE` (стр. 22) — локальный
- `ImageUploader` (стр. 24) — локальный
- `inputRef` (стр. 26) — локальный
- `handleFile` (стр. 28) — локальный
- `file` (стр. 29) — локальный
- `result` (стр. 33) — локальный
- `src` (стр. 43) — локальный
- `ContentEditor` (стр. 91)
- `handleSave` (стр. 103) — локальный
- `updateHero` (стр. 117) — локальный
- `updateStat` (стр. 121) — локальный
- `updateAbout` (стр. 128) — локальный
- `updateService` (стр. 132) — локальный
- `addService` (стр. 139) — локальный
- `removeService` (стр. 143) — локальный
- `addFeature` (стр. 147) — локальный
- `updateFeature` (стр. 154) — локальный
- `removeFeature` (стр. 161) — локальный
- `updateWork` (стр. 168) — локальный
- `addWork` (стр. 175) — локальный
- `removeWork` (стр. 179) — локальный
- `next` (стр. 304) — локальный
- `q` (стр. 332) — локальный
- `matchesQuery` (стр. 333) — локальный
- `q` (стр. 381) — локальный

### frontend/src/app/components/admin/screens/AdminCalendarDayScreen.tsx (383 строк)

- `EASE` (стр. 18) — локальный
- `AnimatedNumber` (стр. 41) — локальный
- `motionValue` (стр. 42) — локальный
- `controls` (стр. 48) — локальный
- `AdminCalendarDayScreen` (стр. 73)
- `sub` (стр. 85) — локальный
- `inProgress` (стр. 87) — локальный
- `pending` (стр. 88) — локальный
- `completed` (стр. 89) — локальный
- `unassigned` (стр. 90) — локальный
- `dayProgress` (стр. 92) — локальный
- `nextPending` (стр. 93) — локальный
- `DayBookingCard` (стр. 290) — локальный
- `sub` (стр. 299) — локальный
- `fixed` (стр. 300) — локальный
- `OtherBookingRow` (стр. 345) — локальный
- `sub` (стр. 346) — локальный
- `formatWorkerPay` (стр. 379) — локальный

### frontend/src/app/components/admin/screens/AdminClientsPage.tsx (648 строк)

- `normalizePhoneSearchValue` (стр. 15) — локальный
- `paymentLabel` (стр. 39) — локальный
- `base` (стр. 40) — локальный
- `AdminClientsPage` (стр. 49)
- `selectedClient` (стр. 70) — локальный
- `normalizedQuery` (стр. 72) — локальный
- `filteredClients` (стр. 75) — локальный
- `plates` (стр. 80) — локальный
- `selectedClientBookings` (стр. 89) — локальный
- `leftDate` (стр. 93) — локальный
- `rightDate` (стр. 94) — локальный
- `selectedClientFilteredBookings` (стр. 99) — локальный
- `svc` (стр. 101) — локальный
- `selectedClientVehicles` (стр. 105) — локальный
- `spentTotal` (стр. 109) — локальный
- `completedCount` (стр. 110) — локальный
- `upcoming` (стр. 111) — локальный
- `lastVisit` (стр. 112) — локальный
- `handleCreateSubmit` (стр. 115) — локальный
- `nameError` (стр. 117) — локальный
- `phoneError` (стр. 120) — локальный
- `carError` (стр. 124) — локальный
- `plateError` (стр. 128) — локальный
- `created` (стр. 135) — локальный
- `draftFor` (стр. 153) — локальный
- `glass` (стр. 156) — локальный
- `sub` (стр. 157) — локальный
- `selectCls` (стр. 160) — локальный
- `incompleteDot` (стр. 161) — локальный
- `clientBookings` (стр. 237) — локальный
- `spent` (стр. 238) — локальный
- `last` (стр. 239) — локальный
- `ld` (стр. 240) — локальный
- `rd` (стр. 241) — локальный
- `displayName` (стр. 245) — локальный
- `phone` (стр. 246) — локальный
- `draft` (стр. 325) — локальный
- `setDraft` (стр. 331) — локальный
- `isIncomplete` (стр. 333) — локальный
- `BookingHistoryCard` (стр. 600) — локальный
- `sub` (стр. 601) — локальный

### frontend/src/app/components/admin/screens/AdminEmployeesPage.tsx (245 строк)

- `EASE` (стр. 13) — локальный
- `toEmployeeSetting` (стр. 15) — локальный
- `AdminEmployeesPage` (стр. 28)
- `sub` (стр. 30) — локальный
- `filtered` (стр. 46) — локальный
- `q` (стр. 47) — локальный
- `activeCount` (стр. 52) — локальный
- `patchMaster` (стр. 54) — локальный
- `handleSave` (стр. 59) — локальный
- `live` (стр. 121) — локальный
- `completed` (стр. 122) — локальный
- `balance` (стр. 123) — локальный
- `raw` (стр. 163) — локальный
- `n` (стр. 165) — локальный

### frontend/src/app/components/admin/screens/AdminPayrollPage.tsx (407 строк)

- `AdminPayrollPage` (стр. 23)
- `loadPayrollData` (стр. 60) — локальный
- `params` (стр. 65) — локальный
- `handleSaveSettings` (стр. 83) — локальный
- `handleCreatePayrollEntry` (стр. 98) — локальный
- `draft` (стр. 99) — локальный
- `amount` (стр. 100) — локальный
- `liveWorker` (стр. 103) — локальный
- `accruedFromBookings` (стр. 104) — локальный
- `glass` (стр. 136) — локальный
- `sub` (стр. 137) — локальный
- `selectCls` (стр. 140) — локальный
- `liveWorker` (стр. 190) — локальный
- `payrollSummary` (стр. 191) — локальный
- `r` (стр. 234) — локальный
- `n` (стр. 239) — локальный

### frontend/src/app/components/admin/screens/AdminStatsPage.tsx (396 строк)

- `periodStart` (стр. 36) — локальный
- `now` (стр. 37) — локальный
- `d` (стр. 41) — локальный
- `d` (стр. 46) — локальный
- `AdminStatsPage` (стр. 59)
- `filtered` (стр. 63) — локальный
- `start` (стр. 64) — локальный
- `parsed` (стр. 67) — локальный
- `completedAll` (стр. 72) — локальный
- `todayLabel` (стр. 73) — локальный
- `todayBookings` (стр. 74) — локальный
- `totalRevenue` (стр. 78) — локальный
- `avgCheck` (стр. 79) — локальный
- `conversionRate` (стр. 80) — локальный
- `byService` (стр. 82) — локальный
- `byStatus` (стр. 97) — локальный
- `byPayment` (стр. 116) — локальный
- `workerStats` (стр. 141) — локальный
- `bw` (стр. 151) — локальный
- `revenueData` (стр. 161) — локальный
- `days` (стр. 162) — локальный
- `formatted` (стр. 164) — локальный
- `hourData` (стр. 174) — локальный
- `source` (стр. 175) — локальный
- `referralStats` (стр. 184) — локальный
- `map` (стр. 185) — локальный
- `src` (стр. 187) — локальный
- `cur` (стр. 188) — локальный
- `glass` (стр. 196) — локальный
- `sub` (стр. 197) — локальный
- `tooltipStyle` (стр. 198) — локальный
- `maxRevenue` (стр. 287) — локальный
- `palette` (стр. 332) — локальный
- `palette` (стр. 341) — локальный
- `total` (стр. 342) — локальный
- `pct` (стр. 343) — локальный

### frontend/src/app/components/admin/screens/AdminStockPage.tsx (734 строк)

- `STOCK_UNITS` (стр. 7) — локальный
- `buildCategoryTree` (стр. 26) — локальный
- `map` (стр. 27) — локальный
- `node` (стр. 31) — локальный
- `sortRec` (стр. 38) — локальный
- `flattenCategories` (стр. 46) — локальный
- `tree` (стр. 47) — локальный
- `dfs` (стр. 49) — локальный
- `getDescendantIds` (стр. 59) — локальный
- `map` (стр. 60) — локальный
- `result` (стр. 66) — локальный
- `queue` (стр. 67) — локальный
- `visited` (стр. 68) — локальный
- `cur` (стр. 70) — локальный
- `children` (стр. 73) — локальный
- `collectSubtreeItemIds` (стр. 82) — локальный
- `ids` (стр. 83) — локальный
- `desc` (стр. 84) — локальный
- `AdminStockPage` (стр. 95)
- `categoryTree` (стр. 127) — локальный
- `flattenedForSelect` (стр. 128) — локальный
- `handleAddStock` (стр. 136) — локальный
- `qty` (стр. 138) — локальный
- `rawPrice` (стр. 139) — локальный
- `unitPrice` (стр. 140) — локальный
- `selectedCat` (стр. 141) — локальный
- `handleWriteOff` (стр. 148) — локальный
- `item` (стр. 150) — локальный
- `glass` (стр. 158) — локальный
- `sub` (стр. 159) — локальный
- `selectCls` (стр. 162) — локальный
- `renderStockTree` (стр. 165) — локальный
- `allIds` (стр. 167) — локальный
- `subtreeItems` (стр. 169) — локальный
- `childContent` (стр. 175) — локальный
- `hasVisibleChild` (стр. 177) — локальный
- `cid` (стр. 178) — локальный
- `directItems` (стр. 192) — локальный
- `low` (стр. 207) — локальный
- `itemCatName` (стр. 209) — локальный
- `cat` (стр. 211) — локальный
- `renderCategoryManagerTree` (стр. 278) — локальный
- `descendantCount` (стр. 280) — локальный
- `withoutCat` (стр. 401) — локальный
- `low` (стр. 413) — локальный
- `cat` (стр. 529) — локальный
- `InlineRename` (стр. 704) — локальный

### frontend/src/app/components/admin/settings-sections/AdminSettingsSections.tsx (827 строк)

- `SERVICE_TYPE_OPTIONS` (стр. 7) — локальный
- `adminServiceResourceGroupForCategory` (стр. 13) — локальный
- `numberInputValue` (стр. 17) — локальный
- `numberFromInput` (стр. 21) — локальный
- `formatFixedMasterAmount` (стр. 25) — локальный
- `SectionShell` (стр. 32) — локальный
- `sub` (стр. 43) — локальный
- `Toggle` (стр. 58)
- `SettingsSaveButton` (стр. 82)
- `glassCls` (стр. 105) — локальный
- `subCls` (стр. 106) — локальный
- `AttendanceSectionShell` (стр. 111)
- `BoxesSection` (стр. 126)
- `ScheduleSection` (стр. 164)
- `NOTIF_ITEMS` (стр. 205) — локальный
- `NotificationsSection` (стр. 213)
- `ProfileSection` (стр. 250)
- `PricingSection` (стр. 327)
- `q` (стр. 348) — локальный
- `matches` (стр. 349) — локальный
- `SecuritySection` (стр. 439)
- `ContentSectionShell` (стр. 534)
- `SHIFT_PHOTO_CATEGORIES` (стр. 551) — локальный
- `SHIFT_PHOTO_MAX_DIMENSION` (стр. 569) — локальный
- `SHIFT_PHOTO_TARGET_BYTES` (стр. 570) — локальный
- `SHIFT_PHOTO_MIN_QUALITY` (стр. 571) — локальный
- `dataUrlApproxBytes` (стр. 573) — локальный
- `padding` (стр. 575) — локальный
- `loadImage` (стр. 579) — локальный
- `image` (стр. 581) — локальный
- `compressShiftPhoto` (стр. 588) — локальный
- `objectUrl` (стр. 589) — локальный
- `image` (стр. 591) — локальный
- `scale` (стр. 592) — локальный
- `width` (стр. 593) — локальный
- `height` (стр. 594) — локальный
- `canvas` (стр. 595) — локальный
- `context` (стр. 598) — локальный
- `ShiftSection` (стр. 613)
- `shiftSupplies` (стр. 626) — локальный
- `uploadedShiftPhotos` (стр. 637) — локальный
- `handleShiftPhotoChange` (стр. 643) — локальный
- `file` (стр. 644) — локальный
- `dataUrl` (стр. 648) — локальный
- `handleSubmitShiftInspection` (стр. 657) — локальный
- `primaryPhoto` (стр. 661) — локальный
- `uploadedCategoriesLabel` (стр. 664) — локальный
- `composedNote` (стр. 665) — локальный
- `saved` (стр. 669) — локальный
- `statusPill` (стр. 686) — локальный
- `statusLabel` (стр. 692) — локальный
- `statusTitle` (стр. 694) — локальный
- `photo` (стр. 710) — локальный
- `checked` (стр. 743) — локальный

### frontend/src/app/components/admin/shared/AssignWorkersDialog.tsx (160 строк)

- `AssignWorkersDialog` (стр. 25)
- `sub` (стр. 35) — локальный
- `segBtn` (стр. 38) — локальный
- `assigned` (стр. 45) — локальный
- `r` (стр. 89) — локальный
- `n` (стр. 94) — локальный
- `r` (стр. 112) — локальный
- `n` (стр. 117) — локальный

### frontend/src/app/components/atmosfera/Button.tsx (57 строк)

- `Button` (стр. 37)

### frontend/src/app/components/atmosfera/Card.tsx (35 строк)

- `Card` (стр. 17)

### frontend/src/app/components/atmosfera/Dialog.tsx (75 строк)

- `Dialog` (стр. 20)
- `onKey` (стр. 23) — локальный
- `prev` (стр. 25) — локальный

### frontend/src/app/components/atmosfera/FormRow.tsx (35 строк)

- `FormRow` (стр. 17)

### frontend/src/app/components/atmosfera/index.ts (29 строк)

### frontend/src/app/components/atmosfera/Input.tsx (43 строк)

- `Input` (стр. 12)
- `Textarea` (стр. 30)

### frontend/src/app/components/atmosfera/Money.tsx (28 строк)

- `formatter` (стр. 3) — локальный
- `Money` (стр. 17)
- `value` (стр. 18) — локальный
- `safe` (стр. 19) — локальный
- `formatted` (стр. 20) — локальный
- `prefix` (стр. 21) — локальный

### frontend/src/app/components/atmosfera/SectionHeader.tsx (28 строк)

- `SectionHeader` (стр. 14)

### frontend/src/app/components/atmosfera/Sheet.tsx (154 строк)

- `useIsWide` (стр. 27) — локальный
- `mq` (стр. 32) — локальный
- `onChange` (стр. 33) — локальный
- `Sheet` (стр. 45)
- `wide` (стр. 46) — локальный
- `dockRight` (стр. 47) — локальный
- `onKey` (стр. 51) — локальный
- `scrollY` (стр. 54) — локальный
- `prevOverflow` (стр. 55) — локальный
- `prevPosition` (стр. 56) — локальный
- `prevTop` (стр. 57) — локальный
- `prevWidth` (стр. 58) — локальный
- `isIOS` (стр. 59) — локальный
- `prevHtmlOverflow` (стр. 67) — локальный

### frontend/src/app/components/atmosfera/StatTile.tsx (23 строк)

- `StatTile` (стр. 11)

### frontend/src/app/components/atmosfera/StatusBadge.tsx (25 строк)

- `StatusBadge` (стр. 13)

### frontend/src/app/components/atmosfera/statusMap.ts (63 строк)

- `BOOKING_STATUSES` (стр. 7)
- `STATUS_LABEL` (стр. 23)
- `STATUS_TONE` (стр. 34)
- `statusToneClass` (стр. 53)
- `statusLabel` (стр. 57)
- `statusTone` (стр. 61)

### frontend/src/app/components/atmosfera/SummaryRows.tsx (22 строк)

- `SummaryRows` (стр. 11)

### frontend/src/app/components/atmosfera/Toaster.tsx (113 строк)

- `listeners` (стр. 20) — локальный
- `TIMERS` (стр. 21) — локальный
- `emit` (стр. 23) — локальный
- `dismiss` (стр. 27) — локальный
- `t` (стр. 29) — локальный
- `toast` (стр. 36)
- `id` (стр. 37) — локальный
- `Toaster` (стр. 59)
- `Icon` (стр. 76) — локальный

### frontend/src/app/components/client/ClientApp.tsx (516 строк)

- `NOOP` (стр. 20) — локальный
- `UPCOMING_STATUSES` (стр. 22) — локальный
- `HISTORY_STATUSES` (стр. 23) — локальный
- `CANCELLABLE_STATUSES` (стр. 24) — локальный
- `isBoxRentalService` (стр. 27) — локальный
- `isDetailingService` (стр. 31) — локальный
- `serviceResourceGroup` (стр. 35) — локальный
- `bookingBoxesForService` (стр. 39) — локальный
- `isManualSchedulingBooking` (стр. 45) — локальный
- `ClientApp` (стр. 49)
- `todayStart` (стр. 81) — локальный
- `parsedSelectedDate` (стр. 92) — локальный
- `nextAvailableDate` (стр. 94) — локальный
- `parsedDate` (стр. 95) — локальный
- `parsedSelectedDate` (стр. 119) — локальный
- `loadAvailability` (стр. 127) — локальный
- `durationMinutes` (стр. 130) — локальный
- `nextSlots` (стр. 133) — локальный
- `clientBookings` (стр. 166) — локальный
- `upcomingBookings` (стр. 167) — локальный
- `pastBookings` (стр. 168) — локальный
- `completedBookings` (стр. 169) — локальный
- `totalSpent` (стр. 170) — локальный
- `favoriteService` (стр. 171) — локальный
- `myNotifications` (стр. 177) — локальный
- `unreadCount` (стр. 178) — локальный
- `compatibleBoxes` (стр. 179) — локальный
- `defaultBoxName` (стр. 180) — локальный
- `selectedServiceIsBoxRental` (стр. 182) — локальный
- `selectedServiceIsDetailing` (стр. 183) — локальный
- `selectedDuration` (стр. 184) — локальный
- `selectedPrice` (стр. 189) — локальный
- `selectedDayDate` (стр. 194) — локальный
- `selectedDaySchedule` (стр. 195) — локальный
- `selectedDayWorkingHours` (стр. 198) — локальный
- `bookingVehicles` (стр. 204) — локальный
- `selectedBookingVehicle` (стр. 207) — локальный
- `glass` (стр. 209) — локальный
- `bg` (стр. 213) — локальный
- `text` (стр. 214) — локальный
- `sub` (стр. 215) — локальный
- `primary` (стр. 216) — локальный
- `slotCards` (стр. 217) — локальный
- `availableSlotCards` (стр. 218) — локальный
- `occupiedSlotCards` (стр. 219) — локальный
- `handleConfirmBooking` (стр. 221) — локальный
- `nextAvailableDate` (стр. 227) — локальный
- `parsedDate` (стр. 228) — локальный
- `primaryVehicle` (стр. 235) — локальный
- `booking` (стр. 236) — локальный
- `handleCancelBooking` (стр. 260) — локальный
- `mainBtnState` (стр. 264) — локальный
- `navRef` (стр. 280) — локальный
- `handleBack` (стр. 283) — локальный

### frontend/src/app/components/client/screens/BookingsScreen.tsx (125 строк)

- `UPCOMING_STATUSES` (стр. 7) — локальный
- `HISTORY_STATUSES` (стр. 8) — локальный
- `CANCELLABLE_STATUSES` (стр. 9) — локальный
- `isManualSchedulingBooking` (стр. 11) — локальный
- `BookingsScreen` (стр. 26)
- `clientBookings` (стр. 29) — локальный
- `upcomingBookings` (стр. 30) — локальный
- `pastBookings` (стр. 31) — локальный
- `completedBookings` (стр. 32) — локальный
- `totalSpent` (стр. 33) — локальный
- `favoriteService` (стр. 34) — локальный
- `BookingCard` (стр. 91) — локальный
- `manualScheduling` (стр. 92) — локальный

### frontend/src/app/components/client/screens/CatalogScreen.tsx (114 строк)

- `CatalogScreen` (стр. 17)
- `categories` (стр. 23) — локальный
- `normalizedSearchQuery` (стр. 24) — локальный
- `filteredServices` (стр. 25) — локальный
- `active` (стр. 57) — локальный

### frontend/src/app/components/client/screens/ConfirmSuccessScreen.tsx (71 строк)

- `ConfirmSuccessScreen` (стр. 20)

### frontend/src/app/components/client/screens/DetailScreen.tsx (132 строк)

- `DetailScreen` (стр. 30)

### frontend/src/app/components/client/screens/ProfileScreen.tsx (334 строк)

- `EMPTY_VEHICLE` (стр. 19) — локальный
- `withBaseVehicles` (стр. 21) — локальный
- `ProfileScreen` (стр. 30)
- `raw` (стр. 40) — локальный
- `hasMain` (стр. 43) — локальный
- `vehicles` (стр. 44) — локальный
- `profileVehicles` (стр. 50) — локальный
- `primaryVehicle` (стр. 53) — локальный
- `visibleProfileVehicles` (стр. 54) — локальный
- `handleSaveProfile` (стр. 56) — локальный
- `nameError` (стр. 58) — локальный
- `carError` (стр. 59) — локальный
- `plateError` (стр. 60) — локальный
- `normalizedVehicles` (стр. 67) — локальный
- `avgCheck` (стр. 97) — локальный
- `value` (стр. 168) — локальный
- `value` (стр. 183) — локальный
- `nextCar` (стр. 197) — локальный
- `nextPlate` (стр. 218) — локальный
- `nextCar` (стр. 261) — локальный
- `nextPlate` (стр. 276) — локальный

### frontend/src/app/components/client/screens/SlotsScreen.tsx (210 строк)

- `SlotsScreen` (стр. 34)
- `slotCards` (стр. 55) — локальный
- `active` (стр. 69) — локальный
- `selected` (стр. 136) — локальный
- `busy` (стр. 137) — локальный

### frontend/src/app/components/client/shared/BoxRentPicker.tsx (48 строк)

- `HOURS` (стр. 12) — локальный
- `BoxRentPicker` (стр. 18)
- `selected` (стр. 23) — локальный

### frontend/src/app/components/figma/ImageWithFallback.tsx (27 строк)

- `ImageWithFallback` (стр. 6)
- `handleError` (стр. 9) — локальный

### frontend/src/app/components/landing/Contact.tsx (126 строк)

- `Contact` (стр. 9)
- `handleSubmit` (стр. 19) — локальный

### frontend/src/app/components/landing/Footer.tsx (64 строк)

- `Footer` (стр. 3)
- `year` (стр. 4) — локальный

### frontend/src/app/components/landing/Hero.tsx (114 строк)

- `API_BASE` (стр. 4) — локальный
- `resolveImageUrl` (стр. 6) — локальный
- `STAT_ICONS` (стр. 29) — локальный
- `scrollToSection` (стр. 31) — локальный
- `id` (стр. 32) — локальный
- `Hero` (стр. 36)
- `h` (стр. 37) — локальный
- `bg` (стр. 38) — локальный
- `stats` (стр. 39) — локальный
- `Icon` (стр. 90) — локальный

### frontend/src/app/components/landing/LandingPage.tsx (45 строк)

- `LandingPage` (стр. 13)
- `contactRef` (стр. 16) — локальный
- `handleBook` (стр. 24) — локальный

### frontend/src/app/components/landing/Navbar.tsx (91 строк)

- `navLinks` (стр. 4) — локальный
- `Navbar` (стр. 12)
- `onScroll` (стр. 17) — локальный
- `handleNav` (стр. 22) — локальный
- `el` (стр. 28) — локальный

### frontend/src/app/components/landing/Pricing.tsx (87 строк)

- `FALLBACK_PLANS` (стр. 6) — локальный
- `Pricing` (стр. 12)
- `plans` (стр. 13) — локальный
- `q` (стр. 27) — локальный
- `visiblePlans` (стр. 28) — локальный

### frontend/src/app/components/landing/Services.tsx (86 строк)

- `Services` (стр. 15)
- `services` (стр. 16) — локальный
- `q` (стр. 18) — локальный
- `visibleServices` (стр. 19) — локальный
- `ServiceCard` (стр. 56) — локальный

### frontend/src/app/components/landing/StudioInfo.tsx (66 строк)

- `API_BASE` (стр. 5) — локальный
- `resolveImageUrl` (стр. 7) — локальный
- `StudioInfo` (стр. 14)
- `imgSrc` (стр. 17) — локальный

### frontend/src/app/components/landing/Testimonials.tsx (46 строк)

- `reviews` (стр. 3) — локальный
- `Testimonials` (стр. 10)

### frontend/src/app/components/landing/Works.tsx (100 строк)

- `API_BASE` (стр. 6) — локальный
- `resolveImageUrl` (стр. 8) — локальный
- `Works` (стр. 24)
- `items` (стр. 26) — локальный

### frontend/src/app/components/landing/WorksPage.tsx (39 строк)

- `WorksPage` (стр. 8)

### frontend/src/app/components/owner/DepositPanel.tsx (1146 строк)

- `toISODate` (стр. 22) — локальный
- `parsed` (стр. 23) — локальный
- `y` (стр. 25) — локальный
- `m` (стр. 26) — локальный
- `d` (стр. 27) — локальный
- `TIME_SLOTS` (стр. 31) — локальный
- `h` (стр. 32) — локальный
- `m` (стр. 33) — локальный
- `MONTH_LABELS` (стр. 37) — локальный
- `PLAN_OPTIONS` (стр. 39) — локальный
- `TXN_TYPE_OPTIONS` (стр. 46) — локальный
- `monthKeyToLabel` (стр. 54) — локальный
- `match` (стр. 55) — локальный
- `monthIndex` (стр. 57) — локальный
- `currentMonthKey` (стр. 61) — локальный
- `now` (стр. 62) — локальный
- `txnMonthOf` (стр. 66) — локальный
- `parts` (стр. 67) — локальный
- `formatMoney` (стр. 71) — локальный
- `planLabel` (стр. 75) — локальный
- `fieldLabel` (стр. 79) — локальный
- `BalanceSparkline` (стр. 83) — локальный
- `points` (стр. 84) — локальный
- `sorted` (стр. 86) — локальный
- `values` (стр. 87) — локальный
- `min` (стр. 88) — локальный
- `max` (стр. 89) — локальный
- `range` (стр. 90) — локальный
- `w` (стр. 91) — локальный
- `h` (стр. 92) — локальный
- `coords` (стр. 99) — локальный
- `Sheet` (стр. 123) — локальный
- `DepositPanel` (стр. 153)
- `glass` (стр. 171) — локальный
- `sub` (стр. 172) — локальный
- `primary` (стр. 173) — локальный
- `accent` (стр. 174) — локальный
- `danger` (стр. 175) — локальный
- `inputCls` (стр. 176) — локальный
- `selectCls` (стр. 177) — локальный
- `loadSummaries` (стр. 212) — локальный
- `loadOverview` (стр. 224) — локальный
- `timer` (стр. 239) — локальный
- `selectedClient` (стр. 243) — локальный
- `workerOptions` (стр. 248) — локальный
- `eligibleClients` (стр. 250) — локальный
- `monthOptions` (стр. 252) — локальный
- `months` (стр. 253) — локальный
- `filteredTxns` (стр. 258) — локальный
- `openClient` (стр. 267) — локальный
- `runAndRefresh` (стр. 274) — локальный
- `handleActivate` (стр. 286) — локальный
- `handleTopup` (стр. 312) — локальный
- `handleAdjust` (стр. 322) — локальный
- `handleRecordWash` (стр. 331) — локальный
- `selectedWorker` (стр. 341) — локальный
- `handleSettle` (стр. 365) — локальный
- `handleExportOne` (стр. 370) — локальный
- `fileName` (стр. 375) — локальный
- `delivery` (стр. 377) — локальный
- `msg` (стр. 380) — локальный
- `delivery` (стр. 385) — локальный
- `handleExportAll` (стр. 393) — локальный
- `fileName` (стр. 397) — локальный
- `delivery` (стр. 399) — локальный
- `msg` (стр. 402) — локальный
- `delivery` (стр. 407) — локальный
- `openActivateFor` (стр. 415) — локальный
- `openWashFor` (стр. 428) — локальный
- `openTopupFor` (стр. 439) — локальный
- `val` (стр. 1116) — локальный

### frontend/src/app/components/owner/OwnerApp.tsx (12241 строк)

- `stockCategoryIdsWithDescendants` (стр. 45) — локальный
- `map` (стр. 46) — локальный
- `queue` (стр. 49) — локальный
- `visited` (стр. 50) — локальный
- `EXPENSE_CATEGORIES` (стр. 302) — локальный
- `STOCK_UNITS` (стр. 303) — локальный
- `SERVICE_TYPE_OPTIONS` (стр. 304) — локальный
- `ownerBookingStatusRequiresScheduledSlot` (стр. 315) — локальный
- `employeeRoleLabel` (стр. 318) — локальный
- `ownerServiceResourceGroup` (стр. 324) — локальный
- `ownerDefaultBoxForService` (стр. 328) — локальный
- `rg` (стр. 329) — локальный
- `match` (стр. 330) — локальный
- `ownerBookingBoxes` (стр. 334) — локальный
- `ownerLocationLabel` (стр. 342) — локальный
- `parseOwnerBookingMinutes` (стр. 346) — локальный
- `match` (стр. 347) — локальный
- `hours` (стр. 349) — локальный
- `minutes` (стр. 350) — локальный
- `OWNER_CALENDAR_WEEKDAYS` (стр. 355) — локальный
- `OWNER_CALENDAR_MONTHS` (стр. 356) — локальный
- `OWNER_CALENDAR_DEFAULT_OPEN` (стр. 360) — локальный
- `OWNER_CALENDAR_DEFAULT_CLOSE` (стр. 361) — локальный
- `ownerScheduleTimeToMinutes` (стр. 363) — локальный
- `ownerMonthTitle` (стр. 367) — локальный
- `ownerBuildMonthCells` (стр. 371) — локальный
- `year` (стр. 372) — локальный
- `month` (стр. 373) — локальный
- `first` (стр. 374) — локальный
- `offset` (стр. 375) — локальный
- `daysInMonth` (стр. 376) — локальный
- `date` (стр. 382) — локальный
- `ownerCalendarDayHours` (стр. 391) — локальный
- `parsedDate` (стр. 392) — локальный
- `daySchedule` (стр. 396) — локальный
- `open` (стр. 400) — локальный
- `close` (стр. 401) — локальный
- `OWNER_CALENDAR_LOAD_COLORS` (стр. 405) — локальный
- `ownerCalendarLoadTone` (стр. 411) — локальный
- `ratio` (стр. 413) — локальный
- `ownerGroupBookingsByHour` (стр. 423) — локальный
- `timed` (стр. 428) — локальный
- `hourLabel` (стр. 431) — локальный
- `slotEnd` (стр. 432) — локальный
- `slotBookings` (стр. 433) — локальный
- `start` (стр. 435) — локальный
- `ownerOpenBookingDetail` (стр. 447) — локальный
- `ownerBookingBlocksBox` (стр. 456) — локальный
- `nextStart` (стр. 459) — локальный
- `existingStart` (стр. 460) — локальный
- `nextEnd` (стр. 462) — локальный
- `existingEnd` (стр. 463) — локальный
- `ownerPickDefaultBookingBox` (стр. 467) — локальный
- `resourceGroup` (стр. 476) — локальный
- `preferred` (стр. 477) — локальный
- `fallback` (стр. 478) — локальный
- `candidates` (стр. 479) — локальный
- `serviceResourceGroupForCategory` (стр. 484) — локальный
- `numberInputValue` (стр. 488) — локальный
- `ORDER_STEPS` (стр. 502) — локальный
- `serviceMoneySummary` (стр. 509) — локальный
- `piggyTargetLabel` (стр. 510) — локальный
- `master` (стр. 514) — локальный
- `piggy` (стр. 519) — локальный
- `owners` (стр. 528) — локальный
- `previewServiceSplit` (стр. 536) — локальный
- `materials` (стр. 541) — локальный
- `net` (стр. 542) — локальный
- `order` (стр. 543) — локальный
- `pipeline` (стр. 544) — локальный
- `piggyType` (стр. 545) — локальный
- `computeMaster` (стр. 552) — локальный
- `computePiggy` (стр. 561) — локальный
- `m` (стр. 569) — локальный
- `p` (стр. 571) — локальный
- `afterMasterPiggy` (стр. 575) — локальный
- `m` (стр. 594) — локальный
- `p` (стр. 598) — локальный
- `isLast` (стр. 602) — локальный
- `claimed` (стр. 603) — локальный
- `ownerPaymentLabel` (стр. 622) — локальный
- `normalizeOwnerPhoneSearchValue` (стр. 629) — локальный
- `numberFromInput` (стр. 639) — локальный
- `parseDecimalInput` (стр. 644) — локальный
- `normalized` (стр. 645) — локальный
- `parsed` (стр. 646) — локальный
- `isValidAmountInput` (стр. 650) — локальный
- `n` (стр. 651) — локальный
- `toISODate` (стр. 655) — локальный
- `parsed` (стр. 656) — локальный
- `y` (стр. 658) — локальный
- `m` (стр. 659) — локальный
- `d` (стр. 660) — локальный
- `TIME_SLOTS` (стр. 664) — локальный
- `h` (стр. 665) — локальный
- `m` (стр. 666) — локальный
- `OwnerApp` (стр. 673)
- `isAccountant` (стр. 750) — локальный
- `modalMaxHeight` (стр. 751) — локальный
- `financeRoleTitle` (стр. 752) — локальный
- `financeNotificationRole` (стр. 753) — локальный
- `__nowRpt` (стр. 821) — локальный
- `__dowRpt` (стр. 822) — локальный
- `__monRpt` (стр. 823) — локальный
- `__sunRpt` (стр. 824) — локальный
- `parentCategories` (стр. 849) — локальный
- `newPayRequestId` (стр. 887) — локальный
- `entryRequestIdRef` (стр. 891) — локальный
- `today` (стр. 1044) — локальный
- `clearOwnerResetFlow` (стр. 1167) — локальный
- `nextBoxes` (стр. 1190) — локальный
- `params` (стр. 1228) — локальный
- `params` (стр. 1243) — локальный
- `handlePayOwnerSalary` (стр. 1254) — локальный
- `amount` (стр. 1255) — локальный
- `res` (стр. 1259) — локальный
- `updated` (стр. 1274) — локальный
- `loadPiggyBank` (стр. 1282) — локальный
- `params` (стр. 1286) — локальный
- `qs` (стр. 1289) — локальный
- `data` (стр. 1291) — локальный
- `loadWallet` (стр. 1299) — локальный
- `params` (стр. 1303) — локальный
- `qs` (стр. 1306) — локальный
- `data` (стр. 1308) — локальный
- `handlePiggyWithdraw` (стр. 1314) — локальный
- `f` (стр. 1315) — локальный
- `amount` (стр. 1317) — локальный
- `buyerLabel` (стр. 1346) — локальный
- `segmentLabel` (стр. 1349) — локальный
- `toastMsg` (стр. 1350) — локальный
- `openPiggyWithdraw` (стр. 1363) — локальный
- `handlePiggyBankExport` (стр. 1369) — локальный
- `openPiggyAdjust` (стр. 1380) — локальный
- `current` (стр. 1381) — локальный
- `currentPrecise` (стр. 1385) — локальный
- `handlePiggyAdjust` (стр. 1392) — локальный
- `newBalance` (стр. 1393) — локальный
- `delta` (стр. 1395) — локальный
- `syncCountdown` (стр. 1468) — локальный
- `diffMs` (стр. 1469) — локальный
- `intervalId` (стр. 1474) — локальный
- `handleOpenShiftForMasters` (стр. 1504) — локальный
- `saved` (стр. 1513) — локальный
- `ownerNotifications` (стр. 1529) — локальный
- `unreadCount` (стр. 1530) — локальный
- `completedBookings` (стр. 1531) — локальный
- `todayBookings` (стр. 1532) — локальный
- `activeMasters` (стр. 1534) — локальный
- `masterCameOutTodayAt` (стр. 1539) — локальный
- `times` (стр. 1540) — локальный
- `mastersCameOutToday` (стр. 1549) — локальный
- `vv` (стр. 1553) — локальный
- `handler` (стр. 1555) — локальный
- `el` (стр. 1556) — локальный
- `bookingFormBoxes` (стр. 1563) — локальный
- `bookingFormLocationLabel` (стр. 1564) — локальный
- `editBookingLocationLabel` (стр. 1565) — локальный
- `todayRevenue` (стр. 1566) — локальный
- `now` (стр. 1569) — локальный
- `dayOfWeek` (стр. 1570) — локальный
- `diffToSaturday` (стр. 1571) — локальный
- `weekSaturday` (стр. 1572) — локальный
- `weekFriday` (стр. 1575) — локальный
- `isDateInWeek` (стр. 1578) — локальный
- `d` (стр. 1579) — локальный
- `weeklyCompletedBookings` (стр. 1582) — локальный
- `weeklyBookings` (стр. 1583) — локальный
- `weeklyExpenses` (стр. 1584) — локальный
- `weeklyIncomes` (стр. 1585) — локальный
- `totalRevenue` (стр. 1586) — локальный
- `totalExpenses` (стр. 1587) — локальный
- `totalIncomes` (стр. 1588) — локальный
- `profit` (стр. 1589) — локальный
- `averageCheck` (стр. 1590) — локальный
- `activeBookings` (стр. 1591) — локальный
- `pipelineCounts` (стр. 1592) — локальный
- `statusListItems` (стр. 1599) — локальный
- `totalStockValue` (стр. 1604) — локальный
- `washRevenue` (стр. 1607) — локальный
- `detailingRevenue` (стр. 1610) — локальный
- `washExpenses` (стр. 1613) — локальный
- `detailingExpenses` (стр. 1616) — локальный
- `washIncomes` (стр. 1619) — локальный
- `detailingIncomes` (стр. 1622) — локальный
- `resourceGroupLabel` (стр. 1626) — локальный
- `payrollRows` (стр. 1631) — локальный
- `workerPenalties` (стр. 1632) — локальный
- `complaintState` (стр. 1633) — локальный
- `payrollTotal` (стр. 1641) — локальный
- `formatComplaintDate` (стр. 1642) — локальный
- `resetPreviewRows` (стр. 1643) — локальный
- `resetExecuteLocked` (стр. 1657) — локальный
- `glass` (стр. 1659) — локальный
- `bg` (стр. 1660) — локальный
- `text` (стр. 1661) — локальный
- `sub` (стр. 1662) — локальный
- `primary` (стр. 1663) — локальный
- `accent` (стр. 1664) — локальный
- `surface` (стр. 1665) — локальный

### frontend/src/app/components/owner/screens/OwnerClientsScreen.tsx (831 строк)

- `OwnerClientsScreen` (стр. 26)
- `filteredSettingsClients` (стр. 88) — локальный
- `normalized` (стр. 91) — локальный
- `normalized` (стр. 95) — локальный
- `plates` (стр. 97) — локальный
- `query` (стр. 105) — локальный
- `selectedSettingsClient` (стр. 108) — локальный
- `selectedSettingsClientCardDraft` (стр. 109) — локальный
- `selectedSettingsClientBookings` (стр. 110) — локальный
- `leftDate` (стр. 114) — локальный
- `rightDate` (стр. 115) — локальный
- `selectedSettingsClientFilteredBookings` (стр. 120) — локальный
- `svc` (стр. 122) — локальный
- `selectedSettingsClientVehicles` (стр. 126) — локальный
- `selectedSettingsClientSpent` (стр. 131) — локальный
- `selectedSettingsClientCompletedCount` (стр. 134) — локальный
- `selectedSettingsClientUpcoming` (стр. 135) — локальный
- `selectedSettingsClientLastVisit` (стр. 136) — локальный
- `ownerStatusLabel` (стр. 138) — локальный
- `ownerStatusBadge` (стр. 149) — локальный
- `normalizeOwnerPhoneSearchValue` (стр. 160) — локальный
- `clientBookings` (стр. 227) — локальный
- `spent` (стр. 228) — локальный
- `lastBooking` (стр. 229) — локальный
- `leftDate` (стр. 230) — локальный
- `rightDate` (стр. 231) — локальный
- `clientDisplayName` (стр. 235) — локальный
- `clientPhone` (стр. 236) — локальный
- `pt` (стр. 360) — локальный
- `pt` (стр. 381) — локальный
- `isMain` (стр. 606) — локальный
- `client` (стр. 622) — локальный
- `current` (стр. 624) — локальный
- `selected` (стр. 634) — локальный
- `client` (стр. 668) — локальный
- `current` (стр. 670) — локальный
- `client` (стр. 714) — локальный
- `current` (стр. 716) — локальный
- `ownerPaymentLabel` (стр. 826) — локальный

### frontend/src/app/components/owner/screens/OwnerPiggyBankScreen.tsx (613 строк)

- `OwnerPiggyBankScreen` (стр. 59)
- `ownerStatusBadge` (стр. 111) — локальный
- `tabBalance` (стр. 163) — локальный
- `tabLabel` (стр. 166) — локальный
- `rem` (стр. 208) — локальный
- `otherWd` (стр. 351) — локальный
- `debtTxs` (стр. 418) — локальный
- `total` (стр. 422) — локальный
- `isOther` (стр. 448) — локальный
- `filteredTxs` (стр. 490) — локальный
- `isDeposit` (стр. 500) — локальный
- `txLabel` (стр. 501) — локальный
- `booking` (стр. 507) — локальный
- `handleClick` (стр. 508) — локальный
- `Wrapper` (стр. 515) — локальный
- `txRunningBalance` (стр. 516) — локальный

### frontend/src/app/components/owner/screens/OwnerStockPage.tsx (361 строк)

- `STOCK_UNITS` (стр. 8) — локальный
- `buildCategoryTree` (стр. 18) — локальный
- `map` (стр. 19) — локальный
- `node` (стр. 23) — локальный
- `sortRec` (стр. 27) — локальный
- `flattenCategories` (стр. 34) — локальный
- `tree` (стр. 35) — локальный
- `dfs` (стр. 37) — локальный
- `getDescendantIds` (стр. 43) — локальный
- `map` (стр. 44) — локальный
- `result` (стр. 46) — локальный
- `queue` (стр. 47) — локальный
- `visited` (стр. 48) — локальный
- `cur` (стр. 50) — локальный
- `children` (стр. 53) — локальный
- `collectSubtreeIds` (стр. 58) — локальный
- `ids` (стр. 59) — локальный
- `OwnerStockPage` (стр. 70)
- `isAccountant` (стр. 83) — локальный
- `categoryTree` (стр. 91) — локальный
- `flattenedForSelect` (стр. 92) — локальный
- `adminShiftPhotoUrlsRef` (стр. 103) — локальный
- `latestShiftChecklists` (стр. 105) — локальный
- `latestAdminShiftInspections` (стр. 106) — локальный
- `latestAdminShiftInspectionKey` (стр. 107) — локальный
- `totalStockValue` (стр. 109) — локальный
- `activeIds` (стр. 114) — локальный
- `currentPhotoUrls` (стр. 120) — локальный
- `missing` (стр. 121) — локальный
- `handleAddStock` (стр. 132) — локальный
- `qty` (стр. 134) — локальный
- `rawPrice` (стр. 135) — локальный
- `unitPrice` (стр. 136) — локальный
- `selectedCat` (стр. 137) — локальный
- `handleWriteOff` (стр. 144) — локальный
- `item` (стр. 146) — локальный
- `glass` (стр. 153) — локальный
- `sub` (стр. 154) — локальный
- `inputCls` (стр. 155) — локальный
- `selectCls` (стр. 156) — локальный
- `renderStockTree` (стр. 158) — локальный
- `allIds` (стр. 160) — локальный
- `subtreeItems` (стр. 161) — локальный
- `childContent` (стр. 163) — локальный
- `hasVisibleChild` (стр. 164) — локальный
- `cid` (стр. 165) — локальный
- `directItems` (стр. 179) — локальный
- `cat` (стр. 196) — локальный
- `renderCategoryManagerTree` (стр. 225) — локальный
- `descendantCount` (стр. 227) — локальный
- `withoutCat` (стр. 274) — локальный
- `InlineRename` (стр. 352) — локальный

### frontend/src/app/components/owner/screens/OwnerWalletScreen.tsx (254 строк)

- `OwnerWalletScreen` (стр. 35)

### frontend/src/app/components/shared/Atmosfera.tsx (7 строк)

- `RoleNavigation` (стр. 4)
- `WorkspaceHeader` (стр. 5)
- `MetricSurface` (стр. 6)
- `StatusPill` (стр. 7)

### frontend/src/app/components/shared/AttendanceTable.tsx (199 строк)

- `AttendanceTable` (стр. 34)
- `fetchData` (стр. 41) — локальный
- `result` (стр. 52) — локальный
- `result` (стр. 56) — локальный

### frontend/src/app/components/shared/EmptyState.tsx (18 строк)

- `EmptyState` (стр. 8)

### frontend/src/app/components/shared/RolePreviewSwitcher.tsx (242 строк)

- `RolePreviewSwitcher` (стр. 18)
- `primary` (стр. 27) — локальный
- `sub` (стр. 28) — локальный
- `panelBg` (стр. 29) — локальный
- `chipBg` (стр. 30) — локальный
- `hoverBg` (стр. 31) — локальный
- `isActivePreview` (стр. 33) — локальный
- `activeOption` (стр. 34) — локальный
- `handleStart` (стр. 36) — локальный
- `handleStop` (стр. 51) — локальный
- `toggleRole` (стр. 66) — локальный
- `renderRoleSection` (стр. 68) — локальный
- `roleActive` (стр. 69) — локальный
- `expanded` (стр. 70) — локальный
- `actorActive` (стр. 102) — локальный

### frontend/src/app/components/shared/ServiceSearchInput.tsx (34 строк)

- `ServiceSearchInput` (стр. 15)

### frontend/src/app/components/shared/ServiceSearchSelect.tsx (173 строк)

- `ServiceSearchSelect` (стр. 22)
- `containerRef` (стр. 38) — локальный
- `inputRef` (стр. 39) — локальный
- `selectedService` (стр. 41) — локальный
- `filtered` (стр. 43) — локальный
- `handleClickOutside` (стр. 48) — локальный
- `handleSelect` (стр. 57) — локальный
- `handleInputChange` (стр. 63) — локальный
- `handleInputFocus` (стр. 68) — локальный
- `q` (стр. 111) — локальный
- `q` (стр. 148) — локальный
- `CheckIcon` (стр. 167) — локальный

### frontend/src/app/components/shared/Skeleton.tsx (31 строк)

- `Skeleton` (стр. 6)
- `SkeletonRow` (стр. 11)
- `SkeletonRows` (стр. 25)

### frontend/src/app/components/shared/SourceBadge.tsx (21 строк)

- `sourceBadgeMeta` (стр. 3)
- `SourceBadge` (стр. 13)
- `badge` (стр. 14) — локальный

### frontend/src/app/components/worker/screens/WorkerEarningsScreen.tsx (345 строк)

- `DANGER` (стр. 19) — локальный
- `SUCCESS` (стр. 20) — локальный
- `WARNING` (стр. 21) — локальный
- `groupBookingsByDate` (стр. 23) — локальный
- `WorkerEarningsScreen` (стр. 45)
- `params` (стр. 66) — локальный
- `myPenalties` (стр. 82) — локальный
- `complaintState` (стр. 83) — локальный
- `glass` (стр. 87) — локальный
- `sub` (стр. 88) — локальный
- `shiftPay` (стр. 172) — локальный
- `bonuses` (стр. 173) — локальный
- `advances` (стр. 174) — локальный
- `deductions` (стр. 175) — локальный
- `adjustments` (стр. 176) — локальный
- `totalAccrued` (стр. 177) — локальный
- `totalDeducted` (стр. 178) — локальный

### frontend/src/app/components/worker/screens/WorkerProfileScreen.tsx (655 строк)

- `WorkerProfileScreen` (стр. 38)
- `isMyTask` (стр. 112) — локальный
- `allMyTasks` (стр. 116) — локальный
- `myEarnings` (стр. 117) — локальный
- `w` (стр. 120) — локальный
- `totalEarned` (стр. 129) — локальный
- `payrollSummary` (стр. 130) — локальный
- `earnedForDisplay` (стр. 131) — локальный
- `completedCount` (стр. 132) — локальный
- `myPenalties` (стр. 133) — локальный
- `complaintState` (стр. 134) — локальный
- `chemistryItems` (стр. 135) — локальный
- `handleSaveProfile` (стр. 138) — локальный
- `handleSubmitShiftChecklist` (стр. 144) — локальный
- `saved` (стр. 147) — локальный
- `handleSavePass` (стр. 162) — локальный
- `handleGenerateTelegramCode` (стр. 189) — локальный
- `handleSaveNotifications` (стр. 193) — локальный
- `glass` (стр. 200) — локальный
- `sub` (стр. 201) — локальный
- `primaryColor` (стр. 204) — локальный
- `accentColor` (стр. 205) — локальный
- `fmtDateTime` (стр. 207) — локальный
- `enabled` (стр. 458) — локальный
- `w` (стр. 504) — локальный

### frontend/src/app/components/worker/screens/WorkerScheduleScreen.tsx (168 строк)

- `WorkerScheduleScreen` (стр. 28)
- `loadCalendar` (стр. 40) — локальный
- `isMyTask` (стр. 59) — локальный
- `dayTasks` (стр. 84) — локальный
- `completed` (стр. 94) — локальный

### frontend/src/app/components/worker/screens/WorkerTodayScreen.tsx (214 строк)

- `WorkerTodayScreen` (стр. 25)
- `currentTask` (стр. 34) — локальный
- `nextTask` (стр. 35) — локальный
- `completedCount` (стр. 36) — локальный
- `inProgressCount` (стр. 37) — локальный
- `TaskCard` (стр. 148) — локальный
- `myExtras` (стр. 149) — локальный

### frontend/src/app/components/worker/shared/CarSearch.tsx (160 строк)

- `CarSearch` (стр. 20)
- `timer` (стр. 29) — локальный
- `params` (стр. 31) — локальный
- `assignedToMe` (стр. 109) — локальный

### frontend/src/app/components/worker/shared/EarningsCalendar.tsx (138 строк)

- `DAY_NAMES` (стр. 4) — локальный
- `MONTH_NAMES` (стр. 5) — локальный
- `formatDateKey` (стр. 7) — локальный
- `mm` (стр. 8) — локальный
- `dd` (стр. 9) — локальный
- `EarningsCalendar` (стр. 29)
- `now` (стр. 41) — локальный
- `calYear` (стр. 42) — локальный
- `calMonth` (стр. 43) — локальный
- `datesWithBookings` (стр. 45) — локальный
- `firstDay` (стр. 47) — локальный
- `lastDay` (стр. 48) — локальный
- `startPad` (стр. 49) — локальный
- `totalDays` (стр. 50) — локальный
- `selectedDayBookings` (стр. 56) — локальный
- `dateKey` (стр. 84) — локальный
- `hasBooking` (стр. 85) — локальный
- `isSelected` (стр. 86) — локальный
- `isToday` (стр. 87) — локальный

### frontend/src/app/components/worker/WorkerApp.tsx (743 строк)

- `workerStatusLabel` (стр. 22) — локальный
- `workerStatusBadge` (стр. 45) — локальный
- `workerPaymentLabel` (стр. 66) — локальный
- `bookingBasePrice` (стр. 72) — локальный
- `additionalTotal` (стр. 73) — локальный
- `servicesTotal` (стр. 74) — локальный
- `bookingBaseWorkerEarned` (стр. 79) — локальный
- `link` (стр. 80) — локальный
- `formatBookingInstant` (стр. 87) — локальный
- `date` (стр. 89) — локальный
- `WorkerApp` (стр. 95)
- `workerId` (стр. 112) — локальный
- `myNotifications` (стр. 141) — локальный
- `unreadCount` (стр. 142) — локальный
- `isMyTask` (стр. 144) — локальный
- `allTasks` (стр. 148) — локальный
- `todayTasks` (стр. 151) — локальный
- `formatTimer` (стр. 159) — локальный
- `glass` (стр. 161) — локальный
- `bg` (стр. 162) — локальный
- `text` (стр. 163) — локальный
- `sub` (стр. 164) — локальный
- `primary` (стр. 165) — локальный
- `accent` (стр. 166) — локальный
- `surface` (стр. 167) — локальный
- `handleStartTask` (стр. 169) — локальный
- `openFinishModal` (стр. 177) — локальный
- `handleFinish` (стр. 186) — локальный
- `nextNote` (стр. 192) — локальный
- `headerTitle` (стр. 232) — локальный
- `isMyService` (стр. 312) — локальный
- `isOutsource` (стр. 313) — локальный
- `myBaseLink` (стр. 361) — локальный
- `myAdditionalServices` (стр. 362) — локальный
- `baseEarned` (стр. 364) — локальный
- `additionalEarned` (стр. 365) — локальный
- `total` (стр. 366) — локальный
- `earned` (стр. 377) — локальный
- `created` (стр. 429) — локальный
- `started` (стр. 430) — локальный
- `completed` (стр. 431) — локальный
- `isActive` (стр. 509) — локальный

### frontend/src/app/components/worker/WorkerCalendar.tsx (615 строк)

- `WORKER_CALENDAR_WEEKDAYS` (стр. 26) — локальный
- `WORKER_CALENDAR_MONTHS` (стр. 27) — локальный
- `WORKER_CALENDAR_DEFAULT_OPEN` (стр. 31) — локальный
- `WORKER_CALENDAR_DEFAULT_CLOSE` (стр. 32) — локальный
- `WORKER_CALENDAR_LOAD_COLORS` (стр. 34) — локальный
- `workerParseBookingMinutes` (стр. 40) — локальный
- `match` (стр. 41) — локальный
- `hours` (стр. 43) — локальный
- `minutes` (стр. 44) — локальный
- `workerScheduleTimeToMinutes` (стр. 49) — локальный
- `workerMonthTitle` (стр. 53) — локальный
- `workerBuildMonthCells` (стр. 57) — локальный
- `year` (стр. 58) — локальный
- `month` (стр. 59) — локальный
- `first` (стр. 60) — локальный
- `offset` (стр. 62) — локальный
- `daysInMonth` (стр. 63) — локальный
- `date` (стр. 69) — локальный
- `workerCalendarDayHours` (стр. 78) — локальный
- `parsedDate` (стр. 79) — локальный
- `daySchedule` (стр. 83) — локальный
- `open` (стр. 87) — локальный
- `close` (стр. 88) — локальный
- `workerCalendarLoadTone` (стр. 92) — локальный
- `ratio` (стр. 94) — локальный
- `workerGroupBookingsByHour` (стр. 104) — локальный
- `timed` (стр. 109) — локальный
- `hourLabel` (стр. 112) — локальный
- `slotEnd` (стр. 113) — локальный
- `slotBookings` (стр. 114) — локальный
- `start` (стр. 116) — локальный
- `workerCalendarStatusLabel` (стр. 128) — локальный
- `workerCalendarStatusBadge` (стр. 149) — локальный
- `WorkerCalendar` (стр. 183)
- `now` (стр. 199) — локальный
- `relevantBookings` (стр. 204) — локальный
- `bookingsByDate` (стр. 205) — локальный
- `dateLabel` (стр. 206) — локальный
- `monthCells` (стр. 214) — локальный
- `monthLabel` (стр. 215) — локальный
- `monthLoads` (стр. 216) — локальный
- `monthMaxLoad` (стр. 219) — локальный
- `dayBookings` (стр. 221) — локальный
- `dayHours` (стр. 222) — локальный
- `hourSlots` (стр. 223) — локальный
- `untimedBookings` (стр. 224) — локальный
- `dayTitle` (стр. 225) — локальный
- `activeMasters` (стр. 231) — локальный
- `timeSlots` (стр. 232) — локальный
- `workerGrid` (стр. 233) — локальный
- `isMine` (стр. 242) — локальный
- `statusLine` (стр. 244) — локальный
- `workerNames` (стр. 245) — локальный
- `today` (стр. 289) — локальный
- `dayItems` (стр. 309) — локальный
- `loadTone` (стр. 310) — локальный
- `loadWidth` (стр. 311) — локальный
- `isToday` (стр. 314) — локальный
- `today` (стр. 389) — локальный
- `workerItems` (стр. 567) — локальный

### frontend/src/app/constants/referralSources.ts (8 строк)

- `REFERRAL_SOURCES` (стр. 1)

### frontend/src/app/context/AppContext.tsx (2186 строк)

- `EMPTY_CONTENT` (стр. 969)
- `timeToMinutes` (стр. 991) — локальный
- `minutesToTime` (стр. 998) — локальный
- `hours` (стр. 999) — локальный
- `minutes` (стр. 1000) — локальный
- `buildTimeSlots` (стр. 1004) — локальный
- `timeRangesOverlap` (стр. 1012) — локальный
- `AppContext` (стр. 1016) — локальный
- `normalizeWorker` (стр. 1018) — локальный
- `normalizeBootstrap` (стр. 1032) — локальный
- `AppProvider` (стр. 1056)
- `THEME_OVERRIDE_KEY` (стр. 1065) — локальный
- `readThemeOverride` (стр. 1066) — локальный
- `raw` (стр. 1068) — локальный
- `writeThemeOverride` (стр. 1074) — локальный
- `override` (стр. 1083) — локальный
- `upcomingDates` (стр. 1104) — локальный
- `todayLabel` (стр. 1105) — локальный
- `tomorrowLabel` (стр. 1106) — локальный
- `applyBootstrap` (стр. 1108) — локальный
- `normalized` (стр. 1109) — локальный
- `refreshBootstrap` (стр. 1138) — локальный
- `bootstrap` (стр. 1139) — локальный
- `startRolePreview` (стр. 1143) — локальный
- `bootstrap` (стр. 1147) — локальный
- `stopRolePreview` (стр. 1160) — локальный
- `bootstrap` (стр. 1164) — локальный
- `handleError` (стр. 1177) — локальный
- `message` (стр. 1178) — локальный
- `restoreSession` (стр. 1183) — локальный
- `bootstrap` (стр. 1185) — локальный
- `refreshActiveSessions` (стр. 1194) — локальный
- `applyTelegramTheme` (стр. 1198) — локальный
- `root` (стр. 1202) — локальный
- `theme` (стр. 1203) — локальный
- `cssVar` (стр. 1206) — локальный
- `tg` (стр. 1213) — локальный
- `logout` (стр. 1230) — локальный
- `loginClient` (стр. 1255) — локальный
- `bootstrap` (стр. 1259) — локальный
- `linkStaff` (стр. 1273) — локальный
- `bootstrap` (стр. 1277) — локальный
- `switchRole` (стр. 1291) — локальный
- `bootstrap` (стр. 1295) — локальный
- `updateClientProfile` (стр. 1309) — локальный
- `payload` (стр. 1310) — локальный
- `saved` (стр. 1311) — локальный
- `remindAdminAboutInactiveClients` (стр. 1315) — локальный
- `response` (стр. 1316) — локальный
- `addClient` (стр. 1320) — локальный
- `created` (стр. 1321) — локальный
- `normalized` (стр. 1322) — локальный
- `updateClientCard` (стр. 1327) — локальный
- `saved` (стр. 1328) — локальный
- `normalized` (стр. 1329) — локальный
- `deleteClient` (стр. 1333) — локальный
- `listDepositClients` (стр. 1338) — локальный
- `items` (стр. 1339) — локальный
- `getDepositOverview` (стр. 1343) — локальный
- `overview` (стр. 1344) — локальный
- `updateDepositSubscription` (стр. 1352) — локальный
- `overview` (стр. 1353) — локальный
- `depositTopUp` (стр. 1361) — локальный
- `txn` (стр. 1362) — локальный
- `depositAdjust` (стр. 1366) — локальный
- `overview` (стр. 1367) — локальный
- `depositRecordWash` (стр. 1375) — локальный
- `overview` (стр. 1376) — локальный
- `depositSettleMonth` (стр. 1384) — локальный
- `overview` (стр. 1385) — локальный
- `resolveOwnerExportDelivery` (стр. 1399) — локальный
- `failedCount` (стр. 1401) — локальный
- `downloadDepositExport` (стр. 1416) — локальный
- `downloadDepositExportAll` (стр. 1420) — локальный
- `sendDepositExport` (стр. 1424) — локальный
- `sendDepositExportAll` (стр. 1428) — локальный
- `addBooking` (стр. 1432) — локальный
- `created` (стр. 1433) — локальный
- `existingClient` (стр. 1453) — локальный
- `nextClient` (стр. 1454) — локальный
- `updateBooking` (стр. 1478) — локальный
- `updated` (стр. 1479) — локальный
- `deleteBooking` (стр. 1505) — локальный
- `addBookingService` (стр. 1510) — локальный
- `updated` (стр. 1511) — локальный
- `addBookingAdditionalService` (стр. 1531) — локальный
- `updated` (стр. 1532) — локальный
- `updateBookingAdditionalService` (стр. 1552) — локальный
- `updated` (стр. 1553) — локальный
- `removeBookingAdditionalService` (стр. 1573) — локальный
- `updated` (стр. 1574) — локальный
- `addNotification` (стр. 1594) — локальный
- `created` (стр. 1595) — локальный
- `markNotificationRead` (стр. 1614) — локальный
- `markAllNotificationsRead` (стр. 1619) — локальный
- `addStockItem` (стр. 1633) — локальный
- `created` (стр. 1634) — локальный
- `updateStockItem` (стр. 1638) — локальный
- `updated` (стр. 1639) — локальный
- `writeOffStock` (стр. 1643) — локальный
- `updated` (стр. 1644) — локальный
- `getWriteOffHistory` (стр. 1648) — локальный
- `deleteStockItem` (стр. 1652) — локальный
- `addStockCategory` (стр. 1657) — локальный
- `created` (стр. 1658) — локальный
- `updateStockCategory` (стр. 1662) — локальный
- `updated` (стр. 1663) — локальный
- `deleteStockCategory` (стр. 1667) — локальный
- `addExpense` (стр. 1676) — локальный
- `created` (стр. 1677) — локальный
- `addIncome` (стр. 1681) — локальный
- `created` (стр. 1682) — локальный
- `updateExpense` (стр. 1686) — локальный
- `updated` (стр. 1687) — локальный
- `updateIncome` (стр. 1691) — локальный
- `updated` (стр. 1692) — локальный
- `addPenalty` (стр. 1696) — локальный
- `revokePenalty` (стр. 1701) — локальный
- `revokeAllPenalties` (стр. 1706) — локальный
- `createTelegramLinkCode` (стр. 1711) — локальный
- `created` (стр. 1712) — локальный
- `downloadOwnerExport` (стр. 1716) — локальный
- `fallback` (стр. 1717) — локальный
- `qs` (стр. 1720) — локальный
- `qstr` (стр. 1725) — локальный
- `sendOwnerExportToTelegram` (стр. 1731) — локальный
- `fallback` (стр. 1732) — локальный
- `qs` (стр. 1735) — локальный
- `qstr` (стр. 1740) — локальный
- `sendOwnerSummaryReport` (стр. 1746) — локальный
- `response` (стр. 1747) — локальный
- `failedCount` (стр. 1751) — локальный
- `dispatchOwnerReminders` (стр. 1757) — локальный
- `saveServices` (стр. 1767) — локальный
- `saveBoxes` (стр. 1772) — локальный
- `saveSchedule` (стр. 1776) — локальный
- `saveAdminProfile` (стр. 1780) — локальный
- `saved` (стр. 1781) — локальный
- `saveAdminNotificationSettings` (стр. 1785) — локальный
- `saved` (стр. 1786) — локальный
- `saveWorkerProfile` (стр. 1790) — локальный
- `saved` (стр. 1791) — локальный
- `normalized` (стр. 1792) — локальный
- `saveWorkerNotificationSettings` (стр. 1799) — локальный
- `saved` (стр. 1800) — локальный
- `saveOwnerCompany` (стр. 1807) — локальный
- `saved` (стр. 1808) — локальный
- `saveOwnerNotificationSettings` (стр. 1812) — локальный
- `saved` (стр. 1813) — локальный
- `saveOwnerIntegrations` (стр. 1817) — локальный
- `saved` (стр. 1818) — локальный
- `saveOwnerSecurity` (стр. 1822) — локальный
- `saved` (стр. 1823) — локальный
- `saveWorkerSettings` (стр. 1827) — локальный
- `saved` (стр. 1828) — локальный
- `saveAdminWorkerPayroll` (стр. 1832) — локальный
- `saved` (стр. 1833) — локальный
- `normalized` (стр. 1834) — локальный
- `nextWorker` (стр. 1836) — локальный
- `saveContent` (стр. 1841) — локальный
- `saved` (стр. 1842) — локальный
- `createPayrollEntry` (стр. 1846) — локальный
- `checkConsent` (стр. 1851) — локальный
- `response` (стр. 1852) — локальный
- `submitConsent` (стр. 1856) — локальный
- `listShiftChecklists` (стр. 1860) — локальный
- `entries` (стр. 1861) — локальный
- `submitShiftChecklist` (стр. 1865) — локальный
- `entry` (стр. 1866) — локальный
- `listAdminShiftInspections` (стр. 1873) — локальный
- `entries` (стр. 1874) — локальный
- `submitAdminShiftInspection` (стр. 1882) — локальный
- `entry` (стр. 1889) — локальный
- `openShiftForMasters` (стр. 1900) — локальный
- `entry` (стр. 1901) — локальный
- `hireWorker` (стр. 1912) — локальный
- `created` (стр. 1913) — локальный
- `normalized` (стр. 1914) — локальный
- `fireWorker` (стр. 1924) — локальный
- `resetWorkerPassword` (стр. 1929) — локальный
- `changePassword` (стр. 1936) — локальный
- `requestOwnerDatabaseReset` (стр. 1943) — локальный
- `response` (стр. 1944) — локальный
- `approveOwnerDatabaseReset` (стр. 1961) — локальный
- `response` (стр. 1962) — локальный
- `executeOwnerDatabaseReset` (стр. 1978) — локальный
- `response` (стр. 1979) — локальный
- `getTimeSlotsForDate` (стр. 1987) — локальный
- `parsedDate` (стр. 1988) — локальный
- `day` (стр. 1990) — локальный
- `openMinutes` (стр. 1993) — локальный
- `closeMinutes` (стр. 1994) — локальный
- `durationMinutes` (стр. 1997) — локальный
- `scheduleSlots` (стр. 1998) — локальный
- `candidateBoxes` (стр. 1999) — локальный
- `boxNames` (стр. 2004) — локальный
- `slotStart` (стр. 2006) — локальный
- `slotEnd` (стр. 2008) — локальный
- `bookingStart` (стр. 2015) — локальный
- `getBookingAvailabilityForDate` (стр. 2022) — локальный

### frontend/src/app/hooks/useTelegramBackButton.ts (23 строк)

- `useTelegramBackButton` (стр. 4)
- `tg` (стр. 6) — локальный
- `btn` (стр. 7) — локальный

### frontend/src/app/hooks/useTelegramMainButton.ts (39 строк)

- `useTelegramMainButton` (стр. 4)
- `tg` (стр. 11) — локальный
- `btn` (стр. 12) — локальный

### frontend/src/app/hooks/useTelegramSetup.ts (15 строк)

- `useTelegramSetup` (стр. 11)

### frontend/src/app/utils/complaints.ts (44 строк)

- `MAX_WORKER_PERCENT` (стр. 3)
- `COMPLAINT_THRESHOLD` (стр. 4)
- `COMPLAINT_PERCENT_DEDUCTION` (стр. 5)
- `clampPercent` (стр. 9) — локальный
- `complaintEndAt` (стр. 13) — локальный
- `isComplaintActive` (стр. 20)
- `getComplaintPenaltyState` (стр. 24)
- `activeComplaints` (стр. 25) — локальный
- `endTimes` (стр. 26) — локальный
- `reductionActive` (стр. 29) — локальный
- `reductionUntil` (стр. 30) — локальный
- `normalizedBasePercent` (стр. 31) — локальный
- `effectivePercent` (стр. 32) — локальный

### frontend/src/app/utils/date.ts (73 строк)

- `formatDate` (стр. 1)
- `day` (стр. 2) — локальный
- `month` (стр. 3) — локальный
- `year` (стр. 4) — локальный
- `parseDate` (стр. 8)
- `parseFlexibleDate` (стр. 13)
- `parsed` (стр. 18) — локальный
- `parsed` (стр. 24) — локальный
- `combineDateTime` (стр. 30)
- `baseDate` (стр. 31) — локальный
- `next` (стр. 35) — локальный
- `isPastTimeSlot` (стр. 40)
- `bookingDate` (стр. 41) — локальный
- `current` (стр. 43) — локальный
- `getUpcomingDates` (стр. 48)
- `date` (стр. 50) — локальный
- `getScheduleDayIndex` (стр. 57)
- `startOfDay` (стр. 61)
- `next` (стр. 62) — локальный
- `getLastNDates` (стр. 67)
- `date` (стр. 69) — локальный

### frontend/src/app/utils/useVisualViewport.ts (46 строк)

- `useVisualViewport` (стр. 13)
- `vv` (стр. 15) — локальный
- `vv` (стр. 23) — локальный
- `handler` (стр. 26) — локальный
- `computeModalMaxHeight` (стр. 41)

### frontend/src/app/utils/validation.test.ts (115 строк)

- `full` (стр. 90) — локальный
- `old` (стр. 112) — локальный

### frontend/src/app/utils/validation.ts (166 строк)

- `CYR` (стр. 6) — локальный
- `NAME_PATTERN` (стр. 7) — локальный
- `REPEATED_LETTERS_PATTERN` (стр. 8) — локальный
- `VEHICLE_PATTERN` (стр. 9) — локальный
- `REPEATED_VEHICLE_PATTERN` (стр. 10) — локальный
- `PLATE_ALLOWED_LETTERS` (стр. 11) — локальный
- `PLATE_PATTERN` (стр. 40) — локальный
- `MOTORCYCLE_PLATE_PATTERN` (стр. 41) — локальный
- `normalizePersonName` (стр. 43)
- `validatePersonName` (стр. 47)
- `normalized` (стр. 48) — локальный
- `validatePhoneValue` (стр. 54)
- `digits` (стр. 55) — локальный
- `normalized` (стр. 57) — локальный
- `normalizeVehicleInput` (стр. 64)
- `validateVehicleName` (стр. 68)
- `normalized` (стр. 69) — локальный
- `lettersOnly` (стр. 70) — локальный
- `plateExpectedAtPosition` (стр. 79) — локальный
- `normalizePlateInput` (стр. 89)
- `expected` (стр. 99) — локальный
- `mapped` (стр. 101) — локальный
- `validatePlateValue` (стр. 118)
- `normalized` (стр. 120) — локальный
- `normalized` (стр. 128) — локальный
- `hasEmptyVehicles` (стр. 138) — локальный
- `isClientCardIncomplete` (стр. 143)
- `weekAgo` (стр. 153) — локальный
- `created` (стр. 154) — локальный

### frontend/src/main.tsx (6 строк)

## Carwash — лендинг (carwash/src)

### carwash/src/api.ts (42 строк)

- `API_BASE` (стр. 1) — локальный
- `fetchContent` (стр. 31)
- `res` (стр. 39) — локальный

### carwash/src/app/App.tsx (46 строк)

- `App` (стр. 13)
- `contactRef` (стр. 16) — локальный
- `handleBook` (стр. 18) — локальный

### carwash/src/app/components/Contact.tsx (283 строк)

- `Contact` (стр. 9)
- `handleSubmit` (стр. 28) — локальный

### carwash/src/app/components/figma/ImageWithFallback.tsx (27 строк)

- `ImageWithFallback` (стр. 6)
- `handleError` (стр. 9) — локальный

### carwash/src/app/components/Footer.tsx (95 строк)

- `Footer` (стр. 3)
- `year` (стр. 4) — локальный

### carwash/src/app/components/Hero.tsx (112 строк)

- `stats` (стр. 6) — локальный
- `Hero` (стр. 12)
- `scrollToServices` (стр. 13) — локальный

### carwash/src/app/components/Navbar.tsx (114 строк)

- `navLinks` (стр. 4) — локальный
- `Navbar` (стр. 12)
- `onScroll` (стр. 17) — локальный
- `handleNav` (стр. 22) — локальный
- `el` (стр. 24) — локальный

### carwash/src/app/components/Pricing.tsx (193 строк)

- `FALLBACK_PLANS` (стр. 6) — локальный
- `Pricing` (стр. 58)
- `plans` (стр. 59) — локальный
- `q` (стр. 73) — локальный
- `visiblePlans` (стр. 74) — локальный

### carwash/src/app/components/Services.tsx (200 строк)

- `Services` (стр. 59)
- `services` (стр. 60) — локальный
- `q` (стр. 62) — локальный
- `visibleServices` (стр. 63) — локальный
- `ServiceCard` (стр. 117) — локальный

### carwash/src/app/components/ServiceSearchInput.tsx (33 строк)

- `ServiceSearchInput` (стр. 13)

### carwash/src/app/components/Testimonials.tsx (134 строк)

- `reviews` (стр. 3) — локальный
- `Testimonials` (стр. 42)

### carwash/src/app/useContent.ts (16 строк)

- `useContent` (стр. 4)

### carwash/src/main.tsx (7 строк)

## Showcase — лендинг (Showcase/src)

### Showcase/src/app/App.tsx (23 строк)

- `App` (стр. 10)

### Showcase/src/app/components/BookingSection.tsx (215 строк)

- `services` (стр. 5) — локальный
- `vehicles` (стр. 14) — локальный
- `BookingSection` (стр. 16)
- `serviceRef` (стр. 22) — локальный
- `handleChange` (стр. 24) — локальный
- `handleSubmit` (стр. 28) — локальный
- `serviceFiltered` (стр. 39) — локальный

### Showcase/src/app/components/figma/ImageWithFallback.tsx (27 строк)

- `ImageWithFallback` (стр. 6)
- `handleError` (стр. 9) — локальный

### Showcase/src/app/components/Footer.tsx (91 строк)

- `Footer` (стр. 3)

### Showcase/src/app/components/GallerySection.tsx (155 строк)

- `photos` (стр. 5) — локальный
- `GallerySection` (стр. 43)

### Showcase/src/app/components/HeroSection.tsx (85 строк)

- `HeroSection` (стр. 4)

### Showcase/src/app/components/Navbar.tsx (87 строк)

- `Navbar` (стр. 4)
- `onScroll` (стр. 9) — локальный
- `links` (стр. 14) — локальный

### Showcase/src/app/components/PricingSection.tsx (171 строк)

- `plans` (стр. 6) — локальный
- `PricingSection` (стр. 58)
- `q` (стр. 60) — локальный
- `visiblePlans` (стр. 61) — локальный

### Showcase/src/app/components/ServiceSearchInput.tsx (33 строк)

- `ServiceSearchInput` (стр. 13)

### Showcase/src/app/components/ServicesSection.tsx (138 строк)

- `services` (стр. 6) — локальный
- `ServicesSection` (стр. 60)
- `q` (стр. 62) — локальный
- `visibleServices` (стр. 63) — локальный
- `Icon` (стр. 102) — локальный
- `colorCls` (стр. 103) — локальный

### Showcase/src/app/components/TestimonialsSection.tsx (111 строк)

- `testimonials` (стр. 4) — локальный
- `TestimonialsSection` (стр. 49)

### Showcase/src/main.tsx (7 строк)

## API (Vercel serverless)

### api/index.py (1 строк)

## Native (Electron)

### native/electron/src/main.js (200 строк)

- `path` (стр. 3) — локальный
- `net` (стр. 4) — локальный
- `PORT` (стр. 7) — локальный
- `BACKEND_URL` (стр. 8) — локальный
- `urlPolicy` (стр. 9) — локальный
- `resolveBackendDir` (стр. 18) — локальный
- `projectRoot` (стр. 23) — локальный
- `backendExeName` (стр. 27) — локальный
- `waitForPort` (стр. 31) — локальный
- `start` (стр. 33) — локальный
- `check` (стр. 34) — локальный
- `sock` (стр. 39) — локальный
- `killBackendTree` (стр. 56) — локальный
- `startBackend` (стр. 81) — локальный
- `backendDir` (стр. 82) — локальный
- `exe` (стр. 83) — локальный
- `createWindow` (стр. 109) — локальный
- `isThisWindow` (стр. 148) — локальный
- `cancel` (стр. 149) — локальный

### native/electron/src/url-policy.js (41 строк)

- `parseSafeUrl` (стр. 3) — локальный
- `url` (стр. 6) — локальный
- `createUrlPolicy` (стр. 14) — локальный
- `internalOrigins` (стр. 15) — локальный
- `isInternal` (стр. 20) — локальный
- `url` (стр. 21) — локальный
- `isExternal` (стр. 25) — локальный
- `url` (стр. 26) — локальный
- `classify` (стр. 32) — локальный

### native/electron/test/url-policy.test.js (38 строк)

- `test` (стр. 3) — локальный
- `assert` (стр. 4) — локальный
- `policy` (стр. 7) — локальный

## Скрипты и корневые файлы

- `scripts/generate_project_map.py`
- `scripts/repair_source_mojibake.py`
- `_tmp_db_check.py`
- `_tmp_worker_session_test.py`
- `app.py`
- `flip_push_permission.py`

## Недавно изменённые файлы

- `audit/FINDINGS.md` (2026-09-04 08:02)
- `backend/migrations/add_referral_source.py` (2026-09-04 08:01)
- `backend/migrations/sync_client_schema.py` (2026-09-04 08:01)
- `backend/migrations/migrate_additional_services.py` (2026-09-04 08:01)
- `backend/migrations/_common.py` (2026-09-04 08:01)
- `backend/migrations/change_int_to_float.py` (2026-09-04 08:01)
- `backend/migrations/add_pay_type_to_workers.py` (2026-09-04 08:01)
- `backend/migrations/add_service_times.py` (2026-09-04 08:01)
- `backend/migrations/add_write_off_booking_fields.py` (2026-09-04 08:01)
- `scripts/.project-map-watch.lock` (2026-09-04 07:54)
- `backend/tests/test_performance_wave3.py` (2026-09-03 22:28)
- `frontend/vite.config.ts` (2026-09-03 22:27)
- `backend/app/main.py` (2026-09-03 22:24)
- `audit/scripts/migration_idempotency.py` (2026-09-03 22:23)
- `backend/migrations/add_performance_indexes.py` (2026-09-03 22:22)
