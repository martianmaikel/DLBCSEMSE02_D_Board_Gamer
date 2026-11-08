# Supabase

Das Team nutzt Supabase Cloud. Nur Mohammad (Model) entwickelt zusätzlich lokal mit Docker.
Alle Befehle im Projektordner ausführen.

Das aktuelle Schema steht im [Datenmodell für User Story 1 und 2](datenmodell.md).
Die US2-Erweiterungen sowie Registrierung und Profile als gemeinsame Grundlage wurden lokal geprüft.
Profile sind keine Anforderung aus US2. Die Übertragung in die gemeinsame
Cloud ist ein separater Schritt nach Review und Merge.

## App einrichten

Voraussetzung: Projekt heruntergeladen und `npm ci` ausgeführt
(siehe [README](../README.md#start)).

1. `.env.example` als `.env.local` kopieren; vorhandene Datei bearbeiten statt überschreiben.
2. Die Cloud-URL aus der Vorlage beibehalten und den bereitgestellten Publishable Key verwenden.
3. Den Key bei `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` eintragen und die App starten:

```bash
npm start
```

`.env.local` wird von Git ignoriert. Nach jeder Änderung die App vollständig neu laden.
Für den Team-Alltag ist kein Docker nötig. Die Cloud-Datenbank ist gemeinsam;
Änderungen an Testdaten können auch die anderen betreffen.

## Übergabe an Controller und View

Der Controller importiert die öffentlichen Funktionen und Typen aus `@model`.
Die [Model-API](model-api.md) beschreibt Aufrufe, Berechtigungen, erwartete
Zustandswerte, atomare Speicherung und Fehlerbehandlung.

Aktuelle Gruppenmitgliedschaft erfordert `is_active = true`.
Erhaltene Mitgliedschaftsdatensätze ehemaliger Mitglieder gewähren keinen Zugriff.

Die View bindet Registrierung, Anmeldung und Datenzugriff über den Controller an.
Neue Registrierungen benötigen Benutzername, E-Mail und Passwort. `signUp`
übermittelt den Namen in den Auth-Metadaten; ein Datenbanktrigger legt das Profil
atomar mit dem Konto an. Bestehende Konten ohne Profil bleiben nutzbar.
Der Controller behandelt geworfene Fehler und berechnet die Anwendungslogik
für Hostauswahl, Rotation, Buchungen, Stornierungen, Tausch und Nachfolge.

## Lokal entwickeln · Model

Docker muss laufen. `supabase/config.toml` ist bereits vorhanden; die CLI-Version ist in
`package.json` festgelegt. Eine globale CLI-Installation ist nicht nötig.

```bash
npm run supabase -- start
npm run supabase -- status
```

Studio: [http://127.0.0.1:54323](http://127.0.0.1:54323).
Zum Stoppen `npm run supabase -- stop` ausführen; die lokalen Daten bleiben gespeichert.

Für lokale App-Tests in `.env.local` **beide Werte** ersetzen:

- `EXPO_PUBLIC_SUPABASE_URL`: Adresse aus der Tabelle.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: lokaler Publishable Key aus `status`.

| App läuft …                           | API-Adresse                        |
| ------------------------------------- | ---------------------------------- |
| auf dem Entwicklungsrechner           | `http://127.0.0.1:54321`           |
| auf dem Smartphone im selben Netzwerk | `http://<IPv4-des-Rechners>:54321` |

Auf dem Smartphone nicht `127.0.0.1` verwenden. Die Rechner-IP steht in den
Netzwerkeinstellungen; die Firewall muss Zugriff auf Port `54321` aus dem Testnetz zulassen.

Zurück zur Cloud: URL aus `.env.example` und Cloud-Key eintragen, keine Umgebungen mischen.

## Datenbank ändern · Model

Schemaänderungen als SQL-Migrationen in `supabase/migrations/` festhalten.
Auf einem `model/...`-Branch arbeiten
(siehe [CONTRIBUTING.md](../CONTRIBUTING.md)).

Migration anlegen, zum Beispiel:

```bash
npm run supabase -- migration new create_groups
```

SQL in die erzeugte Datei schreiben und bei laufender lokaler Datenbank anwenden:

```bash
npm run supabase -- migration up --local
```

Nach Schema- oder RPC-Signaturänderungen die öffentlichen Datenbanktypen
neu erzeugen. Beispiel für Bash/WSL:

```bash
if npm run --silent supabase -- gen types typescript --local --schema public > /tmp/board-gamer-types.ts; then
  cp /tmp/board-gamer-types.ts src/model/database.types.ts
  npx --no-install prettier --write src/model/database.types.ts
fi
```

Die temporäre Datei verhindert das Überschreiben der bisherigen Typen bei
fehlgeschlagener Generierung. `--silent` unterdrückt npm-Ausgaben im TypeScript-Inhalt.

Zum Testen des vollständigen Neuaufbaus:

> **Achtung:** Der folgende Befehl löscht alle lokalen Daten. Benötigte Daten vorher sichern.
> Er baut die Datenbank aus den Migrationen neu auf. Automatische Testdaten sind deaktiviert.
> Nicht mit `--linked` ausführen.

```bash
npm run supabase -- db reset --local
```

Verhalten lokal prüfen, `npm run check` und `npm run test:integration` ausführen
und Migrationen mit dem zugehörigen Code zum Review geben.
Bereits angewendete Migrationen nicht nachträglich ändern;
Korrekturen als neue Migrationen anlegen.

Ausnahme in diesem noch nicht gemeinsam verwendeten US2-Arbeitsstand:
Die Dauer wurde am 08.11.2026 in die ursprünglichen lokalen US2-Migrationen
aufgenommen. Die zusätzliche, nicht angewendete Duration-Migration wurde
entfernt und die lokale Testdatenbank vollständig neu aufgebaut.
Die bereits gemeinsam genutzten Migrationen aus `main` bleiben unverändert.
`20261104220141_fix_hosting_conflict_errors.sql` erwartet weiterhin die
ursprünglichen `40001`-Definitionen und ersetzt sie beim Aufbau durch `PT409`.

## Cloud aktualisieren · Model

Einmalig mit Zugriff auf das gemeinsame Supabase-Projekt anmelden und diese Projektkopie verknüpfen:

```bash
npm run supabase -- login
npm run supabase -- link --project-ref dacleuibujwdtydhdkow
```

Den CLI-Anweisungen folgen und bei Bedarf das Datenbankpasswort eingeben.
`link` bestimmt das Cloud-Ziel der CLI; `.env.local` nur die Verbindung der App.

Erst nach Review und Merge vom aktuellen Stand von `main` übertragen. Zunächst prüfen:

```bash
npm run supabase -- db push --dry-run
```

Zielprojekt und angezeigte Migrationen prüfen. Nur wenn alles dem erwarteten Stand entspricht:

> **Achtung:** Dies ändert die gemeinsame Cloud-Datenbank. Vor Änderungen, die Daten löschen
> oder umformen, benötigte Cloud-Daten sichern und das Team informieren.

```bash
npm run supabase -- db push
```

Schemaänderungen nicht direkt im Cloud-Dashboard vornehmen. Bei widersprüchlichen Migrationen
stoppen und die Historien vergleichen, nicht die Cloud zurücksetzen oder Migrationen löschen.

Migrationen übertragen keine Benutzerkonten oder Testdaten.
Nach dem Deployment stellt Mohammad bestätigte Testkonten und eine Testgruppe
mit Mitgliedschaften, Ort und Session-Terminen bereit.
Die Zugangsdaten werden privat geteilt.

Weiterführend:
[Lokale Entwicklung](https://supabase.com/docs/guides/local-development/overview),
[Cloud-Migrationen](https://supabase.com/docs/guides/deployment/database-migrations),
[Expo-Umgebungsvariablen](https://docs.expo.dev/guides/environment-variables/).

## Integrationstests · Model

Die Integrationstests prüfen die Model-Abfragen und geschützten Schreiboperationen
gegen die lokale Supabase-Instanz. Sie benötigen Docker, laufendes Supabase und
die angewendeten lokalen Migrationen.

In `.env.integration.local` die lokalen Werte aus
`npm run supabase -- status -o env` eintragen:

```dotenv
SUPABASE_TEST_URL=http://127.0.0.1:54321
SUPABASE_TEST_ANON_KEY=<lokaler ANON_KEY>
SUPABASE_TEST_SERVICE_ROLE_KEY=<lokaler SERVICE_ROLE_KEY>
```

Die Datei wird von Git ignoriert. Die Tests lassen nur lokale HTTP-Ziele zu.
Der Service-Role-Key wird ausschließlich für Fixtures, Bereinigung und direkte
Integritätsprüfungen verwendet. Die Model-Aufrufe nutzen den Anon-Key mit echten
Benutzersitzungen. Weitere Anfragen ohne Anmeldung prüfen die Zugriffssperre.

```bash
npm run test:integration
```

Die Tests erstellen eigene Daten und entfernen sie anschließend. Sie prüfen:

- Model-Anmeldung, Gruppenfilter, Session-Reihenfolge und zugehörige Orte.
- RLS, gesperrte direkte App-Schreibzugriffe und geschützte RPC-Berechtigungen.
- Aktive und historische Mitgliedschaften, Aufnahme, Austritt und Wiedereintritt.
- Hosting-Positionen, Hostreferenzen, Bestätigung und atomaren Rollback.
- Speichern, Lesen und Ändern der Dauer einschließlich 30 und 1440 Minuten,
  ungültige Werte, `NULL`-Altdaten und unvollständige Snapshots.
- `PT409` bei konkurrierenden Änderungen, auch allein an der Dauer.
- Registrierung mit automatischem Profil, Ablehnung fehlender, leerer und
  unabhängig von Groß-/Kleinschreibung belegter Namen sowie atomaren Rollback.
- Profile, ausdrückliches Anlegen für Altkonten und Umbenennen;
  bestehende Accounts ohne Profil bleiben für Anmeldung und Gruppen nutzbar.
- Profilzugriff für eigene und aktive gemeinsame Mitgliedschaften, Rechteentzug
  nach Austritt, Wiederaufnahme sowie Sperren für Fremde und anonyme Clients.

Die mobile Clientinitialisierung und die Anmeldeoberfläche werden dabei nicht geprüft.
`npm test` und `npm run check` schließen Integrationstests aus und
benötigen keine lokale Supabase-Instanz.

## Lokales Prüfprotokoll · 08.11.2026

Geprüft auf `model/host-rotation` mit der Projekt-CLI `2.122.0` und lokalem
Supabase in Docker. Die folgenden Ergebnisse beziehen sich jeweils auf den
Stand der genannten Änderung.

### Session-Dauer

| Prüfung                                | Ergebnis                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run supabase -- db reset --local` | 18 Migrationen einschließlich der Konfliktkorrektur erfolgreich angewendet.                                                           |
| Generierte Datenbanktypen              | Lokal aus dem Schema `public` erzeugt und formatiert.                                                                                 |
| Schemaprüfung                          | `duration_minutes` ist ein nullable `integer` ohne Standardwert. Erstellen, Bearbeiten und Konfliktprüfung berücksichtigen die Dauer. |
| `npm run check`                        | ESLint, TypeScript und 12 Unit-Tests erfolgreich.                                                                                     |
| `npm run test:integration`             | 46 Tests erfolgreich, einschließlich Dauer, Altdaten, Rollback und Konflikten.                                                        |

### Registrierung und Profile

Die Profil-Migration enthält den Trigger zur automatischen Profilanlage.
Testkonten übergeben Benutzernamen als Metadaten. Die Unit-Tests prüfen
auch die Registrierung mit ausstehender E-Mail-Bestätigung.

| Prüfung                                | Ergebnis                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run supabase -- db reset --local` | 19 Migrationen einschließlich des Registrierungstriggers erfolgreich angewendet.                                      |
| Generierte Datenbanktypen              | Identisch zu `src/model/database.types.ts`.                                                                           |
| `npm run check`                        | ESLint, TypeScript und 16 Unit-Tests erfolgreich.                                                                     |
| `npm run test:integration`             | 64 Tests erfolgreich, einschließlich Profilanlage, Namensprüfung, Rollback und Anmeldung eines Altkontos ohne Profil. |

### Abfrageoptimierung

Die Migration `20261108091030_optimize_membership_and_session_lookups.sql`
ergänzt B-Tree-Indizes auf `memberships (user_id)` und
`sessions (group_id, starts_at)`. Bei der ursprünglichen lokalen Prüfung
der Index-Migration wurden beide Indexdefinitionen ohne Duplikate
verifiziert. RLS-Policies und Mitgliedschaftsprüfungen blieben unverändert.
Der lokale Datenbank-Lint meldete keine Schemafehler.
