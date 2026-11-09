import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { createGrid } from '@puzzleme/game-core';
import { theme } from '@puzzleme/ui';
import Scene from '../components/Scene';
export default function Home() {
  const { width } = useWindowDimensions();
  const [showDetails, setShowDetails] = useState(false);
  const grid = createGrid(3, 4);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.logo}>✳ PuzzleMe</Text><Text style={styles.tag}>A LITTLE PIECE OF CALM</Text></View>
    <View style={[styles.main, width < 850 && styles.stacked]}>
      <View style={[styles.copy, width < 850 && styles.naturalSize]}>
        <Text style={styles.eyebrow}>SLOW DOWN. PIECE IT TOGETHER.</Text>
        <Text style={styles.title}>Find your{ '\n' }little escape.</Text>
        <Text style={styles.description}>A quiet moment, a beautiful picture, one piece at a time. Your puzzle space is taking shape.</Text>
        <Pressable accessibilityRole="button" onPress={() => setShowDetails(value => !value)} style={styles.button}><Text style={styles.buttonText}>{showDetails ? 'Hide project details ↑' : 'Explore the foundation →'}</Text></Pressable>
        <Text style={styles.note}>PHASE 02  /  PUZZLE GEOMETRY</Text>
        {showDetails && <View style={styles.details}><Text style={styles.detailText}>Shared engine · {grid.rows} × {grid.columns} grid · {grid.pieceCount} pieces</Text><Text style={styles.detailText}>Expo Router + React Native + Skia</Text><Text style={styles.detailText}>Deterministic geometry · Seed 42 · Static assembled preview</Text></View>}
      </View>
      <View style={[styles.card, width < 850 && styles.naturalSize]}><View style={styles.cardTop}><Text style={styles.cardLabel}>PIECE BY PIECE</Text><Text style={styles.cardLabel}>02 / GEOMETRY STUDY</Text></View><View style={styles.scene}><Scene /></View><View style={styles.caption}><View><Text style={styles.cardTitle}>A perfect fit</Text><Text style={styles.small}>Shared Web + iOS puzzle geometry</Text></View><Text style={styles.pill}>12 pieces</Text></View></View>
    </View>
    <View style={styles.footer}><Text style={styles.small}>Made for moments of pause.</Text><Text style={styles.small}>iOS + Web · Geometry preview</Text></View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background }, content: { paddingHorizontal: 32, maxWidth: 1240, width: '100%', alignSelf: 'center', minHeight: '100%' },
  header: { paddingVertical: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }, logo: { color: theme.ink, fontSize: 29, fontWeight: '700' }, tag: { color: theme.muted, fontSize: 10, letterSpacing: 2 },
  main: { flexGrow: 1, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 64, paddingVertical: 65 }, naturalSize: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }, stacked: { flexGrow: 0, flexDirection: 'column', alignItems: 'stretch', gap: 40, paddingVertical: 30 }, copy: { flexGrow: 1, flexBasis: 0 }, eyebrow: { color: '#718264', fontSize: 11, letterSpacing: 2, marginBottom: 24 },
  title: { fontSize: 64, lineHeight: 70, fontWeight: '600', color: theme.ink, letterSpacing: -3 }, description: { color: theme.muted, fontSize: 17, lineHeight: 28, maxWidth: 365, marginTop: 25 }, button: { backgroundColor: theme.ink, borderRadius: 30, paddingVertical: 18, paddingHorizontal: 25, alignSelf: 'flex-start', marginTop: 32 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' }, note: { fontSize: 10, letterSpacing: 1.5, color: theme.muted, marginTop: 22 },
  card: { flexGrow: 1, flexBasis: 0, maxWidth: 490, width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, transform: [{ rotate: '2deg' }] }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8 }, cardLabel: { fontSize: 9, letterSpacing: 1.2, color: theme.muted }, scene: { overflow: 'hidden', borderRadius: 16 }, caption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, gap: 10 }, cardTitle: { fontSize: 18, color: theme.ink, fontWeight: '600' }, small: { color: theme.muted, fontSize: 12, marginTop: 6 }, pill: { color: theme.ink, backgroundColor: '#eaf0df', padding: 10, borderRadius: 20, fontSize: 11 }, footer: { paddingVertical: 26, borderTopWidth: 1, borderTopColor: '#dedfd5', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }, details: { marginTop: 18, gap: 6 }, detailText: { fontSize: 12, color: theme.ink },
});
