# KI-Einsatz

Der Tutor hat gebeten, den KI-Einsatz im Bericht wie jeden anderen Tool-Einsatz zu dokumentieren
und zu reflektieren. Dieses Log ist die Grundlage dafür.

Regeln:

- Jede Person trägt ihre eigene KI-Nutzung ein, auch kleine (Code, Konzept, Recherche, Texte).
- "Übernommen/angepasst" ehrlich ausfüllen: Was kam von der KI, was wurde geändert und warum?
- Die Spalte "Reflexion" schreibt der Mensch (Nutzen, Fehler der KI, was man anders machen würde).
- Prompts müssen nicht wörtlich rein, eine Zusammenfassung reicht.

| Datum      | Person   | Tool        | Aufgabe                                                                                | Übernommen / angepasst                                                                                                                                                               | Reflexion |
| ---------- | -------- | ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 2026-10-26 | Maikel   | Claude Code | Projekt-Setup: Expo-Projekt, MVC-Ordner, ESLint-Schichtregeln, CI, Git-Strategie, Doku | Struktur und Doku übernommen, Feature-Code bewusst nicht generiert                                                                                                                   |           |
| 2026-10-29 | Mohammad | Codex       | Supabase-Setup: Cloud, lokale Docker-Umgebung, Model-Client, Doku                      | Befehle und Client-Code übernommen, Einrichtung manuell durchgeführt, Doku überarbeitet                                                                                              |           |
| 2026-10-30 | Maikel   | Claude Code | Review von PR #1 (Supabase-Setup)                                                      | Diff zusammengefasst, Checks ausgeführt, Review-Kommentar vorformuliert. Kürzung, Auswahl der Kritikpunkte und Freigabe durch Maikel                                                 |           |
| 2026-10-30 | Mohammad | Codex       | Supabase-Review: CLI, lokale Dienste und Dokumentation                                 | Review-Vorschläge manuell umgesetzt, Anleitung und Entscheidungslog überarbeitet                                                                                                     |           |
| 2026-11-02 | Mohammad | Codex       | User Story 1: minimales Datenbankschema und lokale Prüfung der Beziehungen             | SQL-Vorschläge für Gruppen, Mitgliedschaften, Orte und Sessions manuell umgesetzt; RLS und weitere User Stories zurückgestellt; Migrationsdateien und Prüfausgaben gemeinsam geprüft |           |
| 2026-11-02 | Mohammad | Codex       | User Story 1: typisierter Datenzugriff und Mock-Tests                                  | Datenbanktypen lokal generiert; Gruppen- und Session-Abfragen manuell umgesetzt; Testcode vorgeschlagen, drei Gruppen-Tests erfolgreich ausgeführt.                                  |           |
| 2026-11-03 | Mohammad | Codex       | US 1: Tests, RLS und Dokumentation                                                     | Integrationstests manuell umgesetzt; zunächst zurückgestellte RLS vor der geplanten Cloud-Nutzung ergänzt; Model-Anmeldung manuell umgesetzt; Datenmodell und Doku ergänzt.          |           |
| 2026-11-04 | Mohammad | Codex       | US 2: Schema, Berechtigungen und Model-API                                             | SQL- und TypeScript-Code vorgeschlagen, manuell übernommen und lokal geprüft                                                                                                         |           |
| 2026-11-04 | Mohammad | Codex       | US 2: Tests und Fehlerbehandlung                                                       | Testcode und Fehlerkorrektur vorgeschlagen, manuell übernommen und lokal geprüft. `fix_hosting_conflict_errors.sql`                                                                  |           |
| 2026-11-05 | Mohammad | Codex       | US 2: Integrationstests                                                                | Testcode, Refactoring und Dokumentation vorgeschlagen und manuell übernommen. geprüft.                                                                                               |           |
| 2026-11-08 | Mohammad | OpenCode    | US 2: Session-Dauer                                                                    | Session-Dauer in die bestehende US2-Implementierung integriert, zugehörige Tests und technische Dokumentation angepasst und lokale Prüfungen ausgeführt.                             |           |
