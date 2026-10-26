# Git-Strategie

Wir arbeiten nach **GitHub Flow**: ein langlebiger Branch `main`, kurze Feature-Branches, Merge nur
per Pull Request mit Review.

## Ablauf

```bash
git switch main && git pull                 # aktuell starten
git switch -c controller/host-rotation      # Branch anlegen
# ... arbeiten, klein committen ...
npm run check                               # Lint, Typecheck, Tests
git pull --rebase origin main               # vor dem PR auf main aufsetzen
git push -u origin controller/host-rotation
gh pr create                                # oder über GitHub
```

## Branches

Schema `<schicht>/<thema>`, kebab-case, kurz.

| Präfix        | Wofür                     | Beispiel                   |
| ------------- | ------------------------- | -------------------------- |
| `view/`       | Screens, Navigation, UI   | `view/next-session-screen` |
| `controller/` | Anwendungslogik           | `controller/overlap-check` |
| `model/`      | Datenmodell, Persistenz   | `model/group-repository`   |
| `docs/`       | Doku, Konzept, KI-Log     | `docs/assumptions`         |
| `chore/`      | Setup, CI, Abhängigkeiten | `chore/add-expo-router`    |

Ein Branch = ein Thema = ein PR. Branches leben möglichst nur wenige Tage.

## Commits

Kurz, englisch, Imperativ, max. ca. 50 Zeichen:

```
<typ>(<scope>): <was>
```

- Typen: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`
- Scopes: `view`, `controller`, `model`, `ci`, `deps` (bei Doku ohne Scope)

Beispiele:

```
feat(controller): add host rotation
fix(model): persist vote timestamp
test(controller): cover overlap edge cases
docs: add assumptions
```

Keine Verweise auf KI-Tools in Commits (kein `Co-Authored-By`, kein "Generated with").
Der KI-Einsatz steht in `docs/ki-einsatz.md`.

## Pull Requests

- PR-Titel folgt dem Commit-Schema, er wird beim **Squash-Merge** zur Commit-Nachricht auf `main`.
- Mindestens **1 Review** durch ein anderes Teammitglied. `CODEOWNERS` fordert den Owner der
  betroffenen Schicht automatisch an.
- CI (`npm run check`) muss grün sein.
- Ändert ein PR die `index.ts` einer Schicht (Schnittstelle), müssen die Owner der abhängigen
  Schichten reviewen.
- Nach dem Merge wird der Branch automatisch gelöscht.

## Schutz von `main`

- Kein direkter Push, nur PR mit Review und grüner CI.
- Nur Squash-Merge erlaubt, damit die Historie auf `main` eine Zeile pro Feature bleibt.
