# PROJECT_MAP — карта проекта

> Автосгенерировано 2026-08-22 15:07 UTC. **НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.**

**Обновление:**

```
python scripts/generate_project_map.py            # один раз
scripts\watch-project-map.bat                    # фоновый вотчер (перезапускается при изменениях)
python scripts/generate_project_map.py --install-hook  # git pre-commit хук (обновляет карту при коммите)
```

## Статистика

- Файлов кода: **453**
- Строк кода: **200 369**
- По расширениям: `.js`: 3, `.mjs`: 4, `.py`: 148, `.ts`: 33, `.tsx`: 265

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
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── complaints.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── date_utils.py
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
│   │   ├── add_materials_written_off.py
│   │   ├── add_pay_type_to_workers.py
│   │   ├── add_plate_type.py
│   │   ├── add_referral_source.py
│   │   ├── add_service_times.py
│   │   ├── add_stock_write_offs.py
│   │   ├── add_write_off_booking_fields.py
│   │   ├── change_int_to_float.py
│   │   ├── finance_consistency.py
│   │   ├── migrate_additional_services.py
│   │   └── sync_client_schema.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_additional_service_validation.py
│   │   ├── test_archive.py
│   │   ├── test_attendance_endpoints.py
│   │   ├── test_booking_logic.py
│   │   ├── test_booking_money_split.py
│   │   ├── test_bot_help.py
│   │   ├── test_broadcast_edge_cases.py
│   │   ├── test_config.py
│   │   ├── test_content.py
│   │   ├── test_database_config.py
│   │   ├── test_deposit.py
│   │   ├── test_finance_batch3.py
│   │   ├── test_finance_calculations.py
│   │   ├── test_finance_edit.py
│   │   ├── test_finance_integration_batch3.py
│   │   ├── test_finance_migration.py
│   │   ├── test_google_calendar.py
│   │   ├── test_google_calendar_api.py
│   │   ├── test_google_calendar_pull.py
│   │   ├── test_html_and_headers.py
│   │   ├── test_income_endpoints.py
│   │   ├── test_owner_export_stock_decimal.py
│   │   ├── test_owner_masters.py
│   │   ├── test_owner_salary_asvc_only.py
│   │   ├── test_piggy_bank_adjust.py
│   │   ├── test_security_hardening.py
│   │   ├── test_upload_security.py
│   │   ├── test_worker_additional_services.py
│   │   ├── test_worker_calendar.py
│   │   └── test_worker_car_search.py
│   ├── .env.example
│   ├── bot.py
│   ├── requirements.txt
│   ├── run.py
│   ├── tmp_repro_slot_bug.py
│   └── tmp_verify_fix.py
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
├── frontend/
│   ├── guidelines/
│   │   └── Guidelines.md
│   ├── public/
│   │   └── google2855e110d983d030.html
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── AdminApp.tsx
│   │   │   │   │   └── ContentEditor.tsx
│   │   │   │   ├── client/
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
│   │   │   │   │   ├── _OwnerApp.work.bak.tsx
│   │   │   │   │   ├── DepositPanel.tsx
│   │   │   │   │   └── OwnerApp.tsx
│   │   │   │   ├── shared/
│   │   │   │   │   ├── Atmosfera.tsx
│   │   │   │   │   ├── AttendanceTable.tsx
│   │   │   │   │   ├── ServiceSearchInput.tsx
│   │   │   │   │   ├── ServiceSearchSelect.tsx
│   │   │   │   │   └── SourceBadge.tsx
│   │   │   │   ├── ui/
│   │   │   │   │   └── (48 shadcn/ui-файлов — не индексируются)
│   │   │   │   └── worker/
│   │   │   │       ├── WorkerApp.tsx
│   │   │   │       └── WorkerCalendar.tsx
│   │   │   ├── constants/
│   │   │   │   └── referralSources.ts
│   │   │   ├── context/
│   │   │   │   └── AppContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTelegramBackButton.ts
│   │   │   │   └── useTelegramMainButton.ts
│   │   │   ├── utils/
│   │   │   │   ├── complaints.ts
│   │   │   │   ├── date.ts
│   │   │   │   ├── useVisualViewport.ts
│   │   │   │   └── validation.ts
│   │   │   ├── api.ts
│   │   │   └── App.tsx
│   │   ├── imports/
│   │   │   └── pasted_text/
│   │   │       └── telegram-webapp-design.txt
│   │   ├── styles/
│   │   │   ├── fonts.css
│   │   │   ├── index.css
│   │   │   ├── tailwind.css
│   │   │   └── theme.css
│   │   └── main.tsx
│   ├── .env.desktop
│   ├── .env.example
│   ├── ATTRIBUTIONS.md
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── README.md
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
│       │   │   │   │   ├── ServiceSearchInput.tsx
│       │   │   │   │   ├── ServiceSearchSelect.tsx
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
├── .env.local
├── .gitignore
├── .python-version
├── .vercelignore
├── _admin_excerpt.txt
├── _client_excerpt.txt
├── _owner_excerpt.txt
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
├── render.yaml
├── requirements.txt
├── start-native.bat
├── task.id
├── task.status
├── tmp_list_routes.py
├── tmp_seed_view.py
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

### backend/app/config.py (273 строк)

Классы и функции (10):

- `class Settings: app_name: str environment: str is_production: bool app_secret: str telegram_bot_token: str | None webapp` (стр. 34)
- `_parse_booldef _parse_bool(raw: str | None, default: bool) -> bool: if raw is None: return default return raw.strip().lower() in {"1", "true", "yes", "on"}` (стр. 65)
- `_parse_positive_intdef _parse_positive_int(name: str, raw: str | None, default: int) -> int: try: value = int(raw) if raw is not None else default except ValueError as exc: raise RuntimeError(f"{name` (стр. 71)
- `_parse_telegram_delivery_modedef _parse_telegram_delivery_mode(raw: str | None) -> str: value = (raw or "polling").strip().lower() if value not in {"polling", "webhook"}: raise ValueError("TELEGRAM_DELIVERY_MO` (стр. 81)
- `_normalize_webhook_pathdef _normalize_webhook_path(raw: str | None) -> str: value = (raw or "/api/telegram/webhook").strip() or "/api/telegram/webhook" if not value.startswith("/"):` (стр. 88)
- `_normalize_database_urldef _normalize_database_url(raw: str) -> str: if raw.startswith("postgres://"):` (стр. 95)
- `_normalize_environmentdef _normalize_environment() -> tuple[str, bool]: raw = ( os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or os.getenv("VERCEL_ENV") or "development" ).strip().lower() aliases = {` (стр. 103)
- `_parse_cors_originsdef _parse_cors_origins(raw: str, *, strong_environment: bool) -> tuple[str, ...]: origins = tuple(dict.fromkeys(origin.strip().rstrip("/") for origin in raw.split(",") if origin.s` (стр. 120)
- `_parse_permanent_telegram_ownersdef _parse_permanent_telegram_owners(raw: str | None) -> tuple[tuple[str, str, str, str], ...]: if not raw: return () try: items = json.loads(raw) except json.JSONDecodeError as ex` (стр. 137)
- `get_settingsdef get_settings() -> Settings: PERSISTENT_DATA_DIR.mkdir(parents=True, exist_ok=True) environment, is_production = _normalize_environment() strong_environment = environment in _ST` (стр. 172)

### backend/app/date_utils.py (36 строк)

Классы и функции (3):

- `parse_dmydef parse_dmy(value: str) -> date: """Strictly parse a real DD.MM.YYYY calendar date.""" if not isinstance(value, str):` (стр. 6)
- `parse_date_paramdef parse_date_param(value: str) -> date: """Accept strict DD.MM.YYYY or ISO YYYY-MM-DD query dates.""" try: return parse_dmy(value) except ValueError: parsed = date.fromisoformat(` (стр. 23)
- `validate_rangedef validate_range(date_from: date, date_to: date) -> None: if date_from > date_to: raise ValueError("date_from must not be after date_to")` (стр. 34)

### backend/app/exports.py (3158 строк)

Классы и функции (42):

- `class ExportMetric: label: str value: str @dataclass(frozen=True)` (стр. 92)
- `class OwnerExportData: owner_name: str company_name: str generated_at: datetime period_from: str period_to: str …` (стр. 104)
- `class GeneratedExport: file_name: str media_type: str content: bytes telegram_caption: str ReportPeriod = Literal["daily` (стр. 142)
- `class OwnerSummaryReport: title: str message: str @dataclass(frozen=True)` (стр. 166)
- `class OwnerSummaryContext: company_name: str generated_at: datetime period: ReportPeriod segment: ReportSegment period_l` (стр. 178)
- `class OwnerSummaryExportData: owner_name: str company_name: str title: str generated_at: datetime period_label: str …` (стр. 202)
- `build_owner_summary_reportdef build_owner_summary_report( *, company_name: str, bookings: list[Booking], services: list[Service], expenses: list[Expense] | None = None, incomes: list[Income] | None = None, ` (стр. 240)
- `OwnerSummaryExportData._parse_ddmmyyyydef _parse_ddmmyyyy(value: str) -> datetime | None: try: return datetime.strptime(value.strip(), "%d.%m.%Y") except ValueError: return None` (стр. 312)
- `OwnerSummaryExportData._in_perioddef _in_period(date_str: str) -> bool: dt = _parse_ddmmyyyy(date_str) if dt is None: return False # Сравниваем без timezone (period_start/end могут быть aware) ps = period_start.re` (стр. 324)
- `build_owner_summary_exportdef build_owner_summary_export( *, owner: StaffUser, company_name: str, bookings: list[Booking], services: list[Service], penalties: list[Penalty] | None = None, piggy_transactions` (стр. 492)
- `_build_owner_summary_contextdef _build_owner_summary_context( *, company_name: str, bookings: list[Booking], services: list[Service], period: ReportPeriod, segment: ReportSegment, now: datetime | None = None,` (стр. 584)
- `_summary_headerdef _summary_header(context: OwnerSummaryContext) -> str: return f"{context.company_name}\n{context.title}\nПериод: {context.period_label}"` (стр. 668)
- `_build_owner_summary_export_datadef _build_owner_summary_export_data( *, owner_name: str, context: OwnerSummaryContext, penalties: list[Penalty] | None = None, db: Session | None = None,` (стр. 676)
- `_summary_period_boundsdef _summary_period_bounds(period: ReportPeriod, current: datetime) -> tuple[datetime, datetime, str]: end_at = current.replace(hour=0, minute=0, second=0, microsecond=0) + timedel` (стр. 1514)
- `_summary_period_labeldef _summary_period_label(period_start: datetime, period_end: datetime) -> str: last_day = period_end - timedelta(days=1) if period_start.date() == last_day.date():` (стр. 1532)
- `_booking_matches_segmentdef _booking_matches_segment(booking: Booking, service: Service | None, segment: ReportSegment) -> bool: if service is not None and service.category: category = service.category.st` (стр. 1546)
- `build_owner_exportdef build_owner_export( *, kind: ExportKind, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUse` (стр. 1572)
- `_build_export_datadef _build_export_data( *, owner: StaffUser, company_name: str, bookings: list[Booking], expenses: list[Expense], penalties: list[Penalty], workers: list[StaffUser], stock_items: l` (стр. 1664)
- `OwnerSummaryExportData._is_fixed_bookingdef _is_fixed_booking(booking: Booking) -> bool: # привязка строго по названию — "подготовка к полировке" всегда фиксированная if is_fixed_master_service(booking.service):` (стр. 1748)
- `_render_excel_reportdef _render_excel_report(data: OwnerExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1") summary["A1"] = data` (стр. 2282)
- `_render_owner_summary_excel_reportdef _render_owner_summary_excel_report(data: OwnerSummaryExportData) -> bytes: workbook = Workbook() summary = workbook.active summary.title = "Сводка" summary.merge_cells("A1:D1")` (стр. 2350)
- `_append_sheetdef _append_sheet(workbook: Workbook, title: str, headers: list[str], rows: list[list[Any]], *, currency_cols: set[int] | None = None) -> None: sheet = workbook.create_sheet(title)` (стр. 2526)
- `_render_pdf_reportdef _render_pdf_report(data: OwnerExportData) -> bytes: buffer = io.BytesIO() font_name = _pdf_font_name() styles = getSampleStyleSheet() title_style = ParagraphStyle("OwnerTitle",` (стр. 2556)
- `_pdf_sectiondef _pdf_section(story: list[Any], section_style: ParagraphStyle, font_name: str, title: str, headers: list[str], rows: list[list[Any]]) -> None: story.append(Paragraph(title, sect` (стр. 2642)
- `_pdf_tabledef _pdf_table(rows: list[list[Any]], font_name: str, header_color: str = "#0E1624") -> LongTable: normalized = [[Paragraph(_escape(str(cell)), _pdf_cell_style(font_name)) for cell` (стр. 2658)
- `_format_rowsdef _format_rows(rows: list[list[Any]], *, currency_cols: set[int]) -> list[list[Any]]: formatted: list[list[Any]] = [] for row in rows: next_row = [] for index, value in enumerate` (стр. 2698)
- `_style_headingdef _style_heading(sheet, *cells: str) -> None: if cells: sheet[cells[0]].font = Font(size=16, bold=True, color="0B1226") for cell_name in cells[1:]: sheet[cell_name].font = Font(s` (стр. 2728)
- `_style_tabledef _style_table(sheet, header_row: int, start_row: int, end_row: int, end_col: int) -> None: header_fill = PatternFill(fill_type="solid", fgColor="0A84FF") header_font = Font(bold` (стр. 2742)
- `_apply_currencydef _apply_currency(cell) -> None: cell.number_format = '#,##0 "руб."' cell.alignment = Alignment(horizontal="right", vertical="center")` (стр. 2784)
- `_autosizedef _autosize(sheet) -> None: for column in sheet.columns: letter = get_column_letter(column[0].column) max_length = 0 for cell in column: max_length = max(max_length, len("" if ce` (стр. 2794)
- `_pdf_font_namedef _pdf_font_name() -> str: candidates = [ str(Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSans-Regular.ttf"), os.getenv("OWNER_EXPORT_FONT_PATH", ""), "C:/Windows` (стр. 2814)
- `_pdf_cell_styledef _pdf_cell_style(font_name: str) -> ParagraphStyle: return ParagraphStyle("OwnerExportCell", fontName=font_name, fontSize=7.5, leading=9, textColor=colors.HexColor("#111827"))` (стр. 2864)
- `_booking_datetimedef _booking_datetime(booking: Booking) -> datetime | None: raw = f"{booking.date} {booking.time}".strip() for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M"):` (стр. 2872)
- `_booking_sort_keydef _booking_sort_key(booking: Booking) -> tuple[datetime, datetime]: local_now = datetime.now().astimezone() booking_dt = _booking_datetime(booking) primary = _as_local_datetime(b` (стр. 2892)
- `_as_local_datetimedef _as_local_datetime(value: datetime, reference: datetime) -> datetime: target_tz = reference.tzinfo if value.tzinfo is None: return value.replace(tzinfo=target_tz) return value.` (стр. 2908)
- `_parse_date_for_sortdef _parse_date_for_sort(value: str) -> datetime: for fmt in ("%d.%m.%Y", "%Y-%m-%d"):` (стр. 2922)
- `_format_datetimedef _format_datetime(value: datetime | None) -> str: if value is None: return "" return value.astimezone().strftime("%d.%m.%Y %H:%M") if value.tzinfo is not None else value.strftim` (стр. 2940)
- `_format_moneydef _format_money(value: int) -> str: return f"{value:,.0f}".replace(",", " ") + " руб."` (стр. 2952)
- `_escapedef _escape(value: str) -> str: return escape(value).replace("\n", "<br/>")` (стр. 2960)
- `build_deposit_exportdef build_deposit_export( db: Any, client: Client, overview: Any,` (стр. 2973)
- `OwnerSummaryExportData.moneydef money(value: float) -> str: return f"{float(value):,.0f} ₽".replace(",", " ")` (стр. 2988)
- `build_deposit_export_alldef build_deposit_export_all( db: Any, *, date_from: str | None = None, date_to: str | None = None,` (стр. 3072)

### backend/app/finance.py (56 строк)

Классы и функции (4):

- `moneydef money(value: object) -> Decimal: """Convert through text and round monetary values consistently.""" return Decimal(str(value or 0)).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_` (стр. 10)
- `money_intdef money_int(value: object) -> int: return int(money(value).quantize(Decimal(1), rounding=ROUND_HALF_UP))` (стр. 15)
- `prorated_monthly_salarydef prorated_monthly_salary(monthly_salary: object, date_from: date, date_to: date) -> Decimal: """Prorate a monthly salary over inclusive calendar dates, month by month.""" if dat` (стр. 19)
- `salary_base_for_perioddef salary_base_for_period( monthly_salary: object, date_from: date, date_to: date, *, period: str, today: date | None = None,` (стр. 36)

### backend/app/finance_sync.py (44 строк)

Классы и функции (1):

- `sync_expense_piggy_transactiondef sync_expense_piggy_transaction(db: Session, expense: Expense) -> None: """Keep the single piggy transaction linked to an expense in sync.""" transaction = db.scalar( select(Pig` (стр. 14)

### backend/app/google_calendar.py (1533 строк)

Классы и функции (50):

- `_appsetting_modeldef _appsetting_model(): """Ленивый импорт модели AppSetting (обход циклических зависимостей).""" global _AppSetting if _AppSetting is None: from .models import AppSetting _AppSett` (стр. 54)
- `is_configureddef is_configured(settings: Settings, db: Any = None) -> bool: """True, если заданы учётные данные Google Calendar. Учётные данные берутся из БД (заполняются владельцем через UI), ` (стр. 64)
- `load_credentialsdef load_credentials(db: Any) -> dict[str, Any]: """Вернуть учётные данные OAuth-клиента из БД или пустой dict. Владелец может ввести client_id/secret прямо в интерфейсе настроек (` (стр. 74)
- `save_credentialsdef save_credentials(db: Any, credentials: dict[str, Any]) -> None: """Сохранить учётные данные OAuth-клиента (upsert).""" AppSetting = _appsetting_model() row = db.get(AppSetting,` (стр. 88)
- `clear_credentialsdef clear_credentials(db: Any) -> None: """Удалить сохранённые в БД учётные данные OAuth-клиента.""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALENDAR_CREDE` (стр. 100)
- `_resolve_credsdef _resolve_creds( db: Any, settings: Settings, *, fallback_redirect_uri: str = "",` (стр. 109)
- `load_tokensdef load_tokens(db: Any) -> dict[str, Any]: """Вернуть OAuth-токены владельца или пустой dict. Совместимость: токены, сохранённые старыми версиями (сырой ответ token-эндпоинта Goog` (стр. 141)
- `save_tokensdef save_tokens(db: Any, tokens: dict[str, Any]) -> None: """Сохранить OAuth-токены владельца (upsert).""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALENDAR` (стр. 160)
- `clear_tokensdef clear_tokens(db: Any) -> None: """Отключить интеграцию: удалить токены и состояние синхронизации.""" AppSetting = _appsetting_model() for key in ( GOOGLE_CALENDAR_TOKENS_KEY, G` (стр. 172)
- `_is_token_revoked_errordef _is_token_revoked_error(exc: _GoogleApiError) -> bool: """True, если ошибка — истёкший/отозванный токен (нужен повторный OAuth). Google возвращает 400 invalid_grant с описанием` (стр. 195)
- `_disable_integration_on_revokeddef _disable_integration_on_revoked(db: Any) -> None: """Отключить Google Calendar при отозванном токене: чистим токены и флаг. Вызывается, когда refresh_token истёк/отозван — даль` (стр. 217)
- `_client_configdef _client_config(settings: Settings) -> dict[str, Any]: """Базовый client_config для построения OAuth-запросов.""" redirect_uri = settings.google_calendar_redirect_uri return { "` (стр. 241)
- `build_auth_urldef build_auth_url( settings: Settings, state: str, db: Any = None, *, fallback_redirect_uri: str = ""` (стр. 251)
- `exchange_codedef exchange_code( settings: Settings, code: str, db: Any = None, *, fallback_redirect_uri: str = ""` (стр. 273)
- `class _GoogleApiError(Exception):` (стр. 305)
- `_GoogleApiError.__init__def __init__( self, status: int, message: str = "", *, reason: str | None = None, details: str | None = None,` (стр. 313)
- `_google_error_from_responsedef _google_error_from_response(resp: Any) -> tuple[str | None, str | None]: """Извлечь (reason, details) из тела ошибки Google API, если возможно. Calendar API: {"error": {"reason` (стр. 327)
- `_refresh_access_tokendef _refresh_access_token( settings: Settings, tokens: dict[str, Any], db: Any = None` (стр. 351)
- `_calendar_requestdef _calendar_request( db: Any, settings: Settings, method: str, path: str, *, params: dict[str, Any] | None = None, body: dict[str, Any] | None = None, _retried: bool = False,` (стр. 376)
- `_source_labeldef _source_label(source: Any) -> str: """Подпись источника записи для Google-события.""" return SOURCE_LABELS.get(source or "", "CRM")` (стр. 427)
- `_booking_event_bodydef _booking_event_body(booking: Any, settings: Settings) -> dict[str, Any]: """Сформировать тело Google-события из записи Booking.""" from zoneinfo import ZoneInfo # type: ignore ` (стр. 432)
- `sync_booking_to_calendardef sync_booking_to_calendar( db: Any, settings: Settings, booking: Any, *, action: str = "upsert"` (стр. 474)
- `_sync_booking_to_calendar_impldef _sync_booking_to_calendar_impl( db: Any, settings: Settings, booking: Any, *, action: str` (стр. 508)
- `_load_sync_tokendef _load_sync_token(db: Any) -> str | None: """Текущий syncToken инкрементальной синхронизации или None.""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALEND` (стр. 573)
- `_save_sync_tokendef _save_sync_token(db: Any, sync_token: str | None) -> None: """Сохранить syncToken (upsert). None — сброс к полному скану.""" AppSetting = _appsetting_model() row = db.get(AppSe` (стр. 582)
- `last_sync_atdef last_sync_at(db: Any) -> str | None: """ISO-метка последней успешной обратной синхронизации или None.""" AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALEND` (стр. 596)
- `_save_last_syncdef _save_last_sync(db: Any) -> None: AppSetting = _appsetting_model() row = db.get(AppSetting, GOOGLE_CALENDAR_LAST_SYNC_KEY) now = datetime.now(timezone.utc).isoformat() if row i` (стр. 605)
- `_parse_google_datetimedef _parse_google_datetime(raw: str) -> datetime | None: """RFC3339 (dateTime или date) -> aware datetime, или None."""` (стр. 617)
- `_event_start_enddef _event_start_end( event: dict[str, Any], settings: Settings` (стр. 625)
- `_parse_event_descriptiondef _parse_event_description(description: Any) -> dict[str, str]: """Извлечь поля «Ключ: значение» из описания Google-события.""" fields: dict[str, str] = {} if not description: re` (стр. 650)
- `_extract_plate_from_textdef _extract_plate_from_text(text: str) -> str: """Найти госномер в свободном тексте (или пустую строку). Сначала российские (авто + мото), затем иностранные. Иностранные распознаё` (стр. 794)
- `_extract_phone_from_textdef _extract_phone_from_text(text: str) -> str: """Найти российский мобильный телефон в свободном тексте (или пустую строку). Перебор всех подстрок 10-11 цифр: соседние цифры (напр` (стр. 818)
- `_extract_name_from_textdef _extract_name_from_text(text: str) -> str: """Найти имя клиента по словарю русских имён (или пустую строку).""" for token in re.findall(r"[А-ЯЁа-яё]+", text):` (стр. 842)
- `_is_plausible_namedef _is_plausible_name(word: str) -> bool: """Подходит ли слово на роль имени клиента (кириллица, не служебное).""" if not re.fullmatch(r"[А-ЯЁа-яё]+", word):` (стр. 851)
- `_extract_name_by_phone_neighborhooddef _extract_name_by_phone_neighborhood(text: str, phone: str) -> str: """Определить имя клиента по соседству с телефоном (или пустую строку). Когда у события есть свободный текст,` (стр. 862)
- `_title_case_wordsdef _title_case_words(value: str) -> str: """Привести каждое слово к виду «С заглавной», сохранив аббревиатуры. «тойота камри» -> «Тойота Камри», «BMW x5» -> «BMW X5», «BMW» остане` (стр. 887)
- `_extract_vehicle_from_textdef _extract_vehicle_from_text(text: str) -> str: """Найти марку и модель автомобиля в свободном тексте (или пустую строку).""" from .schemas import normalize_vehicle_name lowered ` (стр. 901)
- `_normalize_for_matchdef _normalize_for_match(value: str) -> str: """Нижний регистр без «ё» и лишних пробелов — для сопоставления названий.""" return re.sub(r"\s+", " ", value.lower().replace("ё", "е")` (стр. 939)
- `_match_service_in_textdef _match_service_in_text(service_names: list[str], text: str) -> str: """Найти услугу из каталога в тексте; вернуть пусто, если нет. Сопоставляем по префиксу названия услуги (от ` (стр. 944)
- `_parse_event_text_loosedef _parse_event_text_loose(text: Any, service_names: list[str]) -> dict[str, str]: """Определить поля (госномер, телефон, имя, авто, услуга) из свободного текста. Данные могут идт` (стр. 975)
- `_active_service_namesdef _active_service_names(db: Any) -> list[str]: """Названия активных услуг из каталога — для распознавания в тексте события.""" from .models import Service return [row.name for ro` (стр. 1047)
- `_booking_by_google_eventdef _booking_by_google_event(db: Any, event_id: str) -> Any | None: from .models import Booking return db.query(Booking).filter(Booking.google_event_id == event_id).first()` (стр. 1054)
- `_event_updated_utcdef _event_updated_utc(event: dict[str, Any]) -> datetime | None: """Метка «когда событие последний раз правилось» (event.updated) в UTC.""" raw = event.get("updated") if not raw: ` (стр. 1060)
- `_event_is_staledef _event_is_stale(event: dict[str, Any], booking: Any) -> bool: """Правилось ли событие ПОЗЖЕ последней записи записи в Google. True — событие не менялось после того, как запись ` (стр. 1071)
- `_update_booking_from_eventdef _update_booking_from_event( db: Any, booking: Any, event: dict[str, Any], settings: Settings` (стр. 1090)
- `_find_duplicate_bookingdef _find_duplicate_booking( db: Any, client_id: str, date: str, time: str` (стр. 1202)
- `_create_booking_from_eventdef _create_booking_from_event( db: Any, event: dict[str, Any], settings: Settings` (стр. 1227)
- `_apply_calendar_eventdef _apply_calendar_event( db: Any, settings: Settings, event: dict[str, Any], result: dict[str, Any]` (стр. 1349)
- `pull_calendar_changesdef pull_calendar_changes(db: Any, settings: Settings) -> dict[str, Any]: """Обратная синхронизация «Google Calendar -> CRM». Инкрементальная через syncToken (Google Calendar API).` (стр. 1387)
- `_pull_calendar_changes_impldef _pull_calendar_changes_impl(db: Any, settings: Settings) -> dict[str, Any]: result: dict[str, Any] = { "ok": True, "skipped": False, "created": 0, "updated": 0, "cancelled": 0,` (стр. 1448)

