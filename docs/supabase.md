# Supabase einrichten

Das Team nutzt Supabase Cloud als gemeinsames Backend. Docker wird nur für die optionale
lokale Datenbankentwicklung benötigt.

## Cloud-Konfiguration

`.env.example` enthält die Projekt-URL. Der Publishable Key wird separat im Team bereitgestellt.
Im Projektordner kopieren:

```bash
cp -n .env.example .env.local
```

Den bereitgestellten Key in `.env.local` bei `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` eintragen.

Falls `.env.local` bereits existiert, die beiden Variablen aus der Vorlage dort ergänzen
oder ihre Werte bei Bedarf anpassen. Der Kopierbefehl überschreibt die vorhandene Datei nicht.

## Lokale Datenbankentwicklung

Voraussetzung: Docker läuft. Im Projektordner starten:

```bash
npx supabase start
npx supabase status
```

Für lokale Tests die Werte in `.env.local` durch die lokale API-Adresse und den lokalen
Publishable Key aus `status` ersetzen.

| Zugriff                           | API-Adresse                        |
| --------------------------------- | ---------------------------------- |
| Vom Entwicklungsrechner           | `http://127.0.0.1:54321`           |
| Vom Smartphone im selben Netzwerk | `http://<IPv4-des-Rechners>:54321` |

Die IPv4-Adresse des aktiven WLAN- oder Ethernet-Adapters lässt sich unter Windows mit
`ipconfig` ermitteln. Sie kann sich bei einem Netzwerkwechsel ändern.

Supabase Studio zur Datenbankverwaltung ist auf dem Entwicklungsrechner unter
`http://127.0.0.1:54323` erreichbar.

Die lokale Datenbank ist unabhängig vom Cloud-Projekt. Änderungen werden nicht automatisch
übertragen.

Zum Beenden die Dienste stoppen. Die Daten bleiben gespeichert:

```bash
npx supabase stop
```
