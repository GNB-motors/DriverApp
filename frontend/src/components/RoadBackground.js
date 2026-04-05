import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function RoadBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        width={427}
        height={427}
        viewBox="0 0 507 507"
      >
        <Path
          d="M8.43424e-07 417.343L88.7091 0L140.877 11.0886L52.1679 428.432L8.43424e-07 417.343ZM182.588 456.153L204.765 351.818L256.933 362.906L234.756 467.242L182.588 456.153ZM365.175 494.964L453.884 77.6205L506.052 88.7091L417.343 506.052L365.175 494.964ZM215.854 299.65L238.031 195.314L290.199 206.403L268.021 310.738L215.854 299.65ZM249.119 143.146L271.297 38.8102L323.465 49.8989L301.287 154.235L249.119 143.146Z"
          fill="#1A1C1C"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -122,
    left: -43,
    width: 427,
    height: 427,
    opacity: 0.05,
  },
});
