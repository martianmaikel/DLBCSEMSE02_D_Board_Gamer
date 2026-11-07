import { StyleSheet, Text, View } from 'react-native';

//Eigenschaften de Platzhalter-Komponente
type PlaceholderScreenProps = { 
  title: string;
};

//WIederverwendbare Platzhalter-Seite
export default function PlaceholderScreen({ 
  title,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>
        {title}
      </Text>

      <Text style={styles.placeholderSubText}>
        Diese Seite ist noch nicht implementiert.
      </Text> {/* Später implementieren */}
    </View>
  );
} 

//Styles
const styles = StyleSheet.create({
    placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F4F0E7',
  },

  placeholderTitle: {
    marginBottom: 16,
    fontFamily: 'Cinzel_700Bold',
    fontSize: 30,
    color: '#211F1A',
    textAlign: 'center'
  },

  placeholderSubText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5D584F',
    textAlign: 'center',
  },
});