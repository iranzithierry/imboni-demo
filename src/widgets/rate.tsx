import { AccessoryWidgetBackground, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { font, monospacedDigit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

export type RateWidgetProps = { code: string; value: string; up: boolean };

const RateWidget = (props: RateWidgetProps) => {
  'widget';
  return (
    <ZStack modifiers={[widgetURL('imboni:///rates')]}>
      <AccessoryWidgetBackground />
      <VStack spacing={1}>
        <Image systemName={props.up ? 'chart.line.uptrend.xyaxis' : 'chart.line.downtrend.xyaxis'} size={13} />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), monospacedDigit()]}>{props.value}</Text>
        <Text modifiers={[font({ size: 8 })]}>{props.code}</Text>
      </VStack>
    </ZStack>
  );
};

export default createWidget('Rate', RateWidget, { code: 'USD', value: '—', up: true });
