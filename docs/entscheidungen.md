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

### E-006 · 2026-10-30 · Manuelles Deployment der Datenbankmigrationen

- **Entscheidung:** Mohammad übernimmt das Deployment auf Supabase Cloud.
  Übertragen werden lokal getestete Migrationen aus `main`, nachdem der zugehörige Pull Request geprüft, freigegeben und gemergt wurde.
- **Begründung:** Die Zuständigkeit entspricht der Model-Verantwortung.
  Der Ablauf hält Review und Deployment nachvollziehbar und benötigt in der aktuellen Projektphase keine zusätzliche GitHub-Integration.
- **Alternativen:** Automatisches Deployment aus `main` über die Supabase-GitHub-Integration oder GitHub Actions. Bei wachsendem Bedarf erneut bewerten.
- **Wer:** Mohammad.

### E-007 · 2026-11-02 · Begrenzter Schemaumfang für User Story 1

- **Entscheidung:** Zunächst werden nur Gruppen, Mitgliedschaften, Orte und Sessions mit den für User Story 1 benötigten Feldern umgesetzt.
  Für die Benutzeridentität genügt vorerst `auth.users`.
- **Begründung:** Ein kleiner Umsetzungsschritt erleichtert Entwicklung und Review.
  `profiles` und weitere Attribute des Gesamtentwurfs bleiben zurückgestellt und werden bei fachlichem Bedarf durch spätere Migrationen ergänzt.
- **Wer:** Mohammad (Model).

### E-008 · 2026-11-03 · Geschützte Lesezugriffe für User Story 1

- **Entscheidung:** RLS wird vor der Cloud-Freigabe umgesetzt. Angemeldete
  Mitglieder lesen ihre eigenen Mitgliedschaften sowie die zugehörigen Gruppen,
  Sessions und Orte. Schreibzugriffe aus der App bleiben gesperrt.
  Der Model stellt eine einfache Anmeldung für bestehende Accounts bereit.
- **Begründung:** Die Lesezugriffe benötigen eine verifizierte Benutzeridentität.
  Abfragefilter allein ersetzen keine Berechtigungsprüfung.
- **Alternative:** RLS bis nach weiteren User Stories verschieben.
- **Wer:** Mohammad (Model).

### E-009 · 2026-11-05 · Überschneidungen warnen statt verbieten (E1)

- **Entscheidung:** Eine Person darf beliebig viele Termine in beliebig vielen Gruppen haben,
  auch am selben Tag oder zur selben Zeit. Der Controller meldet Überschneidungen nur als Warnung:
  `overlap` bei zeitlicher Überlappung von Terminen verschiedener Gruppen, `same-day` bei gleichem
  Kalendertag ohne Überlappung. Termine derselben Gruppe werden nicht verglichen.
- **Begründung:** Spieler:innen entscheiden selbst, welchen Termin sie wahrnehmen. Ein Verbot
  würde legitime Fälle blockieren, z. B. eine kurze Session vor einer zweiten am Abend.
  Die reine Zeitüberlappung ist eindeutig und gut testbar.
- **Alternativen:** Überschneidungen verbieten; zusätzlich Mindestabstand inkl. Anfahrt prüfen
  (offener Punkt im Konzept, verworfen, weil Anfahrtszeiten unbekannt sind).
- **Wer:** Maikel (Controller).

### E-010 · 2026-11-05 · Gruppenleitung und Beitritt per Einladungscode

- **Entscheidung:** Jede Gruppe hat eine Gruppenleitung, anfangs die Person, die sie anlegt.
  Tritt sie aus, übernimmt das am längsten zugehörige Mitglied. Die Leitung benennt die Gruppe um,
  entfernt Mitglieder, legt Termine an, ändert und sagt sie ab und ändert die
  Gastgeberreihenfolge. Beitritt per Einladungscode, den Mitglieder teilen (z. B. per WhatsApp):
  ein Code je Gruppe, gültig 7 Tage, beliebig viele Beitritte. Entfernte Personen können erst
  nach Freigabe durch die Leitung wieder beitreten.
- **Begründung:** Klare Zuständigkeit für Änderungen, die alle betreffen. Ein Code lässt sich
  ohne eigene Freundesliste oder Suche über vorhandene Messenger teilen.
- **Alternativen:** Alle Mitglieder gleichberechtigt; Einladung per E-Mail; Einmal-Codes.
- **Wer:** Maikel (Controller), Datenmodell durch Mohammad abzustimmen.

### E-011 · 2026-11-05 · Erinnerungen in der App statt Push, Lieferdienst als Stub

- **Entscheidung:** Push-Benachrichtigungen werden vorerst nicht umgesetzt. Erinnerungen
  (Abstimmung, Essenswahl, Bestellung, Bewertung) erscheinen als Hinweise auf der Startseite,
  Verspätungen am Termin. Die optionalen Stories 7 bis 9 werden umgesetzt, Lieferdienste und
  Menüs sind feste Beispieldaten ohne echte Bestellung oder Bezahlung.
- **Begründung:** Push braucht zusätzliche Einrichtung und Tests auf Geräten. Die Stories bleiben
  so ohne externe Abhängigkeiten testbar.
- **Alternativen:** Push über `expo-notifications`; echte Lieferdienst-API.
- **Wer:** Maikel (Controller).
