# Limitations

1. Embedded CLI uses the nearest Git repository; installing into a nested folder inside a monorepo will see parent dirty files unless a task session isolates hashes carefully—prefer installing at repo root.
2. Model critics default to provider `none` until configured.
3. Playwright remains optional; without browsers, runtime stages skip with clear messages.
4. Faceted packages (`visual-validator`, `animation-validator`, `report-generator`) re-export agent-autoreview — do not fork logic there.
5. Dashboard autoreview panel reads local `.autoreview`/`.agent-memory` artifacts; it does not run reviews itself.
6. Embedded review does not launch a full Playwright stack; package mode does when Playwright is installed.
