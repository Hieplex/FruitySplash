import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChapterFruitRain } from '@/components/chapter-fruit-rain';
import { warmChapterDecorAssets, warmGameplayAssets } from '@/game/assets/preload-assets.native';
import { useScreenWipe } from '@/state/screen-wipe';

const chapterBackground = require('../assets/Chapter/ChapterBackground.png');
const CHAPTER_CARD_OFFSET_X = 0;
const FIRST_CHAPTER_CARD_OFFSET_X = 0;

type ChapterCardBase = {
  id: string;
  image: ImageSourcePropType;
  lockedImage?: ImageSourcePropType;
};

const chapterCards: ChapterCardBase[] = [
  { id: 'sweet-grove', image: require('../assets/Chapter/SweetGrove .png') },
  {
    id: 'citrus-meadow',
    image: require('../assets/Chapter/CitrusMeadow.png'),
    lockedImage: require('../assets/Chapter/Locked/CitrusMeadow.png'),
  },
  {
    id: 'grape-haven',
    image: require('../assets/Chapter/GrapeHaven.png'),
    lockedImage: require('../assets/Chapter/Locked/GrapeHaven.png'),
  },
  {
    id: 'melon-bay',
    image: require('../assets/Chapter/MelonBay.png'),
    lockedImage: require('../assets/Chapter/Locked/MelonBay.png'),
  },
  {
    id: 'pineapple-cove',
    image: require('../assets/Chapter/PineappleCove.png'),
    lockedImage: require('../assets/Chapter/Locked/PineappleCove.png'),
  },
  {
    id: 'berry-bloom',
    image: require('../assets/Chapter/BerryBloom.png'),
    lockedImage: require('../assets/Chapter/Locked/BerryBloom.png'),
  },
] as const;

type ChapterCardModel = {
  id: string;
  image: ImageSourcePropType;
  locked: boolean;
};

function ChapterCard({
  image,
  locked,
  isActive,
  onPress,
  width,
  height,
}: {
  image: ImageSourcePropType;
  locked: boolean;
  isActive: boolean;
  onPress: () => void;
  width: number;
  height: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 20,
      bounciness: 7,
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? 'Locked chapter' : 'Open chapter'}
      disabled={locked}
      onPress={onPress}
      onPressIn={() => {
        if (!locked) {
          animateTo(0.96);
        }
      }}
      onPressOut={() => {
        if (!locked) {
          animateTo(1);
        }
      }}
      style={{
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ scale }],
          opacity: locked || isActive ? 1 : 0.88,
        }}
      >
        <Image
          source={image}
          fadeDuration={0}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function ChaptersScreen() {
  const screenWipe = useScreenWipe();
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDecor, setShowDecor] = useState(false);
  const listRef = useRef<FlatList<ChapterCardModel>>(null);

  const cardGap = 50;
  const cardWidth = Math.min(width * 0.788, 468);
  const cardHeight = Math.min(height * 0.554, 832);
  const slotWidth = cardWidth + cardGap;
  const sideInset = Math.max(0, (width - cardWidth) / 2);
  const snapOffsets = useMemo(() => chapterCards.map((_, index) => index * slotWidth), [slotWidth]);

  const chapters = useMemo(
    (): ChapterCardModel[] =>
      chapterCards.map((chapter, index) => ({
        id: chapter.id,
        image: index === 0 || !chapter.lockedImage ? chapter.image : chapter.lockedImage,
        locked: index !== 0,
      })),
    [],
  );

  useEffect(() => {
    void warmGameplayAssets();

    const timer = setTimeout(() => {
      void warmChapterDecorAssets();
      setShowDecor(true);
    }, 180);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showDecor) {
      return;
    }

    screenWipe.setScreenReady();
  }, [screenWipe, showDecor]);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slotWidth);
    setActiveIndex(Math.max(0, Math.min(chapters.length - 1, nextIndex)));
  }

  function handleOpenChapter(index: number) {
    setActiveIndex(index);
    screenWipe.push('/map');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#20191a' }}>
      <ImageBackground source={chapterBackground} fadeDuration={0} resizeMode="cover" style={{ flex: 1 }}>
        {showDecor ? <ChapterFruitRain width={width} height={height} /> : null}
        <FlatList<ChapterCardModel>
          ref={listRef}
          data={chapters}
          keyExtractor={(item) => item.id}
          horizontal
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snapOffsets}
          disableIntervalMomentum
          onMomentumScrollEnd={handleMomentumEnd}
          contentContainerStyle={{ paddingHorizontal: sideInset }}
          ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: cardWidth,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ translateX: CHAPTER_CARD_OFFSET_X + (index === 0 ? FIRST_CHAPTER_CARD_OFFSET_X : 0) }],
              }}
            >
              <ChapterCard
                image={item.image}
                locked={item.locked}
                isActive={index === activeIndex}
                onPress={() => handleOpenChapter(index)}
                width={cardWidth}
                height={cardHeight}
              />
            </View>
          )}
          style={{ flex: 1 }}
        />
      </ImageBackground>
    </View>
  );
}
