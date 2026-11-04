import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { NavigationContainer} from '@react-navigation/native'; 

import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; 

import  Ionicons from '@expo/vector-icons/Ionicons';  

import { useFonts } from 'expo-font';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';

// Typen
type User = {
  username: string;
  email: string;
  password: string;
};

type RootStackParamList = {
  Startseite: undefined;
  Anmelden: undefined;
  Registrieren: undefined;
  Hauptbereich: undefined;
};  

type TabParamList = {
  Übersicht: undefined;
  Gruppen: undefined;
  Abstimmung: undefined;
  Statistik: undefined;
  Profil: undefined;
};

// Navigation
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Startseite
type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Startseite'>; 

function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('./D&D.jpg')}
        style={styles.backgroundImage}
        resizeMode="stretch"
      />

      <View style={styles.content}>
        <Text style={styles.title}>Willkommen bei Board Game Terminplaner</Text>  

        <View style={styles.homeButtons}>
          <Pressable
            style={styles.button}
            onPress={() => navigation.navigate('Anmelden')}
          >
            <Text style={styles.buttonText}>Anmelden</Text>
          </Pressable>
        
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Registrieren')}
          >
            <Text style={styles.secondaryButtonText}>Registrieren
            </Text>
          </Pressable>
         </View>
      </View>
  
      <StatusBar style="auto" />
    </View> 
  );
}

//Anmelden-Screen
type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Anmelden'
> & { users: User[];
};

