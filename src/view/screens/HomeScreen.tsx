import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View, } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack'; 

// Navigationstypen
type RootStackParamList = {
  Startseite: undefined;
  Anmelden: undefined;
  Registrieren: undefined;
  Hauptbereich: undefined;
};  

type HomeScreenProps = NativeStackScreenProps<
    RootStackParamList,
    'Startseite'
>; 

// Startseite
export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../D&D.jpg')}
        style={styles.backgroundImage}
        resizeMode="stretch"
      />

      <View style={styles.content}>
        <Text style={styles.title}>
          Willkommen bei Board Game Terminplaner
        </Text>  

        <View style={styles.homeButtons}>
          <Pressable
            style={styles.button}
            onPress={() => navigation.navigate('Anmelden')}
          >
            <Text style={styles.buttonText}>Anmelden</Text>
          </Pressable>
        </View>
      </View>
  
      <StatusBar style="auto" />
    </View> 
  );
}

// Styles für Startseite
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#940606',
  },

  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,  
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  content: {
    flex: 1,
    justifyContent:'space-between',
    paddingTop: 80,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  homeButtons: {
    alignItems: 'center',
  },

  title: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 37,
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: '#65000C',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  button: {
    width: 200,
    marginTop: 32,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2, 
    borderColor: '#D4AF37',
    backgroundColor: '#65000C',
    alignItems: 'center', 
  },

  buttonText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '600',
  },
});

/* ## Prüfung durch Karin

Der aktuelle HomeScreen benötigt keine Änderung für die Controller-Schnittstelle.
Er zeigt nur die Startseite und navigiert zum Anmelden-Screen.

Die Navigation und das Layout bleiben Aufgabe der View. Die Authentifizierung
wird erst im Anmelden-Screen über `useAuth()` an den Controller angebunden.

Für den HomeScreen fehlen daher keine Controller-Daten. 
*/
