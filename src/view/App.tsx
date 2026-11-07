import { useState } from 'react';

import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { NavigationContainer} from '@react-navigation/native'; 

import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; 

import  Ionicons from '@expo/vector-icons/Ionicons'; 

import HomeScreenView from './screens/HomeScreen';
import OverviewScreenView from './screens/OverviewScreen';
import GroupsScreenView from './screens/GroupsScreen';
import VotingScreenView from './screens/VotingScreen';
import StatisticsScreenView from './screens/StatisticsScreen';
import ProfileScreenView from './screens/ProfileScreen';


import { useFonts } from 'expo-font';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';

import * as Notifications from 'expo-notifications';

// Benachrichtigungen
Notifications.setNotificationHandler({
  handleNotification: async() => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestNotificationPermission() {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();
    
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log( 'Keine Berechtigung für  Benachrichtigungen.'
    );
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync( 'default',
      {
        name: 'Standard',
        importance: 
          Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        lightColor: '#3D579E',
      }
    );
  }

  return true;
}
async function sendTestNotification() {
  const permissionGranted = 
    await requestNotificationPermission();

  if (!permissionGranted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'TERMINPLANER',
      subtitle: 'Session morgen um 19:00 bei Maria',
      body: 'Die Glutwacht · Hauptbahnhof Str.41, Hamburg. Bis 23:00.',
      sound: 'default',
    },
    trigger: null,
  });
}



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

// Anmelden-Screen
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
    </ScrollView>
  );
}

// Tab-Navigation mit fünf Buttons unten
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
        component={OverviewScreenView}
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
        component={GroupsScreenView}
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
        component={VotingScreenView}
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
        component={StatisticsScreenView}
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
        component={ProfileScreenView}
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

// App-Komponente
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
          component={HomeScreenView} 
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

// Styles
const styles = StyleSheet.create({
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
    color: '#0000FF',
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
  
});