function LoginScreen({ navigation, users }: LoginScreenProps) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function handleLogin() {
    setErrorMessage('');

    const loginValue = loginInput.trim().toLowerCase();

    const foundUser = users.find(
      (user) =>
        (user.email.toLocaleLowerCase() === loginValue || 
          user.username.toLocaleLowerCase() === loginValue) &&
        user.password === passwordInput
    );

    if (!foundUser) {
      setErrorMessage('Benutzername/E-Mail oder Passwort ist falsch.'); 
      return;
    }

    navigation.navigate('Hauptbereich');
  }   

  function handleForgotPassword() {
    setErrorMessage('Die Passwort-vergessen-Funktion ist noch nicht implementiert.');
  }

  return (
    <ScrollView 
      contentContainerStyle={styles.formContainer} 
      keyboardShouldPersistTaps='handled'
    >
      <Text style={styles.formTitle}>Anmelden</Text>
      <Text style={styles.label}>E-Mail oder Benutzername</Text>
      <TextInput
        style={styles.input}
        placeholder='E-Mail oder Benutzername'
        placeholderTextColor='#999 '
        value={loginInput}
        onChangeText={setLoginInput}
        autoCapitalize='none'
        autoCorrect={false}
        autoComplete='username'
      />

      <Text style={styles.label}>Passwort:</Text>
      <TextInput
        style={styles.input}
        placeholder='Passwort'
        placeholderTextColor='#999'
        value={passwordInput}
        onChangeText={setPasswordInput}
        secureTextEntry
        autoCapitalize='none'
        autoComplete='password'
      />

      {errorMessage !== '' && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    
      <Pressable
        style={styles.formButton}
        onPress={handleLogin}
      >
        <Text style={styles.formButtonText}>Anmelden</Text>
      </Pressable>

      <Pressable onPress={handleForgotPassword}>
        <Text style={styles.forgotPassword}>Passwort vergessen?</Text>
      </Pressable>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Noch kein Konto?</Text>
        
        <Pressable
          onPress={() => navigation.navigate('Registrieren')}
        >
          <Text style={styles.switchLink}> Jetzt registrieren</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Registrieren-Screen
type RegisterScreenProps = NativeStackScreenProps< RootStackParamList,'Registrieren' 
> & { 
  users: User[]; 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>; 
};

function RegisterScreen({ navigation, users, setUsers, }: RegisterScreenProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function handleRegister() {
    setErrorMessage('');

    const username = usernameInput.trim();
    const email = emailInput.trim().toLowerCase();

    if (
      username === '' || 
      email === '' || 
      passwordInput === '' || 
      repeatPassword === ''
    ) {
      setErrorMessage('Bitte füllen Sie alle Felder aus.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }  

    if (passwordInput.length < 6) {
      setErrorMessage('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    } 

    if (passwordInput !== repeatPassword) {
      setErrorMessage('Die Passwörter stimmen nicht überein.');
      return;
    }

    const usernameExists = users.some((user) => user.username.toLowerCase() === username.toLowerCase());
    const emailExists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

    if (usernameExists) {
      setErrorMessage('Der Benutzername ist bereits vergeben.');
      return;
    }

    if (emailExists) {
      setErrorMessage('Die E-Mail-Adresse ist bereits registriert.');
      return;
    } 

    const newUser: User = {
      username,
      email,
      password: passwordInput,
    };

    setUsers((currentUsers) => [...currentUsers, newUser, ]);

    navigation.replace('Hauptbereich');
  } 

  return (
    <ScrollView contentContainerStyle={styles.formContainer}
    keyboardShouldPersistTaps='handled'
    >
      <Text style={styles.formTitle}>Registrieren</Text>
      <Text style={styles.label}>Benutzername</Text>

      <TextInput
        style={styles.input}
        placeholder='Benutzername'
        placeholderTextColor='#999 '
        value={usernameInput}
        onChangeText={setUsernameInput}
        autoCapitalize='none'
        autoCorrect={false}
        autoComplete='username'
      />

      <Text style={styles.label}>E-Mail-Adresse</Text>
      <TextInput
        style={styles.input}
        placeholder='E-Mail-Adresse'
        placeholderTextColor='#999'
        value={emailInput}
        onChangeText={setEmailInput}
        autoCapitalize='none'
        autoCorrect={false}
        keyboardType='email-address'
        autoComplete='email'
      />

      <Text style={styles.label}>Passwort</Text>
      <TextInput
        style={styles.input}
        placeholder='Passwort'
        placeholderTextColor='#999'
        value={passwordInput}
        onChangeText={setPasswordInput}
        secureTextEntry
        autoCapitalize='none'
        autoComplete='new-password'
      />

      <Text style={styles.label}>Passwort bestätigen:</Text>
      <TextInput
        style={styles.input}
        placeholder='Passwort bestätigen'
        placeholderTextColor='#999'
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        secureTextEntry
        autoCapitalize='none'
        autoComplete='new-password'
      />

        {errorMessage !== '' && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <Pressable 
          style={styles.formButton}
          onPress={handleRegister}
        >
          <Text style={styles.formButtonText}>Konto erstellen</Text>
        </Pressable>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>Bereits ein Konto?</Text>
          
          <Pressable
            onPress={() => navigation.navigate('Anmelden')}
          >
            <Text style={styles.switchLink}> Jetzt anmelden</Text>
          </Pressable>
        </View>

        <StatusBar style="auto" />
      </ScrollView>
    );
  }

//Tab-Seiten
function OverviewScreen() {
  return (
    <View style={styles.overviewContainer}>
      {/* Überschrift */}
      <Text style={styles.overviewTitle}>
        Nächste Sessions
      </Text>

      {/* Bereich, wenn noch keine Gruppe vorhanden ist */}
      <View style={styles.emptyState}>
        <Ionicons name="map-outline" size={125} color='#D8CBB2'
        />
        <Text style={styles.emptyTitle}>
          Noch keine Gruppe </Text>
        <Text style={styles.emptyDescription}>
          Sobald du in einer Gruppe bist, siehst du hier alle kommende Termine.</Text>
      </View>

      {/* Gruppen-Buttons */}
      <View style={styles.groupButtons}>
        <Pressable
          style={styles.createGroupButton}
          onPress={() => console.log('Gruppe erstellen')}
        >
          <Text style={styles.plus}>+</Text>
          <Text style={styles.createGroupText}>
            Gruppe erstellen </Text>
        </Pressable>
        <Pressable
          style={styles.joinGroupButton}
          onPress={() => console.log ('Einladungscode eingeben')}
        >
          <Text style={styles.joinGroupText}>
            Mit Einladungscode beitreten.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function GroupsScreen() {
  return <PlaceholderScreen title="Gruppen" />;
}

function AbstimmungScreen() {
  return <PlaceholderScreen title="Abstimmung" />;
}

function StatisticsScreen() {
  return <PlaceholderScreen title="Statistik" />;
}

function ProfileScreen() {
  return <PlaceholderScreen title="Profil" />;
} 

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubText}>Diese Seite ist noch nicht implementiert.</Text> {/* Später implementieren */}
    </View>
  );
} 

//Tab-Navigation mit fünf Buttons unten
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Übersicht"
      screenOptions={{ 
        headerShown: false,

        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#FFFDF8',

        tabBarStyle: { 
          backgroundColor: '#65000C',
          borderTopColor: '#D4AF37',  
          borderTopWidth: 1,
          height: 78,
          paddingBottom: 7,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },  
      }}
    >
      <Tab.Screen
        name="Übersicht"
        component={OverviewScreen}
        options={{
          tabBarIcon: ({ color, size })  => (
          <Ionicons
            name= 'home-outline'
            color={color}
            size={size}
          />
        ),
      }}
    />
        
      <Tab.Screen
        name="Gruppen"
        component={GroupsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name='people-outline'
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Abstimmung"
        component={AbstimmungScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name='checkbox-outline'
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Statistik"
        component={StatisticsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name='bar-chart-outline'
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
            options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name='person-outline'
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

//App-Komponente
export default function App() {
  const [fontsLoaded] = useFonts({
    Cinzel_700Bold,
  });

  const [users, setUsers] = useState<User[]>([]); 

  if (!fontsLoaded) {
    return null; 
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Startseite" 
          component={HomeScreen} 
          options={{ headerShown: false }} />

        <Stack.Screen 
          name="Anmelden" 
          options={{ 
            title: 'Anmelden', 
            headerStyle: { backgroundColor: '#940606', 
            },
            headerTintColor: '#D4AF37',
            headerTitleStyle: { fontFamily: 'Cinzel_700Bold', 
            },
          }}
        >
          {props => <LoginScreen {...props} users={users} />}
        </Stack.Screen>
        <Stack.Screen
          name="Registrieren"
          options={{    
            title: 'Registrieren',
            headerStyle: {  backgroundColor: '#940606ff',
            },
            headerTintColor: '#D4AF37', 
            headerTitleStyle: { fontFamily: 'Cinzel_700Bold' 
            },
          }}
        >
          {props => <RegisterScreen {...props} users={users} setUsers={setUsers} />}
        </Stack.Screen>

        <Stack.Screen 
          name="Hauptbereich" 
          component={MainTabs} 
          options={{ headerShown: false }} />
        </Stack.Navigator>
    </NavigationContainer>
  );
}

//Styles
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
    zIndex: 2,
    elevation: 2,
  },

  homeButtons: {
    alignItems: 'center',
  },

  title: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 34,
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: '#65000C',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  button: {
    width: 220,
    marginTop: 32,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2, 
    borderColor: '#FFFFFF',
    backgroundColor: '#65000C',
    alignItems: 'center', 
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  secondaryButton: {
    width: 220,
    marginTop: 14,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: '#FFFDF8',
    alignItems: 'center', 
  },

  secondaryButtonText: {
    color: '#65000C',
    fontSize: 18,
    fontWeight: '700',
  },

  formContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 45, 
    paddingBottom: 40,
    backgroundColor: '#940606',
  },

  formTitle: {
    marginBottom: 20,
    fontFamily: 'Cinzel_700Bold',
    fontSize: 34,
    fontWeight: '800',
    color: '#D4AF37',
  },

  label: {
    marginBottom: 8,
    marginTop: 18,
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
  },

  input: {
    height: 56,
    width: '100%',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#C9BFAE',
    backgroundColor: '#FFFDF8',
    color: '#D4AF37',
    fontSize: 16,
  },

  formButton: {
    width: '100%',
    marginTop: 30,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderColor: '#FFFFFF',
    backgroundColor: '#65000C'
  },

  formButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  forgotPassword: {
    marginTop: 22,
    color: '#ee0d0dff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  switchContainer: {
    alignItems: 'center',
    marginTop: 30,
  },

  switchText: {
    marginBottom: 8,
    color: '#FFFFFF',
    fontSize: 16,
  },

  switchLink: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
  },

  errorText: {
    marginTop: 14,
    color: '#FFD7D7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F4F0E7',
  },

  placeholderTitle: {
    marginBottom: 12,
    fontFamily: 'Cinzel_700Bold',
    fontSize: 30,
    color: '#211F1A',
  },

  placeholderSubText: {
    fontSize: 16,
    color: '#5D584F',
    textAlign: 'center',
  },

  //Style für Gruppe
  overviewContainer: {
    flex: 1,
    backgroundColor: '#F4F0E7',
    paddingHorizontal: 24,
    paddingTop: 30,
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
  groupButtons: {
    width: '100%',
    gap: 16,
  },
  createGroupButton: {
    height: 92,
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
    height: 92,
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
  },

});
