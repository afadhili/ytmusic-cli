import { Box, Text } from "ink";
import { ComponentProps } from "react";

export type HelpItems = [string, string][];

type HelpProps = ComponentProps<typeof Box> & {
  items: HelpItems;
};

export default function Help({ items, ...props }: HelpProps) {
  if (!items || items.length == 0) {
    return <></>;
  }
  return (
    <Box columnGap={2} flexWrap="wrap" justifyContent="center" {...props}>
      {items.length > 0 &&
        items.map((item, index) => (
          <Box gap={1} key={`${item[0]}-${index}`}>
            <Text bold>{item[0]}</Text>
            <Text dimColor>{item[1]}</Text>
          </Box>
        ))}
    </Box>
  );
}
