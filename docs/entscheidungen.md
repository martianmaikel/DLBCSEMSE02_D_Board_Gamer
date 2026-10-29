# Entscheidungslog

Kurzes Protokoll aller Projektentscheidungen, Grundlage für die Kapitel "Vorgehen" und "Reflexion"
im Bericht. Neue Einträge unten anhängen.

Format: Datum, Entscheidung, Begründung, Alternativen, wer.

---

### E-001 · 2026-10-26 · React Native mit Expo (SDK 58, TypeScript)

- **Begründung:** Eine Codebasis für Android und iOS. Expo Go erlaubt Tests auf dem eigenen Handy
  ohne Mac oder Android Studio. TypeScript macht die Schnittstellen zwischen den drei Schichten
  explizit.
- **Alternativen:** React Native CLI (mehr native Einrichtung), Flutter, nativ Swift/Kotlin.
- **Wer:** Team

### E-002 · 2026-10-26 · MVC-Ordnerstruktur mit erzwungenen Schichtgrenzen

- **Begründung:** Aufteilung View/Controller/Model entspricht der Teamaufteilung und der
  individuellen Benotung. ESLint (`no-restricted-imports`) verhindert Zugriffe gegen die Richtung
  view -> controller -> model, die öffentliche API jeder Schicht ist ihre `index.ts`.
- **Alternativen:** Feature-Ordner (fachlich geschnitten), MVVM.
- **Wer:** Team

### E-003 · 2026-10-26 · GitHub Flow mit Squash-Merge

- **Begründung:** Einfach für drei Personen, `main` bleibt lauffähig, Reviews verteilen Wissen über
  die Schichten. Squash hält die Historie lesbar. Details in `CONTRIBUTING.md`.
- **Alternativen:** Git Flow (zu schwer für die Teamgröße), Trunk-based ohne Reviews.
- **Wer:** Maikel

### E-004 · 2026-10-26 · Kursunterlagen und Berichtsentwürfe nicht im Repo

- **Begründung:** Die IU untersagt die Veröffentlichung der Aufgabenstellung, ausgearbeitete
  Lösungen sollen wegen Plagiatsprüfung nicht geteilt werden. Das Repo ist öffentlich, damit der
  Tutor Einblick in den Code hat.
- **Wer:** Maikel

### E-005 · 2026-10-27 · Supabase als Backend-as-a-Service

- **Begründung**: PostgreSQL passt zu den Beziehungen zwischen Accounts, Gruppen, Terminen,
  Abstimmungen und Bewertungen. Integrierte Authentifizierung und automatisch bereitgestellte
  APIs reduzieren den Backend-Aufwand. Das Team nutzt Supabase Cloud ohne lokale
  Backend-Einrichtung; Mohammad plant zusätzlich eine separate lokale Supabase-Umgebung
  über Docker für Entwicklung und Tests.
- **Alternativen:** Firebase, eigener REST-Server mit Express und Prisma.

- **Wer:** Mohammad nach Abstimmung mit dem Team
