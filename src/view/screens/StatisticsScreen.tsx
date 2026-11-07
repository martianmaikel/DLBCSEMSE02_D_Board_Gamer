import { ScrollView, StyleSheet, Text, View } from 'react-native';
import  Ionicons  from '@expo/vector-icons/Ionicons';

// Statistikseite
export default function StatisticsScreen() {
    const statistics = [
        {
            id: '1',
            title: 'Spielrunde',
            value: '12',
            description: 'Bisher gespielt',
            icon: 'dice-outline' as const,
        },
        {
            id: '2',
            title: 'Abstimmungen',
            value: '8',
            description: 'Daran teilgenommen',
            icon: 'bar-chart-outline' as const,
        },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Statistik</Text>
                <Text style={styles.subtitle}>Deine Abenteuer auf einen Blick</Text>
            </View>

            <View style={styles.intro}>
                <Ionicons name='trophy-outline' size={30} color='#8A7655' />
                <Text style={styles.introTitle}>Deine bisherigen Erfolge</Text>
                <Text style={styles.introText}>Hier findest du eine Übersicht deiner Aktivitäten und Erlebnisse.</Text>
            </View>

            <View style={styles.statisticsGrid}>
                {statistics.map((item) => (
                    <View key={item.id} style={styles.statCard}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={item.icon} size={25} color='#D8CBB2' />
                        </View>

                        <Text style={styles.statValue}>{item.value}</Text>
                        <Text style={styles.statTitle}>{item.title}</Text>
                        <Text style={styles.statDescription}>{item.description}</Text>
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
        color: '#5D585F',
    },
    intro: {
        marginHorizontal: 20,
        padding: 20,
        backgroundColor: '#FFFCF6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D8CBB2',
        alignItems: 'center',
    },
    introTitle: {
        marginTop: 10,
        fontFamily: 'Cinzel_700Bold',
        fontSize: 18,
        color: '#211F1A',
        textAlign: 'center'
    },
    introText: {
        marginTop: 8,
        fontSize: 14,
        color: '#5D584F',
        textAlign: 'center',
        lineHeight: 21,
    },
    statisticGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: 12,
    },
    statCard: {
        width: '47%',
        flexGrow: 1,
        padding: 16,
        backgroundColor: '#FFFCF6',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D8CBB2',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 58,
        borderRadius: 12,
        backgroundColor: '#344B5E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        marginTop: 12,
        fontFamily: 'Cinzel_700Bold',
        fontSize: 26,
        color: '#344B5E',
    },
    statTitle: {
        marginTop: 4,
        fontSize: 15,
        fontWeight: '600',
        color: '#211F1A',
        textAlign: 'center',
    },
    statDescription: {
        marginTop: 5,
        fontSize: 12,
        color: '#5D584F',
        textAlign: 'center',
    },
    statisticsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: 12,
    },
});

