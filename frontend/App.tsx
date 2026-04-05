import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GoogleAuth from './src/components/auth-screen';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GoogleAuth />  
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({

});