### backend/app/main.py (21612 строк)

Роуты (128):

```
  `POST /api/auth/client` -> `register_or_login_client` (декоратор: стр. 5603)
  `POST /api/auth/staff/login` -> `staff_login` (декоратор: стр. 5692)
  `POST /api/auth/telegram` -> `authenticate_via_telegram` (декоратор: стр. 5738)
  `POST /api/auth/staff/link` -> `link_staff_account` (декоратор: стр. 5760)
  `POST /api/auth/telegram-owner` -> `authenticate_primary_owner_via_telegram` (декоратор: стр. 5794)
  `POST /api/auth/switch-role` -> `switch_role` (декоратор: стр. 5831)
  `POST /api/owner/database-reset/start` -> `start_owner_database_reset` (декоратор: стр. 7669)
  `POST /api/owner/database-reset/approve` -> `approve_owner_database_reset` (декоратор: стр. 7725)
  `POST /api/owner/database-reset/execute` -> `execute_owner_database_reset` (декоратор: стр. 7779)
  `GET /api/owner/exports/{kind}` -> `download_owner_export` (декоратор: стр. 8590)
  `POST /api/owner/exports/{kind}/telegram` -> `send_owner_export_to_telegram` (декоратор: стр. 8611)
  `POST /api/owner/reports/{period}/{segment}/telegram` -> `send_owner_summary_report_to_telegram` (декоратор: стр. 8632)
  `PATCH /api/clients/me` -> `update_client_me` (декоратор: стр. 9680)
  `DELETE /api/clients/{client_id}` -> `delete_client` (декоратор: стр. 9760)
  `PATCH /api/clients/{client_id}/card` -> `update_client_card` (декоратор: стр. 9785)
  `POST /api/clients` -> `create_client` (декоратор: стр. 9885)
  `GET /api/health` -> `health` (декоратор: стр. 9942)
  `GET /api/content` -> `get_public_content` (декоратор: стр. 10099)
  `PUT /api/content` -> `save_content` (декоратор: стр. 10113)
  `POST /api/upload` -> `upload_file` (декоратор: стр. 10177)
  `GET /api/uploads/{filename}` -> `serve_upload` (декоратор: стр. 10229)
  `POST /api/contact` -> `submit_contact` (декоратор: стр. 10250)
  `POST settings.telegram_webhook_path` -> `handle_telegram_webhook` (декоратор: стр. 10300)
  `POST /api/telegram/webhook/sync` -> `resync_telegram_webhook` (декоратор: стр. 10350)
  `GET /api/stock-categories` -> `list_stock_categories` (декоратор: стр. 10391)
  `POST /api/stock-categories` -> `create_stock_category` (декоратор: стр. 10404)
  `PATCH /api/stock-categories/{category_id}` -> `update_stock_category` (декоратор: стр. 10422)
  `DELETE /api/stock-categories/{category_id}` -> `delete_stock_category` (декоратор: стр. 10441)
  `GET /api/shift-checklists` -> `get_booking_availability` (декоратор: стр. 10462)
  `POST /api/bookings` -> `create_booking` (декоратор: стр. 10539)
  `PATCH /api/bookings/{booking_id}` -> `update_booking` (декоратор: стр. 11772)
  `DELETE /api/bookings/{booking_id}` -> `delete_booking` (декоратор: стр. 12444)
  `POST /api/bookings/{booking_id}/services` -> `add_booking_service` (декоратор: стр. 12544)
  `POST /api/bookings/{booking_id}/additional-services` -> `add_booking_additional_service` (декоратор: стр. 12610)
  `DELETE /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `remove_booking_additional_service` (декоратор: стр. 12728)
  `PATCH /api/bookings/{booking_id}/additional-services/{additional_service_id}` -> `update_booking_additional_service` (декоратор: стр. 12800)
  `POST /api/notifications` -> `create_notification` (декоратор: стр. 12884)
  `PATCH /api/notifications/{notification_id}/read` -> `mark_notification_read` (декоратор: стр. 12964)
  `POST /api/notifications/read-all` -> `mark_all_notifications_read` (декоратор: стр. 13042)
  `POST /api/stock-items` -> `create_stock_item` (декоратор: стр. 13108)
  `PATCH /api/stock-items/{item_id}` -> `update_stock_item` (декоратор: стр. 13144)
  `POST /api/stock-items/{item_id}/write-off` -> `write_off_stock` (декоратор: стр. 13192)
  `GET /api/stock/write-off-history` -> `get_write_off_history` (декоратор: стр. 13241)
  `DELETE /api/stock-items/{item_id}` -> `delete_stock_item` (декоратор: стр. 13272)
  `GET /api/shift-checklists` -> `list_shift_checklists` (декоратор: стр. 13308)
  `POST /api/shift-checklists` -> `submit_shift_checklist` (декоратор: стр. 13350)
  `GET /api/admin/shift-inspections` -> `list_admin_shift_inspections` (декоратор: стр. 13472)
  `GET /api/admin/shift-inspections/{inspection_id}/photo` -> `get_admin_shift_inspection_photo` (декоратор: стр. 13518)
  `POST /api/admin/shift-inspections` -> `submit_admin_shift_inspection` (декоратор: стр. 13600)
  `POST /api/admin/shift-inspections/{inspection_id}/review` -> `review_admin_shift_inspection` (декоратор: стр. 13756)
  `POST /api/owner/shift-openings` -> `open_shift_for_masters` (декоратор: стр. 13795)
  `POST /api/expenses` -> `create_expense` (декоратор: стр. 13921)
  `PATCH /api/expenses/{expense_id}` -> `update_expense` (декоратор: стр. 13967)
  `GET /api/owner/incomes` -> `list_incomes` (декоратор: стр. 14025)
  `POST /api/owner/incomes` -> `create_income` (декоратор: стр. 14073)
  `PATCH /api/owner/incomes/{income_id}` -> `update_income` (декоратор: стр. 14137)
  `GET /api/owner/piggy-bank` -> `get_piggy_bank` (декоратор: стр. 14217)
  `POST /api/owner/piggy-bank/withdraw` -> `piggy_bank_withdraw` (декоратор: стр. 14718)
  `POST /api/owner/piggy-bank/adjust` -> `piggy_bank_adjust` (декоратор: стр. 14860)
  `GET /api/owner/deposits` -> `list_deposit_clients` (декоратор: стр. 15306)
  `PATCH /api/owner/deposits/{client_id}` -> `update_deposit_subscription` (декоратор: стр. 15350)
  `POST /api/owner/deposits/{client_id}/topup` -> `deposit_topup` (декоратор: стр. 15385)
  `POST /api/owner/deposits/{client_id}/adjust` -> `deposit_adjust` (декоратор: стр. 15412)
  `GET /api/owner/deposits/export-all.xlsx` -> `deposit_export_all_excel` (декоратор: стр. 15438)
  `POST /api/owner/deposits/export-all.xlsx/telegram` -> `deposit_export_all_excel_telegram` (декоратор: стр. 15456)
  `POST /api/owner/deposits/{client_id}/export.xlsx/telegram` -> `deposit_export_excel_telegram` (декоратор: стр. 15468)
  `GET /api/owner/deposits/{client_id}` -> `get_deposit_overview` (декоратор: стр. 15486)
  `POST /api/owner/deposits/{client_id}/washes` -> `deposit_record_wash` (декоратор: стр. 15499)
  `POST /api/owner/deposits/{client_id}/settle-month` -> `deposit_settle_month` (декоратор: стр. 15578)
  `GET /api/owner/deposits/{client_id}/export.xlsx` -> `deposit_export_excel` (декоратор: стр. 15663)
  `GET /api/owner/wallet` -> `get_wallet` (декоратор: стр. 15723)
  `GET /api/owner/workers/{worker_id}/shift-attendance` -> `get_worker_shift_attendance` (декоратор: стр. 15935)
  `GET /api/owner/shift-attendance` -> `get_all_workers_shift_attendance` (декоратор: стр. 16031)
  `GET /api/worker/shift-attendance` -> `get_own_shift_attendance` (декоратор: стр. 16111)
  `GET /api/worker/calendar` -> `get_worker_calendar_bookings` (декоратор: стр. 16179)
  `GET /api/worker/cars/search` -> `search_worker_cars` (декоратор: стр. 16318)
  `POST /api/penalties` -> `create_penalty` (декоратор: стр. 16400)
  `POST /api/penalties/{penalty_id}/revoke` -> `revoke_penalty` (декоратор: стр. 16550)
  `POST /api/workers/{worker_id}/penalties/revoke-all` -> `revoke_all_worker_penalties` (декоратор: стр. 16692)
  `POST /api/telegram/link-code` -> `generate_telegram_link_code` (декоратор: стр. 16838)
  `PUT /api/settings/services` -> `save_services` (декоратор: стр. 16892)
  `PUT /api/settings/boxes` -> `save_boxes` (декоратор: стр. 16968)
  `PUT /api/settings/schedule` -> `save_schedule` (декоратор: стр. 17026)
  `PUT /api/settings/admin/profile` -> `save_admin_profile` (декоратор: стр. 17074)
  `PUT /api/settings/admin/notifications` -> `save_admin_notifications` (декоратор: стр. 17148)
  `PUT /api/settings/workers/{worker_id}/profile` -> `save_worker_profile` (декоратор: стр. 17172)
  `PUT /api/settings/workers/{worker_id}/notifications` -> `save_worker_notifications` (декоратор: стр. 17232)
  `PUT /api/settings/owner/company` -> `save_owner_company` (декоратор: стр. 17274)
  `PUT /api/settings/owner/notifications` -> `save_owner_notifications` (декоратор: стр. 17298)
  `PUT /api/settings/owner/integrations` -> `save_owner_integrations` (декоратор: стр. 17322)
  `GET /api/owner/integrations/google/auth-url` -> `get_google_calendar_auth_url` (декоратор: стр. 17357)
  `GET /api/owner/integrations/google/callback` -> `google_calendar_callback` (декоратор: стр. 17412)
  `POST /api/owner/integrations/google/disconnect` -> `disconnect_google_calendar` (декоратор: стр. 17480)
  `GET /api/owner/integrations/google/status` -> `get_google_calendar_status` (декоратор: стр. 17498)
  `PUT /api/owner/integrations/google/credentials` -> `save_google_calendar_credentials` (декоратор: стр. 17531)
  `DELETE /api/owner/integrations/google/credentials` -> `delete_google_calendar_credentials` (декоратор: стр. 17564)
  `POST /api/owner/integrations/google/sync` -> `sync_google_calendar_now` (декоратор: стр. 17576)
  `GET /api/cron/google-sync` -> `run_google_calendar_sync_cron` (декоратор: стр. 17600)
  `GET /api/cron/reminders` -> `run_reminders_cron` (декоратор: стр. 17625)
  `POST /api/owner/reminders/dispatch` -> `dispatch_owner_booking_reminders` (декоратор: стр. 17657)
  `GET /api/cron/reports` -> `run_reports_cron` (декоратор: стр. 17676)
  `PUT /api/settings/owner/security` -> `save_owner_security` (декоратор: стр. 17722)
  `PUT /api/workers/settings` -> `save_worker_settings` (декоратор: стр. 17758)
  `GET /api/admin/workers/payroll` -> `get_admin_workers_payroll` (декоратор: стр. 17861)
  `PUT /api/admin/workers/payroll` -> `save_admin_worker_payroll` (декоратор: стр. 17961)
  `GET /api/owner/outsource/payroll` -> `get_owner_outsource_payroll` (декоратор: стр. 18030)
  `POST /api/payroll/entries` -> `create_payroll_entry` (декоратор: стр. 18100)
  `PUT /api/payroll/entries/{entry_id}` -> `update_payroll_entry` (декоратор: стр. 18330)
  `PUT /api/payroll/booking-workers/{link_id}/override-earned` -> `update_booking_worker_override_earned` (декоратор: стр. 18426)
  `GET /api/owner/bookings-history` -> `get_owner_bookings_history` (декоратор: стр. 18651)
  `GET /api/owner/bookings-history/totals` -> `get_owner_bookings_history_totals` (декоратор: стр. 18730)
  `GET /api/owner/archive` -> `get_owner_archive` (декоратор: стр. 18903)
  `GET /api/owner/bookings/{booking_id}/money-split` -> `get_owner_booking_money_split` (декоратор: стр. 19205)
  `PUT /api/owner/bookings/{booking_id}/money-split` -> `update_owner_booking_money_split` (декоратор: стр. 19219)
  `GET /api/owner/workers/{worker_id}/salary-detail` -> `owner_worker_salary_detail` (декоратор: стр. 19595)
  `GET /api/worker/salary-detail` -> `worker_my_salary_detail` (декоратор: стр. 20044)
  `POST /api/owner/workers/{worker_id}/pay-salary` -> `owner_worker_pay_salary` (декоратор: стр. 20452)
  `GET /api/owner/owners/salary-detail` -> `owner_salary_detail` (декоратор: стр. 20643)
  `POST /api/owner/owners/pay-salary` -> `owner_pay_salary` (декоратор: стр. 20891)
  `POST /api/workers` -> `create_worker` (декоратор: стр. 21103)
  `POST /api/workers/{worker_id}/reset-password` -> `reset_worker_password` (декоратор: стр. 21241)
  `DELETE /api/workers/{worker_id}` -> `fire_worker` (декоратор: стр. 21301)
  `GET /api/auth/session` -> `get_session_bootstrap` (декоратор: стр. 21495)
  `GET /api/auth/consent/check` -> `check_consent` (декоратор: стр. 21503)
  `POST /api/auth/consent` -> `record_consent` (декоратор: стр. 21515)
  `GET /api/auth/sessions` -> `get_active_sessions` (декоратор: стр. 21539)
  `POST /api/auth/logout` -> `logout` (декоратор: стр. 21547)
  `POST /api/auth/change-password` -> `change_password` (декоратор: стр. 21555)
