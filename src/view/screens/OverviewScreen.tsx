import {Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons'; 

// Übersichtsseite
export default function OverviewScreen() {
  return (
    <View style={styles.overviewContainer}>
      {/* Überschrift */}
      <Text style={styles.overviewTitle}>
        Nächste Sessions
      </Text>

      {/* Bereich, wenn noch keine Gruppe vorhanden ist */}
      <View style={styles.emptyState}>
        <Ionicons 
          name='map-outline' 
          size={125} 
          color='#D8CBB2'
        />

        <Text style={styles.emptyTitle}>
          Noch keine Gruppe 
        </Text>

        <Text style={styles.emptyDescription}>
          Sobald du in einer Gruppe bist, siehst du hier alle kommenden Termine.
        </Text>
      </View>

      {/* Gruppen-Buttons */}
      <View style={styles.createGroupButtons}>
        <Pressable
          style={styles.createGroupButton}
          onPress={() => console.log('Gruppe erstellen')}
        >
          <Text style={styles.plus}>+</Text>

          <Text style={styles.createGroupText}>
            Gruppe erstellen 
          </Text>
        </Pressable>

        <Pressable
          style={styles.joinGroupButton}
          onPress={() => console.log ('Einladungscode eingeben')}
        >
          <Text style={styles.joinGroupText}>
            Mit Einladungscode beitreten
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

//Style für die Übersichtsseite
const styles = StyleSheet.create({
  overviewContainer: {
    flex: 1,
    backgroundColor: '#F4F0E7',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },

  overviewTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 30,
    color: '#211F1A',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  emptyTitle: {
    marginTop: 25,
    fontFamily: 'Cinzel_700Bold',
    fontSize: 27,
    color: '#211F1A',
    textAlign: 'center',
  },

  emptyDescription: {
    marginTop: 18,
    fontSize: 18,
    lineHeight: 27,
    color: '#5D584F',
    textAlign: 'center',
  },

  createGroupButtons: {
    width: '100%',
    gap: 16,
  },

  createGroupButton: {
    minHeight: 92,
    paddingHorizontal: 12,
    backgroundColor: '#31549A',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  plus: {
    color: '#FFFFFF',
    fontSize: 34,
    marginRight: 12,
  },

  createGroupText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: 'bold',
  },

  joinGroupButton: {
    minHeight: 92,
    paddingHorizontal: 12,
    backgroundColor: '#FFFCF6',
    borderWidth: 2,
    borderColor: '#DCCFB8',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  joinGroupText: {
    color: '#211F1A',
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center'
  },
});

/* ## Prüfung durch Karin

Der Empty State für Nutzer:innen ohne Gruppe ist durch
`useUpcomingOverview()` abgedeckt. Bei einer leeren Gruppenliste kann die View
die vorhandene Ansicht anzeigen.

Die beiden Buttons benötigen später folgende Controller-Funktionen:
- „Gruppe erstellen“ → `createGroup(name)`
- „Mit Einladungscode beitreten“ → `joinGroup(code)`

Aktuell verwenden die Buttons noch `console.log`. Das ist für den UI-Entwurf
in Ordnung. Die Navigation beziehungsweise die Eingabeformulare werden später
ergänzt. 
*/
