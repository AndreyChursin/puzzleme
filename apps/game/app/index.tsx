import { View, Text } from 'react-native';
import Scene from '../components/Scene';
export default function Home() {
  return <View style={{flex:1,padding:16,backgroundColor:'#f5f3ed'}}><Text style={{fontSize:26,color:'#254f46',marginBottom:12}}>PuzzleMe</Text><Scene /></View>;
}
