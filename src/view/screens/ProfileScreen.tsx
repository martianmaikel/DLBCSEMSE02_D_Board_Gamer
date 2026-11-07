import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons  from '@expo/vector-icons/Ionicons';  

// Profilseite
export default function ProfileScreen() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Dein Profil</Text>
                <Text style={styles.subtitle}>Dein Charakter im Abenteuer</Text>
            </View>

            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Ionicons name='person-outline' size={42} color='#D8CBB2' />
                </View>

                <Text style={styles.name}>Dein Name</Text>
                <Text style={styles.email}>deine.email@example.com</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kontoeinstellungen</Text>

                <View style={styles.menuItem}>
                    <Ionicons name='person-circle-outline' size={24} color='#344B5E' />
                    <Text style={styles.menuText}>Persönliche Daten</Text>
                    <Ionicons name='chevron-forward' size={20} color='#8A7655' />
                </View>

                <View style={styles.menuItem}>
                    <Ionicons name='notifications-outline' size={24} color='#344B5E' />
                    <Text style={styles.menuText}>Einstellung</Text>
                    <Ionicons name='chevron-forward' size={20} color='#8A7655' />
                </View>
            </View>

            <View style={styles.logoutButton}>
                <Ionicons name='log-out-outline' size={22} color='#8B3A3A' />
                <Text style={styles.logoutText}>Abmelden</Text>
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
    profileCard: {
        marginHorizontal: 20,
        padding: 24,
        backgroundColor: '#FFFCF6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D8CBB2',
        alignItems: 'center',
    },
    avatar: {
        width: 85,
        height: 85,
        borderRadius: 43,
        backgroundColor: '#344B5E',
        justifyContent: 'center',
        alignItems: 'center'
    },
    name: {
        marginTop: 14,
        fontFamily: 'Cinzel_700Bold',
        fontSize: 20,
        color: '#211F1A',
    },
    email: {
        marginTop: 5,
        fontSize: 14,
        color: '#5D584F',
    },
    section: {
        margin: 20,
        padding: 18,
        backgroundColor: '#FFFCF6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D8CBB2'
    },
    sectionTitle: {
        marginBottom: 12,
        fontFamily: 'Cinzel_700Bold',
        fontSize: 17,
        color: '#211F1A',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#E8E0D2',
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        color: '#344B5E',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 30,
        padding: 16,
        backgroundColor: '#FFFCF6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D8CBB2',
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#8B3A3A',
    },
});