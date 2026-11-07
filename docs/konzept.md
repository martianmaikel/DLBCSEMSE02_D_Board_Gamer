# Konzept: D&D-Terminplaner

Abwandlung von Aufgabenstellung 1.2 (Board-Gamer-App). Themenwahl inkl. Erweiterungen vom Tutor
freigegeben (Oktober 2026).

## Ziel

Spielgruppen für Dungeons & Dragons treffen sich regelmäßig an wechselnden Orten. Die App
organisiert diese Termine: wer spielt wann und wo, wer ist Gastgeber:in, was wird gespielt.
Nutzer:innen können mehreren Gruppen angehören, die App warnt bei Terminüberschneidungen.

## User Stories

| #   | User Story (D&D-Kontext)                                                                                               | Status                |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | Als Spieler:in will ich pro Gruppe und gesammelt den nächsten Session-Termin mit Zeit und Ort sehen.                   | Pflicht               |
| 2   | Als Spieler:in will ich, dass der Gastgeber-Ort in der Gruppe rotiert, damit der Aufwand fair verteilt ist.            | Pflicht               |
| 3   | Als Spieler:in will ich Inhalte für die nächste Session vorschlagen (One-Shot, Abenteuermodul, Kampagnen-Schwerpunkt). | Pflicht               |
| 4   | Als Spieler:in will ich vor dem Termin über die Vorschläge abstimmen.                                                  | Pflicht               |
| 5   | Als Spieler:in will ich nach der Session Gastgeber:in, Verpflegung und Abend bewerten.                                 | Pflicht               |
| 6   | Als Spieler:in will ich allen Gruppenmitgliedern schnell melden können, dass ich später komme.                         | Pflicht               |
| 7   | Als Spieler:in will ich rechtzeitig erinnert werden, meine Essensrichtung zu wählen.                                   | Optional              |
| 8   | Als Gastgeber:in will ich rechtzeitig die mehrheitliche Essensrichtung erfahren, um einen Lieferdienst auszusuchen.    | Optional              |
| 9   | Als Spieler:in will ich das Menü des gewählten Lieferdienstes sehen, um meine Bestellung zu übermitteln (ggf. Stub).   | Optional              |
| E1  | Als Spieler:in in mehreren Gruppen will ich vor Terminüberschneidungen gewarnt werden.                                 | Pflicht (Erweiterung) |
| E2  | Als Spieler:in will ich eine Statistik sehen, wo die meisten Termine stattfanden.                                      | Pflicht (Erweiterung) |

Optionale Stories nur, wenn Zeit bleibt.

## Annahmen (im Bericht dokumentieren)

- Eine Gruppe hat ca. 3 bis 8 Mitglieder, eine Person kann in beliebig vielen Gruppen sein.
- Jede Person hat einen Account (einfache Registrierung genügt).
- Der Gastgeber-Turnus rotiert in fester Reihenfolge, Ausfall oder Tausch ist manuell möglich.
- Ein Termin hat Start, Dauer und Ort (Adresse der Gastgeber:in oder Freitext).
- Überschneidung = zeitliche Überlappung zweier Termine derselben Person in verschiedenen Gruppen.
- Die Statistik bezieht sich auf stattgefundene Termine, gruppiert nach Ort.
- Benachrichtigungen erfolgen per Push.

## Offene Punkte

| Thema                     | Frage                                                                                           | Zuständig  |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Navigation                | Expo Router (empfohlen) oder React Navigation?                                                  | View       |
| Spielleiter vs. Gastgeber | Bei D&D leitet meist dauerhaft dieselbe Person (DM), der Gastgeber rotiert. Eigenes Rollenfeld? | Team       |
| Kampagne vs. One-Shot     | Abstimmung über Inhalte ist bei laufender Kampagne schwach. Gruppentyp mit/ohne Abstimmung?     | Team       |
| Kollisionsdefinition (E1) | Reine Zeitüberlappung (testbar) oder auch zu kurzer Abstand inkl. Anfahrt?                      | Controller |
| Lieferdienst-Menü (US 9)  | Stub mit Dummy-Menüs oder weglassen?                                                            | Team       |

## Bericht

Aufteilung (Vorschlag, noch nicht final): Karin Einleitung + View, Maikel Controller, Mohammad
Model + Schluss. Umfang ca. 7 Seiten Textteil pro Person, bei Bedarf ausgleichen.
Berichtsentwürfe gehören nicht in dieses öffentliche Repo.
