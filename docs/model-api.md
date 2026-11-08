# Model-API – User Story 1 und 2 und gemeinsame Grundlagen

Stand: 08.11.2026. US2 ist auf dem Feature-Branch lokal implementiert und getestet.
Profile sind eine zusätzliche gemeinsame technische Grundlage, keine US2-Anforderung.

Der Controller importiert ausschließlich aus `@model`.
Die öffentliche Schnittstelle ist in [src/model/index.ts](../src/model/index.ts)
definiert; das [Datenmodell](datenmodell.md) beschreibt Felder und Beziehungen.

## Identität und Zugriff

Aufrufe verwenden die Sitzung des angemeldeten Nutzers.
Lesezugriffe unterliegen RLS; geschützte Schreiboperationen prüfen die
Berechtigung serverseitig. Direkte Tabellenänderungen aus der App sind gesperrt.

`userId` bezeichnet `auth.users.id`.
Host-, Administrator-, Positions- und Nachfolgerreferenzen verwenden dagegen
`memberships.id`.

Eine aktuelle Mitgliedschaft erfordert `is_active = true`.
Erhaltene Datensätze ehemaliger Mitglieder belegen keine aktuelle Mitgliedschaft.

## Registrierung, Anmeldung und Lesen

| Funktion                                       | Ergebnis und Bedeutung                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `signUp({ username, email, password })`        | `SignUpResult`; registriert einen Account und legt dessen Profil atomar an.                                |
| `signIn(email, password)`                      | `AuthUser`; meldet einen bestehenden Account an.                                                           |
| `getGroupsForUser(userId)`                     | `Group[]`; Gruppen über aktive Mitgliedschaften des angegebenen Nutzers, soweit für den Aufrufer sichtbar. |
| `getActiveMembersForGroup(groupId)`            | `Membership[]`; aktive Mitglieder, nach Position aufsteigend, `NULL` zuletzt, danach nach ID sortiert.     |
| `getMembersForGroupIncludingInactive(groupId)` | `Membership[]`; einschließlich ehemaliger Mitglieder, nach ID sortiert.                                    |
| `isActiveGroupMember(groupId, userId)`         | `boolean`; prüft eine aktive, für den Aufrufer sichtbare Mitgliedschaft.                                   |
| `getSessionsForGroup(groupId)`                 | `SessionWithLocation[]`; alle Status, mit `location`, nach `starts_at` aufsteigend.                        |

Listen liefern bei fehlenden sichtbaren Treffern `[]`.
Aktuelle Mitglieder dürfen sämtliche Mitgliedschaften ihrer Gruppe lesen,
einschließlich inaktiver historischer Datensätze.
Ausgetretene Mitglieder verlieren den Zugriff auf diese Gruppendaten.

### Registrierung

`SignUpInput` verlangt `username`, `email` und `password` als Strings.
`SignUpResult` enthält `user: AuthUser` mit `id` und `email` sowie
`requiresEmailConfirmation: boolean`. Zugangstokens werden nicht zurückgegeben.
Die Sitzung verwaltet der bestehende Supabase-Client.

```ts
import { signUp, type SignUpResult } from '@model';

const registration: SignUpResult = await signUp({
  username: 'Wuerfelmagier',
  email: 'spieler@example.com',
  password: enteredPassword,
});

if (registration.requiresEmailConfirmation) {
  // Ask the user to confirm their email before signing in.
}
```

Der Benutzername wird als `options.data.username` an Supabase Auth übergeben.
Ein Trigger auf `auth.users` entfernt äußeren Leerraum und legt das Profil
in derselben Datenbanktransaktion an. Fehlende, leere oder bereits belegte
Benutzernamen verhindern die Kontoanlage, auch bei direkten Auth-Aufrufen.
Schlägt die Profilanlage fehl, bleibt kein neues Konto ohne Profil zurück.
Supabase reicht solche Datenbankfehler als Auth-Fehler weiter, nicht als
SQL-Fehlercode `22023` oder `23505`. Lokal wirft das verwendete SDK einen
`AuthRetryableFetchError` mit `status: 500`, der Meldung
`Database error saving new user` und ohne `code`. Damit lassen sich fehlende
und belegte Namen im Controller nicht anhand eines SQL-Fehlercodes unterscheiden.

