import { Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// Gruppenseite
export default function GroupsScreen() {
    // Vorläufige Beispieldaten für die Gestaltung
    const groups = [
        {
            id: '1',
            name: 'Die Würfelrunde',
            memberCount: 5,
            nextSession: 'Freitag, 13. November',
            role: 'Gruppenleitung',
        },
        {
            id: '2',
            name: 'Drachenjäger',
            memberCount: 4,
            nextSession: 'Noch kein Termin geplant',
            role: 'Mitglied',
        },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Meine Gruppen</Text>
                <Text style={styles.subtitle}>Deine Abenteuer und Mitspieler</Text>
            </View>

            <View style={styles.groupList}>
                {groups.map((group) => (
                    <View key={group.id} style={styles.groupCard}>
                        <View style={styles.groupHeader}>
                            <View style={styles.iconContainer}>
                                <Ionicons name='people' size={28} color='#D8CBB2' />
                            </View>

                            <View style={styles.groupInfo}>
                                <Text style={styles.groupName}>{group.name}</Text>
                                <Text style={styles.memberCount}>
                                    {group.memberCount} Mitglieder
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailRow}>
                            <Ionicons name='calendar-outline' size={18} color='#8A7655' />
                            <Text style={styles.detailText}>{group.nextSession}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Ionicons name='shield-outline' size={18} color='#8A7655' />
                            <Text style={styles.detailText}>{group.role}</Text>
                        </View>

                        <Pressable 
                            style={styles.detailsButton}
                            onPress={() => console.log('Gruppe öffnen:', group.name)}
                        >
                            <Text style={styles.detailsButtonText}>Gruppe ansehen</Text>
                            <Ionicons name='chevron-forward' size={18} color='#F4F0E7' />
                        </Pressable>
                    </View>
                ))}
            </View>

            <View style={styles.actions}>
                <Pressable
                    style={styles.createButton}
                    onPress={() => console.log('Gruppe erstellen')}
                >
                    <Ionicons name='add-circle-outline' size={22} color='#F4F0E7' />
                    <Text style={styles.createButtonText}>Gruppe erstellen</Text>
                </Pressable>

                <Pressable
                    style={styles.joinButton}
                    onPress={() => console.log('Einladungscode eingeben')}
                >
                    <Ionicons name='key-outline' size={20} color='#8A7655' />
                    <Text style={styles.joinButtonText}>Mit Einladungscode beitreten</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

// Styles
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
        fontSize: 28,
        color: '#211F1A'
    },
    subtitle: {
        marginTop: 6,
        fontSize: 15,
        color: '#5D584F'
    },
    groupList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    groupCard: {
        padding: 18,
        backgroundColor: '#FFFCF6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D8CBB2',
    },
    groupHeader: {
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
    groupInfo: {
        flex: 1,
        marginLeft: 14,
    },
    groupName: {
        fontFamily: 'Cinzel_700Bold',
        fontSize: 18,
        color: '#211F1A',
    },
    memberCount: {
        marginTop: 4,
        fontSize: 14,
        color: '#5D584F',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5DCCB',
        marginVertical: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 9,
    },
    detailText: {
        fontSize: 14,
        color: '#4F493F',
    },
    detailsButton: {
        marginTop: 8,
        padding: 12,
        borderRadius: 9,
        backgroundColor: '#344B5E',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    detailsButtonText: {
        color: '#F4F0E7',
        fontSize: 14,
        fontWeight: '600',
    },
    actions: {
        padding: 20,
        gap: 12,
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
    joinButton: {
        borderWidth: 1,
        borderColor: '#B8A98F',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
    },
    joinButtonText: {
        color: '#5D584F',
        fontSize: 15,
        fontWeight: '600',
    },
});
