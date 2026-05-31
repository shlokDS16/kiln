import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.kiln}>KILN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kiln: {
    fontFamily: 'Georgia',
    fontWeight: '900',
    fontSize: 120,
    color: '#F5F5F5',
  },
});
