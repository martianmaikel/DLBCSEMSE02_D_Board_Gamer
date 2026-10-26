# AGENTS.md

Gemeinsame Arbeitsanweisungen für KI-Agenten in diesem Repo (Codex liest diese Datei direkt,
Claude Code über `CLAUDE.md`). Gilt für alle Teammitglieder und alle Tools.

## Projekt

Uni-Projekt IU, Kurs DLBCSEMSE02_D (Mobile Software Engineering II), Aufgabenstellung 1.2
"Board-Gamer-App", konkretisiert auf Dungeons & Dragons. Dreiergruppe, Aufteilung nach MVC.
Fachlicher Rahmen (User Stories, Annahmen, offene Punkte): `docs/konzept.md`.
Getroffene Entscheidungen: `docs/entscheidungen.md`.

Stack: Expo SDK 58, React Native 0.88, React 19.3, TypeScript (strict), Jest (`jest-expo`).

## Architektur: MVC mit festen Zuständigkeiten

| Schicht    | Ordner            | Inhalt                                                                                     | Owner                    |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------ | ------------------------ |
| View       | `src/view/`       | Screens, Navigation, UI-Komponenten                                                        | Karin (`KPardis`)        |
| Controller | `src/controller/` | Anwendungslogik: Rotation, Abstimmung, Bewertung, Nachrichten, Statistik, Überschneidungen | Maikel (`martianmaikel`) |
| Model      | `src/model/`      | Datenmodell, Persistenz, Datenzugriff                                                      | Mohammad (`Msaf777`)     |

Abhängigkeitsrichtung: **view -> controller -> model**. Per ESLint erzwungen (`eslint.config.js`):

- `src/view` importiert nie aus `src/model`. Typen, die die View braucht, exportiert der Controller weiter.
- `src/controller` importiert nie aus `src/view`.
- `src/model` importiert weder Controller noch View und enthält keine UI.
- Schichtübergreifend nur über die Aliase `@controller` bzw. `@model` importieren. Die öffentliche
  API jeder Schicht ist ihre `index.ts`. Interne Dateien einer fremden Schicht nicht direkt importieren.

Regeln für Agenten:

- Nur in der Schicht arbeiten, deren Owner dich gerade nutzt. Jede Person wird einzeln für ihren Teil
  benotet, darum keine Änderungen an fremden Schichten "nebenbei".
- Braucht eine Aufgabe eine Änderung an einer fremden Schicht oder an deren `index.ts`
  (Schnittstelle), stoppen und dem Menschen sagen, was der Owner ändern müsste.
- Controller-Logik als reine, testbare Funktionen schreiben (keine React-Abhängigkeit in der Kernlogik),
  React-Hooks für die View nur als dünne Hülle darum.

## Expo: nicht auf Trainingswissen verlassen

Expo ändert APIs mit jedem SDK. Vor Code, der Expo-, EAS- oder React-Native-APIs berührt:

1. Major-Version von `expo` in `package.json` lesen (aktuell 58).
2. Passende Doku lesen: `https://docs.expo.dev/versions/v58.0.0/`
3. Sonst `https://docs.expo.dev/llms.txt` als Index nutzen. Nicht aus dem Gedächtnis antworten.

- Pakete immer mit `npx expo install <paket>` hinzufügen (SDK-kompatible Versionen), Dev-Tools mit
  `npx expo install <paket> -- --save-dev`. Neue Abhängigkeiten nur nach Rückfrage.
- `ios/` und `android/` werden generiert (Continuous Native Generation). Nie anlegen oder von Hand
  bearbeiten, natives Verhalten über `app.json` und Config-Plugins.
- Expo Go enthält nur gebündelte native Module. Bibliotheken mit eigenem nativen Code brauchen einen
  Development Build, vorher mit dem Team klären.
- Navigation ist noch offen (Entscheidung der View). Empfohlen ist Expo Router; dann liegen Routen in
  `src/app/` und zählen zur View-Schicht.

## Befehle

```bash
npm start              # Dev-Server (Expo Go per QR-Code)
npm run lint           # ESLint inkl. MVC-Regeln
npm run typecheck      # tsc --noEmit
npm test               # Jest
npm run check          # alles drei, Pflicht vor jedem Commit/PR
npm run format         # Prettier
npx expo-doctor        # Abhängigkeiten/Config prüfen
```

Aufgabe erst als fertig melden, wenn `npm run check` grün ist.

## Code-Konventionen

- TypeScript strict, kein `any`, keine `// @ts-ignore` ohne Begründung im Kommentar.
- Bezeichner und Code-Kommentare englisch, UI-Texte deutsch.
- Tests als `*.test.ts(x)` neben der getesteten Datei. Controller-Logik immer mit Tests.
- Formatierung macht Prettier (`.prettierrc`), nicht von Hand umformatieren.

## Git

Vollständige Strategie: `CONTRIBUTING.md`. Kurzfassung:

- Nie direkt auf `main` committen. Branch `<schicht>/<thema>`, z. B. `controller/host-rotation`.
- Commit-Nachrichten kurz: `<typ>(<scope>): <was>`, englisch, Imperativ, max. ca. 50 Zeichen.
  Beispiel: `feat(controller): add host rotation`.
- **Keine Agent-Verweise** in Commits, PR-Titeln, PR-Texten oder Code: kein `Co-Authored-By`,
  kein "Generated with ...", keine Tool-Namen. Der KI-Einsatz wird stattdessen in
  `docs/ki-einsatz.md` dokumentiert (siehe unten).
- Nicht pushen, mergen oder PRs öffnen ohne ausdrücklichen Auftrag.

## KI-Einsatz dokumentieren (Vorgabe des Tutors)

Der Tutor verlangt, den KI-Einsatz im Bericht wie jeden Tool-Einsatz zu dokumentieren und zu
reflektieren. Nach jeder nennenswerten Aufgabe (Code, Konzept, Doku) einen Eintrag in
`docs/ki-einsatz.md` anlegen: Datum, Person, Tool, Aufgabe, was übernommen bzw. angepasst wurde.
Die Spalte "Reflexion" füllt der Mensch, nicht der Agent.

## Nicht ins Repo

- Aufgabenstellung, Prüfungsleitfaden und Berichtsentwürfe (PDF/DOCX): Urheberrecht der IU und
  Plagiatsschutz, das Repo ist öffentlich. `.gitignore` deckt `*.pdf` und `*.docx` ab.
- Secrets, API-Keys, `.env`-Dateien. Matrikelnummern und andere personenbezogene Daten.
