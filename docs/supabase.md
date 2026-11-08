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

Auch die rein lokale Profil-Migration `20261108085659_add_user_profiles.sql`
enthält den Registrierungstrigger direkt. Nach dieser Ergänzung muss die lokale
Testdatenbank mit `db reset --local` aus dem aktuellen Checkout neu aufgebaut
werden; ein erneutes `migration up` führt die bereits angewendete Datei nicht aus.
Die vorhandene Auth-Konfiguration bleibt unverändert: Lokal ist
`auth.email.enable_confirmations = false`. Bei aktivierter Bestätigung liefert
`signUp` einen Nutzer ohne Sitzung und `requiresEmailConfirmation: true`.

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

Geprüft auf `model/host-rotation` mit der Projekt-CLI `2.122.0` gegen den
Docker-Container `supabase_db_DLBCSEMSE02_D_Board_Gamer`.
Lokales Ziel: Datenbank `postgres`, API `http://127.0.0.1:54321`,
Datenbankport `54322`. Keine Cloud-Änderung und kein Deployment.

| Prüfung                                                                     | Ergebnis                                                                                                                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run supabase -- db reset --local`                                      | Erfolgreich; alle 18 Migrationen einschließlich der Konfliktkorrektur angewendet, ohne zusätzliche Duration-Migration.                                                      |
| `npm run --silent supabase -- gen types typescript --local --schema public` | Erfolgreich; erst in eine temporäre Datei geschrieben, danach `src/model/database.types.ts` ersetzt und mit Prettier formatiert.                                            |
| Lokales Schema per SQL geprüft                                              | `duration_minutes`: nullable `integer`, kein Standardwert; je eine neue öffentliche/private Create- und Update-Signatur; Session-Guard enthält `PT409`, nicht mehr `40001`. |
| `npm run check`                                                             | Erfolgreich: ESLint, TypeScript und 3 Unit-Testsuites mit 12 Tests.                                                                                                         |
| `npm run test:integration`                                                  | Erfolgreich: 6 Testsuites mit 46 Tests einschließlich Dauer, Altdaten, Rollback und Konflikten.                                                                             |
| `git --no-pager diff --check`                                               | Erfolgreich; keine Whitespace-Fehler.                                                                                                                                       |

Die gemeinsamen Entscheidungen und das bisherige Austrittsverhalten wurden
für diesen Abschluss nicht geändert. Controller- und View-Verhalten sind nicht
Gegenstand dieser lokalen Prüfung.

### Ergänzung: Registrierung und Profile

Die rein lokale Profil-Migration enthält nun den Trigger auf `auth.users`.
Alle Fixtures für neue Auth-Konten liefern Benutzernamen als Metadaten.
Die Profiltests simulieren Altkonten durch gezieltes Entfernen ihrer Fixture-Profile
mit dem lokalen Service-Role-Client; der Registrierungstrigger bleibt aktiv.
Die Unit-Tests prüfen beide Rückgabevarianten der Registrierung, auch die
ausstehende E-Mail-Bestätigung. Integrationstests verwenden die unveränderte
lokale Auth-Konfiguration ohne Bestätigungspflicht.

Der erste Integrationslauf bestand 58 von 64 Tests. Sechs neue Fehlerprüfungen
erwarteten fälschlich `error.code = unexpected_failure`. Der lokale Auth-Dienst
liefert diesen Wert zwar im HTTP-Body, das installierte SDK wirft bei HTTP 500
aber einen `AuthRetryableFetchError` ohne `code`. Nach Abgleich mit HTTP-Antwort
und SDK-Quellcode wurden die Erwartungen auf Fehlertyp, Status und Meldung
korrigiert. Der anschließende gezielte Lauf bestand alle sieben Registrierungstests.

Prüfung am Profil-Commit `a3af3f1` während des interaktiven Rebase:

| Prüfung                                                                | Ergebnis                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run supabase -- db reset --local`                                 | Erfolgreich; alle 19 Migrationen aus dem aktuellen Checkout angewendet, einschließlich Profil- und Registrierungstrigger.                                                                                                  |
| Datenbanktypen lokal neu generiert und mit Projekt-Prettier formatiert | Identisch zu `src/model/database.types.ts`; keine Änderung erforderlich.                                                                                                                                                   |
| Lokales Schema per SQL geprüft                                         | Trigger auf `auth.users`, private `SECURITY DEFINER`-Funktion mit leerem `search_path`; nur `postgres` hat Ausführungsrechte. Profil-Lesepolicy unverändert.                                                               |
| `npm run check`                                                        | Erfolgreich: ESLint, TypeScript, 3 Unit-Testsuites mit 16 Tests.                                                                                                                                                           |
| `npm run test:integration`                                             | Abschließender Gesamtlauf erfolgreich: 8 Testsuites mit 64 Tests; Registrierung samt Profil, fehlende/leere und doppelte Namen, Rollback, erneuter Versuch mit derselben E-Mail und Anmeldung eines Altkontos ohne Profil. |
| `git diff --check`                                                     | Erfolgreich; keine Whitespace-Fehler.                                                                                                                                                                                      |

Nur lokale Supabase-Arbeiten; keine Cloud-Änderung und kein Deployment.
Git wurde ausschließlich lesend verwendet. Staging, Amend, Stash und
Fortsetzung des Rebase bleiben beim Menschen.
