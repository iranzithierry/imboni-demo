import { HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

export type NextEventWidgetProps = { day: string; title: string; time: string; url: string };

const NextEventWidget = (props: NextEventWidgetProps) => {
  'widget';
  return (
    <VStack alignment="leading" spacing={0} modifiers={[containerBackground({ type: 'material', material: 'ultraThin' }, 'widget'), widgetURL(props.url)]}>
      <HStack spacing={4}>
        <Image systemName="calendar" size={11} />
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' })]}>{props.day || 'No events'}</Text>
      </HStack>
      <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{props.title}</Text>
      <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.time}</Text>
    </VStack>
  );
};

export default createWidget('NextEvent', NextEventWidget, { day: '', title: '', time: '', url: 'imboni:///calendar' });
