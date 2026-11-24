import { Gauge, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, gaugeStyle, lineLimit, monospacedDigit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type DeadlineWidgetProps = {
  /** Empty when nothing is tracked. */
  title: string;
  mono: string;
  daysLeft: number;
  /** 0..1 share of the action window still remaining. */
  remaining: number;
  dueLabel: string;
  url: string;
};

// Runs inside the widget extension: only Expo UI globals are available, no app imports or closures.
const DeadlineWidget = (props: DeadlineWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const days = props.daysLeft === 1 ? '1 day' : `${props.daysLeft} days`;
  if (!props.title) {
    return (
      <VStack modifiers={[containerBackground({ type: 'material', material: 'regular' }, 'widget'), widgetURL('imboni:///tracking')]}>
        <Text modifiers={[font({ textStyle: 'caption' })]}>Nothing tracked</Text>
      </VStack>
    );
  }
  if (environment.widgetFamily === 'accessoryInline') {
    return <Text modifiers={[widgetURL(props.url)]}>{`${props.mono} · ${days} left`}</Text>;
  }
  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <Gauge
        value={props.remaining}
        min={0}
        max={1}
        modifiers={[gaugeStyle('circularCapacity'), containerBackground({ type: 'material', material: 'ultraThin' }, 'widget'), widgetURL(props.url)]}
        currentValueLabel={<Text modifiers={[font({ size: 16, weight: 'bold' }), monospacedDigit()]}>{`${props.daysLeft}d`}</Text>}>
        <Text modifiers={[font({ size: 9, weight: 'semibold' })]}>{props.mono}</Text>
      </Gauge>
    );
  }
  return (
    <VStack alignment="leading" spacing={4} modifiers={[containerBackground({ type: 'material', material: 'regular' }, 'widget'), widgetURL(props.url)]}>
      <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle('#FF9500')]}>{`UP NEXT · ${props.mono}`}</Text>
      <Text modifiers={[font({ size: 40, weight: 'bold' }), monospacedDigit()]}>{String(props.daysLeft)}</Text>
      <Text modifiers={[font({ textStyle: 'footnote', weight: 'semibold' }), lineLimit(2)]}>{props.title}</Text>
      <Text modifiers={[font({ textStyle: 'caption2' }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.dueLabel}</Text>
    </VStack>
  );
};

export default createWidget('Deadline', DeadlineWidget, { title: '', mono: '', daysLeft: 0, remaining: 0, dueLabel: '', url: 'imboni:///tracking' });
