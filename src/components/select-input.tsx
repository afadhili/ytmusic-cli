import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

type SelectItem<T = string> = {
  label: string;
  value: T;
  description?: string;
};

interface CustomInputProps<T = string> {
  items: SelectItem<T>[];
  onSelect?: (item: SelectItem<T>) => void;
  onChange?: (item: SelectItem<T>) => void;
  onCancel?: () => void;
  focused?: boolean;
  title?: string;
  itemsPerPage?: number;
  indicator?: string;
  showNumber?: boolean;
  loop?: boolean;
  wrap?:
    | "wrap"
    | "truncate"
    | "hard"
    | "truncate-end"
    | "truncate-middle"
    | "truncate-start"
    | undefined;
  noTab?: boolean;
  resetWhenItemsChanged?: boolean;
}

export default function SelectInput<T = string>({
  items,
  onSelect = () => {},
  onChange,
  onCancel,
  focused = true,
  title,
  wrap = "truncate",
  itemsPerPage = 7,
  indicator = "▶ ",
  showNumber = false,
  loop = true,
  noTab = false,
  resetWhenItemsChanged = false,
}: CustomInputProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);

  const safeItemsPerPage = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(items.length / safeItemsPerPage));

  const currentPageStart = page * safeItemsPerPage;
  const currentPageEnd = currentPageStart + safeItemsPerPage;
  const paginatedItems = items.slice(currentPageStart, currentPageEnd);

  function updateSelectedIndex(nextIndex: number) {
    if (items.length === 0) return;

    const safeIndex = Math.max(0, Math.min(nextIndex, items.length - 1));

    setSelectedIndex(safeIndex);
    setPage(Math.floor(safeIndex / safeItemsPerPage));

    const selectedItem = items[safeIndex];

    if (selectedItem) {
      onChange?.(selectedItem);
    }
  }

  function selectCurrentItem() {
    const selectedItem = items[selectedIndex];

    if (selectedItem) {
      onSelect(selectedItem);
    }
  }

  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
      setPage(0);
      return;
    }

    if (resetWhenItemsChanged) {
      setSelectedIndex(0);
      setPage(0);
      onChange?.(items[0]!);
      return;
    }

    if (selectedIndex >= items.length) {
      updateSelectedIndex(items.length - 1);
      return;
    }

    setPage(Math.floor(selectedIndex / safeItemsPerPage));

    const selectedItem = items[selectedIndex];
    if (selectedItem) {
      onChange?.(selectedItem);
    }
  }, [items, safeItemsPerPage]);

  useInput(
    (input, key) => {
      if (!focused || items.length === 0) return;

      if (showNumber && /^[1-9]$/.test(input)) {
        const number = Number(input);
        const targetIndex = currentPageStart + number - 1;

        if (targetIndex >= 0 && targetIndex < items.length) {
          updateSelectedIndex(targetIndex);

          const selectedItem = items[targetIndex];
          if (selectedItem) {
            onSelect(selectedItem);
          }
        }

        return;
      }

      if (key.upArrow || input === "u") {
        if (selectedIndex > 0) {
          updateSelectedIndex(selectedIndex - 1);
        } else if (loop) {
          updateSelectedIndex(items.length - 1);
        }

        return;
      }

      if (key.downArrow || input === "j") {
        if (selectedIndex < items.length - 1) {
          updateSelectedIndex(selectedIndex + 1);
        } else if (loop) {
          updateSelectedIndex(0);
        }

        return;
      }

      if (key.pageDown) {
        updateSelectedIndex(
          Math.min(selectedIndex + safeItemsPerPage, items.length - 1),
        );
        return;
      }

      if (key.pageUp) {
        updateSelectedIndex(Math.max(selectedIndex - safeItemsPerPage, 0));
        return;
      }

      if (key.return) {
        selectCurrentItem();
        return;
      }

      if (key.escape) {
        onCancel?.();
      }
    },
    { isActive: focused },
  );

  const displayIndex = selectedIndex - currentPageStart;

  return (
    <Box flexDirection="column" gap={0}>
      {title && (
        <Box marginBottom={1}>
          <Text bold underline>
            {title}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" paddingX={1} paddingY={0}>
        {paginatedItems.map((item, index) => {
          const absoluteIndex = currentPageStart + index;
          const isSelected = index === displayIndex;

          const cursor = isSelected ? `${indicator}` : noTab ? "" : "  ";
          const number = showNumber
            ? `${page * itemsPerPage + index + 1}. `
            : "";
          const prefix = `${cursor}${number}`;

          return (
            <Box
              key={`${String(item.value)}-${absoluteIndex}`}
              flexDirection="column"
            >
              <Box>
                <Text
                  bold={isSelected}
                  color={isSelected ? "cyan" : "white"}
                  wrap={wrap}
                >
                  {prefix}
                  {item.label}
                </Text>
              </Box>

              {item.description && isSelected && (
                <Box marginLeft={showNumber ? 7 : 4}>
                  <Text dimColor italic>
                    {item.description}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {items.length > safeItemsPerPage && (
        <Box marginTop={1}>
          <Text dimColor>
            Page {page + 1}/{totalPages}
          </Text>
        </Box>
      )}
    </Box>
  );
}