Die bestehenden Auth-Einstellungen entscheiden über die E-Mail-Bestätigung.
Bei erforderlicher Bestätigung ist eine erfolgreiche Registrierung mit
`requiresEmailConfirmation: true` noch keine Anmeldung; Supabase liefert keine
Sitzung. Ohne Bestätigungspflicht liefert Supabase eine Sitzung und der Wert ist
`false`. Lokal ist `auth.email.enable_confirmations = false`; die Konfiguration
wird durch `signUp` nicht geändert. Die Registrierungsmaske und ihre Anbindung
bleiben Aufgabe von Controller und View.

Grundlagen: Supabase-Dokumentation zur [Profilanlage](https://supabase.com/docs/guides/auth/managing-user-data)
und [E-Mail-Bestätigung](https://supabase.com/docs/guides/auth/general-configuration).

## Profile

`Profile` enthält `id: string` (die Auth-Nutzer-ID) und `username: string`.

| Funktion                                   | Ergebnis und Bedeutung                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `getOwnProfile()`                          | `Profile \| null`; liest das eigene Profil. `null` bedeutet angemeldet, aber noch kein Profil angelegt.          |
| `saveOwnProfile(username)`                 | `Profile`; legt ausschließlich das eigene Profil an oder ändert dessen Benutzernamen.                            |
| `getActiveMemberProfilesForGroup(groupId)` | `Profile[]`; vorhandene Profile aktiver Mitglieder einer eigenen aktiven Gruppe, nach `id` aufsteigend sortiert. |

Alle drei Aufrufe benötigen eine Anmeldung. `getOwnProfile` prüft den Nutzer
über Supabase Auth. Die beiden anderen Funktionen verwenden die RPCs
`save_own_profile` und `get_active_member_profiles`.

`saveOwnProfile` entfernt äußeren Leerraum. Leere und reine Leerraum-Namen
werden mit `22023` abgelehnt. Bereits belegte Namen liefern `23505`, auch bei
anderer Groß-/Kleinschreibung. Eine reine Änderung der Schreibweise des eigenen
Namens ist erlaubt. Neue Registrierungen erhalten ihr Profil automatisch.
Bestehende Konten ohne Profil können es weiterhin über `saveOwnProfile` anlegen.
Es gibt weder automatische Nachbefüllung noch E-Mail-basierte Ersatznamen.

RLS erlaubt das eigene Profil sowie Profile von Personen mit mindestens einer
gemeinsamen Gruppe, in der beide aktiv sind. Die Gruppenabfrage ist zusätzlich
auf aktive Mitglieder der angefragten eigenen Gruppe beschränkt. Ohne sichtbare
Treffer oder eigene aktive Mitgliedschaft liefert sie `[]`. Mitglieder ohne
Profil fehlen in dieser Liste; ihre Mitgliedschaften bleiben über die bisherigen
Mitgliedschaftsfunktionen abrufbar. Der Controller muss fehlende Namen behandeln.

Direktes Schreiben und Löschen von Profilen bleibt gesperrt, auch für das eigene
Profil und für Gruppenadministratoren. Einladungen und UI sind nicht Teil
dieser Schnittstellenergänzung.

## Geschützte Schreiboperationen

| Funktion                                                       | Berechtigung und Ergebnis                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createGroup(name)`                                            | Angemeldeter Nutzer; erstellt Gruppe, eigene aktive Mitgliedschaft und Administration gemeinsam. Liefert `Group`.                                    |
| `setHostingWillingness(input)`                                 | Aktuelles Mitglied für die eigene Mitgliedschaft. Liefert `Membership`.                                                                              |
| `saveHostPositions(groupId, changes)`                          | Gruppenadministrator; speichert vorgegebene Positionen gemeinsam. Liefert die geänderten `Membership[]`.                                             |
| `admitGroupMember(input)`                                      | Gruppenadministrator; nimmt einen bestehenden Auth-Nutzer auf oder reaktiviert dessen Mitgliedschaft. Liefert `Membership`.                          |
| `leaveGroup(input)`                                            | Aktuelles Mitglied für den eigenen Austritt; speichert gegebenenfalls die Administrationsnachfolge gemeinsam. Liefert die deaktivierte `Membership`. |
| `createSession(input)`                                         | Gruppenadministrator; erstellt eine geplante Session. Liefert `Session`.                                                                             |
| `updateSession(input)`                                         | Gruppenadministrator; bearbeitet eine geplante Session. Liefert `Session`.                                                                           |
| `cancelSession(expectedSession, positionChanges?)`             | Gruppenadministrator; storniert eine geplante Session. Liefert `Session`.                                                                            |
| `designateActualHost(expectedSession, actualHostMembershipId)` | Gruppenadministrator; benennt den tatsächlichen Host einer geplanten Session, ohne sie abzuschließen. Liefert `Session`.                             |
| `confirmSession(expectedSession)`                              | Aktuelles Mitglied, das als tatsächlicher Host benannt ist; ohne Benennung der geplante Host. Liefert die abgeschlossene `Session`.                  |

Bearbeiten, Stornieren, Benennen und Bestätigen erfordern `status = scheduled`.
Ein neuer oder neu zugewiesener geplanter Host muss aktiv und hostingbereit sein.
Ein benannter tatsächlicher Host muss aktiv sein; Hosting-Bereitschaft ist dafür
nicht erforderlich.

## Eingaben und erwarteter Zustand

Die exportierten Eingabetypen stehen in
[memberships.ts](../src/model/memberships.ts) und
[sessions.ts](../src/model/sessions.ts).

### Hosting-Bereitschaft und Positionen

`HostingWillingnessInput` enthält `groupId`, `newWillingness` und
`expectedWillingness`. Das Abschalten leert die eigene Position.
Das Einschalten weist keine Position zu.

Ein `HostPositionChange` enthält:

- `membershipId`
- `expectedPosition`: bisherige Position oder `null`
- `newPosition`: neue positive Position oder `null`

`saveHostPositions` benötigt eine nicht leere Änderungsliste mit eindeutigen
Mitgliedschafts-IDs. Alle Zielmitglieder müssen aktiv, hostingbereit und
Mitglieder derselben Gruppe sein. Nicht aufgeführte Positionen bleiben erhalten.

### Aufnahme und Wiedereintritt

`AdmitGroupMemberInput` enthält `groupId`, `userId` und `expectedMembership`.

- `null` erwartet, dass noch keine Mitgliedschaft existiert.
- Bei vorhandener Mitgliedschaft werden `id`, `is_active` und `joined_at`
  des zuletzt gelesenen Zustands übergeben.
- Eine passende aktive Mitgliedschaft wird unverändert zurückgegeben.
- Eine inaktive Mitgliedschaft wird mit derselben ID reaktiviert.
  `joined_at` beginnt neu, die bisherige Hosting-Bereitschaft bleibt erhalten
  und `host_position` bleibt `null`.
- Eine frühere Administratorrolle wird nicht wiederhergestellt.

Die Aufnahme setzt einen bestehenden Auth-Account voraus.
Öffentliche Gruppensuche, Selbstbeitritt und Beitrittsanfragen sind in dieser
Schnittstelle nicht implementiert.

### Austritt und Administrationsnachfolge

`LeaveGroupInput` enthält:

- `groupId`
- `expectedJoinedAt`: Beginn der aktuellen Mitgliedschaftsperiode
- `expectedAdminMembershipId`: zuletzt gelesene Administratorreferenz
- `successorMembershipId`: ausgewählte Nachfolgermitgliedschaft oder `null`

Bei `null` in einem der beiden Erwartungswerte bricht die Model-Funktion ab.
Legacy-Daten benötigen daher eine geklärte Datenbasis.

Nur der austretende Administrator darf einen Nachfolger übergeben.
Solange andere aktive Mitglieder bleiben, muss dieser eine andere aktive
Mitgliedschaft derselben Gruppe sein. Beim Austritt des letzten Mitglieds
wird die Administratorreferenz geleert.

Der Controller wählt den vereinbarten Nachfolger aus.
Der optionale freiwillige Transfer per Anfrage und Annahme ist zurückgestellt.

### Session-Eingaben

`CreateSessionInput` enthält `groupId`, `plannedHostMembershipId`, `startsAt`,
`durationMinutes`, `location` und optional `positionChanges`.

`UpdateSessionInput` enthält `expectedSession`, `plannedHostMembershipId`,
`startsAt`, `durationMinutes`, `location` und optional `positionChanges`.

`durationMinutes` ist bei beiden Aufrufen erforderlich: eine ganze Zahl von
30 bis 1440 Minuten einschließlich der Grenzen. Das Model übergibt sie als
`session_duration_minutes` an die jeweilige RPC. Es gibt keinen Standardwert.
`Session` und `SessionWithLocation` enthalten `duration_minutes: number | null`.
`getSessionsForGroup` liest diesen Wert mit; alte Sessions ohne bekannte Dauer
bleiben lesbar. Beim Bearbeiten ist auch für sie ein gültiger Wert erforderlich.

Zeitwerte werden als ISO-8601-Zeichenketten mit Zeitzone übergeben.
`SessionLocationInput` wählt genau eine Variante:

- `{ kind: 'existing', locationId }`
- `{ kind: 'new', address }`

`expectedSession` ist der zuletzt gelesene Session-Datensatz.
Die Speicheroperation vergleicht dessen `starts_at`, `duration_minutes`, `location_id`,
`planned_host_membership_id`, `actual_host_membership_id` und `status`
mit dem aktuellen Datenbankzustand.
Dieser gemeinsame Snapshot gilt für Bearbeiten, Absagen, Benennen des tatsächlichen
Hosts und Bestätigen. Der Schlüssel `duration_minutes` muss enthalten sein; `null`
ist für alte Sessions zulässig. Eine zwischenzeitliche Änderung nur der Dauer
führt ebenfalls zu `PT409`. Danach neu laden, statt mit dem alten Snapshot
fortzufahren.

## Atomare Speicherung und Controller-Verantwortung

Gruppenerstellung, Positionsänderungen und Session-Bestätigung werden jeweils
als zusammengehörige Speicheroperation ausgeführt.

Erstellen, Bearbeiten und Stornieren einer Session können optionale
`positionChanges` mitspeichern. Schlägt ein Teil fehl, werden auch Session-,
Positions- und gegebenenfalls neue Ortsdaten zurückgerollt.

`confirmSession` speichert tatsächlichen Host und `completed` gemeinsam.
Der geplante Host bleibt erhalten. Die Operation verändert keine Positionen.

Der Controller berechnet Hostauswahl, Rotationsfortschritt, Reservierungen,
Stornierungsfolgen, Tausch und Nachfolgeauswahl anhand der vorhandenen Daten.
Ein vergangener Termin allein bestätigt keine Durchführung.
Mehrere zukünftige Sessions sind zulässig; Positionsänderungen weisen deren
gebuchte Hosts nicht automatisch neu zu.

## Fehlerbehandlung

Die Model-Funktionen werfen Fehler; der Controller behandelt sie.

| Code    | Bedeutung                                                        |
| ------- | ---------------------------------------------------------------- |
| `42501` | Anmeldung oder Berechtigung fehlt.                               |
| `22023` | Ungültige Eingabe oder für diese Operation unzulässiger Zustand. |
| `PT409` | Ein erwarteter Zustandswert ist veraltet.                        |
| `23503` | Fremdschlüssel verletzt.                                         |
| `23505` | Eindeutigkeit verletzt.                                          |
| `23514` | CHECK-Bedingung verletzt.                                        |

Eine fehlende Dauer wird bereits vom TypeScript-Eingabetyp ausgeschlossen.
Direkte RPC-Aufrufe mit `NULL` oder ganzzahligen Werten außerhalb des Bereichs
liefern `22023`. Nicht ganzzahlige Werte scheitern am SQL-Typ `integer`
(`22P02`); bei fehlendem Pflichtargument findet PostgREST keine passende
RPC-Signatur (`PGRST202`).

Nach `PT409` aktuelle Daten neu laden und die beabsichtigte Änderung im
Controller erneut prüfen beziehungsweise berechnen. Dieselbe veraltete
Änderung nicht blind wiederholen.

Zusätzlich können Authentifizierungs-, Transport- und gewöhnliche
Model-Fehler auftreten. Die Tabelle ist keine abschließende Fehlerliste.
