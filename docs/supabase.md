# Supabase

Das Team nutzt Supabase Cloud. Nur Mohammad (Model) entwickelt zusätzlich lokal mit Docker.
Alle Befehle im Projektordner ausführen.

Das aktuelle Schema ist im [Datenmodell für User Story 1](datenmodell.md) dargestellt.

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

Der Controller nutzt die Funktionen aus `@model`:

- `signIn(email, password)`: vorhandenes Konto anmelden; liefert `id` und `email`.
- `getGroupsForUser(user.id)`: eigene Gruppen laden.
- `getSessionsForGroup(group.id)`: Sessions mit Ort laden, aufsteigend nach
  `starts_at` sortiert. Der Controller wählt die nächste Session.

Die View bindet Anmeldung und Anzeige über den Controller an.
Lesen erfordert Anmeldung und Gruppenmitgliedschaft. Leere Ergebnisse sind `[]`;
Fehler werden geworfen und im Controller behandelt.

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

Zum Testen des vollständigen Neuaufbaus:

> **Achtung:** Der folgende Befehl löscht alle lokalen Daten. Benötigte Daten vorher sichern.
> Er baut die Datenbank aus den Migrationen neu auf. Automatische Testdaten sind deaktiviert.
> Nicht mit `--linked` ausführen.

```bash
npm run supabase -- db reset --local
```

Verhalten lokal prüfen, `npm run check` ausführen und Migrationen mit dem zugehörigen Code
zum Review geben. Bereits in der Cloud angewendete Migrationen nicht ändern;
Korrekturen als neue anlegen.

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

Die Integrationstests prüfen die Model-Abfragen gegen die lokale
Supabase-Instanz. Sie benötigen Docker, laufendes Supabase und die
angewendeten lokalen Migrationen.

In `.env.integration.local` die lokalen Werte aus
`npm run supabase -- status -o env` eintragen:

```dotenv
SUPABASE_TEST_URL=http://127.0.0.1:54321
SUPABASE_TEST_ANON_KEY=<lokaler ANON_KEY>
SUPABASE_TEST_SERVICE_ROLE_KEY=<lokaler SERVICE_ROLE_KEY>
```

Die Datei wird von Git ignoriert. Der Service-Role-Key wird nur zur
Vorbereitung und Bereinigung der Testdaten verwendet. Die Lesetests verwenden
den Anon-Key mit echten Benutzersitzungen. Weitere Anfragen ohne Anmeldung
prüfen die Zugriffssperre.

```bash
npm run test:integration
```

Die Tests erstellen eigene Daten und entfernen sie anschließend. Sie prüfen
die Model-Anmeldung, Gruppenfilter, Session-Reihenfolge, zugehörige Orte und
RLS einschließlich gesperrter Schreibzugriffe. Die mobile Clientinitialisierung
und die Anmeldeoberfläche werden dabei nicht geprüft.

`npm test` und `npm run check` schließen Integrationstests aus und
benötigen keine lokale Supabase-Instanz.
