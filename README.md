# Board Gamer: D&D-Terminplaner

Mobile App zur Organisation von Dungeons-&-Dragons-Runden: nächster Termin mit Zeit und Ort,
rotierende Gastgeber:innen, Vorschläge und Abstimmung für die nächste Session, Bewertung nach dem
Abend, Schnellnachricht bei Verspätung, mehrere Gruppen mit Überschneidungswarnung und
Ortsstatistik.

Projekt im Kurs DLBCSEMSE02_D (Mobile Software Engineering II) an der IU, Aufgabenstellung 1.2.

## Team

| Name     | GitHub          | Schicht    |
| -------- | --------------- | ---------- |
| Karin    | `KPardis`       | View       |
| Maikel   | `martianmaikel` | Controller |
| Mohammad | `Msaf777`       | Model      |

## Start

Voraussetzungen: Node.js LTS (22 oder neuer), Git, auf dem Handy die App **Expo Go**.

```bash
git clone https://github.com/martianmaikel/DLBCSEMSE02_D_Board_Gamer.git
cd DLBCSEMSE02_D_Board_Gamer
npm ci
npm start          # QR-Code mit Expo Go scannen
```

| Befehl           | Zweck                             |
| ---------------- | --------------------------------- |
| `npm start`      | Dev-Server                        |
| `npm run check`  | Lint + Typecheck + Tests (vor PR) |
| `npm run format` | Code formatieren (Prettier)       |

## Struktur

```
src/
  view/         Screens, Navigation, UI           -> nutzt @controller
  controller/   Anwendungslogik                    -> nutzt @model
  model/        Datenmodell, Persistenz
docs/
  konzept.md         User Stories, Annahmen, offene Punkte
  entscheidungen.md  Entscheidungslog
  ki-einsatz.md      Dokumentation des KI-Einsatzes
```

Die Abhängigkeitsrichtung view -> controller -> model wird per ESLint geprüft.

## Mitarbeit

Git-Workflow, Branch- und Commit-Schema: [CONTRIBUTING.md](CONTRIBUTING.md).
Regeln für KI-Agenten (Codex, Claude Code): [AGENTS.md](AGENTS.md).
