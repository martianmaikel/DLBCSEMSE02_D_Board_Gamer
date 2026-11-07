import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';


// Abstimmungseite
export default function VotingScreen() {
    const votes = [
        {
            id: '1',
            title: 'Nächster Spieltermin',
            description: 'Wann treffen wir uns zum nächsten Abenteuer?',
            options: 'Freitag oder Samstag',
            status: 'Offen',
        },
        {
            id: '2',
            title: 'Abenteuer auswählen',
            description: 'Welches Abenteuer spielen wir als Nächstes?',
            options: 'Der Drachenhort oder Der dunkle Wald',
            status: 'Offen',
        },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Abstimmungen</Text>
                <Text style={styles.subtitle}>Entscheide gemeinsam mit deiner Gruppe</Text>
            </View>

            <View style={styles.voteList}>
                {votes.map((vote) => (
                    <View key={vote.id} style={styles.voteCard}>
                        <View style={styles.voteHeader}>
                            <View style={styles.iconContainer}>
                                <Ionicons name='people-outline' size={26} color='#D8CBB2' />
                            </View>

                            <View style={styles.voteInfo}>
                                <Text style={styles.voteTitle}>{vote.title}</Text>
                                <Text style={styles.status}>{vote.status}</Text>
                            </View>
                        </View>

                        <Text style={styles.description}>{vote.description}</Text>
                        <Text style={styles.options}>{vote.options}</Text>

                        <Pressable
                            style={styles.voteButton}
                            onPress={() => console.log('Abstimmung öffnen:', vote.title)}
                        >
                            <Text style={styles.voteButtonText}>Jetzt abstimmen</Text>
                            <Ionicons name='chevron-forward' size={18} color='#F4F0E7' />
                        </Pressable>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
 }

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#F4F0E7',
        },
        header: {
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 20,
        },
        title: {
            fontFamily: 'Cinzel_700Bold',
            fontSize: 30,
            color: '#211F1A',
        },
        subtitle: {
            marginTop: 6,
            fontSize: 15,
            color: '#5D584F',
        },
        voteList: {
            paddingHorizontal: 20,
            gap: 16,
        },
        voteCard: {
            padding: 18,
            backgroundColor: '#FFFCF6',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#D8CBB2',
        },
        voteHeader: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        iconContainer: {
            width: 52,
            height: 52,
            borderRadius: 12,
            backgroundColor: '#344B5E',
            justifyContent: 'center',
            alignItems: 'center',
        },
        voteInfo: {
            flex: 1,
            marginLeft: 14,
        },
        voteTitle: {
            fontFamily: 'Cinzel_700Bold',
            fontSize: 17,
            color: '#211F1A',
        },
        status: {
            marginTop: 4,
            fontSize: 13,
            color: '#8A7655',
        },
        description: {
            marginTop: 16,
            fontSize: 14,
            color: '#5D584F',
        },
        options: {
            marginTop: 8,
            fontSize: 14,
            fontWeight: '600',
            color: '#344B5E',
        },
        voteButton: {
            marginTop: 16,
            padding: 12,
            borderRadius: 9,
            backgroundColor: '#344B5E',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
        },
        voteButtonText: {
            color: '#F4F0E7',
            fontSize: 14,
            fontWeight: '600',
        },
        actions: {
            padding: 20,
            marginBottom: 20,
        },
        createButton: {
            backgroundColor: '#344B5E',
            padding: 15,
            borderRadius: 10,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 9,
        },
        createButtonText: {
            color: '#F4F0E7',
            fontSize: 15,
            fontWeight: '600',
        },
    });