```

Классы и функции (230):

- `_resolve_frontend_distdef _resolve_frontend_dist() -> Path: """Каталог собранного React-фронтенда. В обычном режиме — <project>/frontend/dist (родитель каталога app/). В frozen-режиме (PyInstaller bundl` (стр. 547)
- `_check_rate_limitdef _check_rate_limit(ip: str) -> None: global _last_rate_limit_cleanup now = time_module.time() window_start = now - _LOGIN_RATE_LIMIT_WINDOW # Periodic cleanup of stale entries t` (стр. 753)
- `add_security_headersasync def add_security_headers(request: Request, call_next): response = await call_next(request) for key, value in SECURITY_HEADERS.items():` (стр. 846)
- `serve_single_page_appasync def serve_single_page_app(request: Request, call_next): path = request.url.path index_file = frontend_dist / "index.html" if request.method not in {"GET", "HEAD"}: return awa` (стр. 859)
- `on_startupdef on_startup() -> None: global bot_thread Base.metadata.create_all(bind=engine) _apply_runtime_migrations() db = next(get_db()) try: seed_database(db, include_demo_staff=settings` (стр. 907)
- `start_google_sync_threaddef start_google_sync_thread() -> None: """Запускает фоновый цикл синхронизации «Google Calendar -> CRM» (daemon-поток). Поток нужен только при настроенной интеграции: без OAuth-кр` (стр. 992)
- `_nowdef _now() -> datetime: return datetime.now(timezone.utc)` (стр. 1014)
- `_local_day_boundsdef _local_day_bounds(date_str: str) -> tuple[datetime, datetime]: """Границы локального дня (DD.MM.YYYY) в UTC: (00:00, 23:59:59) местного времени. Периоды ЗП считаются по локальн` (стр. 1019)
- `_as_utcdef _as_utc(value: datetime) -> datetime: if value.tzinfo is None: return value.replace(tzinfo=timezone.utc) return value.astimezone(timezone.utc)` (стр. 1034)
- `_format_moscow_dtdef _format_moscow_dt(dt: datetime | None) -> str: if dt is None: return "" msk = dt.astimezone(timezone(timedelta(hours=3))) return msk.strftime("%H:%M %d.%m.%Y")` (стр. 1043)
- `_request_ipdef _request_ip(request: Request) -> str: # For rate limiting, prefer direct client IP to prevent X-Forwarded-For spoofing if request.client is not None and request.client.host: re` (стр. 1054)
- `_safe_textdef _safe_text(value: Any) -> str: return value if isinstance(value, str) else ""` (стр. 1074)
- `_client_by_phonedef _client_by_phone(db: Session, phone: str) -> Client | None: if not phone.strip():` (стр. 1082)
- `_owner_querydef _owner_query(): return ( select(StaffUser) .where(StaffUser.role == "owner") .order_by(StaffUser.created_at.asc(), StaffUser.id.asc()) )` (стр. 1120)
- `_primary_ownerdef _primary_owner(db: Session) -> StaffUser | None: return db.scalar( select(StaffUser) .where(StaffUser.role == "owner", StaffUser.is_primary_owner.is_(True)) .order_by(StaffUser` (стр. 1136)
- `_owner_master_conditiondef _owner_master_condition() -> Any: """Владелец, которому дополнительно выдана роль мастера (extra_roles != []). Такие владельцы попадают в списки мастеров: назначение на записи,` (стр. 1152)
- `_is_owner_masterdef _is_owner_master(worker: StaffUser) -> bool: return worker.role == "owner" and bool(worker.extra_roles)` (стр. 1167)
- `_ensure_permanent_telegram_ownersdef _ensure_permanent_telegram_owners(db: Session) -> None: """Upsert explicitly configured owners without reassigning existing rows.""" for staff_id, login, chat_id, owner_name in` (стр. 1174)
- `_ensure_owner_accountsdef _ensure_owner_accounts(db: Session) -> None: owners = db.scalars(_owner_query()).all() primary_owner = next((owner for owner in owners if owner.is_primary_owner), None) if prim` (стр. 1280)
- `_device_labeldef _device_label(user_agent: str) -> str: if "Telegram-Android" in user_agent: return "Telegram Android" if "Telegram-iOS" in user_agent: return "Telegram iPhone" if "iPhone" in u` (стр. 1408)
- `_apply_runtime_migrationsdef _apply_runtime_migrations() -> None: from sqlalchemy import text def boolean_default_sql(value: bool) -> str:` (стр. 1444)
- `boolean_default_sqldef boolean_default_sql(value: bool) -> str: if engine.dialect.name == "postgresql": return "TRUE" if value else "FALSE" return "1" if value else "0"` (стр. 1448)
- `ensure_postgres_varchar_lengthdef ensure_postgres_varchar_length( table_name: str, column_name: str, minimum_length: int` (стр. 1458)
- `ensure_postgres_text_columndef ensure_postgres_text_column(table_name: str, column_name: str) -> None: if engine.dialect.name != "postgresql": return column = next( ( item for item in inspect(engine).get_col` (стр. 1504)
- `_apply_default_shift_paydef _apply_default_shift_pay(db: Session) -> None: """Один раз выставляет оклад за смену DEFAULT_SHIFT_PAY сотрудникам (кроме владельцев), у которых ставка не задана (0). Выполняет` (стр. 2583)
- `_repair_text_valuedef _repair_text_value(value: str) -> str: if not value or not any(ord(char) > 127 for char in value):` (стр. 2613)
- `_repair_nested_textdef _repair_nested_text(value): if isinstance(value, str):` (стр. 2633)
- `_repair_model_text_fieldsdef _repair_model_text_fields(db: Session, model, fields: tuple[str, ...]) -> bool: changed = False for item in db.scalars(select(model)).all():` (стр. 2653)
- `_sanitize_notification_messagedef _sanitize_notification_message(message: str) -> str: fixed = _repair_text_value(message).strip() for source, target in { "вЂў": "•", "в€¢": "•", "вВў": "•", "â€¢": "•", "вЂ”": ` (стр. 2681)
- `_repair_text_datadef _repair_text_data(db: Session) -> None: changed = False changed |= _repair_model_text_fields( db, StaffUser, ("name", "city", "experience", "specialty", "about"), ) changed |= ` (стр. 2715)
- `_settingdef _setting(db: Session, key: str, default: dict) -> dict: row = db.get(AppSetting, key) if row: return row.value row = AppSetting(key=key, value=default) db.add(row) db.flush() r` (стр. 2861)
- `_merge_setting_dictdef _merge_setting_dict(value: Any, default: dict[str, Any]) -> dict[str, Any]: if not isinstance(value, dict):` (стр. 2881)
- `_normalize_client_vehiclesdef _normalize_client_vehicles( vehicles: list[ClientVehiclePayload] | list[dict[str, Any]] | None, *, fallback_car: str = "", fallback_plate: str = "",` (стр. 2905)
- `_client_vehicles_mapdef _client_vehicles_map(db: Session) -> dict[str, Any]: return _setting(db, "client_vehicles", {})` (стр. 3017)
- `_client_vehicles_payloaddef _client_vehicles_payload(db: Session, client: Client) -> list[ClientVehiclePayload]: raw = _client_vehicles_map(db).get(client.id, []) return _normalize_client_vehicles( raw, f` (стр. 3025)
- `_save_client_vehiclesdef _save_client_vehicles( db: Session, client_id: str, vehicles: list[ClientVehiclePayload]` (стр. 3039)
- `_client_phone_verifications_mapdef _client_phone_verifications_map(db: Session) -> dict[str, Any]: value = _setting(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) return value if isinstance(value, dict) else {}` (стр. 3059)
- `_client_verified_phone_digitsdef _client_verified_phone_digits(db: Session, telegram_id: str | None) -> str | None: if not telegram_id: return None entry = _client_phone_verifications_map(db).get(str(telegram_` (стр. 3069)
- `_client_phone_is_verifieddef _client_phone_is_verified(db: Session, telegram_id: str | None, phone: str) -> bool: if not phone.strip():` (стр. 3089)
- `_require_client_phone_verificationdef _require_client_phone_verification( db: Session, telegram_id: str | None, phone: str` (стр. 3115)
- `_client_payloaddef _client_payload(client: Client | None) -> ClientProfilePayload | None: if client is None: return None with Session(engine) as vehicles_db: vehicles = _client_vehicles_payload(v` (стр. 3137)
- `_client_summary_payloaddef _client_summary_payload( client: Client, db: Session | None = None` (стр. 3177)
- `_booking_status_labeldef _booking_status_label(status_value: str) -> str: return { "new": "Новая заявка", "confirmed": "Подтверждена", "scheduled": "Запланирована", "in_progress": "В работе", "complete` (стр. 3235)
- `_booking_status_short_labeldef _booking_status_short_label(status_value: str) -> str: return { "new": "Новая", "confirmed": "Подтв.", "scheduled": "Запл.", "in_progress": "В работе", "completed": "Завершена"` (стр. 3261)
- `_format_local_datetimedef _format_local_datetime(value: datetime) -> str: return _as_utc(value).astimezone().strftime("%d.%m.%Y %H:%M")` (стр. 3287)
- `_parse_booking_datetimedef _parse_booking_datetime(date_value: str, time_value: str) -> datetime | None: raw = f"{date_value.strip()} {time_value.strip()}" for fmt in ("%d.%m.%Y %H:%M", "%Y-%m-%d %H:%M")` (стр. 3295)
- `_py_weekday_to_schedule_indexdef _py_weekday_to_schedule_index(py_weekday: int) -> int: # Python weekday(): Пн=0..Вс=6 — совпадает с day_index сида (0=Пн..6=Вс). # Регрессия 899e3e9 добавляла +2: брони проверя` (стр. 3315)
- `_parse_time_to_minutesdef _parse_time_to_minutes(time_value: str) -> int | None: raw = time_value.strip() if len(raw) != 5 or raw[2] != ":": return None try: hours = int(raw[:2]) minutes = int(raw[3:]) ` (стр. 3326)
- `_today_labeldef _today_label() -> str: return datetime.now().strftime("%d.%m.%Y")` (стр. 3354)
- `_build_schedule_slotsdef _build_schedule_slots( open_minutes: int, close_minutes: int, step_minutes: int = 30` (стр. 3362)
- `_booking_requires_scheduled_slotdef _booking_requires_scheduled_slot(status_value: str) -> bool: return status_value in BOOKING_ACTIVE_STATUSES` (стр. 3386)
- `_booking_slot_fields_changeddef _booking_slot_fields_changed(booking: Booking, updates: dict) -> bool: if "date" in updates and (updates.get("date") or "").strip() != (booking.date or "").strip():` (стр. 3394)
- `_booking_time_rangedef _booking_time_range( date_value: str, time_value: str, duration: int` (стр. 3414)
- `_time_ranges_overlapdef _time_ranges_overlap( start_at: datetime, end_at: datetime, other_start_at: datetime, other_end_at: datetime,` (стр. 3432)
- `_ensure_booking_datetime_not_in_pastdef _ensure_booking_datetime_not_in_past(date_value: str, time_value: str, role: str) -> None: if role in {"admin", "owner"}: return scheduled_at = _parse_booking_datetime(date_val` (стр. 3450)
- `_ensure_booking_within_scheduledef _ensure_booking_within_schedule( db: Session, date_value: str, time_value: str, duration: int` (стр. 3484)
- `_box_is_availabledef _box_is_available( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str,` (стр. 3558)
- `_pick_available_boxdef _pick_available_box( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, resource_group: str | None = None, preferred_box: str | None = Non` (стр. 3582)
- `_booking_slot_availabilitydef _booking_slot_availability( db: Session, *, date_value: str, duration: int, service_id: str | None = None, resource_group: str | None = None,` (стр. 3644)
- `_ensure_booking_has_no_conflictsdef _ensure_booking_has_no_conflicts( db: Session, *, booking_id: str | None, date_value: str, time_value: str, duration: int, box: str, worker_ids: set[str], …` (стр. 3796)
- `_load_penaltiesdef _load_penalties( db: Session, *, worker_ids: set[str] | None = None` (стр. 3840)
- `_complaints_by_workerdef _complaints_by_worker(penalties: list[Penalty]) -> dict[str, list[Penalty]]: grouped: dict[str, list[Penalty]] = {} for penalty in penalties: grouped.setdefault(penalty.worker_` (стр. 3866)
- `_normalize_worker_rulesdef _normalize_worker_rules(db: Session) -> None: changed = False workers = db.scalars(select(StaffUser).where(StaffUser.role == "worker")).all() for worker in workers: capped_perc` (стр. 3880)
- `_worker_payloaddef _worker_payload(worker: StaffUser) -> WorkerPayload: return WorkerPayload( id=worker.id, role=worker.role, # type: ignore[arg-type] name=worker.name, experience=worker.experien` (стр. 3934)
- `_payroll_entry_payloaddef _payroll_entry_payload(entry: PayrollEntry, actor_name: str) -> PayrollEntryPayload: return PayrollEntryPayload( id=entry.id, workerId=entry.worker_id, kind=entry.kind, # type:` (стр. 3974)
- `_worker_payroll_summariesdef _worker_payroll_summaries( db: Session, workers: list[StaffUser], complaints_by_worker: dict[str, list[Penalty]],` (стр. 4002)
- `_worker_payroll_summaries_from_datadef _worker_payroll_summaries_from_data( db: Session, workers: list[StaffUser], completed_bookings: list[Booking], entries: list[PayrollEntry], complaints_by_worker: dict[str, list` (стр. 4050)
- `_worker_payload_with_payrolldef _worker_payload_with_payroll( worker: StaffUser, payroll_summaries: dict[str, WorkerPayrollSummaryPayload] | None = None,` (стр. 4224)
- `_booking_payloaddef _booking_payload( booking: Booking, complaints_by_worker: dict[str, list[Penalty]] | None = None` (стр. 4248)
- `_notification_payloaddef _notification_payload(notification: Notification) -> NotificationPayload: return NotificationPayload( id=notification.id, recipientRole=notification.recipient_role, # type: ign` (стр. 4418)
- `_stock_payloaddef _stock_payload(item: StockItem) -> StockItemPayload: return StockItemPayload( id=item.id, name=item.name, qty=item.qty, unit=item.unit, unitPrice=item.unit_price, category=item` (стр. 4440)
- `_expense_payloaddef _expense_payload(expense: Expense) -> ExpensePayload: return ExpensePayload( id=expense.id, title=expense.title, amount=expense.amount, category=expense.category, date=expense.` (стр. 4456)
- `_penalty_payloaddef _penalty_payload(penalty: Penalty) -> PenaltyPayload: worker_name = penalty.worker.name if penalty.worker else "" return PenaltyPayload( id=penalty.id, workerId=penalty.worker_` (стр. 4480)
- `_service_payloaddef _service_payload(service: Service) -> ServicePayload: return ServicePayload( id=service.id, name=service.name, category=service.category, price=service.price, duration=service.` (стр. 4510)
- `_box_payloaddef _box_payload(box: Box) -> BoxPayload: return BoxPayload( id=box.id, name=box.name, resourceGroup=(box.resource_group or DEFAULT_RESOURCE_GROUP).strip() or DEFAULT_RESOURCE_GROU` (стр. 4554)
- `_visible_boxesdef _visible_boxes(db: Session) -> list[Box]: boxes = db.scalars(select(Box).order_by(Box.name.asc())).all() wash_order_map = {name: index for index, name in enumerate(WASH_BOX_NAM` (стр. 4578)
- `box_orderdef box_order(box: Box) -> tuple[int, int, str, str]: resource_group = _resource_group_key( box.resource_group or _default_box_resource_group(box) ) if resource_group == DETAILING_` (стр. 4588)
- `_schedule_payloaddef _schedule_payload(entry: ScheduleEntry) -> SchedulePayload: return SchedulePayload( dayIndex=entry.day_index, day=entry.day_label, open=entry.open_time, close=entry.close_time,` (стр. 4624)
- `_settings_payloaddef _settings_payload(db: Session) -> SettingsBundlePayload: admin_profile_default = { "name": "Администратор", "email": "", "phone": "", "telegramChatId": "", } admin_notification` (стр. 4644)
- `_empty_settings_payloaddef _empty_settings_payload() -> SettingsBundlePayload: return SettingsBundlePayload( adminProfile=AdminProfilePayload( name="", email="", phone="", telegramChatId="" ), adminNotif` (стр. 4864)
- `_scoped_settings_payloaddef _scoped_settings_payload( db: Session, role: str, actor_id: str` (стр. 4944)
- `_session_payloaddef _session_payload(session_data: dict) -> SessionPayload: return SessionPayload( role=session_data["role"], actorId=session_data["actorId"], sessionId=session_data.get("sessionId` (стр. 5030)
- `_mark_overdue_bookings_for_admin_reviewdef _mark_overdue_bookings_for_admin_review(db: Session) -> None: now_local = datetime.now().replace(second=0, microsecond=0) changed = False for booking in db.scalars( select(Book` (стр. 5050)
- `_build_bootstrapdef _build_bootstrap(db: Session, session_data: dict) -> BootstrapPayload: role = session_data["role"] actor_id = session_data["actorId"] _mark_overdue_bookings_for_admin_review(db` (стр. 5094)
- `_resolve_user_from_init_datadef _resolve_user_from_init_data(authorization: str, db: Session) -> dict | None: try: validated = validate_telegram_init_data( authorization, settings.telegram_bot_token, max_age_` (стр. 5416)
- `_require_sessiondef _require_session( authorization: str | None = Header(default=None), db: Session = Depends(get_db),` (стр. 5537)
- `_extract_telegram_id_from_init_datadef _extract_telegram_id_from_init_data(authorization: str) -> str: if not authorization: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing initData") t` (стр. 5568)
- `_ensure_staff_roledef _ensure_staff_role(session_data: dict, allowed: set[str]) -> None: if session_data["role"] not in allowed: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Fo` (стр. 5864)
- `_validated_booking_workersdef _validated_booking_workers( db: Session, workers: list[BookingWorkerPayload]` (стр. 5874)
- `_booking_payload_for_responsedef _booking_payload_for_response(db: Session, booking: Booking) -> BookingPayload: worker_ids = {link.worker_id for link in booking.worker_links} penalties = _load_penalties(db, w` (стр. 5970)
- `_sync_booking_workersdef _sync_booking_workers( db: Session, booking: Booking, workers: list[BookingWorkerPayload]` (стр. 5982)
- `_sync_booking_materialsdef _sync_booking_materials( db: Session, booking: Booking, materials: list[BookingMaterialPayload]` (стр. 6012)
- `_send_telegram_safedef _send_telegram_safe(chat_id: str | None, text: str) -> None: if not chat_id: logger.warning("Пропущена отправка Telegram-уведомления: у получателя нет chat_id") return try: sen` (стр. 6031)
- `_telegram_display_namedef _telegram_display_name(telegram_user: dict, fallback: str) -> str: first_name = str(telegram_user.get("first_name") or "").strip() last_name = str(telegram_user.get("last_name"` (стр. 6051)
- `_owner_two_factor_recipientdef _owner_two_factor_recipient(db: Session) -> StaffUser: owner = _primary_owner(db) if owner is None: raise HTTPException( status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail` (стр. 6067)
- `_all_active_ownersdef _all_active_owners(db: Session) -> list[StaffUser]: """Возвращает всех активных владельцев, отсортированных по created_at asc.""" return list( db.scalars( select(StaffUser) .wh` (стр. 6097)
- `_all_owner_telegram_recipientsdef _all_owner_telegram_recipients(db: Session) -> list[StaffUser]: """Возвращает всех владельцев с непустым telegram_chat_id, отсортированных по created_at asc.""" return list( db` (стр. 6119)
- `_booking_reminder_target_datedef _booking_reminder_target_date(days_ahead: int = 1) -> str: return (datetime.now() + timedelta(days=days_ahead)).strftime("%d.%m.%Y")` (стр. 6147)
- `_worker_notification_settings_mapdef _worker_notification_settings_map(db: Session) -> dict[str, dict[str, Any]]: return _setting(db, "worker_notification_settings", {})` (стр. 6155)
- `_booking_reminder_statedef _booking_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, BOOKING_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 6163)
- `_return_reminder_statedef _return_reminder_state(db: Session) -> dict[str, Any]: return _setting(db, RETURN_REMINDER_STATE_KEY, {"deliveries": {}})` (стр. 6171)
- `_shift_checklists_statedef _shift_checklists_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, SHIFT_CHECKLISTS_KEY, []) return value if isinstance(value, list) else []` (стр. 6179)
- `_admin_shift_inspections_statedef _admin_shift_inspections_state(db: Session) -> list[dict[str, Any]]: value = _setting(db, ADMIN_SHIFT_INSPECTIONS_KEY, []) return value if isinstance(value, list) else []` (стр. 6189)
- `_compute_shift_attendancedef _compute_shift_attendance( inspections: list[dict], worker_id: str, date_from: date, date_to: date,` (стр. 6199)
- `_period_to_date_rangedef _period_to_date_range(period: str) -> tuple[date, date]: """ Преобразует строковый период в диапазон дат (date_from, date_to). - ``week`` → последние 7 дней - ``month`` → после` (стр. 6327)
- `_admin_shift_owner_bot_statedef _admin_shift_owner_bot_state(db: Session) -> dict[str, Any]: value = _setting(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) return value if isinstance(value,` (стр. 6373)
- `_cleanup_booking_reminder_deliveriesdef _cleanup_booking_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=14) cleaned: dict[str, str] = {} for key, value in deliv` (стр. 6383)
- `_cleanup_return_reminder_deliveriesdef _cleanup_return_reminder_deliveries(deliveries: dict[str, Any]) -> dict[str, str]: threshold = _now() - timedelta(days=30) cleaned: dict[str, str] = {} for key, value in delive` (стр. 6403)
- `_booking_client_reminder_messagedef _booking_client_reminder_message(booking: Booking) -> str: return ( "Напоминание о записи\n" f"Услуга: {booking.service}\n" f"Дата: {booking.date} {booking.time}\n" f"Бокс: {bo` (стр. 6423)
- `_booking_worker_reminder_messagedef _booking_worker_reminder_message(booking: Booking, worker_name: str) -> str: return ( f"Напоминание мастеру {worker_name}\n" f"Клиент: {booking.client_name}\n" f"Услуга: {booki` (стр. 6443)
- `_dispatch_booking_remindersdef _dispatch_booking_reminders( db: Session, *, target_date: str | None = None, force: bool = False,` (стр. 6463)
- `_dispatch_return_visit_remindersdef _dispatch_return_visit_reminders(db: Session) -> int: reminder_state = _return_reminder_state(db) deliveries = reminder_state.get("deliveries") if not isinstance(deliveries, di` (стр. 6725)
- `_shift_checklist_payloaddef _shift_checklist_payload(entry: dict[str, Any]) -> ShiftChecklistPayload: return ShiftChecklistPayload( id=str(entry.get("id") or ""), workerId=str(entry.get("workerId") or "")` (стр. 6835)
- `_chemistry_stock_itemsdef _chemistry_stock_items(db: Session) -> list[StockItem]: return db.scalars( select(StockItem) .where(StockItem.category == "Химия") .order_by(StockItem.name.asc()) ).all()` (стр. 6889)
- `_latest_shift_checklist_entrydef _latest_shift_checklist_entry( entries: list[dict[str, Any]], worker_id: str, phase: str` (стр. 6905)
- `_clean_data_url_prefixdef _clean_data_url_prefix(data_url: str) -> str: return data_url.split(",", 1)[1] if "," in data_url else data_url` (стр. 6927)
- `_decode_data_url_imagedef _decode_data_url_image(data_url: str) -> tuple[str, bytes]: raw = data_url.strip() if not raw.startswith("data:image/"):` (стр. 6935)
- `_admin_shift_inspection_suppliesdef _admin_shift_inspection_supplies(db: Session) -> list[dict[str, Any]]: items = db.scalars( select(StockItem) .where(StockItem.category.in_(("Химия", "Расходники"))) .order_by(S` (стр. 7001)
- `_admin_shift_inspection_payloaddef _admin_shift_inspection_payload( entry: dict[str, Any],` (стр. 7059)
- `_admin_shift_captiondef _admin_shift_caption(entry: dict[str, Any]) -> str: checked_supplies = [ item.get("name") for item in entry.get("supplies", []) if isinstance(item, dict) and item.get("checked"` (стр. 7148)
- `_admin_shift_owner_inline_keyboarddef _admin_shift_owner_inline_keyboard(inspection_id: str) -> dict[str, Any]: return { "inline_keyboard": [ [ { "text": "Подтвердить", "callback_data": f"shiftapprove:{inspection_i` (стр. 7200)
- `_notify_owner_about_admin_shiftdef _notify_owner_about_admin_shift(db: Session, entry: dict[str, Any]) -> None: caption = _admin_shift_caption(entry) mime_type, photo_bytes = _decode_data_url_image( str(entry.ge` (стр. 7228)
- `_apply_admin_shift_reviewdef _apply_admin_shift_review( db: Session, inspection_id: str, *, action: str, issue_note: str, owner_actor_id: str,` (стр. 7298)
- `_serialize_state_datetimedef _serialize_state_datetime(value: datetime | None) -> str | None: if value is None: return None return _as_utc(value).isoformat()` (стр. 7418)
- `_parse_state_datetimedef _parse_state_datetime(value: Any) -> datetime | None: if not value: return None if not isinstance(value, str):` (стр. 7430)
- `_owner_database_reset_statedef _owner_database_reset_state(db: Session) -> dict[str, Any] | None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is None or not isinstance(row.value, dict):` (стр. 7452)
- `_save_owner_database_reset_statedef _save_owner_database_reset_state( db: Session, value: dict[str, Any]` (стр. 7466)
- `_clear_owner_database_reset_statedef _clear_owner_database_reset_state(db: Session) -> None: row = db.get(AppSetting, OWNER_DATABASE_RESET_SETTING_KEY) if row is not None: db.delete(row) db.flush()` (стр. 7478)
- `_normalize_database_reset_phrasedef _normalize_database_reset_phrase(value: str) -> str: normalized = " ".join(value.replace("\n", " ").split()).strip().upper() return normalized.replace("Ё", "Е")` (стр. 7492)
- `_owner_database_reset_previewdef _owner_database_reset_preview( db: Session,` (стр. 7502)
- `_owner_database_reset_warningsdef _owner_database_reset_warnings( preview: OwnerDatabaseResetPreviewPayload,` (стр. 7556)
- `_perform_owner_database_resetdef _perform_owner_database_reset(db: Session) -> None: db.execute(sa_delete(TelegramLinkCode)) db.execute(sa_delete(Notification)) db.execute(sa_delete(BookingWorker)) db.execute(` (стр. 7596)
- `_parse_datedef _parse_date(s: str) -> date | None: if "." in s: parts = s.split(".") try: return date(int(parts[2]), int(parts[1]), int(parts[0])) except (ValueError, IndexError):` (стр. 7815)
- `_owner_export_filedef _owner_export_file( db: Session, actor_id: str, kind: str, segment: str = "all", date_from: str | None = None, date_to: str | None = None,` (стр. 7841)
- `_in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_to an` (стр. 7985)
- `_download_responsedef _download_response(export_file: GeneratedExport) -> Response: return Response( content=export_file.content, media_type=export_file.media_type, headers={ "Content-Disposition": ` (стр. 8065)
- `class _PartialBroadcastError(Exception):` (стр. 8085)
- `_PartialBroadcastError.__init__def __init__(self, payload: TelegramBroadcastPayload) -> None: super().__init__("partial broadcast failure") self.payload = payload` (стр. 8091)
- `_send_export_to_telegramdef _send_export_to_telegram( db: Session, actor_id: str, export_file: GeneratedExport` (стр. 8101)
- `_owner_summary_reportdef _owner_summary_report( db: Session, actor_id: str, period: str, segment: str` (стр. 8221)
- `_owner_summary_export_filedef _owner_summary_export_file( db: Session, actor_id: str, period: str, segment: str` (стр. 8339)
- `_send_owner_summary_reportdef _send_owner_summary_report( db: Session, actor_id: str, report: OwnerSummaryReport, export_file: GeneratedExport,` (стр. 8457)
- `_booking_car_labeldef _booking_car_label(car: str | None, plate: str | None) -> str: car_value = (car or "").strip() or "Авто не указано" plate_value = (plate or "").strip() return f"{car_value}, {p` (стр. 8648)
- `_admin_booking_notification_titledef _admin_booking_notification_title( client_name: str, car: str | None, plate: str | None` (стр. 8660)
- `_booking_datetime_labeldef _booking_datetime_label(date: str | None, time: str | None) -> str: if not (date or "").strip():` (стр. 8672)
- `_admin_booking_notification_textdef _admin_booking_notification_text( client_name: str, car: str | None, plate: str | None, date: str | None, time: str | None,` (стр. 8688)
- `_notify_admins_about_bookingdef _notify_admins_about_booking(db: Session, booking: Booking) -> None: admins = db.scalars( select(StaffUser).where(StaffUser.role == "admin", StaffUser.active.is_(True)) ).all()` (стр. 8708)
- `_notify_owners_about_bookingdef _notify_owners_about_booking(db: Session, booking: Booking) -> None: owners = _all_owner_telegram_recipients(db) text = ( "Новая запись\n" f"Клиент: {booking.client_name}\n" f"` (стр. 8740)
- `_service_category_keydef _service_category_key(value: str | None) -> str: return (value or "").strip().lower()` (стр. 8768)
- `_resource_group_keydef _resource_group_key(value: str | None) -> str: return (value or "").strip().lower() or DEFAULT_RESOURCE_GROUP` (стр. 8776)
- `_normalized_textdef _normalized_text(value: str | None) -> str: return (value or "").strip()` (стр. 8784)
- `_default_service_resource_groupdef _default_service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_for_service_category(service.category)` (стр. 8792)
- `_default_box_resource_groupdef _default_box_resource_group(box: Box | None) -> str: if box is None: return DEFAULT_RESOURCE_GROUP name_key = (box.name or "").strip().lower() description_key = (box.descriptio` (стр. 8804)
- `_service_resource_groupdef _service_resource_group(service: Service | None) -> str: if service is None: return DEFAULT_RESOURCE_GROUP return _resource_group_key( service.resource_group or _default_servic` (стр. 8824)
- `_compatible_box_namesdef _compatible_box_names(db: Session, resource_group: str | None) -> list[str]: target_group = _resource_group_key(resource_group) return [ box.name for box in db.scalars( select(` (стр. 8840)
- `_is_box_rental_servicedef _is_box_rental_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "аренда бокса" )` (стр. 8866)
- `_is_detailing_servicedef _is_detailing_service(service: Service | None) -> bool: return ( service is not None and _service_category_key(service.category) == "детейлинг" )` (стр. 8880)
- `_resource_group_for_service_categorydef _resource_group_for_service_category(category: str | None) -> str: category_key = _service_category_key(category) if category_key == "детейлинг": return DETAILING_RESOURCE_GROU` (стр. 8892)
- `_box_by_namedef _box_by_name(db: Session, box_name: str) -> Box | None: return db.scalar(select(Box).where(Box.name == box_name))` (стр. 8906)
- `_normalize_service_and_box_resourcesdef _normalize_service_and_box_resources(db: Session) -> None: changed = False # Группа ресурсов услуг больше не привязывается к категории принудительно. boxes = db.scalars(select(` (стр. 8914)
- `_box_hourly_pricedef _box_hourly_price(db: Session, box_name: str, fallback_price: int) -> int: box = _box_by_name(db, box_name) if box is not None and box.price_per_hour > 0: return box.price_per_` (стр. 9122)
- `_payment_type_labeldef _payment_type_label(payment_type: str) -> str: return { "cash": "Наличные", "transfer": "Перевод", "invoice": "По счёту", "credit": "В долг (депозит)", }.get(payment_type, paym` (стр. 9136)
- `_booking_payment_labeldef _booking_payment_label(booking: Booking) -> str: if not booking.payment_settled: return "Не оплачено" return _payment_type_label(booking.payment_type)` (стр. 9154)
- `_notify_ownersdef _notify_owners(db: Session, text: str) -> None: db.add( Notification( id=f"n-{uuid4()}", recipient_role="owner", recipient_id=None, message=text, read=False, created_at=_now(),` (стр. 9166)
- `_booking_receipt_textdef _booking_receipt_text(booking: Booking, *, worker_name: str | None = None) -> str: worker_line = f"\nМастер: {worker_name}" if worker_name else "" return ( "Чек по записи\n" f"` (стр. 9202)
- `_notify_booking_completion_receiptdef _notify_booking_completion_receipt( db: Session, booking: Booking, *, worker_name: str | None = None` (стр. 9232)
- `_notify_owner_about_worker_booking_eventdef _notify_owner_about_worker_booking_event( db: Session, booking: Booking, *, worker_name: str, event_label: str` (стр. 9304)
- `_notify_workers_about_assignmentdef _notify_workers_about_assignment( db: Session, booking: Booking, worker_ids: set[str]` (стр. 9345)
- `_notify_workers_about_notedef _notify_workers_about_note( db: Session, booking: Booking, worker_ids: set[str]` (стр. 9431)
- `_notify_workers_about_rescheduledef _notify_workers_about_reschedule( db: Session, booking: Booking, worker_ids: set[str], previous_date: str, previous_time: str, previous_box: str,` (стр. 9501)
- `_payroll_entry_labeldef _payroll_entry_label(kind: str) -> str: return { "bonus": "премия", "advance": "аванс", "deduction": "удержание", "payout": "выплата", "adjustment": "корректировка", }.get(kind` (стр. 9589)
- `_notify_worker_about_payroll_entrydef _notify_worker_about_payroll_entry( db: Session, worker: StaffUser, *, actor_role: str, actor_id: str, kind: str, amount: int, note: str, …` (стр. 9609)
- `_PartialBroadcastError._safe_digitsdef _safe_digits(value: str) -> str: try: return normalize_phone_digits(value) except ValueError: return ""` (стр. 9697)
- `_default_contentdef _default_content() -> ContentPayload: return ContentPayload( hero=ContentHeroPayload(), about=ContentAboutPayload( text=( "<b>\u2728 \u041e \u0441\u0442\u0443\u0434\u0438\u0438` (стр. 9958)
- `_normalize_legacy_contentdef _normalize_legacy_content(value: dict) -> dict: """Мигрирует старый формат контента (hero.title строкой + hero.titleHighlight) в новый (hero.title => {before, highlight, after}` (стр. 10038)
- `_get_or_create_contentdef _get_or_create_content(db: Session) -> ContentPayload: row = db.get(AppSetting, "content") if row is None or not isinstance(row.value, dict):` (стр. 10059)
- `_detected_image_formatdef _detected_image_format(header: bytes) -> str | None: if header.startswith(b"\xff\xd8\xff"):` (стр. 10157)
- `_upload_headersdef _upload_headers(filename: str) -> dict[str, str]: return { "Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": f'inline; filename="{filename}"', "X-C` (стр. 10169)
- `_google_sync_bookingdef _google_sync_booking(db, booking, *, action="upsert") -> None: """Best-effort синхронизация записи с Google Calendar. No-op, если интеграция не настроена или токены не привязан` (стр. 10508)
- `_google_sync_loopdef _google_sync_loop() -> None: """Фоновый цикл обратной синхронизации «Google Calendar -> CRM». Запускается daemon-потоком при старте приложения. No-op, если интеграция не настро` (стр. 10520)
- `_write_off_booking_materialsdef _write_off_booking_materials(db: Session, booking: Booking) -> None: if booking.materials_written_off: print(f"[WRITE_OFF] skip booking {booking.id[:8]} — already written off")` (стр. 11046)
- `_booking_materials_costdef _booking_materials_cost(db: Session, booking: Booking) -> int: """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада.""" override = (booking.mone` (стр. 11134)
- `_booking_materials_cost_actualdef _booking_materials_cost_actual(db: Session, booking: Booking) -> int: """Фактическая стоимость материалов по записи; fallback — материалы услуги со склада.""" materials_cost = ` (стр. 11142)
- `_asvc_paid_amountdef _asvc_paid_amount(asvc: BookingAdditionalService) -> int: """Сколько уходит с доп. услуги: аутсорсеру или мастерам (фикс/процент).""" if asvc.is_outsource: return int(asvc.outs` (стр. 11161)
- `_booking_money_splitdef _booking_money_split( db: Session, booking: Booking, complaints_by_worker: dict[str, list] | None = None,` (стр. 11174)
- `_PartialBroadcastError._compute_masterdef _compute_master(base: int) -> tuple[dict[str, int], int, int]: """Доля мастеров: явные суммы (override/fixed) + сервисный режим/проценты профиля от base. Возвращает (master_by_` (стр. 11214)
- `_PartialBroadcastError._compute_piggydef _compute_piggy(base: int) -> int: if piggy_pay_type == "fixed": return piggy_pay_value if piggy_pay_type == "percent": return money_int(base * piggy_pay_value / 100) if piggy_p` (стр. 11348)
- `_PartialBroadcastError._allocate_ownersdef _allocate_owners(claimed: int, limit: int) -> tuple[int, dict[str, int]]: owner_by_owner: dict[str, int] = {} if claimed <= 0 or not owner_split_enabled: return 0, owner_by_own` (стр. 11361)
- `_process_piggy_bank_for_bookingdef _process_piggy_bank_for_booking(db: Session, booking: Booking) -> None: """Auto-deposit 24% into piggy bank for detailing bookings and repay material withdrawals for any servic` (стр. 11467)
- `_process_owner_profit_sharedef _process_owner_profit_share(db: Session, booking: Booking) -> None: """Расчёт доли владельцев: цена → материалы → мастера → копилка → остаток владельцам (50/50).""" if booking.` (стр. 11700)
- `_PartialBroadcastError._parse_date_strdef _parse_date_str(s: str) -> date | None: try: if "." in s: parts = s.split(".") return date(int(parts[2]), int(parts[1]), int(parts[0])) return date.fromisoformat(s) except (Val` (стр. 14239)
- `_PartialBroadcastError._in_rangedef _in_range(d: str | None) -> bool: if not d: return True parsed = _parse_date_str(d) if not parsed: return True if parsed_from and parsed < parsed_from: return False if parsed_t` (стр. 14263)
- `_deposit_balancedef _deposit_balance(db: Session, client_id: str) -> Decimal: return sum( ( t.amount for t in db.scalars( select(DepositTransaction).where(DepositTransaction.client_id == client_id` (стр. 14978)
- `_deposit_add_transactiondef _deposit_add_transaction( db: Session, client_id: str, txn_type: str, amount: float, description: str, *, date: str, booking_id: str | None = None, created_by_id: str | None = ` (стр. 14990)
- `_deposit_txn_payloaddef _deposit_txn_payload(db: Session, txn: DepositTransaction) -> DepositTransactionPayload: car, plate = "", "" if txn.booking_id: booking = db.get(Booking, txn.booking_id) if boo` (стр. 15019)
- `_deposit_month_labeldef _deposit_month_label() -> str: return datetime.now().strftime("%m.%Y")` (стр. 15042)
- `_deposit_month_ofdef _deposit_month_of(date_str: str) -> str: parts = (date_str or "").split(".") if len(parts) == 3: return f"{parts[1]}.{parts[2]}" return ""` (стр. 15044)
- `_deposit_month_wash_total_fordef _deposit_month_wash_total_for(db: Session, client_id: str, month: str) -> float: total = 0.0 rows = db.scalars( select(Booking).where( Booking.client_id == client_id, Booking.p` (стр. 15051)
- `_deposit_plan_keydef _deposit_plan_key(value: str | None) -> str: plan = (value or "").strip() or "fee" return plan if plan in {"fee", "washes", "per_wash", "unlimited"} else "fee"` (стр. 15067)
- `_deposit_prev_monthdef _deposit_prev_month(month: str) -> str: try: m, y = month.split(".") yi = int(y) - (1 if int(m) == 1 else 0) mi = 12 if int(m) == 1 else int(m) - 1 return f"{mi:02d}.{yi}" exce` (стр. 15072)
- ...ещё 30

### backend/app/models.py (605 строк)

Классы и функции (28):

- `utc_nowdef utc_now() -> datetime: return datetime.now(timezone.utc)` (стр. 16)
- `class Client(Base):` (стр. 20)
- `class StaffUser(Base):` (стр. 64)
- `class Service(Base):` (стр. 113)
- `class Box(Base):` (стр. 139)
- `class ScheduleEntry(Base):` (стр. 150)
- `class Booking(Base):` (стр. 161)
- `class BookingWorker(Base):` (стр. 224)
- `class BookingAdditionalService(Base):` (стр. 240)
- `class BookingMaterial(Base):` (стр. 264)
- `class AdditionalServiceWorker(Base):` (стр. 286)
- `class Notification(Base):` (стр. 303)
- `class StockCategory(Base):` (стр. 316)
- `class StockItem(Base):` (стр. 338)
- `class Expense(Base):` (стр. 358)
- `class StockWriteOff(Base):` (стр. 374)
- `class Penalty(Base):` (стр. 398)
- `class PayrollEntry(Base):` (стр. 425)
- `class TelegramLinkCode(Base):` (стр. 450)
- `class AppSetting(Base):` (стр. 465)
- `class UploadedFile(Base):` (стр. 472)
- `class DataConsent(Base):` (стр. 482)
- `class Income(Base):` (стр. 490)
- `class WeeklyArchive(Base):` (стр. 509)
- `class PiggyBankTransaction(Base):` (стр. 527)
- `class DepositTransaction(Base):` (стр. 550)
- `class DepositMonth(Base):` (стр. 569)
- `class OwnerProfitShare(Base):` (стр. 587)

### backend/app/schemas.py (2123 строк)

Классы и функции (206):

- `normalize_person_namedef normalize_person_name(value: str) -> str: normalized = re.sub(r"\s+", " ", value).strip() if len(normalized) < 1: raise ValueError("Введите настоящее имя") if not NAME_PATTERN.` (стр. 53)
- `normalize_phone_digitsdef normalize_phone_digits(value: str) -> str: digits = re.sub(r"\D", "", value) if len(digits) == 10: digits = f"7{digits}" elif len(digits) == 11 and digits[0] in {"7", "8"}: dig` (стр. 62)
- `normalize_phonedef normalize_phone(value: str) -> str: digits = normalize_phone_digits(value) return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"` (стр. 75)
- `normalize_vehicle_namedef normalize_vehicle_name(value: str) -> str: normalized = re.sub(r"\s+", " ", value).strip() letters_only = "".join(char for char in normalized if char.isalpha()) if not normaliz` (стр. 80)
- `normalize_platedef normalize_plate(value: str, plate_type: str = "russian") -> str: if plate_type == "foreign": normalized = re.sub(r"[^A-Za-z0-9]", "", value).lower() if not normalized: raise Va` (стр. 96)
- `class ClientVehiclePayload(BaseModel):` (стр. 159)
- `ClientVehiclePayload.validate_vehicledef validate_vehicle(self) -> "ClientVehiclePayload": if self.car.strip():` (стр. 166)
- `class ClientProfilePayload(BaseModel):` (стр. 174)
- `class ClientProfileInput(BaseModel):` (стр. 185)
- `ClientProfileInput.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 196)
- `ClientProfileInput.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 201)
- `ClientProfileInput.validate_vehicledef validate_vehicle(self) -> "ClientProfileInput": if self.plate.strip():` (стр. 207)
- `class ClientSummaryPayload(BaseModel):` (стр. 213)
- `class ClientCreateRequest(BaseModel):` (стр. 238)
- `ClientCreateRequest.validate_namedef validate_name(cls, value: str) -> str: return normalize_person_name(value)` (стр. 249)
- `ClientCreateRequest.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 254)
- `ClientCreateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCreateRequest": if self.car.strip():` (стр. 260)
- `class WorkerPayload(BaseModel):` (стр. 268)
- `class PayrollEntryPayload(BaseModel):` (стр. 287)
- `class WorkerPayrollBookingPayload(BaseModel):` (стр. 299)
- `class WorkerPayrollSummaryPayload(BaseModel):` (стр. 312)
- `class SalaryBookingItem(BaseModel):` (стр. 337)
- `class SalaryPayoutItem(BaseModel):` (стр. 361)
- `class SalaryDetailResponse(BaseModel):` (стр. 369)
- `class PaySalaryRequest(BaseModel):` (стр. 387)
- `class PaySalaryResponse(BaseModel):` (стр. 396)
- `class BookingWorkerPayload(BaseModel):` (стр. 403)
- `class BookingServiceItem(BaseModel):` (стр. 411)
- `class AdditionalServiceWorkerPayload(BaseModel):` (стр. 418)
- `class AdditionalServicePayload(BaseModel):` (стр. 426)
- `class AddAdditionalServiceRequest(BaseModel):` (стр. 440)
- `class UpdateAdditionalServiceRequest(BaseModel):` (стр. 451)
- `class BookingPayload(BaseModel):` (стр. 461)
- `class WorkerCalendarBookingPayload(BaseModel):` (стр. 493)
- `class BookingAvailabilitySlotPayload(BaseModel):` (стр. 511)
- `class BookingAvailabilityPayload(BaseModel):` (стр. 518)
- `class NotificationPayload(BaseModel):` (стр. 524)
- `class StockCategoryPayload(BaseModel):` (стр. 533)
- `class StockItemPayload(BaseModel):` (стр. 539)
- `class BookingMaterialPayload(BaseModel):` (стр. 549)
- `class ShiftChecklistItemPayload(BaseModel):` (стр. 558)
- `class ShiftChecklistPayload(BaseModel):` (стр. 567)
- `class ShiftChecklistSubmitItem(BaseModel):` (стр. 577)
- `class ShiftChecklistSubmitRequest(BaseModel):` (стр. 582)
- `class AdminShiftInspectionSupplyPayload(BaseModel):` (стр. 588)
- `class AdminShiftInspectionMasterPayload(BaseModel):` (стр. 597)
- `class AdminShiftInspectionPayload(BaseModel):` (стр. 603)
- `class AdminShiftInspectionSubmitSupply(BaseModel):` (стр. 620)
- `class AdminShiftInspectionSubmitMaster(BaseModel):` (стр. 625)
- `class AdminShiftInspectionSubmitRequest(BaseModel):` (стр. 630)
- `class AdminShiftInspectionReviewRequest(BaseModel):` (стр. 638)
- `class OwnerShiftOpeningRequest(BaseModel):` (стр. 643)
- `class ExpensePayload(BaseModel):` (стр. 648)
- `class PenaltyPayload(BaseModel):` (стр. 658)
- `class TelegramLinkCodePayload(BaseModel):` (стр. 670)
- `class ServicePayload(BaseModel):` (стр. 676)
- `class DetailingRequestCreateRequest(BaseModel):` (стр. 700)
- `DetailingRequestCreateRequest.validate_cardef validate_car(cls, value: str | None) -> str | None: if value is None: return None return normalize_vehicle_name(value)` (стр. 709)
- `DetailingRequestCreateRequest.validate_plate_fielddef validate_plate_field(self) -> "DetailingRequestCreateRequest": if self.plate is not None: if not self.plate.strip():` (стр. 715)
- `class BoxPayload(BaseModel):` (стр. 724)
- `class SchedulePayload(BaseModel):` (стр. 733)
- `class AdminNotificationSettings(BaseModel):` (стр. 741)
- `class AdminProfilePayload(BaseModel):` (стр. 749)
- `class WorkerNotificationSettings(BaseModel):` (стр. 756)
- `class WorkerProfilePayload(BaseModel):` (стр. 764)
- `class OperatingMode(str, Enum):` (стр. 775)
- `class OwnerCompanyPayload(BaseModel):` (стр. 780)
- `class OwnerNotificationSettings(BaseModel):` (стр. 790)
- `class OwnerIntegrationsPayload(BaseModel):` (стр. 800)
- `class GoogleCredentialsPayload(BaseModel):` (стр. 807)
- `class OwnerSecurityPayload(BaseModel):` (стр. 815)
- `class AuthSessionPayload(BaseModel):` (стр. 819)
- `class EmployeeSettingPayload(BaseModel):` (стр. 828)
- `class WorkerCreateRequest(BaseModel):` (стр. 839)
- `class PayrollEntryCreateRequest(BaseModel):` (стр. 851)
- `PayrollEntryCreateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 864)
- `class PayrollEntryUpdateRequest(BaseModel):` (стр. 868)
- `PayrollEntryUpdateRequest.validate_notedef validate_note(cls, value: str) -> str: return value.strip()` (стр. 874)
- `class SettingsBundlePayload(BaseModel):` (стр. 878)
- `class SessionPayload(BaseModel):` (стр. 888)
- `class BootstrapPayload(BaseModel):` (стр. 896)
- `class ClientRegisterRequest(BaseModel):` (стр. 914)
- `ClientRegisterRequest.lift_profiledef lift_profile(cls, raw: Any) -> Any: if isinstance(raw, dict) and isinstance(raw.get("profile"), dict):` (стр. 926)
- `ClientRegisterRequest.validate_namedef validate_name(cls, value: str) -> str: if not value.strip():` (стр. 935)
- `ClientRegisterRequest.validate_phonedef validate_phone(cls, value: str) -> str: if not value.strip():` (стр. 942)
- `ClientRegisterRequest.validate_vehicledef validate_vehicle(self) -> "ClientRegisterRequest": if self.plate.strip():` (стр. 948)
- `class ConsentRecordPayload(BaseModel):` (стр. 954)
- `class ConsentCheckResponse(BaseModel):` (стр. 959)
- `class StaffLinkRequest(BaseModel):` (стр. 963)
- `class SwitchRoleRequest(BaseModel):` (стр. 968)
- `class BookingCreateRequest(BaseModel):` (стр. 972)
- `BookingCreateRequest.validate_client_namedef validate_client_name(cls, value: str) -> str: if not value.strip():` (стр. 998)
- `BookingCreateRequest.validate_client_phonedef validate_client_phone(cls, value: str) -> str: if not value.strip():` (стр. 1005)
- `BookingCreateRequest.validate_vehicledef validate_vehicle(self) -> "BookingCreateRequest": if self.car is not None and self.car.strip():` (стр. 1011)
- `class AddBookingServiceRequest(BaseModel):` (стр. 1019)
- `class BookingUpdateRequest(BaseModel):` (стр. 1026)
- `BookingUpdateRequest.validate_client_namedef validate_client_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 1052)
- `BookingUpdateRequest.validate_client_phonedef validate_client_phone(cls, value: str | None) -> str | None: if value is None: return None return normalize_phone(value)` (стр. 1059)
- `BookingUpdateRequest.validate_vehicledef validate_vehicle(self) -> "BookingUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1065)
- `class ClientCardUpdateRequest(BaseModel):` (стр. 1078)
- `ClientCardUpdateRequest.validate_namedef validate_name(cls, value: str | None) -> str | None: if value is None: return None return normalize_person_name(value)` (стр. 1096)
- `ClientCardUpdateRequest.validate_phonedef validate_phone(cls, value: str | None) -> str | None: if value is None or not value.strip():` (стр. 1103)
- `ClientCardUpdateRequest.validate_vehicledef validate_vehicle(self) -> "ClientCardUpdateRequest": if self.car is not None and not self.car.strip():` (стр. 1109)
- `class NotificationCreateRequest(BaseModel):` (стр. 1122)
- `class ReadAllNotificationsRequest(BaseModel):` (стр. 1129)
- `class StockItemCreateRequest(BaseModel):` (стр. 1133)
- `class StockItemUpdateRequest(BaseModel):` (стр. 1142)
- `class StockCategoryCreateRequest(BaseModel):` (стр. 1151)
- `class StockCategoryUpdateRequest(BaseModel):` (стр. 1156)
- `class StockWriteOffRequest(BaseModel):` (стр. 1161)
- `class StockWriteOffPayload(BaseModel):` (стр. 1165)
- `class IncomeCreateRequest(BaseModel):` (стр. 1183)
- `IncomeCreateRequest.validate_sourcedef validate_source(cls, value: str) -> str: stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или состоять только из пробелов") return stripp` (стр. 1192)
- `IncomeCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1200)
- `class IncomePayload(BaseModel):` (стр. 1206)
- `class ExpenseCreateRequest(BaseModel):` (стр. 1217)
- `ExpenseCreateRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1227)
- `class PenaltyCreateRequest(BaseModel):` (стр. 1233)
- `class OwnerReminderDispatchRequest(BaseModel):` (стр. 1239)
- `class OwnerReminderDispatchPayload(BaseModel):` (стр. 1244)
- `class StaffLoginRequest(BaseModel):` (стр. 1252)
- `class ChangePasswordRequest(BaseModel):` (стр. 1257)
- `class OwnerDatabaseResetPreviewPayload(BaseModel):` (стр. 1262)
- `class OwnerDatabaseResetStartRequest(BaseModel):` (стр. 1277)
- `class OwnerDatabaseResetApproveRequest(BaseModel):` (стр. 1281)
- `class OwnerDatabaseResetExecuteRequest(BaseModel):` (стр. 1287)
- `class OwnerDatabaseResetStartPayload(BaseModel):` (стр. 1291)
- `class OwnerDatabaseResetApprovePayload(BaseModel):` (стр. 1300)
- `class OwnerDatabaseResetExecutePayload(BaseModel):` (стр. 1308)
- `class ContentAboutPayload(BaseModel):` (стр. 1313)
- `class ContentServicePayload(BaseModel):` (стр. 1319)
- `class ContentWorksPayload(BaseModel):` (стр. 1330)
- `class ContentStatsPayload(BaseModel):` (стр. 1336)
- `class ContentTitlePayload(BaseModel):` (стр. 1341)
- `ContentTitlePayload.to_full_titledef to_full_title(self) -> str: return f"{self.before}{self.highlight}{self.after}"` (стр. 1346)
- `class ContentHeroPayload(BaseModel):` (стр. 1350)
- `class ContentPayload(BaseModel):` (стр. 1366)
- `class ContactPayload(BaseModel):` (стр. 1373)
- `class ResetPasswordRequest(BaseModel):` (стр. 1380)
- `class GenericMessage(BaseModel):` (стр. 1384)
- `class TelegramDeliveryResult(BaseModel):` (стр. 1388)
- `class TelegramBroadcastPayload(BaseModel):` (стр. 1394)
- `class OwnerExportDeliveryPayload(BaseModel):` (стр. 1400)
- `class ShiftAttendancePayload(BaseModel):` (стр. 1407)
- `class ExpenseUpdateRequest(BaseModel):` (стр. 1418)
- `ExpenseUpdateRequest.validate_titledef validate_title(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("title не может быть пустым или с` (стр. 1428)
- `ExpenseUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1438)
- `ExpenseUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "ExpenseUpdateRequest": if all(v is None for v in [self.title, self.amount, self.category, self.date, self.note]):` (стр. 1446)
- `class IncomeUpdateRequest(BaseModel):` (стр. 1452)
- `IncomeUpdateRequest.validate_sourcedef validate_source(cls, value: str | None) -> str | None: if value is None: return None stripped = value.strip() if not stripped: raise ValueError("source не может быть пустым или` (стр. 1461)
- `IncomeUpdateRequest.validate_datedef validate_date(cls, value: str | None) -> str | None: if value is None: return None if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1471)
- `IncomeUpdateRequest.require_at_least_one_fielddef require_at_least_one_field(self) -> "IncomeUpdateRequest": # Use model_fields_set to detect explicitly provided fields (including null). # This allows {"note": null} to pass as` (стр. 1479)
- `class PiggyBankTransactionPayload(BaseModel):` (стр. 1487)
- `class PiggyBankWithdrawRequest(BaseModel):` (стр. 1509)
- `PiggyBankWithdrawRequest.validate_datedef validate_date(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):` (стр. 1518)
- `class PiggyBankAdjustRequest(BaseModel):` (стр. 1524)
- `PiggyBankAdjustRequest.validate_datedef validate_date(cls, value: str) -> str: stripped = value.strip() if stripped and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", stripped):` (стр. 1532)
- `class PiggyBankWashBreakdown(BaseModel):` (стр. 1539)
- `class PiggyBankDetailingBreakdown(BaseModel):` (стр. 1552)
- `class PiggyBankResponse(BaseModel):` (стр. 1563)
- `class WeeklyArchivePayload(BaseModel):` (стр. 1582)
- `class WalletResponse(BaseModel):` (стр. 1596)
- `class OwnerProfitShareItem(BaseModel):` (стр. 1613)
- `class OwnerProfitShareSummary(BaseModel):` (стр. 1630)
- `class OwnerSalaryDetailResponse(BaseModel):` (стр. 1639)
- `class PayOwnerSalaryRequest(BaseModel):` (стр. 1646)
- `class PayOwnerSalaryResponse(BaseModel):` (стр. 1652)
- `class OverrideEarnedRequest(BaseModel):` (стр. 1659)
- `class BookingHistoryItem(BaseModel):` (стр. 1663)
- `class BookingTotalsWorkerItem(BaseModel):` (стр. 1680)
- `class BookingTotalsOwnerItem(BaseModel):` (стр. 1698)
- `class BookingTotalsPiggyItem(BaseModel):` (стр. 1705)
- `class BookingHistoryTotals(BaseModel):` (стр. 1711)
- `class BookingMoneySplitWorkerItem(BaseModel):` (стр. 1717)
- `class BookingMoneySplitOwnerItem(BaseModel):` (стр. 1728)
- `class BookingPiggyTxItem(BaseModel):` (стр. 1736)
- `class BookingAdditionalServiceItem(BaseModel):` (стр. 1745)
- `class BookingAsvcPiggyItem(BaseModel):` (стр. 1754)
- `class BookingAsvcWorkerItem(BaseModel):` (стр. 1760)
- `class BookingMoneySplitDetail(BaseModel):` (стр. 1771)
- `class BookingWorkerEarnedUpdate(BaseModel):` (стр. 1819)
- `class BookingMoneySplitOwnerUpdate(BaseModel):` (стр. 1824)
- `class BookingMoneySplitUpdateRequest(BaseModel):` (стр. 1829)
- `class ArchiveBookingWorkerItem(BaseModel):` (стр. 1839)
- `class ArchiveAdditionalServiceItem(BaseModel):` (стр. 1849)
- `class ArchiveBookingItem(BaseModel):` (стр. 1855)
- `class ArchivePayrollItem(BaseModel):` (стр. 1882)
- `class ArchiveOwnerItem(BaseModel):` (стр. 1900)
- `class ArchiveSummary(BaseModel):` (стр. 1908)
- `class ArchiveResponse(BaseModel):` (стр. 1924)
- `class DepositSubscriptionUpdateRequest(BaseModel):` (стр. 1941)
- `DepositSubscriptionUpdateRequest.validate_plandef validate_plan(cls, value: str) -> str: value = value.strip() if value and value not in DEPOSIT_PLANS: raise ValueError("Неизвестный тип абонемента") return value` (стр. 1955)
- `class DepositTopUpRequest(BaseModel):` (стр. 1962)
- `DepositTopUpRequest.validate_datedef validate_date(cls, value: str) -> str: value = value.strip() if value and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1970)
- `class DepositAdjustRequest(BaseModel):` (стр. 1977)
- `DepositAdjustRequest.validate_datedef validate_date(cls, value: str) -> str: value = value.strip() if value and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):` (стр. 1985)
- `class DepositWashRequest(BaseModel):` (стр. 1992)
- `DepositWashRequest.validate_vehicledef validate_vehicle(self) -> "DepositWashRequest": if not self.car.strip() and not self.plate.strip():` (стр. 2008)
- `class DepositSettleRequest(BaseModel):` (стр. 2018)
- `DepositSettleRequest.validate_monthdef validate_month(cls, value: str) -> str: if not re.fullmatch(r"\d{2}\.\d{4}", value.strip()):` (стр. 2024)
- ...ещё 6

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

### backend/bot.py (701 строк)

Классы и функции (39):

- `class BotRuntime: token: str webapp_url: str api_base: str training_webapp_url: str | None = None ADMIN_SHIFT_INSPECTION` (стр. 29)
- `_build_runtimedef _build_runtime() -> BotRuntime: settings = get_settings() if not settings.telegram_bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured") if not settings.webapp_` (стр. 41)
- `telegram_webhook_secretdef telegram_webhook_secret() -> str: settings = get_settings() if not settings.telegram_bot_token: raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured") raw_secret = f"{setti` (стр. 55)
- `telegram_webhook_urldef telegram_webhook_url() -> str: settings = get_settings() if not settings.webapp_url: raise RuntimeError("WEBAPP_URL is not configured") return f"{settings.webapp_url.rstrip('/'` (стр. 63)
- `_parse_retry_afterdef _parse_retry_after(details: str) -> int | None: try: parsed = json.loads(details) except json.JSONDecodeError: return None parameters = parsed.get("parameters") if not isinstan` (стр. 70)
- `_telegram_calldef _telegram_call( runtime: BotRuntime, method: str, payload: dict[str, Any] | None = None, *, max_attempts: int = 3,` (стр. 84)
- `_telegram_multipart_calldef _telegram_multipart_call( runtime: BotRuntime, method: str, fields: dict[str, Any], files: dict[str, tuple[str, str, bytes]],` (стр. 116)
- `_welcome_reply_markupdef _welcome_reply_markup(webapp_url: str) -> dict[str, Any]: return { "inline_keyboard": [ [ {"text": "✨ О нас", "web_app": {"url": f"{webapp_url}/about"}}, {"text": "📸 Наши работ` (стр. 159)
- `_help_reply_markupdef _help_reply_markup(runtime: BotRuntime) -> dict[str, Any]: training_url = runtime.training_webapp_url or runtime.webapp_url help_url = f"{training_url}?help=1" if "?" not in tr` (стр. 182)
- `_send_help_messagedef _send_help_message(runtime: BotRuntime, chat_id: int) -> None: _send_text_message( runtime, chat_id, HELP_TEXT, reply_markup=_help_reply_markup(runtime), parse_mode="HTML", )` (стр. 194)
- `_configure_bot_metadatadef _configure_bot_metadata(runtime: BotRuntime) -> str | None: me = _telegram_call(runtime, "getMe") _telegram_call( runtime, "setMyCommands", { "commands": [ {"command": "start",` (стр. 204)
- `disable_telegram_webhookdef disable_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None: runtime = _build_runtime() username = _configure_bot_metadata(runtime) _telegram_call(runtime, "d` (стр. 232)
- `sync_telegram_webhookdef sync_telegram_webhook(*, drop_pending_updates: bool = False) -> str | None: runtime = _build_runtime() username = _configure_bot_metadata(runtime) target_url = telegram_webhook` (стр. 239)
- `_send_text_messagedef _send_text_message( runtime: BotRuntime, chat_id: int, text: str, *, reply_markup: dict[str, Any] | None = None, parse_mode: str | None = None,` (стр. 268)
- `_send_start_messagedef _send_start_message(runtime: BotRuntime, chat_id: int) -> None: markup = _welcome_reply_markup(runtime.webapp_url) try: req = request.Request(WELCOME_PHOTO_URL) with request.ur` (стр. 299)
- `_send_about_messagedef _send_about_message(runtime: BotRuntime, chat_id: int) -> None: with session_scope() as db: row = db.get(AppSetting, "content") if row and isinstance(row.value, dict):` (стр. 335)
- `_send_works_messagedef _send_works_message(runtime: BotRuntime, chat_id: int) -> None: with session_scope() as db: row = db.get(AppSetting, "content") works = (row.value or {}).get("works", []) if ro` (стр. 348)
- `send_telegram_messagedef send_telegram_message( chat_id: str | int, text: str, *, parse_mode: str | None = None` (стр. 370)
- `send_telegram_documentdef send_telegram_document( chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream",` (стр. 377)
- `send_telegram_photodef send_telegram_photo( chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, parse_mode: str | None = None, mime_type: str = "image/jpeg", reply_mark` (стр. 397)
- `_setting_dictdef _setting_dict(db, key: str, default: dict[str, Any]) -> dict[str, Any]: row = db.get(AppSetting, key) if row is None or not isinstance(row.value, dict):` (стр. 423)
- `_setting_listdef _setting_list(db, key: str) -> list[dict[str, Any]]: row = db.get(AppSetting, key) if row is None or not isinstance(row.value, list):` (стр. 430)
- `_upsert_settingdef _upsert_setting(db, key: str, value: Any) -> None: row = db.get(AppSetting, key) if row is None: row = AppSetting(key=key, value=value) db.add(row) else: row.value = value` (стр. 437)
- `_serialize_nowdef _serialize_now() -> str: return datetime.now(timezone.utc).isoformat()` (стр. 446)
- `_owner_by_chat_iddef _owner_by_chat_id(db, chat_id: int) -> StaffUser | None: return db.query(StaffUser).filter(StaffUser.role == "owner", StaffUser.telegram_chat_id == str(chat_id)).first()` (стр. 450)
- `_apply_shift_review_from_botdef _apply_shift_review_from_bot(chat_id: int, inspection_id: str, action: str, issue_note: str = "") -> str: with session_scope() as db: owner = _owner_by_chat_id(db, chat_id) if ` (стр. 454)
- `_remember_pending_issuedef _remember_pending_issue(chat_id: int, inspection_id: str) -> None: with session_scope() as db: state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat":` (стр. 494)
- `_pop_pending_issuedef _pop_pending_issue(chat_id: int) -> str | None: with session_scope() as db: state = _setting_dict(db, ADMIN_SHIFT_OWNER_BOT_STATE_KEY, {"pendingIssueByChat": {}}) pending = sta` (стр. 505)
- `_extract_contact_phonedef _extract_contact_phone(update: dict[str, Any], chat_id: int) -> str | None: message = update.get("message") or {} contact = message.get("contact") or {} phone_number = contact.` (стр. 517)
- `_store_client_phone_verificationdef _store_client_phone_verification(chat_id: int, phone_digits: str) -> None: with session_scope() as db: current = _setting_dict(db, CLIENT_PHONE_VERIFICATIONS_KEY, {}) current[s` (стр. 532)
- `_extract_chat_iddef _extract_chat_id(update: dict[str, Any]) -> int | None: callback = update.get("callback_query") or {} callback_message = callback.get("message") or {} callback_chat = callback_` (стр. 542)
- `_extract_textdef _extract_text(update: dict[str, Any]) -> str: message = update.get("message") or {} text = message.get("text") return text.strip() if isinstance(text, str) else ""` (стр. 555)
- `_extract_callbackdef _extract_callback(update: dict[str, Any]) -> tuple[str, str] | None: callback = update.get("callback_query") or {} callback_id = callback.get("id") data = callback.get("data") ` (стр. 561)
- `_answer_callback_querydef _answer_callback_query(runtime: BotRuntime, callback_id: str, text: str) -> None: _telegram_call(runtime, "answerCallbackQuery", {"callback_query_id": callback_id, "text": text` (стр. 570)
- `_handle_link_commanddef _handle_link_command(chat_id: int, text: str) -> str: parts = text.split(maxsplit=1) code = parts[1].strip() if len(parts) == 2 else "" if not code.isdigit():` (стр. 574)
- `_handle_plain_codedef _handle_plain_code(chat_id: int, text: str) -> str: code = text.strip() if not (code.isdigit() and len(code) == 6):` (стр. 595)
- `_process_telegram_updatedef _process_telegram_update(runtime: BotRuntime, update: dict[str, Any]) -> None: text = _extract_text(update) chat_id = _extract_chat_id(update) if chat_id is None: return contac` (стр. 615)
- `process_telegram_updatedef process_telegram_update(update: dict[str, Any]) -> None: runtime = _build_runtime() _process_telegram_update(runtime, update)` (стр. 663)
- `run_pollingdef run_polling() -> None: logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s") runtime = _build_runtime() username = disable_telegram_webhook(dr` (стр. 668)

### backend/migrations/add_materials_written_off.py (31 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS materials_written_off BOOLEAN NOT NULL DEFAULT FALSE")) conn.commit()` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS materials_written_off")) conn.commit() print("Downgrade complete: remo` (стр. 23)

### backend/migrations/add_pay_type_to_workers.py (39 строк)

### backend/migrations/add_plate_type.py (33 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS plate_type VARCHAR(16) NOT NULL DEFAULT 'russian'")) conn.execute(text` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE clients DROP COLUMN IF EXISTS plate_type")) conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EX` (стр. 24)

### backend/migrations/add_referral_source.py (40 строк)

Классы и функции (2):

- `add_referral_source_columndef add_referral_source_column(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() cursor.execute("PRAGMA table_info(clients)") columns = {row[` (стр. 13)
- `maindef main() -> None: print("Adding referral_source column to client databases...") for db_file in sorted(DB_FILES):` (стр. 32)

### backend/migrations/add_service_times.py (33 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP")) conn.execute(text("ALTER TABLE bookings ADD C` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS started_at")) conn.execute(text("ALTER TABLE bookings DROP COLUMN IF E` (стр. 24)

### backend/migrations/add_stock_write_offs.py (46 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text(""" CREATE TABLE IF NOT EXISTS stock_write_offs ( id VARCHAR(64) PRIMARY KEY, stock_item_id VARCHAR(64) REFERENCES s` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("DROP TABLE IF EXISTS stock_write_offs")) conn.commit() print("Downgrade complete: dropped stock_write_offs table"` (стр. 38)

### backend/migrations/add_write_off_booking_fields.py (35 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_write_offs ADD COLUMN IF NOT EXISTS booking_client_name VARCHAR(120)")) conn.execute(text("ALTER ` (стр. 16)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_write_offs DROP COLUMN IF EXISTS booking_client_name")) conn.execute(text("ALTER TABLE stock_wr` (стр. 25)

### backend/migrations/change_int_to_float.py (50 строк)

Классы и функции (2):

- `upgradedef upgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_items ALTER COLUMN qty TYPE DOUBLE PRECISION")) conn.execute(text("ALTER TABLE stock_items ALTER ` (стр. 17)
- `downgradedef downgrade(): with engine.connect() as conn: conn.execute(text("ALTER TABLE stock_items ALTER COLUMN qty TYPE INTEGER")) conn.execute(text("ALTER TABLE stock_items ALTER COLUMN ` (стр. 33)

### backend/migrations/finance_consistency.py (117 строк)

Классы и функции (4):

- `_default_enginedef _default_engine() -> Engine: """Load application configuration only when the migration is executed.""" try: from backend.app.database import engine except ModuleNotFoundError: ` (стр. 15)
- `_sqlite_pathdef _sqlite_path(engine: Engine | None = None) -> Path | None: target = engine or _default_engine() if target.dialect.name != "sqlite": return None database = target.url.database r` (стр. 35)
- `preflightdef preflight(engine: Engine | None = None) -> list[str]: target = engine or _default_engine() inspector = inspect(target) report: list[str] = [] for table, names in MONEY_COLUMNS.` (стр. 43)
- `upgradedef upgrade(*, dry_run: bool = True, engine: Engine | None = None) -> list[str]: target = engine or _default_engine() report = preflight(target) if dry_run: return report if target` (стр. 58)

### backend/migrations/migrate_additional_services.py (79 строк)

Классы и функции (2):

- `migrate_additional_servicesdef migrate_additional_services(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() # Проверить, существует ли новая таблица cursor.execute("SE` (стр. 15)
- `maindef main() -> None: print("Migrating additional services from Booking.services JSON to booking_additional_services table...") for db_file in sorted(DB_FILES):` (стр. 71)

### backend/migrations/sync_client_schema.py (49 строк)

Классы и функции (2):

- `sync_client_schemadef sync_client_schema(db_path: Path) -> None: try: conn = sqlite3.connect(str(db_path)) cursor = conn.cursor() cursor.execute("PRAGMA table_info(clients)") columns = {row[1] for r` (стр. 21)
- `maindef main() -> None: print("Syncing client table schema...") for db_file in sorted(DB_FILES):` (стр. 41)

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

### backend/tests/test_booking_logic.py (4462 строк)

Классы и функции (150):

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
- `BookingLogicTests.test_booking_must_fit_schedule_windowdef test_booking_must_fit_schedule_window(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/bookings", header` (стр. 991)
- `BookingLogicTests.test_worker_cannot_update_foreign_bookingdef test_worker_cannot_update_foreign_booking(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/bookings", headers=self.auth` (стр. 1016)
- `BookingLogicTests.test_owner_can_revoke_all_worker_complaintsdef test_owner_can_revoke_all_worker_complaints(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker = self.get_staff(login="ivan"` (стр. 1050)
- `BookingLogicTests.test_owner_summary_report_sends_detailed_excel_documentdef test_owner_summary_report_sends_detailed_excel_document(self) -> None: from app.database import SessionLocal from app.models import Booking, BookingWorker self.disable_owner_tw` (стр. 1079)
- `BookingLogicTests.fake_send_documentdef fake_send_document(chat_id: str | int, *, file_name: str, content: bytes, caption: str | None = None, mime_type: str = "application/octet-stream") -> None: sent_documents.appen` (стр. 1143)
- `BookingLogicTests.test_admin_create_booking_can_assign_workers_and_notify_themdef test_admin_create_booking_can_assign_workers_and_notify_them(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = s` (стр. 1191)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 1205)
- `BookingLogicTests.test_admin_can_create_booking_without_platedef test_admin_can_create_booking_without_plate(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/bookings", headers=self.auth_head` (стр. 1256)
- `BookingLogicTests.test_admin_can_create_admin_review_booking_with_empty_optional_fieldsdef test_admin_can_create_admin_review_booking_with_empty_optional_fields(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/booking` (стр. 1286)
- `BookingLogicTests.test_admin_cannot_create_scheduled_booking_without_date_and_timedef test_admin_cannot_create_scheduled_booking_without_date_and_time(self) -> None: """Статус scheduled требует валидный слот при создании — иначе запись нельзя впоследствии переве` (стр. 1324)
- `BookingLogicTests.test_scheduled_booking_without_slot_cannot_be_moved_to_active_statusdef test_scheduled_booking_without_slot_cannot_be_moved_to_active_status(self) -> None: """Слотless запись (устаревшие данные) не может быть переведена в активный статус: PATCH отв` (стр. 1353)
- `BookingLogicTests.test_patch_can_clear_slot_when_moving_to_non_active_statusdef test_patch_can_clear_slot_when_moving_to_non_active_status(self) -> None: """Регресс: перевод детейлинг-записи со слотом в «на уточнении» (admin_review) фронтенд отправляет с н` (стр. 1399)
- `BookingLogicTests.test_owner_can_create_client_and_past_booking_visible_on_first_client_logindef test_owner_can_create_client_and_past_booking_visible_on_first_client_login(self) -> None: owner_token = self.login_staff("owner", "owner") client_response = self.client.post( ` (стр. 1450)
- `BookingLogicTests.test_service_resource_group_preserved_on_savedef test_service_resource_group_preserved_on_save(self) -> None: owner_token = self.login_staff("owner", "owner") bootstrap = self.client.get("/api/auth/session", headers=self.auth` (стр. 1503)
- `BookingLogicTests.test_fired_worker_loses_access_and_future_assignmentsdef test_fired_worker_loses_access_and_future_assignments(self) -> None: admin_token = self.login_staff("admin", "admin") self.disable_owner_two_factor() owner_token = self.login_s` (стр. 1520)
- `BookingLogicTests.test_same_telegram_client_reuses_existing_accountdef test_same_telegram_client_reuses_existing_account(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.` (стр. 1580)
- `BookingLogicTests.test_generic_telegram_auth_logs_in_linked_clientdef test_generic_telegram_auth_logs_in_linked_client(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/client", json=self.c` (стр. 1614)
- `BookingLogicTests.test_generic_telegram_auth_tolerates_legacy_client_profile_datadef test_generic_telegram_auth_tolerates_legacy_client_profile_data(self) -> None: from app.database import SessionLocal from app.models import Client self.verify_client_phone("100` (стр. 1633)
- `BookingLogicTests.test_generic_telegram_auth_prefers_linked_staff_windowdef test_generic_telegram_auth_prefers_linked_staff_window(self) -> None: self.set_staff_telegram("ivan", "7001") self.verify_client_phone("7001", "+7 (999) 111-22-33") client = se` (стр. 1663)
- `BookingLogicTests.test_generic_telegram_auth_does_not_claim_primary_ownerdef test_generic_telegram_auth_does_not_claim_primary_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post("/api/auth/telegram", json={"initData": s` (стр. 1679)
- `BookingLogicTests.test_primary_owner_telegram_route_rejects_unlinked_ownerdef test_primary_owner_telegram_route_rejects_unlinked_owner(self) -> None: self.set_primary_owner_telegram("") response = self.client.post( "/api/auth/telegram-owner", json={"init` (стр. 1686)
- `BookingLogicTests.test_nullable_text_values_are_treated_as_empty_stringsdef test_nullable_text_values_are_treated_as_empty_strings(self) -> None: from app.main import _safe_text self.assertEqual(_safe_text(None), "") self.assertEqual(_safe_text(" 9001 ` (стр. 1699)
- `BookingLogicTests.test_primary_owner_can_log_in_via_dedicated_telegram_routedef test_primary_owner_can_log_in_via_dedicated_telegram_route(self) -> None: self.set_primary_owner_telegram("9001") response = self.client.post( "/api/auth/telegram-owner", json=` (стр. 1705)
- `BookingLogicTests.test_generic_telegram_auth_rejects_expired_init_datadef test_generic_telegram_auth_rejects_expired_init_data(self) -> None: # Строгий режим: без insecure-fallback просроченный initData отклоняется self.shutdown_app() os.environ["ALL` (стр. 1722)
- `BookingLogicTests.test_generic_telegram_auth_rejects_duplicate_staff_bindingsdef test_generic_telegram_auth_rejects_duplicate_staff_bindings(self) -> None: self.set_staff_telegram("ivan", "7007") self.set_staff_telegram("oleg", "7007") response = self.clien` (стр. 1739)
- `BookingLogicTests.test_client_registration_rejects_same_phone_for_different_telegram_idsdef test_client_registration_rejects_same_phone_for_different_telegram_ids(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/aut` (стр. 1747)
- `BookingLogicTests.test_client_profile_cannot_take_phone_of_another_clientdef test_client_profile_cannot_take_phone_of_another_client(self) -> None: first_token, first_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") second_token, _ = sel` (стр. 1762)
- `BookingLogicTests.test_client_booking_creates_notification_for_same_client_iddef test_client_booking_creates_notification_for_same_client_id(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.` (стр. 1781)
- `BookingLogicTests.test_client_cannot_mark_other_clients_notification_as_readdef test_client_cannot_mark_other_clients_notification_as_read(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice` (стр. 1812)
- `BookingLogicTests.test_client_login_rejects_foreign_telegram_id_for_existing_phonedef test_client_login_rejects_foreign_telegram_id_for_existing_phone(self) -> None: self.verify_client_phone("1001", "+7 (999) 111-22-33") first = self.client.post( "/api/auth/clie` (стр. 1841)
- `BookingLogicTests.test_client_read_all_marks_only_own_notificationsdef test_client_read_all_marks_only_own_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_client(name="Alice", phone=` (стр. 1862)
- `BookingLogicTests.test_client_read_all_rejects_foreign_role_payloaddef test_client_read_all_rejects_foreign_role_payload(self) -> None: token, _ = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.post( "/api/notif` (стр. 1904)
- `BookingLogicTests.test_deleting_client_removes_client_sessions_and_notificationsdef test_deleting_client_removes_client_sessions_and_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name=` (стр. 1913)
- `BookingLogicTests.test_client_cancel_booking_creates_client_and_admin_notificationsdef test_client_cancel_booking_creates_client_and_admin_notifications(self) -> None: token, actor_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") create_response =` (стр. 1941)
- `BookingLogicTests.test_deleted_client_can_register_again_with_same_phone_and_telegramdef test_deleted_client_can_register_again_with_same_phone_and_telegram(self) -> None: admin_token = self.login_staff("admin", "admin") self.verify_client_phone("1001", "+7 (999) 1` (стр. 1982)
- `BookingLogicTests.test_secure_client_auth_requires_valid_init_datadef test_secure_client_auth_requires_valid_init_data(self) -> None: self.shutdown_app() os.environ["ALLOW_INSECURE_CLIENT_AUTH"] = "false" self.restart_app() missing = self.client.` (стр. 2006)
- `BookingLogicTests.test_admin_reschedule_creates_client_notificationdef test_admin_reschedule_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 2037)
- `BookingLogicTests.test_admin_completion_creates_client_notificationdef test_admin_completion_creates_client_notification(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, actor_id = self.login_client(name="Alice", phone` (стр. 2075)
- `BookingLogicTests.test_admin_booking_reuses_existing_client_by_normalized_phonedef test_admin_booking_reuses_existing_client_by_normalized_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", pho` (стр. 2119)
- `BookingLogicTests.test_admin_cannot_create_booking_with_conflicting_client_and_phonedef test_admin_cannot_create_booking_with_conflicting_client_and_phone(self) -> None: admin_token = self.login_staff("admin", "admin") _, first_client_id = self.login_client(name="` (стр. 2153)
- `BookingLogicTests.test_admin_can_save_profile_and_notification_settingsdef test_admin_can_save_profile_and_notification_settings(self) -> None: admin_token = self.login_staff("admin", "admin") profile_response = self.client.put( "/api/settings/admin/p` (стр. 2181)
- `BookingLogicTests.test_owner_can_create_admin_like_worker_and_update_telegram_idsdef test_owner_can_create_admin_like_worker_and_update_telegram_ids(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_admin = s` (стр. 2217)
- `BookingLogicTests.test_owner_can_create_and_login_accountantdef test_owner_can_create_and_login_accountant(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_accountant = self.client.post(` (стр. 2299)
- `BookingLogicTests.test_owner_can_rehire_employee_with_same_telegram_after_dismissaldef test_owner_can_rehire_employee_with_same_telegram_after_dismissal(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_worker ` (стр. 2338)
- `BookingLogicTests.test_admin_can_manage_master_payroll_and_private_client_ratingdef test_admin_can_manage_master_payroll_and_private_client_rating(self) -> None: admin_token = self.login_staff("admin", "admin") _, client_id = self.login_client(name="Alice", ph` (стр. 2389)
- `BookingLogicTests.test_admin_payroll_propagates_period_and_matches_salary_base_helperdef test_admin_payroll_propagates_period_and_matches_salary_base_helper(self) -> None: from app.database import SessionLocal from app.finance import money_int, salary_base_for_peri` (стр. 2431)
- `BookingLogicTests.test_owner_and_admin_can_see_detailed_worker_payroll_summarydef test_owner_and_admin_can_see_detailed_worker_payroll_summary(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.` (стр. 2491)
- `BookingLogicTests.test_payroll_entry_notifies_worker_and_updates_summarydef test_payroll_entry_notifies_worker_and_updates_summary(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser self.disable_owner_tw` (стр. 2584)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2599)
- `BookingLogicTests.test_admin_cannot_issue_advance_before_worker_earns_1000def test_admin_cannot_issue_advance_before_worker_earns_1000(self) -> None: admin_token = self.login_staff("admin", "admin") response = self.client.post( "/api/payroll/entries", he` (стр. 2625)
- `BookingLogicTests._tg_headersdef _tg_headers(self, login: str, telegram_id: str) -> dict[str, str]: """Авторизация текущего флоу (Telegram init data): привязываем telegram_chat_id к сотруднику и возвращаем заг` (стр. 2641)
- `BookingLogicTests.test_payroll_entries_with_period_are_attributed_to_selected_perioddef test_payroll_entries_with_period_are_attributed_to_selected_period(self) -> None: """Премия/штраф/списание с выбранным периодом учитываются за этот период (08.08–14.08), а не п` (стр. 2660)
- `BookingLogicTests.test_payroll_entry_without_period_keeps_created_at_behaviordef test_payroll_entry_without_period_keeps_created_at_behavior(self) -> None: """Операция без периода (legacy) учитывается по дате создания.""" owner_headers = self._tg_headers("o` (стр. 2725)
- `BookingLogicTests.test_owner_pay_salary_attributes_payout_to_selected_perioddef test_owner_pay_salary_attributes_payout_to_selected_period(self) -> None: """Выплата мастеру тоже привязывается к выбранному периоду.""" owner_headers = self._tg_headers("owner` (стр. 2758)
- `BookingLogicTests.test_owner_salary_detail_lists_db_owners_without_configdef test_owner_salary_detail_lists_db_owners_without_config(self) -> None: """Доходы владельцев видны без PERMANENT_TELEGRAM_OWNERS — владельцы берутся из БД.""" owner_headers = se` (стр. 2784)
- `BookingLogicTests.test_owner_pdf_export_returns_pdf_filedef test_owner_pdf_export_returns_pdf_file(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self.client.get("/api/owner/ex` (стр. 2812)
- `BookingLogicTests.test_owner_can_create_booking_with_assigned_master_without_platedef test_owner_can_create_booking_with_assigned_master_without_plate(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") response = self` (стр. 2821)
- `BookingLogicTests.test_admin_reschedule_notifies_assigned_workerdef test_admin_reschedule_notifies_assigned_worker(self) -> None: from app.database import SessionLocal from app.models import Notification, StaffUser admin_token = self.login_staf` (стр. 2850)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2889)
- `BookingLogicTests.test_worker_start_and_completion_notify_owner_and_send_receiptdef test_worker_start_and_completion_notify_owner_and_send_receipt(self) -> None: from app.database import SessionLocal from app.models import Client, Notification self.disable_own` (стр. 2917)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 2962)
- `BookingLogicTests.test_client_can_store_multiple_vehiclesdef test_client_can_store_multiple_vehicles(self) -> None: token, client_id = self.login_client(name="Alice", phone="+7 (999) 111-22-33") response = self.client.patch( "/api/client` (стр. 3008)
- `BookingLogicTests.test_owner_can_notify_admin_about_inactive_clientsdef test_owner_can_notify_admin_about_inactive_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two_fact` (стр. 3045)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3080)
- `BookingLogicTests.test_owner_dispatches_return_visit_reminders_to_clientsdef test_owner_dispatches_return_visit_reminders_to_clients(self) -> None: from app.database import SessionLocal from app.models import Booking, Notification self.disable_owner_two` (стр. 3100)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str | int, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 3144)
- `BookingLogicTests.test_worker_can_submit_shift_checklists_and_owner_can_review_themdef test_worker_can_submit_shift_checklists_and_owner_can_review_them(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 3174)
- `BookingLogicTests.test_admin_shift_inspection_sends_owner_photo_and_can_be_approveddef test_admin_shift_inspection_sends_owner_photo_and_can_be_approved(self) -> None: from app.database import SessionLocal from app.models import Notification self.disable_owner_tw` (стр. 3243)
- `BookingLogicTests.fake_send_photodef fake_send_photo(chat_id: str | int, **kwargs) -> None: sent_photos.append({"chat_id": chat_id, **kwargs})` (стр. 3263)
- `BookingLogicTests.test_admin_shift_inspection_list_uses_photo_endpointdef test_admin_shift_inspection_list_uses_photo_endpoint(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_st` (стр. 3299)
- `BookingLogicTests.test_bot_can_reject_admin_shift_with_issue_notedef test_bot_can_reject_admin_shift_with_issue_note(self) -> None: from bot import BotRuntime, process_telegram_update from app.database import SessionLocal from app.models import ` (стр. 3342)
- `BookingLogicTests.fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict[str, object] | None = None, **_kwargs): telegram_calls.append((method, payload or {})) return {}` (стр. 3377)
- `BookingLogicTests.test_admin_mark_read_all_affects_only_admin_notificationsdef test_admin_mark_read_all_affects_only_admin_notifications(self) -> None: admin_token = self.login_staff("admin", "admin") owner_token = self.login_staff("owner", "owner") if Fa` (стр. 3409)
- `BookingLogicTests.test_admin_cannot_access_owner_only_endpointsdef test_admin_cannot_access_owner_only_endpoints(self) -> None: admin_token = self.login_staff("admin", "admin") create_worker = self.client.post( "/api/workers", headers=self.aut` (стр. 3452)
- `BookingLogicTests.test_worker_can_update_only_own_assigned_booking_status_and_notesdef test_worker_can_update_only_own_assigned_booking_status_and_notes(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "maste` (стр. 3499)
- `BookingLogicTests.test_worker_completion_creates_admin_notification_with_amount_client_and_servicedef test_worker_completion_creates_admin_notification_with_amount_client_and_service(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff` (стр. 3545)
- `BookingLogicTests.test_worker_cannot_change_time_or_workers_even_on_own_bookingdef test_worker_cannot_change_time_or_workers_even_on_own_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 3585)
- `BookingLogicTests.test_worker_must_specify_payment_state_when_completing_bookingdef test_worker_must_specify_payment_state_when_completing_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master")` (стр. 3627)
- `BookingLogicTests.test_worker_can_save_only_own_profiledef test_worker_can_save_only_own_profile(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.get_staff(login` (стр. 3680)
- `BookingLogicTests.test_worker_can_save_only_own_notification_settingsdef test_worker_can_save_only_own_notification_settings(self) -> None: worker_token = self.login_staff("ivan", "master") worker = self.get_staff(login="ivan") other_worker = self.g` (стр. 3718)
- `BookingLogicTests.test_worker_mark_read_all_affects_only_own_notificationsdef test_worker_mark_read_all_affects_only_own_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") worker_token = self.log` (стр. 3751)
- `BookingLogicTests.test_worker_cannot_create_penaltiesdef test_worker_cannot_create_penalties(self) -> None: worker_token = self.login_staff("ivan", "master") other_worker = self.get_staff(login="oleg") response = self.client.post( "/` (стр. 3784)
- `BookingLogicTests.test_worker_cannot_create_notifications_for_other_rolesdef test_worker_cannot_create_notifications_for_other_roles(self) -> None: worker_token = self.login_staff("ivan", "master") _, client_id = self.login_client(name="Alice", phone="+` (стр. 3794)
- `BookingLogicTests.test_worker_can_create_notification_for_assigned_clientdef test_worker_can_create_notification_for_assigned_client(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") worker` (стр. 3809)
- `BookingLogicTests.test_worker_can_generate_telegram_link_codedef test_worker_can_generate_telegram_link_code(self) -> None: worker_token = self.login_staff("ivan", "master") response = self.client.post( "/api/telegram/link-code", headers=sel` (стр. 3850)
- `BookingLogicTests.test_telegram_webhook_rejects_invalid_secretdef test_telegram_webhook_rejects_invalid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.restart_app()` (стр. 3861)
- `BookingLogicTests.test_telegram_webhook_processes_update_with_valid_secretdef test_telegram_webhook_processes_update_with_valid_secret(self) -> None: os.environ["WEBAPP_URL"] = "https://crm.example" os.environ["TELEGRAM_DELIVERY_MODE"] = "webhook" self.r` (стр. 3873)
- `BookingLogicTests.test_client_bootstrap_contains_only_own_bookings_and_no_worker_directorydef test_client_bootstrap_contains_only_own_bookings_and_no_worker_directory(self) -> None: admin_token = self.login_staff("admin", "admin") first_token, first_id = self.login_clie` (стр. 3888)
- `BookingLogicTests.test_worker_bootstrap_contains_only_assigned_bookingsdef test_worker_bootstrap_contains_only_assigned_bookings(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") first_wo` (стр. 3948)
- `BookingLogicTests.test_admin_can_update_booking_alias_fields_and_service_canonical_datadef test_admin_can_update_booking_alias_fields_and_service_canonical_data(self) -> None: admin_token = self.login_staff("admin", "admin") create_response = self.client.post( "/api/` (стр. 4008)
- `BookingLogicTests.test_owner_stock_write_off_rejects_negative_qtydef test_owner_stock_write_off_rejects_negative_qty(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") create_response = self.client.po` (стр. 4059)
- `BookingLogicTests.test_admin_can_read_targeted_admin_notificationsdef test_admin_can_read_targeted_admin_notifications(self) -> None: self.disable_owner_two_factor() owner_token = self.login_staff("owner", "owner") admin_token = self.login_staff(` (стр. 4088)
- `BookingLogicTests.test_deleting_client_removes_related_bookings_and_sessionsdef test_deleting_client_removes_related_bookings_and_sessions(self) -> None: admin_token = self.login_staff("admin", "admin") client_token, client_id = self.login_client(name="Ali` (стр. 4141)
- `BookingLogicTests.test_worker_cannot_message_client_from_only_completed_bookingdef test_worker_cannot_message_client_from_only_completed_booking(self) -> None: admin_token = self.login_staff("admin", "admin") worker_token = self.login_staff("ivan", "master") ` (стр. 4178)
- `BookingLogicTests.test_owner_database_reset_execute_requires_delay_after_approvaldef test_owner_database_reset_execute_requires_delay_after_approval(self) -> None: self.disable_owner_two_factor() self.set_primary_owner_telegram() owner_token = self.login_staff(` (стр. 4225)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 4231)
- `BookingLogicTests.test_owner_database_reset_clears_operational_data_and_preserves_ownersdef test_owner_database_reset_clears_operational_data_and_preserves_owners(self) -> None: from app.database import SessionLocal from app.models import ( AppSetting, Booking, Box, C` (стр. 4265)
- `BookingLogicTests.fake_send_messagedef fake_send_message(chat_id: str, text: str) -> None: sent_messages.append((chat_id, text))` (стр. 4336)
- `BookingLogicTests.test_normalize_service_and_box_resources_handles_legacy_null_box_fieldsdef test_normalize_service_and_box_resources_handles_legacy_null_box_fields(self) -> None: from app.main import DETAILING_BOX_NAME, WASH_BOX_NAMES, _normalize_service_and_box_resou` (стр. 4399)
- `class FakeScalarResult: def __init__(self, items: list[object]) -> None: self._items = items def all(self) -> list[objec` (стр. 4403)
- `FakeScalarResult.__init__def __init__(self, items: list[object]) -> None: self._items = items` (стр. 4404)
- `FakeScalarResult.alldef all(self) -> list[object]: return self._items` (стр. 4407)
- `class FakeSession: def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.` (стр. 4410)
- `FakeSession.__init__def __init__(self, services: list[Service], boxes: list[Box]) -> None: self.services = services self.boxes = boxes self.flushed = False` (стр. 4411)
- `FakeSession.scalarsdef scalars(self, statement): entity = statement.column_descriptions[0]["entity"] if entity is Service: return FakeScalarResult(self.services) if entity is Box: return FakeScalarRe` (стр. 4416)
- `FakeSession.adddef add(self, _item: object) -> None: return None` (стр. 4424)
- `FakeSession.flushdef flush(self) -> None: self.flushed = True` (стр. 4427)

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

### backend/tests/test_bot_help.py (89 строк)

Классы и функции (8):

- `_runtimedef _runtime(*, training_url: str | None = "https://training.example") -> BotRuntime: return BotRuntime( token="t", webapp_url="https://app.example", api_base="https://api.example"` (стр. 8)
- `_run_updatedef _run_update(runtime: BotRuntime, update: dict) -> list[tuple[str, dict]]: calls: list[tuple[str, dict]] = [] def fake_telegram_call(_runtime, method: str, payload: dict | None ` (стр. 17)
- `fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs): calls.append((method, payload or {})) return {}` (стр. 20)
- `test_help_command_sends_training_message_with_webapp_buttondef test_help_command_sends_training_message_with_webapp_button() -> None: calls = _run_update( _runtime(), {"message": {"chat": {"id": 777}, "text": "/help"}}, ) sent = [payload f` (стр. 31)
- `test_help_button_falls_back_to_main_webapp_url_when_training_unsetdef test_help_button_falls_back_to_main_webapp_url_when_training_unset() -> None: calls = _run_update( _runtime(training_url=None), {"message": {"chat": {"id": 778}, "text": "/help` (стр. 52)
- `test_help_command_registered_in_bot_menudef test_help_command_registered_in_bot_menu() -> None: calls: list[tuple[str, dict]] = [] runtime = _runtime() def fake_telegram_call(_runtime, method: str, payload: dict | None =` (стр. 64)
- `fake_telegram_calldef fake_telegram_call(_runtime, method: str, payload: dict | None = None, **_kwargs): calls.append((method, payload or {})) return {}` (стр. 68)
- `test_help_does_not_break_start_commanddef test_help_does_not_break_start_command() -> None: calls = _run_update( _runtime(), {"message": {"chat": {"id": 779}, "text": "/start"}}, ) sent = [payload for method, payload i` (стр. 82)

### backend/tests/test_broadcast_edge_cases.py (178 строк)

Классы и функции (12):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 18)
- `class BroadcastEdgeCaseTests(unittest.TestCase):` (стр. 30)
- `BroadcastEdgeCaseTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_suite_{uuid4().hex}.sq` (стр. 33)
- `BroadcastEdgeCaseTests.tearDowndef tearDown(self) -> None: self.shutdown_app() reset_app_modules() if self.db_path.exists():` (стр. 52)
- `BroadcastEdgeCaseTests.shutdown_appdef shutdown_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 58)
- `BroadcastEdgeCaseTests.restart_appdef restart_app(self) -> None: if hasattr(self, "client_manager"):` (стр. 67)
- `BroadcastEdgeCaseTests.login_staffdef login_staff(self, login: str, password: str) -> str: response = self.client.post( "/api/auth/staff/login", json={"login": login, "password": password}, ) self.assertEqual(respo` (стр. 76)
- `BroadcastEdgeCaseTests.disable_owner_two_factordef disable_owner_two_factor(self) -> None: from app.database import SessionLocal from app.models import AppSetting with SessionLocal() as db: setting = db.get(AppSetting, "owner_s` (стр. 84)
- `BroadcastEdgeCaseTests.clear_all_owner_telegram_chat_idsdef clear_all_owner_telegram_chat_ids(self) -> None: """Remove telegram_chat_id from all owners so no one is eligible for broadcast.""" from app.database import SessionLocal from a` (стр. 95)
- `BroadcastEdgeCaseTests.auth_headersdef auth_headers(token: str) -> dict[str, str]: return {"Authorization": token}` (стр. 109)
- `BroadcastEdgeCaseTests.test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_iddef test_export_broadcast_returns_503_when_no_owners_have_telegram_chat_id( self,` (стр. 116)
- `BroadcastEdgeCaseTests.test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_iddef test_report_broadcast_returns_503_when_no_owners_have_telegram_chat_id( self,` (стр. 146)

### backend/tests/test_config.py (123 строк)

Классы и функции (12):

- `test_normalize_database_url_converts_legacy_postgres_schemedef test_normalize_database_url_converts_legacy_postgres_scheme() -> None: raw_url = "postgres://user:pass@example.com:5432/appdb?sslmode=require&application_name=crm" assert _norm` (стр. 9)
- `test_normalize_database_url_uses_psycopg_for_postgresql_schemedef test_normalize_database_url_uses_psycopg_for_postgresql_scheme() -> None: raw_url = "postgresql://user:pass@example.com:5432/appdb" assert _normalize_database_url(raw_url) == "` (стр. 18)
- `test_normalize_database_url_keeps_explicit_driver_and_sqlitedef test_normalize_database_url_keeps_explicit_driver_and_sqlite() -> None: assert _normalize_database_url("postgresql+psycopg://user:pass@example.com/appdb") == "postgresql+psycop` (стр. 24)
- `test_strong_environments_reject_weak_secretdef test_strong_environments_reject_weak_secret(monkeypatch, environment: str) -> None: monkeypatch.setenv("APP_ENV", environment) monkeypatch.setenv("APP_SECRET", "change-me") mon` (стр. 30)
- `test_production_rejects_demo_seeddef test_production_rejects_demo_seed(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("ALLOW_DEMO_SE` (стр. 40)
- `test_production_caps_init_data_ttldef test_production_caps_init_data_ttl(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("ALLOW_DEMO_S` (стр. 50)
- `test_cors_rejects_wildcard_with_credentialsdef test_cors_rejects_wildcard_with_credentials(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "development") monkeypatch.setenv("CORS_ORIGINS", "*") with pytest.raises(Runtim` (стр. 61)
- `test_production_postgres_defaults_to_required_tlsdef test_production_postgres_defaults_to_required_tls(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.seten` (стр. 69)
- `test_production_rejects_disabled_tls_from_urldef test_production_rejects_disabled_tls_from_url(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("APP_SECRET", "a" * 32) monkeypatch.setenv("A` (стр. 80)
- `test_development_postgres_does_not_force_tlsdef test_development_postgres_does_not_force_tls(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "development") monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@examp` (стр. 93)
- `test_vercel_production_rejects_sqlitedef test_vercel_production_rejects_sqlite(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "production") monkeypatch.setenv("VERCEL", "1") monkeypatch.setenv("APP_SECRET", "a" *` (стр. 101)
- `test_permanent_owner_config_is_strict_and_contains_no_defaultsdef test_permanent_owner_config_is_strict_and_contains_no_defaults(monkeypatch) -> None: monkeypatch.setenv("APP_ENV", "test") monkeypatch.setenv("PERMANENT_TELEGRAM_OWNERS", json.` (стр. 113)

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

### backend/tests/test_google_calendar.py (340 строк)

Классы и функции (32):

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

### backend/tests/test_google_calendar_api.py (481 строк)

Классы и функции (24):

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
- `GoogleCalendarApiTests.test_callback_rejects_wrong_statedef test_callback_rejects_wrong_state(self) -> None: response = self.client.get( "/api/owner/integrations/google/callback", params={"code": "auth-code", "state": "wrong-state"}, he` (стр. 258)
- `GoogleCalendarApiTests.test_callback_returns_html_page_for_browserdef test_callback_returns_html_page_for_browser(self) -> None: """Браузер (Accept: text/html) после OAuth видит понятную страницу, а не JSON.""" token = self.login_owner() with pat` (стр. 267)
- `GoogleCalendarApiTests.test_disconnect_clears_tokens_and_flagdef test_disconnect_clears_tokens_and_flag(self) -> None: token = self.login_owner() with patch("app.main.exchange_code", return_value={"token": "t", "refresh_token": "r"}):` (стр. 306)
- `GoogleCalendarApiTests.test_create_booking_calls_google_syncdef test_create_booking_calls_google_sync(self) -> None: token = self.login_owner() from app.database import SessionLocal from app.models import AppSetting # Подключаем интеграцию ` (стр. 343)
- `GoogleCalendarApiTests.test_sync_endpoint_requires_ownerdef test_sync_endpoint_requires_owner(self) -> None: response = self.client.post("/api/owner/integrations/google/sync") self.assertEqual(response.status_code, 401)` (стр. 384)
- `GoogleCalendarApiTests.test_sync_endpoint_returns_pull_statsdef test_sync_endpoint_returns_pull_stats(self) -> None: token = self.login_owner() from app.database import SessionLocal from app.models import AppSetting # Подключаем интеграцию ` (стр. 388)
- `GoogleCalendarApiTests.test_create_booking_sets_source_for_client_roledef test_create_booking_sets_source_for_client_role(self) -> None: token = self.login_owner() response = self.client.post( "/api/bookings", headers=self.auth_headers(token), json={` (стр. 420)
- `GoogleCalendarApiTests.test_exchange_code_normalizes_google_responsedef test_exchange_code_normalizes_google_response(self) -> None: """exchange_code возвращает ключ "token" (access_token из ответа Google).""" from unittest.mock import MagicMock fr` (стр. 444)
- `GoogleCalendarApiTests.test_load_tokens_normalizes_legacy_access_token_keydef test_load_tokens_normalizes_legacy_access_token_key(self) -> None: """Токены, сохранённые старым кодом (ключ access_token), читаются как token.""" from app.database import Sess` (стр. 467)

### backend/tests/test_google_calendar_pull.py (1294 строк)

Классы и функции (39):

- `reset_app_modulesdef reset_app_modules() -> None: for name in list(sys.modules):` (стр. 15)
- `_eventdef _event( event_id: str, *, start: str = "2026-08-13T10:30:00+03:00", end: str = "2026-08-13T11:15:00+03:00", summary: str = "Мойка", description: str | None = "Клиент: Иван\nТел` (стр. 21)
- `class GoogleCalendarPullTests(unittest.TestCase):` (стр. 47)
- `GoogleCalendarPullTests.setUpdef setUp(self) -> None: data_dir = Path(__file__).resolve().parents[1] / "data" data_dir.mkdir(parents=True, exist_ok=True) self.db_path = data_dir / f"test_gc_pull_{os.urandom(4)` (стр. 48)
- `GoogleCalendarPullTests.tearDowndef tearDown(self) -> None: from app.database import engine engine.dispose() self.client_manager.__exit__(None, None, None) self._sync_thread_patch.stop() reset_app_modules() for s` (стр. 82)
- `GoogleCalendarPullTests.sessiondef session(self): from app.database import SessionLocal return SessionLocal()` (стр. 96)
- `GoogleCalendarPullTests._save_tokensdef _save_tokens(self) -> None: from app.google_calendar import save_tokens with self.session() as db: save_tokens(db, {"token": "t", "refresh_token": "r"}) db.commit()` (стр. 101)
- `GoogleCalendarPullTests._patch_calendar_requestdef _patch_calendar_request(self, pages: list) -> patch: """Подменить _calendar_request: каждый вызов возвращает следующую страницу. Элемент может быть dict (страница) или исключен` (стр. 108)
- `GoogleCalendarPullTests.fake_calendar_requestdef fake_calendar_request(db, settings, method, path, *, params=None, body=None, _retried=False): next_item = consumed.pop(0) if isinstance(next_item, BaseException):` (стр. 115)
- `GoogleCalendarPullTests.test_pull_skipped_without_tokensdef test_pull_skipped_without_tokens(self) -> None: from app.google_calendar import pull_calendar_changes with self.session() as db: result = pull_calendar_changes(db, self.setting` (стр. 123)
- `GoogleCalendarPullTests.test_pull_creates_booking_and_client_from_new_eventdef test_pull_creates_booking_and_client_from_new_event(self) -> None: from app.google_calendar import pull_calendar_changes self._save_tokens() pages = [ { "items": [ _event( "g-n` (стр. 132)
- `GoogleCalendarPullTests.test_pull_updates_booking_time_by_crm_booking_iddef test_pull_updates_booking_time_by_crm_booking_id(self) -> None: from app.google_calendar import pull_calendar_changes from app.models import Booking, Client with self.session()` (стр. 182)
- `GoogleCalendarPullTests.test_pull_cancels_booking_when_event_deleteddef test_pull_cancels_booking_when_event_deleted(self) -> None: from app.google_calendar import pull_calendar_changes from app.models import Booking, Client with self.session() as ` (стр. 238)
- `GoogleCalendarPullTests.test_pull_updates_existing_booking_without_crm_linkdef test_pull_updates_existing_booking_without_crm_link(self) -> None: """События, созданные старым кодом (без extendedProperties), обновляются по google_event_id и не дублируются.` (стр. 279)
- `GoogleCalendarPullTests.test_pull_passes_sync_token_on_next_rundef test_pull_passes_sync_token_on_next_run(self) -> None: from app.google_calendar import pull_calendar_changes self._save_tokens() pages = [{"items": [], "nextSyncToken": "tok-1"` (стр. 325)
- `GoogleCalendarPullTests.fake_seconddef fake_second(db, settings, method, path, *, params=None, body=None, _retried=False): captured.append(dict(params or {})) return {"items": [], "nextSyncToken": "tok-2"}` (стр. 338)
- `GoogleCalendarPullTests.test_pull_full_rescan_when_sync_token_expireddef test_pull_full_rescan_when_sync_token_expired(self) -> None: from app.google_calendar import _GoogleApiError, pull_calendar_changes self._save_tokens() captured: list[dict] = [` (стр. 352)
- `GoogleCalendarPullTests.fake_rescandef fake_rescan(db, settings, method, path, *, params=None, body=None, _retried=False): captured.append(dict(params or {})) next_item = pages.pop(0) if isinstance(next_item, BaseEx` (стр. 362)
- `GoogleCalendarPullTests.test_pull_skips_foreign_event_with_wrong_crm_linkdef test_pull_skips_foreign_event_with_wrong_crm_link(self) -> None: """Событие с чужим crmBookingId (подделанным или от другой записи) не должно перезаписывать чужую запись.""" fr` (стр. 387)
- `GoogleCalendarPullTests.test_pull_reports_auth_failed_with_google_detailsdef test_pull_reports_auth_failed_with_google_details(self) -> None: """401/403 после попытки обновления токена -> error="auth_failed"; детали из ответа Google пробрасываются в err` (стр. 440)
- `GoogleCalendarPullTests.test_pull_reports_auth_failed_with_raw_detailsdef test_pull_reports_auth_failed_with_raw_details(self) -> None: """Прочие 401/403 (не accessNotConfigured) отдают исходный текст Google.""" from app.google_calendar import _Googl` (стр. 467)
- `GoogleCalendarPullTests.test_pull_parses_scrambled_descriptiondef test_pull_parses_scrambled_description(self) -> None: """Свободный текст события: имя, телефон, авто, госномер, услуга в любом порядке.""" from app.google_calendar import pull_` (стр. 482)
- `GoogleCalendarPullTests.test_pull_parses_latin_brand_and_short_platedef test_pull_parses_latin_brand_and_short_plate(self) -> None: """Латиница марки, телефон «+7 (…)», госномер на 777.""" from app.google_calendar import pull_calendar_changes from ` (стр. 532)
- `GoogleCalendarPullTests.test_pull_keeps_strict_format_prioritydef test_pull_keeps_strict_format_priority(self) -> None: """«Ключ: значение» имеет приоритет над свободным распознаванием.""" from app.google_calendar import pull_calendar_changes` (стр. 569)
- `GoogleCalendarPullTests.test_sync_creates_event_for_admin_review_bookingdef test_sync_creates_event_for_admin_review_booking(self) -> None: """Заявка клиента (admin_review) сразу синхронизируется в календарь.""" from unittest.mock import patch as _patc` (стр. 609)
- `GoogleCalendarPullTests.test_sync_skips_deleted_statusdef test_sync_skips_deleted_status(self) -> None: """Отменённая запись не создаёт событие в календаре.""" from unittest.mock import patch as _patch from app.google_calendar import ` (стр. 650)
- `GoogleCalendarPullTests.test_pull_parses_free_form_bookingdef test_pull_parses_free_form_booking(self) -> None: """«миша ремонт скола мерседес 79872136194» разкладывается по полям.""" from app.google_calendar import pull_calendar_changes ` (стр. 689)
- `GoogleCalendarPullTests.test_pull_falls_back_to_free_text_slice_for_servicedef test_pull_falls_back_to_free_text_slice_for_service(self) -> None: """Без совпадения в каталоге услугой становится остаток текста.""" from app.google_calendar import pull_calen` (стр. 738)
- `GoogleCalendarPullTests.test_pull_does_not_duplicate_existing_bookingdef test_pull_does_not_duplicate_existing_booking(self) -> None: """Запись из бота и то же событие из Google не дают дубля.""" from app.google_calendar import pull_calendar_changes` (стр. 774)
- `GoogleCalendarPullTests.test_pull_links_booking_to_existing_clientdef test_pull_links_booking_to_existing_client(self) -> None: """Запись из Google падает в карточку уже известного клиента.""" from app.google_calendar import pull_calendar_changes` (стр. 824)
- `GoogleCalendarPullTests.test_pull_parses_rare_name_before_phonedef test_pull_parses_rare_name_before_phone(self) -> None: """Имя, которого нет в словаре, определяется по соседству с телефоном. «Гарик» не входит в _COMMON_NAMES — эвристика «ряд` (стр. 864)
- `GoogleCalendarPullTests.test_pull_parses_rare_name_after_phonedef test_pull_parses_rare_name_after_phone(self) -> None: """Имя после телефона в конце текста тоже определяется.""" from app.google_calendar import pull_calendar_changes from app.` (стр. 905)
- `GoogleCalendarPullTests.test_pull_does_not_steal_service_word_as_namedef test_pull_does_not_steal_service_word_as_name(self) -> None: """Служебное слово рядом с телефоном не выдаётся за имя клиента.""" from app.google_calendar import pull_calendar_c` (стр. 941)
- `GoogleCalendarPullTests.test_pull_transfers_google_edits_to_bookingdef test_pull_transfers_google_edits_to_booking(self) -> None: """Правки в Google (заголовок, клиент, бокс, комментарий) переносятся в CRM. Владелец отредактировал событие в Google` (стр. 979)
- `GoogleCalendarPullTests.test_pull_does_not_overwrite_newer_crm_editdef test_pull_does_not_overwrite_newer_crm_edit(self) -> None: """Событие не правилось после последней записи в Google — правки CRM не затираются. Если запись недавно правилась в C` (стр. 1054)
- `GoogleCalendarPullTests.test_pull_transfers_free_text_car_plate_to_existing_bookingdef test_pull_transfers_free_text_car_plate_to_existing_booking(self) -> None: """Свободный текст «бмв х5 у888уу716» в событии доходит до полей Авто/Номер. Существующая запись прав` (стр. 1120)
- `GoogleCalendarPullTests.test_pull_does_not_use_plate_letters_as_namedef test_pull_does_not_use_plate_letters_as_name(self) -> None: """Буквы госномера «у888уу716» не становятся именем клиента «Уу».""" from app.google_calendar import pull_calendar_c` (стр. 1190)
- `GoogleCalendarPullTests.test_pull_parses_foreign_platedef test_pull_parses_foreign_plate(self) -> None: """Иностранный госномер (M123AB) распознаётся и нормализуется.""" from app.google_calendar import pull_calendar_changes from app.m` (стр. 1225)
- `GoogleCalendarPullTests.test_pull_parses_new_chinese_branddef test_pull_parses_new_chinese_brand(self) -> None: """Новые марки из расширенного словаря (хавал, танк) распознаются.""" from app.google_calendar import pull_calendar_changes fr` (стр. 1259)

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

### backend/tests/test_security_hardening.py (66 строк)

Классы и функции (6):

- `_signed_init_datadef _signed_init_data(*, user: object, auth_date: int | None = None) -> str: pairs = { "auth_date": str(int(time.time()) if auth_date is None else auth_date), "query_id": "query", ` (стр. 15)
- `test_accepts_valid_user_with_short_configurable_ttldef test_accepts_valid_user_with_short_configurable_ttl() -> None: result = validate_telegram_init_data( _signed_init_data(user={"id": 123456789}), BOT_TOKEN, max_age_seconds=300, ` (стр. 27)
- `test_rejects_duplicate_query_keysdef test_rejects_duplicate_query_keys() -> None: init_data = _signed_init_data(user={"id": 123456789}) with pytest.raises(ValueError, match="duplicate keys"):` (стр. 38)
- `test_rejects_invalid_user_structuredef test_rejects_invalid_user_structure(user: object) -> None: with pytest.raises(ValueError, match="user"):` (стр. 46)
- `test_rejects_future_auth_date_beyond_skewdef test_rejects_future_auth_date_beyond_skew() -> None: with pytest.raises(ValueError, match="auth_date"):` (стр. 51)
- `test_rejects_expired_init_data_using_configured_ttldef test_rejects_expired_init_data_using_configured_ttl() -> None: with pytest.raises(ValueError, match="expired"):` (стр. 60)

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

### backend/tests/test_worker_additional_services.py (244 строк)

Классы и функции (15):

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

### backend/tmp_repro_slot_bug.py (119 строк)

Классы и функции (2):

- `create_bookingdef create_booking(client, H, *, name, phone, service_id, service_name, price, duration, date, time_, box): r = client.post( "/api/bookings", headers=H, json={ "clientId": "", "cli` (стр. 37)
- `maindef main() -> None: with TestClient(app) as client: r = client.post("/api/auth/staff/login", json={"login": "admin", "password": "admin"}) assert r.status_code == 200, r.text token` (стр. 62)

### backend/tmp_verify_fix.py (95 строк)

Классы и функции (1):

- `maindef main() -> None: with TestClient(app) as client: r = client.post("/api/auth/staff/login", json={"login": "admin", "password": "admin"}) token = r.json()["token"] H = {"Authoriza` (стр. 37)

## Frontend — CRM-минапп (frontend/src)

### frontend/src/app/api.ts (192 строк)

- `API_BASE_URL` (стр. 1) — локальный
- `getInitData` (стр. 55) — локальный
- `getErrorDetail` (стр. 59) — локальный
- `payload` (стр. 62) — локальный
- `messages` (стр. 66) — локальный
- `field` (стр. 67) — локальный
- `msg` (стр. 68) — локальный
- `getDownloadFileName` (стр. 78) — локальный
- `disposition` (стр. 79) — локальный
- `utf8Match` (стр. 80) — локальный
- `plainMatch` (стр. 84) — локальный
- `getTelegramWebApp` (стр. 91)
- `getTelegramInitData` (стр. 95)
- `apiRequest` (стр. 99)
- `initData` (стр. 106) — локальный
- `response` (стр. 111) — локальный
- `apiDownload` (стр. 130)
- `initData` (стр. 132) — локальный
- `response` (стр. 137) — локальный
- `fileName` (стр. 146) — локальный
- `blob` (стр. 147) — локальный
- `objectUrl` (стр. 148) — локальный
- `anchor` (стр. 149) — локальный
- `apiUploadFile` (стр. 159)
- `initData` (стр. 160) — локальный
- `formData` (стр. 161) — локальный
- `response` (стр. 163) — локальный
- `apiBlobUrl` (стр. 174)
- `initData` (стр. 176) — локальный
- `response` (стр. 181) — локальный
- `blob` (стр. 190) — локальный

### frontend/src/app/App.tsx (731 строк)

- `NOOP` (стр. 49) — локальный
- `ConsentDialog` (стр. 51) — локальный
- `primary` (стр. 56) — локальный
- `sub` (стр. 57) — локальный
- `bg` (стр. 58) — локальный
- `text` (стр. 59) — локальный
- `handleAgree` (стр. 61) — локальный
- `WelcomeScreen` (стр. 285) — локальный
- `bg` (стр. 305) — локальный
- `text` (стр. 306) — локальный
- `sub` (стр. 307) — локальный
- `primary` (стр. 308) — локальный
- `glass` (стр. 309) — локальный
- `inputCls` (стр. 312) — локальный
- `validate` (стр. 314) — локальный
- `nameError` (стр. 316) — локальный
- `carError` (стр. 317) — локальный
- `plateError` (стр. 318) — локальный
- `handleClientSubmit` (стр. 327) — локальный
- `message` (стр. 338) — локальный
- `handleStaffLink` (стр. 343) — локальный
- `message` (стр. 349) — локальный
- `navRef` (стр. 354) — локальный
- `handleBack` (стр. 357) — локальный
- `AppContent` (стр. 631) — локальный
- `usePath` (стр. 697) — локальный
- `onPopState` (стр. 700) — локальный
- `LandingWrapper` (стр. 707) — локальный
- `App` (стр. 715)
- `path` (стр. 716) — локальный

### frontend/src/app/components/admin/AdminApp.tsx (4806 строк)

- `SERVICE_TYPE_OPTIONS` (стр. 68) — локальный
- `adminServiceResourceGroupForCategory` (стр. 74) — локальный
- `DEFAULT_SHIFT_SUPPLIES` (стр. 86) — локальный
- `SHIFT_PHOTO_CATEGORIES` (стр. 92) — локальный
- `SHIFT_PHOTO_MAX_DIMENSION` (стр. 109) — локальный
- `SHIFT_PHOTO_TARGET_BYTES` (стр. 110) — локальный
- `SHIFT_PHOTO_MIN_QUALITY` (стр. 111) — локальный
- `STOCK_UNITS` (стр. 126) — локальный
- `isDetailingService` (стр. 127) — локальный
- `serviceResourceGroup` (стр. 131) — локальный
- `hasManualScheduling` (стр. 135) — локальный
- `bookingBoxesForService` (стр. 139) — локальный
- `bookingLocationLabel` (стр. 147) — локальный
- `parseBookingMinutes` (стр. 151) — локальный
- `match` (стр. 152) — локальный
- `hours` (стр. 154) — локальный
- `minutes` (стр. 155) — локальный
- `bookingBlocksBox` (стр. 160) — локальный
- `nextStart` (стр. 163) — локальный
- `existingStart` (стр. 164) — локальный
- `nextEnd` (стр. 166) — локальный
- `existingEnd` (стр. 167) — локальный
- `pickDefaultBookingBox` (стр. 171) — локальный
- `resourceGroup` (стр. 180) — локальный
- `preferred` (стр. 181) — локальный
- `fallback` (стр. 182) — локальный
- `candidates` (стр. 183) — локальный
- `paymentLabel` (стр. 188) — локальный
- `normalizePhoneSearchValue` (стр. 197) — локальный
- `bookingStatusRequiresScheduledSlot` (стр. 201) — локальный
- `numberInputValue` (стр. 205) — локальный
- `numberFromInput` (стр. 209) — локальный
- `toISODate` (стр. 213) — локальный
- `parsed` (стр. 214) — локальный
- `y` (стр. 216) — локальный
- `m` (стр. 217) — локальный
- `d` (стр. 218) — локальный
- `TIME_SLOTS` (стр. 222) — локальный
- `h` (стр. 223) — локальный
- `m` (стр. 224) — локальный
- `dataUrlApproxBytes` (стр. 228) — локальный
- `padding` (стр. 230) — локальный
- `loadImage` (стр. 234) — локальный
- `image` (стр. 236) — локальный
- `compressShiftPhoto` (стр. 243) — локальный
- `objectUrl` (стр. 244) — локальный
- `image` (стр. 246) — локальный
- `scale` (стр. 247) — локальный
- `width` (стр. 248) — локальный
- `height` (стр. 249) — локальный
- `canvas` (стр. 250) — локальный
- `context` (стр. 253) — локальный
- `AdminApp` (стр. 271)
- `parentCategories` (стр. 348) — локальный
- `selectableBookingDates` (стр. 429) — локальный
- `masterWorkers` (стр. 435) — локальный
- `selectedClient` (стр. 436) — локальный
- `normalizedClientSearchQuery` (стр. 437) — локальный
- `filteredClients` (стр. 440) — локальный
- `plates` (стр. 445) — локальный
- `selectedClientBookings` (стр. 453) — локальный
- `leftDate` (стр. 457) — локальный
- `rightDate` (стр. 458) — локальный
- `selectedClientFilteredBookings` (стр. 463) — локальный
- `svc` (стр. 465) — локальный
- `selectedClientVehicles` (стр. 469) — локальный
- `newBookingClientVehicles` (стр. 473) — локальный
- `client` (стр. 475) — локальный
- `selectedClientSpent` (стр. 481) — локальный
- `selectedClientCompletedCount` (стр. 484) — локальный
- `selectedClientUpcoming` (стр. 485) — локальный
- `selectedClientLastVisit` (стр. 486) — локальный
- `shiftSupplies` (стр. 487) — локальный
- `uploadedShiftPhotos` (стр. 492) — локальный
- `selectedService` (стр. 505) — локальный
- `defaultBoxForService` (стр. 523) — локальный
- `settingsBoxes` (стр. 535) — локальный
- `bookingFormBoxes` (стр. 536) — локальный
- `editBookingBoxes` (стр. 537) — локальный
- `newBookingLocationLabel` (стр. 540) — локальный
- `editBookingLocationLabel` (стр. 541) — локальный
- `modalMaxHeight` (стр. 593) — локальный
- `vv` (стр. 597) — локальный
- `handler` (стр. 599) — локальный
- `el` (стр. 600) — локальный
- `staffRoleTitle` (стр. 613) — локальный
- `staffNotificationsRole` (стр. 614) — локальный
- `adminNotifications` (стр. 615) — локальный
- `unreadCount` (стр. 620) — локальный
- `todayBookings` (стр. 621) — локальный
- `completedAll` (стр. 622) — локальный
- `totalRevenue` (стр. 623) — локальный
- `glass` (стр. 625) — локальный
- `bg` (стр. 626) — локальный
- `text` (стр. 627) — локальный
- `sub` (стр. 628) — локальный
- `primary` (стр. 629) — локальный
- `accent` (стр. 630) — локальный
- `surface` (стр. 631) — локальный
- `inputCls` (стр. 632) — локальный
- `selectCls` (стр. 633) — локальный
- `timeToMinutes` (стр. 634) — локальный
- `match` (стр. 635) — локальный
- `hours` (стр. 637) — локальный
- `minutes` (стр. 638) — локальный
- `byService` (стр. 644) — локальный
- `byStatus` (стр. 650) — локальный
- `byPayment` (стр. 661) — локальный
- `workerStats` (стр. 668) — локальный
- `bw` (стр. 672) — локальный
- `avgCheck` (стр. 679) — локальный
- `conversionRate` (стр. 680) — локальный
- `scheduleSummary` (стр. 681) — локальный
- `revenueData` (стр. 682) — локальный
- `formatted` (стр. 683) — локальный
- `hourData` (стр. 689) — локальный
- `handleStatusChange` (стр. 693) — локальный
- `target` (стр. 694) — локальный
- `statusNeedsSlot` (стр. 695) — локальный
- `handleDeleteClient` (стр. 707) — локальный
- `confirmed` (стр. 708) — локальный
- `handleCreateClient` (стр. 713) — локальный
- `nameError` (стр. 715) — локальный
- `phoneError` (стр. 719) — локальный
- `carError` (стр. 723) — локальный
- `plateError` (стр. 727) — локальный
- `created` (стр. 735) — локальный
- `handleSaveClientCard` (стр. 757) — локальный
- `draft` (стр. 758) — локальный
- `handleShiftPhotoChange` (стр. 772) — локальный
- `file` (стр. 773) — локальный
- `dataUrl` (стр. 777) — локальный
- `handleSubmitShiftInspection` (стр. 789) — локальный
- `primaryPhoto` (стр. 793) — локальный
- `uploadedCategoriesLabel` (стр. 800) — локальный
- `composedNote` (стр. 801) — локальный
- `saved` (стр. 805) — локальный
- `validateClientName` (стр. 822) — локальный
- `validateClientPhone` (стр. 826) — локальный
- `validateBookingDate` (стр. 830) — локальный
- `parsedDate` (стр. 832) — локальный
- `scheduleDay` (стр. 837) — локальный
- `normalizedTime` (стр. 842) — локальный
- `slotStart` (стр. 843) — локальный
- `openMinutes` (стр. 852) — локальный
- `closeMinutes` (стр. 853) — локальный
- `slotEnd` (стр. 854) — локальный
- `validateBookingDateForEdit` (стр. 864) — локальный
- `parsedDate` (стр. 866) — локальный
- `scheduleDay` (стр. 871) — локальный
- `normalizedTime` (стр. 876) — локальный
- `slotStart` (стр. 877) — локальный
- `openMinutes` (стр. 883) — локальный
- `closeMinutes` (стр. 884) — локальный
- `slotEnd` (стр. 885) — локальный
- `validateBookingDateTimeFormat` (стр. 895) — локальный
- `parsedDate` (стр. 897) — локальный
- `validateNewBookingForm` (стр. 910) — локальный
- `selectedService` (стр. 912) — локальный
- `nameError` (стр. 914) — локальный
- `phoneError` (стр. 918) — локальный
- `carError` (стр. 922) — локальный
- `plateError` (стр. 926) — локальный
- `hasDate` (стр. 929) — локальный
- `hasTime` (стр. 930) — локальный
- `requiresScheduledSlot` (стр. 931) — локальный
- `validation` (стр. 948) — локальный
- `resetNewBookingDraft` (стр. 958) — локальный
- `openNewBookingModal` (стр. 988) — локальный
- `openAdditionalServiceModal` (стр. 993) — локальный
- `openNewBookingForClient` (стр. 1002) — локальный
- `historyDate` (стр. 1004) — локальный
- `clientVehicles` (стр. 1006) — локальный
- `mainVehicle` (стр. 1008) — локальный
- `hasPriorVisits` (стр. 1009) — локальный
- `closeNewBookingModal` (стр. 1027) — локальный
- `handleAddService` (стр. 1032) — локальный
- `svc` (стр. 1037) — локальный
- `workersList` (стр. 1038) — локальный
- `worker` (стр. 1039) — локальный
- `updatedBooking` (стр. 1042) — локальный
- `handleRemoveService` (стр. 1062) — локальный
- `handleOpenEditAsvc` (стр. 1066) — локальный
- `handleSaveEditAsvc` (стр. 1074) — локальный
- `workersList` (стр. 1079) — локальный
- `worker` (стр. 1080) — локальный
- `updatedBooking` (стр. 1083) — локальный
- `closeAddServiceModal` (стр. 1100) — локальный
- `openEditModal` (стр. 1106) — локальный
- `handleSaveEditedBooking` (стр. 1129) — локальный
- `editServiceId` (стр. 1131) — локальный
- `detailingBooking` (стр. 1132) — локальный
- `requiresScheduledSlot` (стр. 1133) — локальный
- `statusNeedsSlot` (стр. 1135) — локальный
- `slotChanged` (стр. 1136) — локальный
- `validationErrors` (стр. 1138) — локальный
- `normalizedEditMaterials` (стр. 1153) — локальный
- `handleDeleteBooking` (стр. 1203) — локальный
- `name` (стр. 1205) — локальный
- `handleAssignWorkers` (стр. 1212) — локальный

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

### frontend/src/app/components/client/ClientApp.tsx (1300 строк)

- `NOOP` (стр. 21) — локальный
- `UPCOMING_STATUSES` (стр. 45) — локальный
- `HISTORY_STATUSES` (стр. 46) — локальный
- `CANCELLABLE_STATUSES` (стр. 47) — локальный
- `isBoxRentalService` (стр. 50) — локальный
- `isDetailingService` (стр. 54) — локальный
- `serviceResourceGroup` (стр. 58) — локальный
- `bookingBoxesForService` (стр. 62) — локальный
- `isManualSchedulingBooking` (стр. 68) — локальный
- `ClientApp` (стр. 72)
- `todayStart` (стр. 111) — локальный
- `parsedSelectedDate` (стр. 122) — локальный
- `nextAvailableDate` (стр. 124) — локальный
- `parsedDate` (стр. 125) — локальный
- `parsedSelectedDate` (стр. 149) — локальный
- `loadAvailability` (стр. 157) — локальный
- `durationMinutes` (стр. 160) — локальный
- `nextSlots` (стр. 163) — локальный
- `raw` (стр. 185) — локальный
- `hasMain` (стр. 188) — локальный
- `vehicles` (стр. 189) — локальный
- `activeServices` (стр. 205) — локальный
- `categories` (стр. 206) — локальный
- `clientBookings` (стр. 207) — локальный
- `upcomingBookings` (стр. 208) — локальный
- `pastBookings` (стр. 209) — локальный
- `completedBookings` (стр. 210) — локальный
- `totalSpent` (стр. 211) — локальный
- `favoriteService` (стр. 212) — локальный
- `myNotifications` (стр. 218) — локальный
- `unreadCount` (стр. 219) — локальный
- `normalizedSearchQuery` (стр. 221) — локальный
- `filteredServices` (стр. 222) — локальный
- `compatibleBoxes` (стр. 227) — локальный
- `defaultBoxName` (стр. 228) — локальный
- `selectedServiceIsBoxRental` (стр. 230) — локальный
- `selectedServiceIsDetailing` (стр. 231) — локальный
- `selectedDuration` (стр. 232) — локальный
- `selectedPrice` (стр. 237) — локальный
- `selectedDayDate` (стр. 242) — локальный
- `selectedDaySchedule` (стр. 243) — локальный
- `selectedDayWorkingHours` (стр. 246) — локальный
- `profileVehicles` (стр. 252) — локальный
- `primaryProfileVehicle` (стр. 255) — локальный
- `bookingVehicles` (стр. 256) — локальный
- `visibleProfileVehicles` (стр. 259) — локальный
- `selectedBookingVehicle` (стр. 260) — локальный
- `glass` (стр. 262) — локальный
- `bg` (стр. 266) — локальный
- `text` (стр. 267) — локальный
- `sub` (стр. 268) — локальный
- `primary` (стр. 269) — локальный
- `primaryBtn` (стр. 270) — локальный
- `secondaryBtn` (стр. 271) — локальный
- `slotCards` (стр. 272) — локальный
- `availableSlotCards` (стр. 273) — локальный
- `occupiedSlotCards` (стр. 274) — локальный
- `slotAvailabilityLoadingLabel` (стр. 275) — локальный
- `slotAvailabilityEmptyLabel` (стр. 276) — локальный
- `handleAddToCalendar` (стр. 278) — локальный
- `handleConfirmBooking` (стр. 286) — локальный
- `nextAvailableDate` (стр. 292) — локальный
- `parsedDate` (стр. 293) — локальный
- `primaryVehicle` (стр. 300) — локальный
- `booking` (стр. 301) — локальный
- `handleSaveProfile` (стр. 325) — локальный
- `nameError` (стр. 327) — локальный
- `primaryVehicle` (стр. 328) — локальный
- `carError` (стр. 329) — локальный
- `plateError` (стр. 330) — локальный
- `normalizedVehicles` (стр. 337) — локальный
- `normalizedProfile` (стр. 347) — локальный
- `handleCancelBooking` (стр. 366) — локальный
- `mainBtnState` (стр. 370) — локальный
- `navRef` (стр. 389) — локальный
- `handleBack` (стр. 392) — локальный
- `selected` (стр. 616) — локальный
- `selected` (стр. 702) — локальный
- `selected` (стр. 747) — локальный
- `slotClass` (стр. 748) — локальный
- `nextCar` (стр. 1022) — локальный
- `baseVehicles` (стр. 1024) — локальный
- `nextPlate` (стр. 1039) — локальный
- `baseVehicles` (стр. 1041) — локальный
- `nextCar` (стр. 1079) — локальный
- `baseVehicles` (стр. 1081) — локальный
- `nextPlate` (стр. 1096) — локальный
- `baseVehicles` (стр. 1098) — локальный
- `baseVehicles` (стр. 1111) — локальный
- `BookingCard` (стр. 1252) — локальный
- `manualScheduling` (стр. 1262) — локальный

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

### frontend/src/app/components/owner/_OwnerApp.work.bak.tsx (11891 строк)

- `EXPENSE_CATEGORIES` (стр. 221) — локальный
- `STOCK_UNITS` (стр. 222) — локальный
- `SERVICE_TYPE_OPTIONS` (стр. 223) — локальный
- `ownerBookingStatusRequiresScheduledSlot` (стр. 234) — локальный
- `employeeRoleLabel` (стр. 237) — локальный
- `ownerServiceResourceGroup` (стр. 243) — локальный
- `ownerDefaultBoxForService` (стр. 247) — локальный
- `rg` (стр. 248) — локальный
- `match` (стр. 249) — локальный
- `ownerBookingBoxes` (стр. 253) — локальный
- `ownerLocationLabel` (стр. 261) — локальный
- `parseOwnerBookingMinutes` (стр. 265) — локальный
- `match` (стр. 266) — локальный
- `hours` (стр. 268) — локальный
- `minutes` (стр. 269) — локальный
- `OWNER_CALENDAR_WEEKDAYS` (стр. 274) — локальный
- `OWNER_CALENDAR_MONTHS` (стр. 275) — локальный
- `OWNER_CALENDAR_DEFAULT_OPEN` (стр. 279) — локальный
- `OWNER_CALENDAR_DEFAULT_CLOSE` (стр. 280) — локальный
- `ownerScheduleTimeToMinutes` (стр. 282) — локальный
- `ownerMonthTitle` (стр. 286) — локальный
- `ownerBuildMonthCells` (стр. 290) — локальный
- `year` (стр. 291) — локальный
- `month` (стр. 292) — локальный
- `first` (стр. 293) — локальный
- `offset` (стр. 294) — локальный
- `daysInMonth` (стр. 295) — локальный
- `date` (стр. 301) — локальный
- `ownerCalendarDayHours` (стр. 310) — локальный
- `parsedDate` (стр. 311) — локальный
- `daySchedule` (стр. 315) — локальный
- `open` (стр. 319) — локальный
- `close` (стр. 320) — локальный
- `OWNER_CALENDAR_LOAD_COLORS` (стр. 324) — локальный
- `ownerCalendarLoadTone` (стр. 330) — локальный
- `ratio` (стр. 332) — локальный
- `ownerGroupBookingsByHour` (стр. 342) — локальный
- `timed` (стр. 347) — локальный
- `hourLabel` (стр. 350) — локальный
- `slotEnd` (стр. 351) — локальный
- `slotBookings` (стр. 352) — локальный
- `start` (стр. 354) — локальный
- `ownerOpenBookingDetail` (стр. 366) — локальный
- `ownerBookingBlocksBox` (стр. 375) — локальный
- `nextStart` (стр. 378) — локальный
- `existingStart` (стр. 379) — локальный
- `nextEnd` (стр. 381) — локальный
- `existingEnd` (стр. 382) — локальный
- `ownerPickDefaultBookingBox` (стр. 386) — локальный
- `resourceGroup` (стр. 395) — локальный
- `preferred` (стр. 396) — локальный
- `fallback` (стр. 397) — локальный
- `candidates` (стр. 398) — локальный
- `serviceResourceGroupForCategory` (стр. 403) — локальный
- `numberInputValue` (стр. 407) — локальный
- `ORDER_STEPS` (стр. 421) — локальный
- `serviceMoneySummary` (стр. 428) — локальный
- `piggyTargetLabel` (стр. 429) — локальный
- `master` (стр. 433) — локальный
- `piggy` (стр. 438) — локальный
- `owners` (стр. 445) — локальный
- `previewServiceSplit` (стр. 453) — локальный
- `materials` (стр. 458) — локальный
- `net` (стр. 459) — локальный
- `order` (стр. 460) — локальный
- `pipeline` (стр. 461) — локальный
- `piggyType` (стр. 462) — локальный
- `computeMaster` (стр. 469) — локальный
- `computePiggy` (стр. 478) — локальный
- `m` (стр. 485) — локальный
- `p` (стр. 487) — локальный
- `afterMasterPiggy` (стр. 489) — локальный
- `m` (стр. 508) — локальный
- `p` (стр. 512) — локальный
- `isLast` (стр. 516) — локальный
- `claimed` (стр. 517) — локальный
- `ownerPaymentLabel` (стр. 536) — локальный
- `normalizeOwnerPhoneSearchValue` (стр. 543) — локальный
- `numberFromInput` (стр. 549) — локальный
- `toISODate` (стр. 553) — локальный
- `parsed` (стр. 554) — локальный
- `y` (стр. 556) — локальный
- `m` (стр. 557) — локальный
- `d` (стр. 558) — локальный
- `TIME_SLOTS` (стр. 562) — локальный
- `h` (стр. 563) — локальный
- `m` (стр. 564) — локальный
- `OwnerApp` (стр. 571)
- `isAccountant` (стр. 649) — локальный
- `modalMaxHeight` (стр. 650) — локальный
- `financeRoleTitle` (стр. 651) — локальный
- `financeNotificationRole` (стр. 652) — локальный
- `__nowRpt` (стр. 724) — локальный
- `__dowRpt` (стр. 725) — локальный
- `__monRpt` (стр. 726) — локальный
- `__sunRpt` (стр. 727) — локальный
- `parentCategories` (стр. 748) — локальный
- `today` (стр. 894) — локальный
- `adminShiftPhotoUrlsRef` (стр. 921) — локальный
- `clearOwnerResetFlow` (стр. 1013) — локальный
- `nextBoxes` (стр. 1036) — локальный
- `params` (стр. 1070) — локальный
- `params` (стр. 1085) — локальный
- `handlePayOwnerSalary` (стр. 1096) — локальный
- `amount` (стр. 1097) — локальный
- `res` (стр. 1101) — локальный
- `updated` (стр. 1110) — локальный
- `loadPiggyBank` (стр. 1118) — локальный
- `params` (стр. 1122) — локальный
- `qs` (стр. 1125) — локальный
- `data` (стр. 1127) — локальный
- `loadWallet` (стр. 1135) — локальный
- `params` (стр. 1139) — локальный
- `qs` (стр. 1142) — локальный
- `data` (стр. 1144) — локальный
- `handlePiggyWithdraw` (стр. 1150) — локальный
- `f` (стр. 1151) — локальный
- `openPiggyAdjust` (стр. 1173) — локальный
- `current` (стр. 1174) — локальный
- `handlePiggyAdjust` (стр. 1183) — локальный
- `newBalance` (стр. 1184) — локальный
- `delta` (стр. 1186) — локальный
- `syncCountdown` (стр. 1259) — локальный
- `diffMs` (стр. 1260) — локальный
- `intervalId` (стр. 1265) — локальный
- `handleOpenShiftForMasters` (стр. 1295) — локальный
- `saved` (стр. 1304) — локальный
- `ownerNotifications` (стр. 1320) — локальный
- `unreadCount` (стр. 1321) — локальный
- `completedBookings` (стр. 1322) — локальный
- `todayBookings` (стр. 1323) — локальный
- `latestShiftChecklists` (стр. 1324) — локальный
- `latestAdminShiftInspections` (стр. 1325) — локальный
- `latestAdminShiftInspectionKey` (стр. 1326) — локальный
- `activeIds` (стр. 1342) — локальный
- `currentPhotoUrls` (стр. 1355) — локальный
- `missing` (стр. 1356) — локальный
- `next` (стр. 1368) — локальный
- `vv` (стр. 1390) — локальный
- `handler` (стр. 1392) — локальный
- `el` (стр. 1393) — локальный
- `bookingFormBoxes` (стр. 1405) — локальный
- `bookingFormLocationLabel` (стр. 1406) — локальный
- `editBookingLocationLabel` (стр. 1407) — локальный
- `todayRevenue` (стр. 1408) — локальный
- `now` (стр. 1411) — локальный
- `dayOfWeek` (стр. 1412) — локальный
- `diffToSaturday` (стр. 1413) — локальный
- `weekSaturday` (стр. 1414) — локальный
- `weekFriday` (стр. 1417) — локальный
- `isDateInWeek` (стр. 1420) — локальный
- `d` (стр. 1421) — локальный
- `weeklyCompletedBookings` (стр. 1424) — локальный
- `weeklyBookings` (стр. 1425) — локальный
- `weeklyExpenses` (стр. 1426) — локальный
- `weeklyIncomes` (стр. 1427) — локальный
- `totalRevenue` (стр. 1428) — локальный
- `totalExpenses` (стр. 1429) — локальный
- `totalIncomes` (стр. 1430) — локальный
- `profit` (стр. 1431) — локальный
- `averageCheck` (стр. 1432) — локальный
- `activeBookings` (стр. 1433) — локальный
- `pipelineCounts` (стр. 1434) — локальный
- `statusListItems` (стр. 1441) — локальный
- `totalStockValue` (стр. 1446) — локальный
- `washRevenue` (стр. 1449) — локальный
- `detailingRevenue` (стр. 1452) — локальный
- `washExpenses` (стр. 1455) — локальный
- `detailingExpenses` (стр. 1458) — локальный
- `washIncomes` (стр. 1461) — локальный
- `detailingIncomes` (стр. 1464) — локальный
- `resourceGroupLabel` (стр. 1468) — локальный
- `payrollRows` (стр. 1473) — локальный
- `workerPenalties` (стр. 1474) — локальный
- `complaintState` (стр. 1475) — локальный
- `payrollTotal` (стр. 1483) — локальный
- `formatComplaintDate` (стр. 1484) — локальный
- `resetPreviewRows` (стр. 1485) — локальный
- `resetExecuteLocked` (стр. 1499) — локальный
- `glass` (стр. 1501) — локальный
- `bg` (стр. 1502) — локальный
- `text` (стр. 1503) — локальный
- `sub` (стр. 1504) — локальный
- `primary` (стр. 1505) — локальный
- `accent` (стр. 1506) — локальный
- `surface` (стр. 1507) — локальный
- `inputCls` (стр. 1508) — локальный
- `selectCls` (стр. 1509) — локальный
- `tooltipStyle` (стр. 1510) — локальный
- `createDraftId` (стр. 1511) — локальный
- `handleAddBoxDraft` (стр. 1513) — локальный
- `handleRemoveBoxDraft` (стр. 1527) — локальный
- `handleAddServiceDraft` (стр. 1531) — локальный
- `handleRemoveServiceDraft` (стр. 1560) — локальный
- `handleHireWorker` (стр. 1564) — локальный
- `name` (стр. 1565) — локальный
- `login` (стр. 1566) — локальный
- `password` (стр. 1567) — локальный
- `employeeLabel` (стр. 1568) — локальный
- `handleSaveSettings` (стр. 1611) — локальный

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

### frontend/src/app/components/owner/OwnerApp.tsx (12790 строк)

- `EXPENSE_CATEGORIES` (стр. 238) — локальный
- `STOCK_UNITS` (стр. 239) — локальный
- `SERVICE_TYPE_OPTIONS` (стр. 240) — локальный
- `ownerBookingStatusRequiresScheduledSlot` (стр. 251) — локальный
- `employeeRoleLabel` (стр. 254) — локальный
- `ownerServiceResourceGroup` (стр. 260) — локальный
- `ownerDefaultBoxForService` (стр. 264) — локальный
- `rg` (стр. 265) — локальный
- `match` (стр. 266) — локальный
- `ownerBookingBoxes` (стр. 270) — локальный
- `ownerLocationLabel` (стр. 278) — локальный
- `parseOwnerBookingMinutes` (стр. 282) — локальный
- `match` (стр. 283) — локальный
- `hours` (стр. 285) — локальный
- `minutes` (стр. 286) — локальный
- `OWNER_CALENDAR_WEEKDAYS` (стр. 291) — локальный
- `OWNER_CALENDAR_MONTHS` (стр. 292) — локальный
- `OWNER_CALENDAR_DEFAULT_OPEN` (стр. 296) — локальный
- `OWNER_CALENDAR_DEFAULT_CLOSE` (стр. 297) — локальный
- `ownerScheduleTimeToMinutes` (стр. 299) — локальный
- `ownerMonthTitle` (стр. 303) — локальный
- `ownerBuildMonthCells` (стр. 307) — локальный
- `year` (стр. 308) — локальный
- `month` (стр. 309) — локальный
- `first` (стр. 310) — локальный
- `offset` (стр. 311) — локальный
- `daysInMonth` (стр. 312) — локальный
- `date` (стр. 318) — локальный
- `ownerCalendarDayHours` (стр. 327) — локальный
- `parsedDate` (стр. 328) — локальный
- `daySchedule` (стр. 332) — локальный
- `open` (стр. 336) — локальный
- `close` (стр. 337) — локальный
- `OWNER_CALENDAR_LOAD_COLORS` (стр. 341) — локальный
- `ownerCalendarLoadTone` (стр. 347) — локальный
- `ratio` (стр. 349) — локальный
- `ownerGroupBookingsByHour` (стр. 359) — локальный
- `timed` (стр. 364) — локальный
- `hourLabel` (стр. 367) — локальный
- `slotEnd` (стр. 368) — локальный
- `slotBookings` (стр. 369) — локальный
- `start` (стр. 371) — локальный
- `ownerOpenBookingDetail` (стр. 383) — локальный
- `ownerBookingBlocksBox` (стр. 392) — локальный
- `nextStart` (стр. 395) — локальный
- `existingStart` (стр. 396) — локальный
- `nextEnd` (стр. 398) — локальный
- `existingEnd` (стр. 399) — локальный
- `ownerPickDefaultBookingBox` (стр. 403) — локальный
- `resourceGroup` (стр. 412) — локальный
- `preferred` (стр. 413) — локальный
- `fallback` (стр. 414) — локальный
- `candidates` (стр. 415) — локальный
- `serviceResourceGroupForCategory` (стр. 420) — локальный
- `numberInputValue` (стр. 424) — локальный
- `ORDER_STEPS` (стр. 438) — локальный
- `serviceMoneySummary` (стр. 445) — локальный
- `piggyTargetLabel` (стр. 446) — локальный
- `master` (стр. 450) — локальный
- `piggy` (стр. 455) — локальный
- `owners` (стр. 464) — локальный
- `previewServiceSplit` (стр. 472) — локальный
- `materials` (стр. 477) — локальный
- `net` (стр. 478) — локальный
- `order` (стр. 479) — локальный
- `pipeline` (стр. 480) — локальный
- `piggyType` (стр. 481) — локальный
- `computeMaster` (стр. 488) — локальный
- `computePiggy` (стр. 497) — локальный
- `m` (стр. 505) — локальный
- `p` (стр. 507) — локальный
- `afterMasterPiggy` (стр. 511) — локальный
- `m` (стр. 530) — локальный
- `p` (стр. 534) — локальный
- `isLast` (стр. 538) — локальный
- `claimed` (стр. 539) — локальный
- `ownerPaymentLabel` (стр. 558) — локальный
- `normalizeOwnerPhoneSearchValue` (стр. 565) — локальный
- `numberFromInput` (стр. 571) — локальный
- `toISODate` (стр. 575) — локальный
- `parsed` (стр. 576) — локальный
- `y` (стр. 578) — локальный
- `m` (стр. 579) — локальный
- `d` (стр. 580) — локальный
- `TIME_SLOTS` (стр. 584) — локальный
- `h` (стр. 585) — локальный
- `m` (стр. 586) — локальный
- `OwnerApp` (стр. 593)
- `isAccountant` (стр. 671) — локальный
- `modalMaxHeight` (стр. 672) — локальный
- `financeRoleTitle` (стр. 673) — локальный
- `financeNotificationRole` (стр. 674) — локальный
- `__nowRpt` (стр. 747) — локальный
- `__dowRpt` (стр. 748) — локальный
- `__monRpt` (стр. 749) — локальный
- `__sunRpt` (стр. 750) — локальный
- `parentCategories` (стр. 771) — локальный
- `today` (стр. 939) — локальный
- `adminShiftPhotoUrlsRef` (стр. 967) — локальный
- `clearOwnerResetFlow` (стр. 1063) — локальный
- `nextBoxes` (стр. 1086) — локальный
- `params` (стр. 1124) — локальный
- `params` (стр. 1139) — локальный
- `handlePayOwnerSalary` (стр. 1150) — локальный
- `amount` (стр. 1151) — локальный
- `res` (стр. 1155) — локальный
- `updated` (стр. 1164) — локальный
- `loadPiggyBank` (стр. 1172) — локальный
- `params` (стр. 1176) — локальный
- `qs` (стр. 1179) — локальный
- `data` (стр. 1181) — локальный
- `loadWallet` (стр. 1189) — локальный
- `params` (стр. 1193) — локальный
- `qs` (стр. 1196) — локальный
- `data` (стр. 1198) — локальный
- `handlePiggyWithdraw` (стр. 1204) — локальный
- `f` (стр. 1205) — локальный
- `openPiggyAdjust` (стр. 1227) — локальный
- `current` (стр. 1228) — локальный
- `handlePiggyAdjust` (стр. 1237) — локальный
- `newBalance` (стр. 1238) — локальный
- `delta` (стр. 1240) — локальный
- `syncCountdown` (стр. 1313) — локальный
- `diffMs` (стр. 1314) — локальный
- `intervalId` (стр. 1319) — локальный
- `handleOpenShiftForMasters` (стр. 1349) — локальный
- `saved` (стр. 1358) — локальный
- `ownerNotifications` (стр. 1374) — локальный
- `unreadCount` (стр. 1375) — локальный
- `completedBookings` (стр. 1376) — локальный
- `todayBookings` (стр. 1377) — локальный
- `activeMasters` (стр. 1379) — локальный
- `masterCameOutTodayAt` (стр. 1384) — локальный
- `times` (стр. 1385) — локальный
- `mastersCameOutToday` (стр. 1394) — локальный
- `latestShiftChecklists` (стр. 1395) — локальный
- `latestAdminShiftInspections` (стр. 1396) — локальный
- `latestAdminShiftInspectionKey` (стр. 1397) — локальный
- `activeIds` (стр. 1413) — локальный
- `currentPhotoUrls` (стр. 1426) — локальный
- `missing` (стр. 1427) — локальный
- `next` (стр. 1439) — локальный
- `vv` (стр. 1461) — локальный
- `handler` (стр. 1463) — локальный
- `el` (стр. 1464) — локальный
- `bookingFormBoxes` (стр. 1476) — локальный
- `bookingFormLocationLabel` (стр. 1477) — локальный
- `editBookingLocationLabel` (стр. 1478) — локальный
- `todayRevenue` (стр. 1479) — локальный
- `now` (стр. 1482) — локальный
- `dayOfWeek` (стр. 1483) — локальный
- `diffToSaturday` (стр. 1484) — локальный
- `weekSaturday` (стр. 1485) — локальный
- `weekFriday` (стр. 1488) — локальный
- `isDateInWeek` (стр. 1491) — локальный
- `d` (стр. 1492) — локальный
- `weeklyCompletedBookings` (стр. 1495) — локальный
- `weeklyBookings` (стр. 1496) — локальный
- `weeklyExpenses` (стр. 1497) — локальный
- `weeklyIncomes` (стр. 1498) — локальный
- `totalRevenue` (стр. 1499) — локальный
- `totalExpenses` (стр. 1500) — локальный
- `totalIncomes` (стр. 1501) — локальный
- `profit` (стр. 1502) — локальный
- `averageCheck` (стр. 1503) — локальный
- `activeBookings` (стр. 1504) — локальный
- `pipelineCounts` (стр. 1505) — локальный
- `statusListItems` (стр. 1512) — локальный
- `totalStockValue` (стр. 1517) — локальный
- `washRevenue` (стр. 1520) — локальный
- `detailingRevenue` (стр. 1523) — локальный
- `washExpenses` (стр. 1526) — локальный
- `detailingExpenses` (стр. 1529) — локальный
- `washIncomes` (стр. 1532) — локальный
- `detailingIncomes` (стр. 1535) — локальный
- `resourceGroupLabel` (стр. 1539) — локальный
- `payrollRows` (стр. 1544) — локальный
- `workerPenalties` (стр. 1545) — локальный
- `complaintState` (стр. 1546) — локальный
- `payrollTotal` (стр. 1554) — локальный
- `formatComplaintDate` (стр. 1555) — локальный
- `resetPreviewRows` (стр. 1556) — локальный
- `resetExecuteLocked` (стр. 1570) — локальный
- `glass` (стр. 1572) — локальный
- `bg` (стр. 1573) — локальный
- `text` (стр. 1574) — локальный
- `sub` (стр. 1575) — локальный
- `primary` (стр. 1576) — локальный
- `accent` (стр. 1577) — локальный
- `surface` (стр. 1578) — локальный
- `inputCls` (стр. 1579) — локальный
- `selectCls` (стр. 1580) — локальный
- `tooltipStyle` (стр. 1581) — локальный
- `createDraftId` (стр. 1582) — локальный
- `handleAddBoxDraft` (стр. 1584) — локальный
- `handleRemoveBoxDraft` (стр. 1598) — локальный
- `handleAddServiceDraft` (стр. 1602) — локальный
- `handleRemoveServiceDraft` (стр. 1631) — локальный
- `handleHireWorker` (стр. 1635) — локальный
- `name` (стр. 1636) — локальный

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

### frontend/src/app/components/shared/ServiceSearchInput.tsx (34 строк)

- `ServiceSearchInput` (стр. 15)

### frontend/src/app/components/shared/ServiceSearchSelect.tsx (128 строк)

- `ServiceSearchSelect` (стр. 18)
- `containerRef` (стр. 32) — локальный
- `inputRef` (стр. 33) — локальный
- `selectedService` (стр. 35) — локальный
- `filtered` (стр. 37) — локальный
- `handleClickOutside` (стр. 42) — локальный
- `handleSelect` (стр. 51) — локальный
- `handleInputChange` (стр. 57) — локальный
- `handleInputFocus` (стр. 62) — локальный
- `CheckIcon` (стр. 122) — локальный

### frontend/src/app/components/shared/SourceBadge.tsx (21 строк)

- `sourceBadgeMeta` (стр. 3)
- `SourceBadge` (стр. 13)
- `badge` (стр. 14) — локальный

### frontend/src/app/components/worker/WorkerApp.tsx (1859 строк)

- `workerStatusLabel` (стр. 23) — локальный
- `workerStatusBadge` (стр. 46) — локальный
- `workerPaymentLabel` (стр. 67) — локальный
- `bookingBasePrice` (стр. 73) — локальный
- `additionalTotal` (стр. 74) — локальный
- `servicesTotal` (стр. 75) — локальный
- `bookingBaseWorkerEarned` (стр. 80) — локальный
- `link` (стр. 81) — локальный
- `formatBookingInstant` (стр. 88) — локальный
- `date` (стр. 90) — локальный
- `DAY_NAMES` (стр. 103) — локальный
- `MONTH_NAMES` (стр. 104) — локальный
- `groupBookingsByDate` (стр. 106) — локальный
- `WorkerEarningsCalendar` (стр. 117) — локальный
- `now` (стр. 139) — локальный
- `calYear` (стр. 140) — локальный
- `calMonth` (стр. 141) — локальный
- `datesWithBookings` (стр. 143) — локальный
- `firstDay` (стр. 145) — локальный
- `lastDay` (стр. 146) — локальный
- `startPad` (стр. 147) — локальный
- `totalDays` (стр. 148) — локальный
- `selectedDayBookings` (стр. 154) — локальный
- `formatDateKey` (стр. 158) — локальный
- `mm` (стр. 159) — локальный
- `dd` (стр. 160) — локальный
- `dateKey` (стр. 190) — локальный
- `hasBooking` (стр. 191) — локальный
- `isSelected` (стр. 192) — локальный
- `isToday` (стр. 193) — локальный
- `WorkerApp` (стр. 241)
- `workerId` (стр. 271) — локальный
- `params` (стр. 372) — локальный
- `loadCalendar` (стр. 383) — локальный
- `timer` (стр. 399) — локальный
- `params` (стр. 401) — локальный
- `myNotifications` (стр. 411) — локальный
- `unreadCount` (стр. 412) — локальный
- `isMyTask` (стр. 414) — локальный
- `allTasks` (стр. 418) — локальный
- `todayTasks` (стр. 421) — локальный
- `myEarnings` (стр. 423) — локальный
- `w` (стр. 426) — локальный
- `earned` (стр. 427) — локальный
- `totalEarned` (стр. 434) — локальный
- `payrollSummary` (стр. 435) — локальный
- `earnedForDisplay` (стр. 436) — локальный
- `myPenalties` (стр. 437) — локальный
- `complaintState` (стр. 438) — локальный
- `payoutAfterPenalties` (стр. 439) — локальный
- `allMyTasks` (стр. 441) — локальный
- `completedCount` (стр. 442) — локальный
- `avgCheck` (стр. 443) — локальный
- `chemistryItems` (стр. 444) — локальный
- `formatTimer` (стр. 452) — локальный
- `glass` (стр. 454) — локальный
- `bg` (стр. 455) — локальный
- `text` (стр. 456) — локальный
- `sub` (стр. 457) — локальный
- `primary` (стр. 458) — локальный
- `accent` (стр. 459) — локальный
- `surface` (стр. 460) — локальный
- `inputCls` (стр. 461) — локальный
- `formatComplaintDate` (стр. 462) — локальный
- `handleStartTask` (стр. 464) — локальный
- `openFinishModal` (стр. 471) — локальный
- `handleFinish` (стр. 480) — локальный
- `nextNote` (стр. 486) — локальный
- `handleSaveProfile` (стр. 524) — локальный
- `handleSubmitShiftChecklist` (стр. 530) — локальный
- `saved` (стр. 533) — локальный
- `handleSavePass` (стр. 548) — локальный
- `handleGenerateTelegramCode` (стр. 575) — локальный
- `handleSaveNotifications` (стр. 579) — локальный
- `headerTitle` (стр. 585) — локальный
- `isMyService` (стр. 667) — локальный
- `isOutsource` (стр. 668) — локальный
- `myBaseLink` (стр. 716) — локальный
- `myAdditionalServices` (стр. 717) — локальный
- `baseEarned` (стр. 719) — локальный
- `additionalEarned` (стр. 720) — локальный
- `total` (стр. 721) — локальный
- `earned` (стр. 732) — локальный
- `created` (стр. 784) — локальный
- `started` (стр. 785) — локальный
- `completed` (стр. 786) — локальный
- `dayTasks` (стр. 902) — локальный
- `assignedToMe` (стр. 974) — локальный
- `shiftPay` (стр. 1119) — локальный
- `bonuses` (стр. 1120) — локальный
- `advances` (стр. 1121) — локальный
- `deductions` (стр. 1122) — локальный
- `adjustments` (стр. 1123) — локальный
- `totalAccrued` (стр. 1124) — локальный
- `totalDeducted` (стр. 1125) — локальный
- `w` (стр. 1509) — локальный
- `earned` (стр. 1510) — локальный
- `paymentLabel` (стр. 1513) — локальный
- `isActive` (стр. 1608) — локальный

### frontend/src/app/components/worker/WorkerCalendar.tsx (614 строк)

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
- `offset` (стр. 61) — локальный
- `daysInMonth` (стр. 62) — локальный
- `date` (стр. 68) — локальный
- `workerCalendarDayHours` (стр. 77) — локальный
- `parsedDate` (стр. 78) — локальный
- `daySchedule` (стр. 82) — локальный
- `open` (стр. 86) — локальный
- `close` (стр. 87) — локальный
- `workerCalendarLoadTone` (стр. 91) — локальный
- `ratio` (стр. 93) — локальный
- `workerGroupBookingsByHour` (стр. 103) — локальный
- `timed` (стр. 108) — локальный
- `hourLabel` (стр. 111) — локальный
- `slotEnd` (стр. 112) — локальный
- `slotBookings` (стр. 113) — локальный
- `start` (стр. 115) — локальный
- `workerCalendarStatusLabel` (стр. 127) — локальный
- `workerCalendarStatusBadge` (стр. 148) — локальный
- `WorkerCalendar` (стр. 182)
- `now` (стр. 198) — локальный
- `relevantBookings` (стр. 203) — локальный
- `bookingsByDate` (стр. 204) — локальный
- `dateLabel` (стр. 205) — локальный
- `monthCells` (стр. 213) — локальный
- `monthLabel` (стр. 214) — локальный
- `monthLoads` (стр. 215) — локальный
- `monthMaxLoad` (стр. 218) — локальный
- `dayBookings` (стр. 220) — локальный
- `dayHours` (стр. 221) — локальный
- `hourSlots` (стр. 222) — локальный
- `untimedBookings` (стр. 223) — локальный
- `dayTitle` (стр. 224) — локальный
- `activeMasters` (стр. 230) — локальный
- `timeSlots` (стр. 231) — локальный
- `workerGrid` (стр. 232) — локальный
- `isMine` (стр. 241) — локальный
- `statusLine` (стр. 243) — локальный
- `workerNames` (стр. 244) — локальный
- `today` (стр. 288) — локальный
- `dayItems` (стр. 308) — локальный
- `loadTone` (стр. 309) — локальный
- `loadWidth` (стр. 310) — локальный
- `isToday` (стр. 313) — локальный
- `today` (стр. 388) — локальный
- `workerItems` (стр. 566) — локальный

### frontend/src/app/constants/referralSources.ts (8 строк)

- `REFERRAL_SOURCES` (стр. 1)

### frontend/src/app/context/AppContext.tsx (2017 строк)

- `EMPTY_CONTENT` (стр. 907)
- `timeToMinutes` (стр. 929) — локальный
- `minutesToTime` (стр. 936) — локальный
- `hours` (стр. 937) — локальный
- `minutes` (стр. 938) — локальный
- `buildTimeSlots` (стр. 942) — локальный
- `timeRangesOverlap` (стр. 950) — локальный
- `AppContext` (стр. 954) — локальный
- `normalizeWorker` (стр. 956) — локальный
- `normalizeBootstrap` (стр. 970) — локальный
- `AppProvider` (стр. 994)
- `upcomingDates` (стр. 1018) — локальный
- `todayLabel` (стр. 1019) — локальный
- `tomorrowLabel` (стр. 1020) — локальный
- `applyBootstrap` (стр. 1022) — локальный
- `normalized` (стр. 1023) — локальный
- `refreshBootstrap` (стр. 1051) — локальный
- `bootstrap` (стр. 1052) — локальный
- `handleError` (стр. 1056) — локальный
- `message` (стр. 1057) — локальный
- `restoreSession` (стр. 1062) — локальный
- `bootstrap` (стр. 1064) — локальный
- `refreshActiveSessions` (стр. 1073) — локальный
- `applyTelegramTheme` (стр. 1077) — локальный
- `root` (стр. 1079) — локальный
- `theme` (стр. 1080) — локальный
- `cssVar` (стр. 1083) — локальный
- `tg` (стр. 1090) — локальный
- `logout` (стр. 1107) — локальный
- `loginClient` (стр. 1131) — локальный
- `bootstrap` (стр. 1135) — локальный
- `linkStaff` (стр. 1149) — локальный
- `bootstrap` (стр. 1153) — локальный
- `switchRole` (стр. 1167) — локальный
- `bootstrap` (стр. 1171) — локальный
- `updateClientProfile` (стр. 1185) — локальный
- `payload` (стр. 1186) — локальный
- `saved` (стр. 1187) — локальный
- `remindAdminAboutInactiveClients` (стр. 1191) — локальный
- `response` (стр. 1192) — локальный
- `addClient` (стр. 1196) — локальный
- `created` (стр. 1197) — локальный
- `normalized` (стр. 1198) — локальный
- `updateClientCard` (стр. 1203) — локальный
- `saved` (стр. 1204) — локальный
- `normalized` (стр. 1205) — локальный
- `deleteClient` (стр. 1209) — локальный
- `listDepositClients` (стр. 1214) — локальный
- `items` (стр. 1215) — локальный
- `getDepositOverview` (стр. 1219) — локальный
- `overview` (стр. 1220) — локальный
- `updateDepositSubscription` (стр. 1228) — локальный
- `overview` (стр. 1229) — локальный
- `depositTopUp` (стр. 1237) — локальный
- `txn` (стр. 1238) — локальный
- `depositAdjust` (стр. 1242) — локальный
- `overview` (стр. 1243) — локальный
- `depositRecordWash` (стр. 1251) — локальный
- `overview` (стр. 1252) — локальный
- `depositSettleMonth` (стр. 1260) — локальный
- `overview` (стр. 1261) — локальный
- `downloadDepositExport` (стр. 1269) — локальный
- `downloadDepositExportAll` (стр. 1273) — локальный
- `sendDepositExport` (стр. 1277) — локальный
- `sendDepositExportAll` (стр. 1281) — локальный
- `addBooking` (стр. 1285) — локальный
- `created` (стр. 1286) — локальный
- `existingClient` (стр. 1306) — локальный
- `nextClient` (стр. 1307) — локальный
- `updateBooking` (стр. 1331) — локальный
- `updated` (стр. 1332) — локальный
- `deleteBooking` (стр. 1358) — локальный
- `addBookingService` (стр. 1363) — локальный
- `updated` (стр. 1364) — локальный
- `addBookingAdditionalService` (стр. 1384) — локальный
- `updated` (стр. 1385) — локальный
- `updateBookingAdditionalService` (стр. 1405) — локальный
- `updated` (стр. 1406) — локальный
- `removeBookingAdditionalService` (стр. 1426) — локальный
- `updated` (стр. 1427) — локальный
- `addNotification` (стр. 1447) — локальный
- `created` (стр. 1448) — локальный
- `markNotificationRead` (стр. 1467) — локальный
- `markAllNotificationsRead` (стр. 1472) — локальный
- `addStockItem` (стр. 1486) — локальный
- `created` (стр. 1487) — локальный
- `updateStockItem` (стр. 1491) — локальный
- `updated` (стр. 1492) — локальный
- `writeOffStock` (стр. 1496) — локальный
- `updated` (стр. 1497) — локальный
- `getWriteOffHistory` (стр. 1501) — локальный
- `deleteStockItem` (стр. 1505) — локальный
- `addStockCategory` (стр. 1510) — локальный
- `created` (стр. 1511) — локальный
- `updateStockCategory` (стр. 1515) — локальный
- `updated` (стр. 1516) — локальный
- `deleteStockCategory` (стр. 1520) — локальный
- `addExpense` (стр. 1529) — локальный
- `created` (стр. 1530) — локальный
- `addIncome` (стр. 1534) — локальный
- `created` (стр. 1535) — локальный
- `updateExpense` (стр. 1539) — локальный
- `updated` (стр. 1540) — локальный
- `updateIncome` (стр. 1544) — локальный
- `updated` (стр. 1545) — локальный
- `addPenalty` (стр. 1549) — локальный
- `revokePenalty` (стр. 1554) — локальный
- `revokeAllPenalties` (стр. 1559) — локальный
- `createTelegramLinkCode` (стр. 1564) — локальный
- `created` (стр. 1565) — локальный
- `downloadOwnerExport` (стр. 1569) — локальный
- `fallback` (стр. 1570) — локальный
- `qs` (стр. 1573) — локальный
- `qstr` (стр. 1577) — локальный
- `sendOwnerExportToTelegram` (стр. 1583) — локальный
- `qs` (стр. 1586) — локальный
- `qstr` (стр. 1590) — локальный
- `sendOwnerSummaryReport` (стр. 1596) — локальный
- `response` (стр. 1597) — локальный
- `dispatchOwnerReminders` (стр. 1601) — локальный
- `saveServices` (стр. 1611) — локальный
- `saveBoxes` (стр. 1616) — локальный
- `saveSchedule` (стр. 1620) — локальный
- `saveAdminProfile` (стр. 1624) — локальный
- `saved` (стр. 1625) — локальный
- `saveAdminNotificationSettings` (стр. 1629) — локальный
- `saved` (стр. 1630) — локальный
- `saveWorkerProfile` (стр. 1634) — локальный
- `saved` (стр. 1635) — локальный
- `normalized` (стр. 1636) — локальный
- `saveWorkerNotificationSettings` (стр. 1643) — локальный
- `saved` (стр. 1644) — локальный
- `saveOwnerCompany` (стр. 1651) — локальный
- `saved` (стр. 1652) — локальный
- `saveOwnerNotificationSettings` (стр. 1656) — локальный
- `saved` (стр. 1657) — локальный
- `saveOwnerIntegrations` (стр. 1661) — локальный
- `saved` (стр. 1662) — локальный
- `saveOwnerSecurity` (стр. 1666) — локальный
- `saved` (стр. 1667) — локальный
- `saveWorkerSettings` (стр. 1671) — локальный
- `saved` (стр. 1672) — локальный
- `saveAdminWorkerPayroll` (стр. 1676) — локальный
- `saved` (стр. 1677) — локальный
- `normalized` (стр. 1678) — локальный
- `nextWorker` (стр. 1680) — локальный
- `saveContent` (стр. 1685) — локальный
- `saved` (стр. 1686) — локальный
- `createPayrollEntry` (стр. 1690) — локальный
- `checkConsent` (стр. 1695) — локальный
- `response` (стр. 1696) — локальный
- `submitConsent` (стр. 1700) — локальный
- `listShiftChecklists` (стр. 1704) — локальный
- `entries` (стр. 1705) — локальный
- `submitShiftChecklist` (стр. 1709) — локальный
- `entry` (стр. 1710) — локальный
- `listAdminShiftInspections` (стр. 1717) — локальный
- `entries` (стр. 1718) — локальный
- `submitAdminShiftInspection` (стр. 1726) — локальный
- `entry` (стр. 1733) — локальный
- `openShiftForMasters` (стр. 1744) — локальный
- `entry` (стр. 1745) — локальный
- `hireWorker` (стр. 1756) — локальный
- `created` (стр. 1757) — локальный
- `normalized` (стр. 1758) — локальный
- `fireWorker` (стр. 1768) — локальный
- `resetWorkerPassword` (стр. 1773) — локальный
- `changePassword` (стр. 1780) — локальный
- `requestOwnerDatabaseReset` (стр. 1787) — локальный
- `response` (стр. 1788) — локальный
- `approveOwnerDatabaseReset` (стр. 1805) — локальный
- `response` (стр. 1806) — локальный
- `executeOwnerDatabaseReset` (стр. 1822) — локальный
- `response` (стр. 1823) — локальный
- `getTimeSlotsForDate` (стр. 1831) — локальный
- `parsedDate` (стр. 1832) — локальный
- `day` (стр. 1834) — локальный
- `openMinutes` (стр. 1837) — локальный
- `closeMinutes` (стр. 1838) — локальный
- `durationMinutes` (стр. 1841) — локальный
- `scheduleSlots` (стр. 1842) — локальный
- `candidateBoxes` (стр. 1843) — локальный
- `boxNames` (стр. 1848) — локальный
- `slotStart` (стр. 1850) — локальный
- `slotEnd` (стр. 1852) — локальный
- `bookingStart` (стр. 1859) — локальный
- `getBookingAvailabilityForDate` (стр. 1866) — локальный
- `durationMinutes` (стр. 1867) — локальный
- `params` (стр. 1869) — локальный
- `response` (стр. 1879) — локальный
- `useApp` (стр. 2009)
- `ctx` (стр. 2010) — локальный
- `getWorkerNotificationSettings` (стр. 2015)

### frontend/src/app/hooks/useTelegramBackButton.ts (23 строк)

- `useTelegramBackButton` (стр. 4)
- `tg` (стр. 6) — локальный
- `btn` (стр. 7) — локальный

### frontend/src/app/hooks/useTelegramMainButton.ts (39 строк)

- `useTelegramMainButton` (стр. 4)
- `tg` (стр. 11) — локальный
- `btn` (стр. 12) — локальный

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

### frontend/src/app/utils/validation.ts (162 строк)

- `NAME_PATTERN` (стр. 3) — локальный
- `REPEATED_LETTERS_PATTERN` (стр. 4) — локальный
- `VEHICLE_PATTERN` (стр. 5) — локальный
- `REPEATED_VEHICLE_PATTERN` (стр. 6) — локальный
- `PLATE_ALLOWED_LETTERS` (стр. 7) — локальный
- `PLATE_PATTERN` (стр. 36) — локальный
- `MOTORCYCLE_PLATE_PATTERN` (стр. 37) — локальный
- `normalizePersonName` (стр. 39)
- `validatePersonName` (стр. 43)
- `normalized` (стр. 44) — локальный
- `validatePhoneValue` (стр. 50)
- `digits` (стр. 51) — локальный
- `normalized` (стр. 53) — локальный
- `normalizeVehicleInput` (стр. 60)
- `validateVehicleName` (стр. 64)
- `normalized` (стр. 65) — локальный
- `lettersOnly` (стр. 66) — локальный
- `plateExpectedAtPosition` (стр. 75) — локальный
- `normalizePlateInput` (стр. 85)
- `expected` (стр. 95) — локальный
- `mapped` (стр. 97) — локальный
- `validatePlateValue` (стр. 114)
- `normalized` (стр. 116) — локальный
- `normalized` (стр. 124) — локальный
- `hasEmptyVehicles` (стр. 134) — локальный
- `isClientCardIncomplete` (стр. 139)
- `weekAgo` (стр. 149) — локальный
- `created` (стр. 150) — локальный

### frontend/src/main.tsx (7 строк)

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
- `app.py`
- `flip_push_permission.py`
- `tmp_list_routes.py`
- `tmp_seed_view.py`

## Недавно изменённые файлы

- `backend/tests/test_booking_logic.py` (2026-08-22 18:07)
- `training/frontend/src/app/App.tsx` (2026-08-22 18:04)
- `frontend/src/app/App.tsx` (2026-08-22 18:02)
- `backend/tmp_verify_fix.py` (2026-08-22 17:53)
- `backend/app/main.py` (2026-08-22 17:52)
- `backend/tmp_repro_slot_bug.py` (2026-08-22 17:50)
- `tmp_seed_view.py` (2026-08-22 17:48)
- `tmp_list_routes.py` (2026-08-22 17:46)
- `scripts/.project-map-watch.lock` (2026-08-22 17:43)
- `training/frontend/src/app/components/owner/OwnerApp.tsx` (2026-08-22 10:15)
- `frontend/src/app/components/owner/OwnerApp.tsx` (2026-08-22 10:15)
- `training/frontend/src/app/components/worker/WorkerApp.tsx` (2026-08-22 10:15)
- `frontend/src/app/components/worker/WorkerApp.tsx` (2026-08-22 10:15)
- `training/frontend/src/app/components/admin/AdminApp.tsx` (2026-08-22 10:13)
- `frontend/src/app/components/admin/AdminApp.tsx` (2026-08-22 10:13)
