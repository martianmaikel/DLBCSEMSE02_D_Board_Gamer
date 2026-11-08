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
- **Wer:** Mohammad.

### E-008 · 2026-11-03 · Geschützte Lesezugriffe für User Story 1

- **Entscheidung:** RLS wird vor der Cloud-Freigabe umgesetzt. Angemeldete
  Mitglieder lesen ihre eigenen Mitgliedschaften sowie die zugehörigen Gruppen,
  Sessions und Orte. Schreibzugriffe aus der App bleiben gesperrt.
  Der Model stellt eine einfache Anmeldung für bestehende Accounts bereit.
- **Begründung:** Die Lesezugriffe benötigen eine verifizierte Benutzeridentität.
  Abfragefilter allein ersetzen keine Berechtigungsprüfung.
- **Alternative:** RLS bis nach weiteren User Stories verschieben.
- **Wer:** Mohammad.

### E-009 · 2026-11-04 · Hosting-Reihenfolge und historische Mitgliedschaften

- **Entscheidung:** Die Reihenfolge liegt in `memberships.host_position`.
  Positionen sind positiv und pro Gruppe eindeutig; `NULL` und Lücken sind erlaubt.
  Beim Wiedereintritt bleibt dieselbe Mitgliedschaft erhalten, mit neuer
  Beitrittszeit und ohne frühere Position.
- **Begründung:** Eine gemeinsame Datenbasis erhält historische Hostreferenzen.
- **Alternative:** Zusätzliche Reihenfolge als Array oder JSON.
- **Wer:** Mohammad.

### E-010 · 2026-11-04 · Administration und Berechtigungen

- **Entscheidung:** Der Gruppenersteller wird Administrator und verwaltet
  Reihenfolge und Sessions. Aktuelle Mitglieder lesen die Gruppendaten und
  ändern ihre eigene Hosting-Bereitschaft. Der administrativ benannte
  tatsächliche Host bestätigt die Session, sonst der geplante Host.
- **Nachfolge:** Ältestes verbleibendes Mitglied nach aktueller Mitgliedschaftsperiode;
  Auswahl im Controller. Freiwilliger Transfer bleibt zurückgestellt.
- **Wer:** Mohammad, mit Zustimmung des Teams.

### E-011 · 2026-11-04 · Geschützte Speicherung und Zustandskonflikte

- **Entscheidung:** Änderungen erfolgen über berechtigungsgeprüfte RPCs.
  Zusammengehörige Änderungen werden atomar gespeichert.
  Veraltete Erwartungswerte liefern `PT409`.
- **Begründung:** Sichere Speicherung und erkennbare Konflikte;
  Rotations- und Auswahlverfahren bleiben im Controller.
- **Wer:** Mohammad.

### E-012 · 2026-11-04 · Aufnahme ohne zusätzlichen Beitrittsworkflow

- **Entscheidung:** Der Administrator nimmt Nutzer auf und reaktiviert
  Mitgliedschaften. Ein zusätzlicher Beitrittsworkflow gehört nicht zum
  ursprünglich festgelegten Story-Umfang.
- **Alternative:** Beitrittsanfragen mit Freigabe als eigene User Story.
- **Wer:** Team bei der ursprünglichen Festlegung der User Stories.

### E-013 · 2026-11-08 · Registrierung und Profile als gemeinsame Grundlage

- **Entscheidung:** `profiles` ergänzt Auth-Accounts um einen bewusst gewählten,
  nicht leeren Benutzernamen, eindeutig ohne Groß-/Kleinschreibung. Neue
  Registrierungen verlangen Benutzername, E-Mail und Passwort; das Profil wird
  automatisch und atomar mit dem Konto angelegt. Bestehende Accounts bleiben
  ohne Profil nutzbar; keine Ableitung aus E-Mail-Adressen.
  Schreiben ist auf das eigene Profil beschränkt. Lesen ist für das eigene
  Profil und aktive Mitglieder gemeinsamer aktiver Gruppen erlaubt.
- **Einordnung:** Gemeinsame technische Grundlage, keine Anforderung aus US2.
  Einladungen und Eingabemaske bleiben außerhalb dieses Schritts.
  Die bisherigen Teamentscheidungen und das Austrittsverhalten bleiben erhalten.
- **Alternative:** Separate Profilanlage nach der Registrierung; wegen möglicher
  Konten ohne Profil bei einem Fehler verworfen.
- **Wer:** Mohammad.

Details: [Datenmodell](datenmodell.md) und [Model-API](model-api.md).
